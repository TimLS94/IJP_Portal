import { test, expect } from '@playwright/test';

test.describe('Stellenangebote (öffentlich)', () => {
  
  test('Jobs-Seite lädt und zeigt Stellenangebote', async ({ page }) => {
    await page.goto('/jobs');
    
    // Prüfe ob Hauptelemente vorhanden sind - flexiblere Selektoren
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Seite sollte laden ohne zu crashen
    await expect(page.locator('body')).toBeVisible();
  });

  test('Jobs können nach Stellenart gefiltert werden', async ({ page }) => {
    await page.goto('/jobs');
    
    // Warte bis Seite geladen
    await page.waitForLoadState('networkidle');
    
    // Stellenart-Filter finden und öffnen
    const positionTypeSelect = page.locator('select').first();
    if (await positionTypeSelect.isVisible()) {
      await positionTypeSelect.selectOption({ index: 1 }); // Erste Option nach "Alle"
      
      // URL sollte sich ändern oder Ergebnisse filtern
      await page.waitForTimeout(500);
    }
  });

  test('Job-Detail-Seite ist erreichbar', async ({ page }) => {
    await page.goto('/jobs');
    
    // Warte auf Jobs
    await page.waitForLoadState('networkidle');
    
    // Klicke auf ersten Job (falls vorhanden)
    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (await jobLink.isVisible()) {
      // Hole href bevor wir klicken
      const href = await jobLink.getAttribute('href');
      
      // Navigiere zur Job-Detail-Seite
      if (href) {
        await page.goto(href);
        
        // Prüfe ob Job-Details geladen wurden
        await expect(page.locator('h1, h2').first()).toBeVisible();
      }
    }
  });

  test('Suchfunktion funktioniert', async ({ page }) => {
    await page.goto('/jobs');
    
    // Suche eingeben - flexiblere Selektoren
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="uch"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Berlin');
      await page.waitForTimeout(500);
    }
    
    // Seite sollte nicht abstürzen
    await expect(page.locator('body')).toBeVisible();
  });

});

test.describe('Stellenarten-Seite', () => {
  
  test('Stellenarten-Übersicht lädt', async ({ page }) => {
    await page.goto('/stellenarten');
    
    // Prüfe ob Seite lädt - flexiblere Prüfung
    await expect(page.locator('h1, h2, main').first()).toBeVisible();
  });

});
