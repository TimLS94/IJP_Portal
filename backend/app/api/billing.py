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
    if company.stripe_customer_id:
        return company.stripe_customer_id

    customer = stripe.Customer.create(
        email=user.email,
        name=company.company_name or None,
        metadata={"company_id": str(company.id), "user_id": str(user.id)},
    )
    company.stripe_customer_id = customer.id
    db.commit()
    return customer.id


def _resolve_company(db: Session, subscription) -> Company | None:
    """Findet die Firma zu einer Stripe-Subscription (über metadata oder customer)."""
    company_id = (subscription.get("metadata") or {}).get("company_id")
    if company_id:
        company = db.query(Company).filter(Company.id == int(company_id)).first()
        if company:
            return company
    customer_id = subscription.get("customer")
    if customer_id:
        return db.query(Company).filter(Company.stripe_customer_id == customer_id).first()
    return None


def _apply_subscription_state(db: Session, company: Company, subscription) -> None:
    """Synchronisiert is_premium & Felder anhand des Subscription-Objekts."""
    sub_status = subscription.get("status")
    is_active = sub_status in ACTIVE_STATUSES

    company.is_premium = is_active
    company.stripe_subscription_id = subscription.get("id") if is_active else None
    company.premium_cancel_at_period_end = bool(subscription.get("cancel_at_period_end"))

    period_end = subscription.get("current_period_end")
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
            company_id = (obj.get("metadata") or {}).get("company_id")
            customer_id = obj.get("customer")
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
                if obj.get("subscription"):
                    company.stripe_subscription_id = obj.get("subscription")
                if customer_id and not company.stripe_customer_id:
                    company.stripe_customer_id = customer_id
                db.commit()
                diag["premium_set"] = True
                logger.info(
                    f"Company {company.id}: Premium via checkout.session.completed aktiviert"
                )
                # Optional: Abrechnungszeitraum nachtragen (nur falls Leserecht vorhanden)
                try:
                    if obj.get("subscription"):
                        sub = stripe.Subscription.retrieve(obj["subscription"])
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
            if company:
                if event_type == "customer.subscription.deleted":
                    company.is_premium = False
                    company.stripe_subscription_id = None
                    company.premium_until = None
                    company.premium_cancel_at_period_end = False
                    db.commit()
                    logger.info(f"Company {company.id}: Abo gelöscht -> Premium deaktiviert")
                else:
                    _apply_subscription_state(db, company, obj)
                    diag["premium_set"] = bool(company.is_premium)
    except Exception as e:
        logger.error(f"Fehler bei Webhook-Verarbeitung ({event_type}): {e}")
        diag["handled"] = False
        diag["error"] = str(e)
        return diag

    return diag
