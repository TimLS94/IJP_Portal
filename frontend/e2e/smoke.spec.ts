import { test, expect, Page } from "@playwright/test";

// Text der Error-Boundary (src/app/error.tsx / global-error.tsx).
// Taucht dieser auf, ist die App abgestürzt (bislang: weiße Seite).
const ERROR_BOUNDARY_TEXT = "schiefgelaufen";

// Backend-API (für Health-/Daten-Checks). Standard: Produktions-Backend.
const API_URL = process.env.E2E_API_URL || "https://ijp-portal.onrender.com/api/v1";

async function assertPageHealthy(page: Page, path: string) {
  // 1) Error-Boundary darf NICHT sichtbar sein (= kein Absturz)
  await expect(
    page.getByText(ERROR_BOUNDARY_TEXT, { exact: false }),
    `Error-Boundary auf ${path} sichtbar -> App abgestürzt`
  ).toHaveCount(0);

  // 2) Seite darf nicht leer/weiß sein
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, `Seite ${path} wirkt leer (weiße Seite)`).toBeGreaterThan(50);
}

test.describe("Smoke: kritische Seiten laden ohne Absturz", () => {
  test("Startseite", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/JobOn/i);
    await expect(page.locator("nav").first()).toBeVisible();
    await assertPageHealthy(page, "/");
  });

  test("Login-Seite mit Formular", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await assertPageHealthy(page, "/login");
  });

  test("Registrierungs-Seite", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await assertPageHealthy(page, "/register");
  });

  test("Stellenübersicht", async ({ page }) => {
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible();
    await assertPageHealthy(page, "/jobs");
  });
});

test.describe("Backend & Inhalt", () => {
  test("Backend /health ist erreichbar", async ({ request }) => {
    // /health liegt im Root, nicht unter /api/v1
    const origin = API_URL.replace(/\/api\/v1\/?$/, "");
    const res = await request.get(`${origin}/health`);
    expect(res.ok(), `/health antwortete mit Status ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });

  test("Öffentliche Stellen-API liefert Stellen", async ({ request }) => {
    const res = await request.get(`${API_URL}/jobs/public`);
    expect(res.ok(), `/jobs/public antwortete mit Status ${res.status()}`).toBeTruthy();
    const data = await res.json();
    const jobs = Array.isArray(data) ? data : data.jobs || [];
    expect(jobs.length, "API liefert keine öffentlichen Stellen").toBeGreaterThan(0);
  });

  test("Stellenübersicht zeigt tatsächlich Stellen an", async ({ page }) => {
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await assertPageHealthy(page, "/jobs");
    // Mindestens ein Stellen-Link muss im DOM sein (SSR-Crawler-Links oder Client-Karten)
    await expect(
      page.locator('a[href^="/jobs/"]').first(),
      "keine Stellen-Links auf /jobs gefunden"
    ).toBeAttached({ timeout: 15_000 });
  });

  test("Google-Login ist auf /login eingebunden", async ({ page }) => {
    // Hinweis: Eine ECHTE Google-Anmeldung lässt sich nicht automatisieren
    // (Google blockiert Bots/Automation). Wir prüfen daher, dass die Google-
    // Integration geladen wird und /login nicht abstürzt. Der eigentliche
    // Fehlerfall (Safari-localStorage-Crash) ist separat abgedeckt.
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await assertPageHealthy(page, "/login");
    await expect(
      page.locator("#google-gsi-script"),
      "Google-Sign-In-Script nicht eingebunden"
    ).toHaveCount(1, { timeout: 10_000 });
  });
});

test.describe("SEO & Job-Detailseite", () => {
  test("Eine echte Job-Detailseite lädt mit Inhalt + JobPosting-Strukturdaten", async ({
    page,
    request,
  }) => {
    // Eine echte Job-URL aus der Sitemap-API holen
    const res = await request.get(`${API_URL}/jobs/sitemap/urls`);
    expect(res.ok(), `sitemap/urls Status ${res.status()}`).toBeTruthy();
    const data = await res.json();
    const urls: { url: string }[] = data.urls || [];
    test.skip(urls.length === 0, "keine Job-URLs vorhanden");

    const jobPath = urls[0].url; // Format: /jobs/slug-id
    await page.goto(jobPath, { waitUntil: "domcontentloaded" });
    await assertPageHealthy(page, jobPath);
    await expect(page.locator("h1").first()).toBeVisible();

    // JobPosting-JSON-LD vorhanden + Pflichtfelder gesetzt (Google-Jobs-Tauglichkeit)
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const jobPosting = scripts
      .map((s) => {
        try {
          return JSON.parse(s);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .find((o) => o["@type"] === "JobPosting");

    expect(jobPosting, `kein JobPosting-JSON-LD auf ${jobPath}`).toBeTruthy();
    for (const field of ["title", "description", "datePosted", "hiringOrganization", "jobLocation"]) {
      expect(jobPosting[field], `JobPosting-Pflichtfeld "${field}" fehlt`).toBeTruthy();
    }
  });

  test("sitemap.xml ist erreichbar und enthält Einträge", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok(), `sitemap.xml Status ${res.status()}`).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("<loc>");
  });

  test("robots.txt ist erreichbar und verweist auf die Sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok(), `robots.txt Status ${res.status()}`).toBeTruthy();
    const body = (await res.text()).toLowerCase();
    expect(body).toContain("sitemap");
  });

  test("Telegram-Info-Endpoint antwortet", async ({ request }) => {
    const res = await request.get(`${API_URL}/telegram/info`);
    expect(res.ok(), `/telegram/info Status ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("configured");
  });
});

// ── Eingeloggt: Dashboard lädt (nur wenn Test-Zugangsdaten als Secrets da sind) ──
// Wichtig: Es wird KEIN echter Google-Login automatisiert (Google blockiert Bots).
// Der Login läuft per API mit einem E-Mail-/Passwort-Test-Account; der Absturz-nach-
// Login-Fall (AuthContext/Dashboard-Rendering) ist für Google- und E-Mail-Nutzer gleich.
test.describe("Eingeloggt: Dashboard lädt", () => {
  async function loginAndOpen(
    page: Page,
    request: import("@playwright/test").APIRequestContext,
    email: string,
    password: string,
    path: string,
    area: string
  ) {
    const res = await request.post(`${API_URL}/auth/login`, {
      form: { username: email, password },
    });
    expect(res.ok(), `Login fehlgeschlagen (Status ${res.status()})`).toBeTruthy();
    const data = await res.json();
    expect(data.access_token, "kein access_token erhalten").toBeTruthy();
    // Session wie die App setzen (AuthContext liest 'token' + 'user' aus localStorage)
    await page.addInitScript(
      ([t, u]) => {
        try {
          localStorage.setItem("token", t);
          localStorage.setItem("user", u);
        } catch {
          /* ignore */
        }
      },
      [data.access_token as string, JSON.stringify(data.user)]
    );
    await page.goto(path, { waitUntil: "domcontentloaded" });

    // Robuste Signale statt Body-Textlänge (Dashboards sind App-Shells mit wenig
    // sichtbarem Text während Daten laden):
    // 1) Navbar erscheint -> AuthContext aufgelöst, kein Hänger.
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 20_000 });
    // 2) Kein Absturz (Error-Boundary).
    await expect(page.getByText(ERROR_BOUNDARY_TEXT, { exact: false })).toHaveCount(0);
    // 3) Nicht zur Login-Seite umgeleitet -> Session gilt (sonst wäre Login/Auth kaputt).
    expect(page.url(), `auf Login umgeleitet -> nicht eingeloggt (${path})`).toContain(area);
  }

  test("Bewerber-Dashboard lädt nach Login", async ({ page, request }) => {
    const email = process.env.TEST_APPLICANT_EMAIL;
    const password = process.env.TEST_APPLICANT_PASSWORD;
    test.skip(!email || !password, "TEST_APPLICANT_* Secrets nicht gesetzt");
    await loginAndOpen(page, request, email!, password!, "/applicant/profile", "/applicant");
  });

  test("Firmen-Dashboard lädt nach Login", async ({ page, request }) => {
    const email = process.env.TEST_COMPANY_EMAIL;
    const password = process.env.TEST_COMPANY_PASSWORD;
    test.skip(!email || !password, "TEST_COMPANY_* Secrets nicht gesetzt");
    await loginAndOpen(page, request, email!, password!, "/company/dashboard", "/company");
  });
});

// ── Regressionstest für den wiederkehrenden Safari-Bug ──────────────────────
// Safari wirft bei blockiertem Speicher (ITP nach Cross-Tab-OAuth / Private Mode)
// SecurityError bei localStorage-Zugriff. Das hat die App mehrfach abstürzen lassen
// (weiße Seite bei Google-Login). Hier erzwingen wir dieses Verhalten und stellen
// sicher, dass die App trotzdem lädt.
test.describe("Regression: App überlebt blockierten localStorage (Safari/ITP)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const boom = () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      };
      try {
        // Realistisch wie Safari: Methoden werfen SecurityError, length bleibt 0
        const blocked = {
          getItem: boom,
          setItem: boom,
          removeItem: boom,
          clear: boom,
          key: boom,
          length: 0,
        } as unknown as Storage;
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            return blocked;
          },
        });
      } catch {
        /* ignore */
      }
    });
  });

  for (const path of ["/", "/login", "/register"]) {
    test(`${path} lädt trotz blockiertem localStorage`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await assertPageHealthy(page, path);
    });
  }
});
