import { test, expect, Page } from "@playwright/test";

// Text der Error-Boundary (src/app/error.tsx / global-error.tsx).
// Taucht dieser auf, ist die App abgestürzt (bislang: weiße Seite).
const ERROR_BOUNDARY_TEXT = "schiefgelaufen";

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
        const blocked = {
          getItem: boom,
          setItem: boom,
          removeItem: boom,
          clear: boom,
          key: boom,
          get length() {
            return boom();
          },
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
