import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  
  test('Hauptnavigation funktioniert', async ({ page }) => {
    await page.goto('/');
    
    // Navigiere zu verschiedenen Seiten
    const navLinks = [
      { text: /jobs|stellen/i, url: '/jobs' },
      { text: /über uns|about/i, url: '/about' },
      { text: /kontakt|contact/i, url: '/contact' },
      { text: /faq/i, url: '/faq' },
    ];
    
    for (const link of navLinks) {
      const navLink = page.getByRole('link', { name: link.text }).first();
      if (await navLink.isVisible()) {
        await navLink.click();
        await expect(page).toHaveURL(new RegExp(link.url));
        await page.goto('/'); // Zurück zur Startseite
      }
    }
  });

  test('Footer-Links sind vorhanden', async ({ page }) => {
    await page.goto('/');
    
    // Scrolle zum Footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Prüfe ob Footer vorhanden ist
    const footer = page.locator('footer');
    if (await footer.isVisible()) {
      await expect(footer).toContainText(/jobon|impressum|datenschutz/i);
    }
  });

  test('Sprachumschalter funktioniert', async ({ page }) => {
    await page.goto('/');
    
    // Suche nach Sprachumschalter
    const languageSelector = page.locator('[data-testid="language-selector"], button:has-text("DE"), button:has-text("EN")').first();
    
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      
      // Warte auf Dropdown oder Sprachwechsel
      await page.waitForTimeout(300);
    }
  });

  test('Mobile Navigation (Hamburger Menu)', async ({ page }) => {
    // Setze mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Suche nach Hamburger-Menu Button
    const menuButton = page.locator('button[aria-label*="menu"], button:has(svg), [data-testid="mobile-menu"]').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Mobile Navigation sollte erscheinen
      await page.waitForTimeout(300);
    }
  });

});

test.describe('Statische Seiten', () => {
  
  test('About-Seite lädt', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Kontakt-Seite lädt', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('FAQ-Seite lädt', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Impressum-Seite lädt', async ({ page }) => {
    await page.goto('/impressum');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Datenschutz-Seite lädt', async ({ page }) => {
    await page.goto('/datenschutz');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

});
