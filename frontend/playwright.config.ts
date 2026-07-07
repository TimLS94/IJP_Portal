import { defineConfig, devices } from "@playwright/test";

// Ziel-URL: standardmäßig die Live-Seite (Monitoring). Für lokale Vorab-Tests
// E2E_BASE_URL=http://localhost:3000 setzen (dann wird der Dev-Server gestartet).
const baseURL = process.env.E2E_BASE_URL || "https://www.jobon.work";
const isLocal = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Etwas großzügiger, da gegen Produktion (Netzwerk) getestet wird
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // WebKit = Safari-Engine -> fängt Safari-spezifische Fehler (z.B. localStorage/ITP)
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  // Nur lokal einen Dev-Server starten; beim Monitoring gegen Produktion nicht.
  ...(isLocal
    ? {
        webServer: {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
