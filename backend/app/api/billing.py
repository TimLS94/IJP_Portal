"""
Stripe-Anbindung für das Premium-Abo (29 €/Monat, 7 Tage Trial).

Flow:
- POST /billing/checkout  -> Stripe Checkout Session (Abo abschließen)
- POST /billing/portal    -> Stripe Customer Portal (Abo verwalten/kündigen)
- GET  /billing/status    -> aktueller Abo-Status der Firma
- POST /billing/webhook   -> Stripe Webhooks synchronisieren is_premium

Der Premium-Status (Company.is_premium) wird ausschließlich über die Webhooks
gesetzt – nie clientseitig. Der Admin-Toggle bleibt als manueller Override.
"""
import logging
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.company import Company
from app.models.premium_cancellation import PremiumCancellation
from app.api.companies import get_company_or_404
from app.services.settings_service import get_setting, set_setting

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])

# Aktive Abo-Status, bei denen Premium gilt
ACTIVE_STATUSES = {"active", "trialing"}
PRICE_SETTING_KEY = "stripe_price_id_auto"  # Cache für automatisch erstellte Price-ID


def _require_stripe():
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Zahlungen sind aktuell nicht konfiguriert.",
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY


def _frontend_url() -> str:
    url = (settings.FRONTEND_URL or "").strip().rstrip("/")
    if not url or "localhost" in url or "127.0.0.1" in url:
        return "https://www.jobon.work"
    return url


def _ensure_price(db: Session) -> str:
    """Liefert die Stripe-Price-ID. Nutzt STRIPE_PRICE_ID aus der Config,
    sonst eine zuvor automatisch erstellte (gecachte), sonst legt sie eine an."""
    if settings.STRIPE_PRICE_ID:
        return settings.STRIPE_PRICE_ID

    cached = get_setting(db, PRICE_SETTING_KEY, None)
    if cached:
        return cached

    product = stripe.Product.create(name="JobOn Premium")
    price = stripe.Price.create(
        product=product.id,
        unit_amount=settings.PREMIUM_PRICE_CENTS,
        currency="eur",
        recurring={"interval": "month"},
    )
    set_setting(db, PRICE_SETTING_KEY, price.id)
    db.commit()
    logger.info(f"Stripe-Price automatisch angelegt: {price.id}")
    return price.id


def _get_or_create_customer(db: Session, company: Company, user: User) -> str:
    # Vorhandenen Kunden verifizieren – ungültige (z.B. Test-Kunden unter Live-Key)
    # werden verworfen und neu angelegt (Selbstheilung beim Test->Live-Wechsel).
    if company.stripe_customer_id:
        try:
            cust = stripe.Customer.retrieve(company.stripe_customer_id)
            if not _g(cust, "deleted", False):
                return company.stripe_customer_id
        except stripe.error.InvalidRequestError:
            company.stripe_customer_id = None
            company.stripe_subscription_id = None
            company.premium_status = None
            db.commit()

    customer = stripe.Customer.create(
        email=user.email,
        name=company.company_name or None,
        metadata={"company_id": str(company.id), "user_id": str(user.id)},
    )
    company.stripe_customer_id = customer.id
    db.commit()
    return customer.id


def _g(obj, key, default=None):
    """Sicherer Feldzugriff für Stripe-Objekte (kein dict mehr in stripe>=15) und Dicts."""
    if obj is None:
        return default
    try:
        val = obj[key]
    except (KeyError, TypeError, AttributeError):
        return default
    return default if val is None else val


def _record_cancellation(db: Session, company: Company | None, subscription) -> None:
    """Speichert den Stripe-Kündigungsgrund (cancellation_details) – einer pro Abo."""
    details = _g(subscription, "cancellation_details")
    feedback = _g(details, "feedback")
    comment = _g(details, "comment")
    if not feedback and not comment:
        return  # Kein Grund hinterlegt (Kündigungsgrund evtl. nicht im Portal aktiviert)

    sub_id = _g(subscription, "id")
    existing = (
        db.query(PremiumCancellation)
        .filter(PremiumCancellation.stripe_subscription_id == sub_id)
        .first()
    )
    if existing:
        existing.feedback = feedback
        existing.comment = comment
        if company:
            existing.company_id = company.id
            existing.company_name = company.company_name
    else:
        db.add(PremiumCancellation(
            company_id=company.id if company else None,
            company_name=company.company_name if company else None,
            stripe_subscription_id=sub_id,
            feedback=feedback,
            comment=comment,
        ))
    db.commit()
    logger.info(f"Kündigungsgrund erfasst (sub {sub_id}): feedback={feedback}")


def _resolve_company(db: Session, subscription) -> Company | None:
    """Findet die Firma zu einer Stripe-Subscription (über metadata oder customer)."""
    company_id = _g(_g(subscription, "metadata"), "company_id")
    if company_id:
        company = db.query(Company).filter(Company.id == int(company_id)).first()
        if company:
            return company
    customer_id = _g(subscription, "customer")
    if customer_id:
        return db.query(Company).filter(Company.stripe_customer_id == customer_id).first()
    return None


def _apply_subscription_state(db: Session, company: Company, subscription) -> None:
    """Synchronisiert is_premium & Felder anhand des Subscription-Objekts."""
    sub_status = _g(subscription, "status")
    is_active = sub_status in ACTIVE_STATUSES

    company.is_premium = is_active
    company.premium_status = sub_status
    company.stripe_subscription_id = _g(subscription, "id") if is_active else None
    company.premium_cancel_at_period_end = bool(_g(subscription, "cancel_at_period_end"))

    period_end = _g(subscription, "current_period_end")
    company.premium_until = (
        datetime.utcfromtimestamp(period_end) if (is_active and period_end) else None
    )
    db.commit()
    logger.info(
        f"Company {company.id}: Abo-Status '{sub_status}' -> is_premium={is_active}"
    )


@router.post("/checkout")
async def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Erstellt eine Stripe Checkout Session für das Premium-Abo."""
    _require_stripe()
    company = get_company_or_404(current_user, db)

    if company.is_premium and company.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dein Account ist bereits Premium.",
        )

    customer_id = _get_or_create_customer(db, company, current_user)

    # Sicherheitsnetz gegen Doppel-Abos: prüfen, ob beim Kunden schon ein
    # aktives/Trial-Abo existiert (best effort – falls Leserecht fehlt, greift
    # weiterhin der is_premium-Guard oben).
    try:
        existing = stripe.Subscription.list(customer=customer_id, status="all", limit=20)
        for sub in existing.data:
            if _g(sub, "status") in ACTIVE_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Es besteht bereits ein aktives Abo. Verwalte es über \"Abo verwalten\".",
                )
    except HTTPException:
        raise
    except Exception:
        pass

    price_id = _ensure_price(db)
    base = _frontend_url()

    subscription_data = {"metadata": {"company_id": str(company.id)}}
    if settings.PREMIUM_TRIAL_DAYS and settings.PREMIUM_TRIAL_DAYS > 0:
        subscription_data["trial_period_days"] = settings.PREMIUM_TRIAL_DAYS

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            subscription_data=subscription_data,
            allow_promotion_codes=True,
            billing_address_collection="auto",
            success_url=f"{base}/company/premium?success=1",
            cancel_url=f"{base}/company/premium?canceled=1",
            metadata={"company_id": str(company.id)},
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Checkout Fehler: {e}")
        raise HTTPException(status_code=502, detail="Checkout konnte nicht gestartet werden.")

    return {"url": session.url}


@router.post("/portal")
async def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Erstellt eine Stripe Customer Portal Session (Abo verwalten/kündigen)."""
    _require_stripe()
    company = get_company_or_404(current_user, db)

    if not company.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kein aktives Abo vorhanden.",
        )

    try:
        session = stripe.billing_portal.Session.create(
            customer=company.stripe_customer_id,
            return_url=f"{_frontend_url()}/company/premium",
        )
    except stripe.error.InvalidRequestError as e:
        # Kunde existiert im aktuellen Modus nicht (z.B. Test-Kunde unter Live-Key)
        # -> veraltete Stripe-Felder bereinigen, damit der Button verschwindet.
        if getattr(e, "code", "") == "resource_missing" or "No such customer" in str(e):
            company.stripe_customer_id = None
            company.stripe_subscription_id = None
            company.premium_status = None
            db.commit()
            logger.info(f"Company {company.id}: veralteten Stripe-Kunden bereinigt")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kein gültiges Abo gefunden – die alten Zahlungsdaten wurden zurückgesetzt.",
            )
        logger.error(f"Stripe Portal Fehler: {e}")
        raise HTTPException(status_code=502, detail="Kundenportal konnte nicht geöffnet werden.")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Portal Fehler: {e}")
        raise HTTPException(status_code=502, detail="Kundenportal konnte nicht geöffnet werden.")

    return {"url": session.url}


@router.get("/status")
async def get_billing_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Liefert den aktuellen Abo-Status der Firma."""
    company = get_company_or_404(current_user, db)
    return {
        "is_premium": bool(company.is_premium),
        "has_subscription": bool(company.stripe_subscription_id),
        "premium_until": company.premium_until.isoformat() if company.premium_until else None,
        "cancel_at_period_end": bool(company.premium_cancel_at_period_end),
        "price_eur": settings.PREMIUM_PRICE_CENTS / 100,
        "trial_days": settings.PREMIUM_TRIAL_DAYS,
        "stripe_configured": bool(settings.STRIPE_SECRET_KEY),
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Empfängt Stripe-Webhooks und synchronisiert den Premium-Status."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET nicht gesetzt – Webhook abgelehnt.")
        raise HTTPException(status_code=503, detail="Webhook nicht konfiguriert.")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.warning(f"Ungültiger Stripe-Webhook: {e}")
        raise HTTPException(status_code=400, detail="Ungültige Signatur.")

    event_type = event["type"]
    obj = event["data"]["object"]
    stripe.api_key = settings.STRIPE_SECRET_KEY

    # Diagnose-Infos, die in der Stripe-Event-Antwort sichtbar sind
    diag = {"received": True, "event": event_type}

    try:
        if event_type == "checkout.session.completed":
            # Premium direkt aus der Checkout-Session aktivieren – ohne dass der
            # (ggf. eingeschränkte) Key ein Subscriptions-Read-Recht braucht.
            company = None
            company_id = _g(_g(obj, "metadata"), "company_id")
            customer_id = _g(obj, "customer")
            subscription_id = _g(obj, "subscription")
            diag["metadata_company_id"] = company_id
            diag["customer_id"] = customer_id

            if company_id:
                company = db.query(Company).filter(Company.id == int(company_id)).first()
            if not company and customer_id:
                company = db.query(Company).filter(
                    Company.stripe_customer_id == customer_id
                ).first()

            diag["company_resolved"] = company.id if company else None

            if company:
                company.is_premium = True
                if subscription_id:
                    company.stripe_subscription_id = subscription_id
                if customer_id and not company.stripe_customer_id:
                    company.stripe_customer_id = customer_id
                db.commit()
                diag["premium_set"] = True
                logger.info(
                    f"Company {company.id}: Premium via checkout.session.completed aktiviert"
                )
                # Optional: Abrechnungszeitraum nachtragen (nur falls Leserecht vorhanden)
                try:
                    if subscription_id:
                        sub = stripe.Subscription.retrieve(subscription_id)
                        _apply_subscription_state(db, company, sub)
                except Exception:
                    pass

        elif event_type in (
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ):
            company = _resolve_company(db, obj)
            diag["company_resolved"] = company.id if company else None
            if event_type == "customer.subscription.deleted":
                _record_cancellation(db, company, obj)
                if company:
                    company.is_premium = False
                    company.premium_status = "canceled"
                    company.stripe_subscription_id = None
                    company.premium_until = None
                    company.premium_cancel_at_period_end = False
                    db.commit()
                    logger.info(f"Company {company.id}: Abo gelöscht -> Premium deaktiviert")
            elif company:
                _apply_subscription_state(db, company, obj)
                diag["premium_set"] = bool(company.is_premium)
                # Kündigung zum Periodenende -> Grund festhalten
                if _g(obj, "cancel_at_period_end"):
                    _record_cancellation(db, company, obj)
    except Exception as e:
        logger.error(f"Fehler bei Webhook-Verarbeitung ({event_type}): {e}")
        diag["handled"] = False
        diag["error"] = str(e)
        return diag

    return diag
