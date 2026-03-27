import { test, expect } from '@playwright/test';

test.describe('Accessibility & Performance', () => {
  
  test('Seite hat keine kritischen Accessibility-Probleme', async ({ page }) => {
    await page.goto('/');
    
    // Prüfe ob Hauptlandmarks vorhanden sind
    await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    
    // Prüfe ob Bilder alt-Texte haben
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      
      // Bilder sollten alt-Attribut haben (kann leer sein für dekorative Bilder)
      expect(alt !== null || src?.includes('data:')).toBeTruthy();
    }
  });

  test('Seite lädt in akzeptabler Zeit', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // Seite sollte in unter 5 Sekunden laden
    expect(loadTime).toBeLessThan(5000);
  });

  test('Keine JavaScript-Fehler auf der Startseite', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Es sollten keine kritischen JS-Fehler auftreten
    const criticalErrors = errors.filter(e => 
      !e.includes('ResizeObserver') && // Bekannter harmloser Fehler
      !e.includes('Non-Error') // React Dev Mode
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('Keine 404-Fehler für wichtige Ressourcen', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', (response) => {
      if (response.status() === 404) {
        const url = response.url();
        // Ignoriere API-Calls die 404 zurückgeben können
        if (!url.includes('/api/')) {
          failedRequests.push(url);
        }
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Keine 404 für statische Ressourcen
    expect(failedRequests).toHaveLength(0);
  });

});
