/**
 * Facebook Gruppen Auto-Poster
 * 
 * Postet automatisch in mehrere Facebook Gruppen.
 * Nutzt deinen bestehenden Browser-Login (keine Credentials nötig).
 * 
 * Nutzung:
 *   node bot.js --test          # Testet nur, ob Login funktioniert
 *   node bot.js --post          # Postet in alle Gruppen
 *   node bot.js --post --dry    # Simuliert nur (kein echtes Posten)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');

// ============ KONFIGURATION ============

// Deine Facebook Gruppen URLs
const GROUPS = [
  // Eigene Gruppen
  // { url: 'https://www.facebook.com/groups/DEINE_GRUPPE_1', name: 'Meine Gruppe 1', own: true },
  // { url: 'https://www.facebook.com/groups/DEINE_GRUPPE_2', name: 'Meine Gruppe 2', own: true },
  
  // Externe Gruppen
  // { url: 'https://www.facebook.com/groups/EXTERNE_GRUPPE', name: 'Jobs Berlin', own: false },
];

// Verzögerungen (in Millisekunden) - wichtig für Anti-Detection
const DELAYS = {
  betweenGroups: { min: 30000, max: 60000 },    // 30-60 Sekunden zwischen Gruppen
  beforeTyping: { min: 2000, max: 4000 },        // 2-4 Sekunden vor dem Tippen
  typingSpeed: { min: 30, max: 80 },             // Millisekunden pro Zeichen
  beforePosting: { min: 3000, max: 6000 },       // 3-6 Sekunden vor dem Posten
  afterPosting: { min: 5000, max: 10000 },       // 5-10 Sekunden nach dem Posten
};

// Pfad für Browser-Session (damit du eingeloggt bleibst)
const USER_DATA_DIR = path.join(__dirname, 'browser-data');

// ============ HILFSFUNKTIONEN ============

function randomDelay(range) {
  const delay = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('de-DE');
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    wait: '⏳'
  }[type] || '📋';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function typeHumanLike(page, selector, text) {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element nicht gefunden: ${selector}`);
  }
  
  await element.click();
  await randomDelay(DELAYS.beforeTyping);
  
  // Menschenähnliches Tippen
  for (const char of text) {
    await element.type(char, { delay: Math.random() * (DELAYS.typingSpeed.max - DELAYS.typingSpeed.min) + DELAYS.typingSpeed.min });
  }
}

// ============ HAUPTFUNKTIONEN ============

async function initBrowser() {
  log('Starte Browser...', 'wait');
  
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,  // Sichtbarer Browser für Login
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  });
  
  return browser;
}

async function checkLogin(page) {
  log('Prüfe Login-Status...', 'wait');
  
  await page.goto('https://www.facebook.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Prüfen ob eingeloggt
  const isLoggedIn = await page.evaluate(() => {
    // Verschiedene Indikatoren für eingeloggt
    return document.querySelector('[aria-label="Dein Profil"]') !== null ||
           document.querySelector('[aria-label="Konto"]') !== null ||
           document.querySelector('[aria-label="Account"]') !== null ||
           document.querySelector('[data-pagelet="ProfileTilesFeed"]') !== null ||
           document.querySelector('div[role="banner"] a[href*="/me"]') !== null;
  });
  
  return isLoggedIn;
}

async function postToGroup(page, group, postText, dryRun = false) {
  log(`Navigiere zu: ${group.name}`, 'wait');
  
  try {
    await page.goto(group.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // "Schreibe etwas..." Button finden und klicken
    // Facebook ändert die Selektoren oft, daher mehrere Varianten
    const postBoxSelectors = [
      '[aria-label="Schreibe etwas..."]',
      '[aria-label="Was machst du gerade?"]',
      '[aria-label="Beitrag erstellen"]',
      'div[role="button"]:has-text("Schreibe etwas")',
      'div[role="button"]:has-text("Was beschäftigt dich")',
      'span:has-text("Schreibe etwas...")',
    ];
    
    let postBox = null;
    for (const selector of postBoxSelectors) {
      try {
        postBox = await page.waitForSelector(selector, { timeout: 5000 });
        if (postBox) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!postBox) {
      log(`Konnte Post-Box nicht finden in: ${group.name}`, 'error');
      return { success: false, error: 'Post-Box nicht gefunden' };
    }
    
    await postBox.click();
    await randomDelay(DELAYS.beforeTyping);
    
    // Warten auf das Textfeld im Modal
    const textAreaSelectors = [
      'div[contenteditable="true"][role="textbox"]',
      'div[aria-label="Was machst du gerade?"][contenteditable="true"]',
      'div[data-lexical-editor="true"]',
    ];
    
    let textArea = null;
    for (const selector of textAreaSelectors) {
      try {
        textArea = await page.waitForSelector(selector, { timeout: 5000 });
        if (textArea) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!textArea) {
      log(`Konnte Textfeld nicht finden in: ${group.name}`, 'error');
      return { success: false, error: 'Textfeld nicht gefunden' };
    }
    
    // Text eingeben
    await textArea.click();
    await page.waitForTimeout(500);
    
    // Text einfügen (schneller als tippen bei langem Text)
    await page.evaluate((text) => {
      const textArea = document.querySelector('div[contenteditable="true"][role="textbox"]') ||
                       document.querySelector('div[data-lexical-editor="true"]');
      if (textArea) {
        textArea.focus();
        document.execCommand('insertText', false, text);
      }
    }, postText);
    
    await randomDelay(DELAYS.beforePosting);
    
    if (dryRun) {
      log(`[DRY RUN] Würde posten in: ${group.name}`, 'warning');
      // Modal schließen
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      return { success: true, dryRun: true };
    }
    
    // "Posten" Button finden und klicken
    const postButtonSelectors = [
      'div[aria-label="Posten"]',
      'div[aria-label="Post"]',
      'span:has-text("Posten")',
      'div[role="button"]:has-text("Posten")',
    ];
    
    let postButton = null;
    for (const selector of postButtonSelectors) {
      try {
        postButton = await page.waitForSelector(selector, { timeout: 3000 });
        if (postButton) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!postButton) {
      log(`Konnte Posten-Button nicht finden in: ${group.name}`, 'error');
      await page.keyboard.press('Escape');
      return { success: false, error: 'Posten-Button nicht gefunden' };
    }
    
    await postButton.click();
    await randomDelay(DELAYS.afterPosting);
    
    log(`Erfolgreich gepostet in: ${group.name}`, 'success');
    return { success: true, postCreated: true };
    
  } catch (error) {
    log(`Fehler bei ${group.name}: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

// Kommentar unter den eigenen Post schreiben
async function addCommentToOwnPost(page, group, comments, dryRun = false) {
  if (!comments || comments.length === 0) {
    return { success: true, skipped: true };
  }
  
  log(`Füge ${comments.length} Kommentar(e) hinzu in: ${group.name}`, 'wait');
  
  try {
    // Zur Gruppe navigieren (falls nicht schon dort)
    if (!page.url().includes(group.url.split('/').pop())) {
      await page.goto(group.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }
    
    // Den neuesten eigenen Post finden
    // Wir suchen nach Posts mit "Gerade eben" oder "vor X Minuten" vom eigenen Profil
    await page.waitForTimeout(2000);
    
    // Scroll zum Feed um Posts zu laden
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(2000);
    
    // Finde den Kommentar-Button beim ersten Post (der neueste, also unser gerade erstellter)
    const commentButtonSelectors = [
      'div[aria-label="Einen Kommentar schreiben"]',
      'div[aria-label="Kommentieren"]',
      'span:has-text("Kommentieren")',
      'div[role="button"]:has-text("Kommentieren")',
    ];
    
    let commentButton = null;
    for (const selector of commentButtonSelectors) {
      try {
        const buttons = await page.$$(selector);
        if (buttons.length > 0) {
          commentButton = buttons[0]; // Erster = neuester Post
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!commentButton) {
      log(`Konnte Kommentar-Button nicht finden in: ${group.name}`, 'warning');
      return { success: false, error: 'Kommentar-Button nicht gefunden' };
    }
    
    // Für jeden Kommentar
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      
      if (dryRun) {
        log(`[DRY RUN] Würde Kommentar ${i + 1} hinzufügen: "${comment.substring(0, 50)}..."`, 'warning');
        continue;
      }
      
      // Kommentar-Button klicken
      await commentButton.click();
      await randomDelay(DELAYS.beforeTyping);
      
      // Kommentar-Textfeld finden
      const commentBoxSelectors = [
        'div[aria-label="Schreibe einen Kommentar"][contenteditable="true"]',
        'div[aria-label="Schreibe einen Kommentar..."][contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
      ];
      
      let commentBox = null;
      for (const selector of commentBoxSelectors) {
        try {
          commentBox = await page.waitForSelector(selector, { timeout: 5000 });
          if (commentBox) break;
        } catch (e) {
          continue;
        }
      }
      
      if (!commentBox) {
        log(`Konnte Kommentar-Feld nicht finden für Kommentar ${i + 1}`, 'warning');
        continue;
      }
      
      // Kommentar eingeben
      await commentBox.click();
      await page.waitForTimeout(500);
      
      await page.evaluate((text) => {
        const box = document.querySelector('div[contenteditable="true"][role="textbox"]:focus') ||
                    document.querySelector('div[aria-label="Schreibe einen Kommentar"][contenteditable="true"]');
        if (box) {
          box.focus();
          document.execCommand('insertText', false, text);
        }
      }, comment);
      
      await randomDelay(DELAYS.beforePosting);
      
      // Enter drücken oder Absenden-Button klicken
      await page.keyboard.press('Enter');
      await randomDelay({ min: 3000, max: 5000 });
      
      log(`Kommentar ${i + 1}/${comments.length} hinzugefügt`, 'success');
      
      // Pause zwischen Kommentaren
      if (i < comments.length - 1) {
        await randomDelay({ min: 5000, max: 10000 });
      }
    }
    
    return { success: true, commentsAdded: comments.length };
    
  } catch (error) {
    log(`Fehler beim Kommentieren in ${group.name}: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function runBot(options = {}) {
  const { test = false, dryRun = false } = options;
  
  console.log('\n🤖 Facebook Gruppen Auto-Poster\n');
  console.log('================================\n');
  
  if (GROUPS.length === 0) {
    log('Keine Gruppen konfiguriert! Bearbeite die GROUPS Liste in bot.js', 'error');
    return;
  }
  
  // Post-Text laden oder eingeben
  let postText = '';
  const postFile = path.join(__dirname, 'post.txt');
  
  if (fs.existsSync(postFile)) {
    postText = fs.readFileSync(postFile, 'utf-8').trim();
    log(`Post-Text aus post.txt geladen (${postText.length} Zeichen)`, 'info');
  } else {
    log('Keine post.txt gefunden. Bitte Post-Text eingeben:', 'warning');
    console.log('(Beende mit einer leeren Zeile)\n');
    
    const lines = [];
    let line;
    while ((line = readline.question('')) !== '') {
      lines.push(line);
    }
    postText = lines.join('\n');
    
    if (!postText) {
      log('Kein Post-Text eingegeben. Abbruch.', 'error');
      return;
    }
  }
  
  // Kommentare laden (optional)
  let comments = [];
  const commentsFile = path.join(__dirname, 'comments.txt');
  
  if (fs.existsSync(commentsFile)) {
    const commentsContent = fs.readFileSync(commentsFile, 'utf-8').trim();
    if (commentsContent) {
      // Kommentare sind durch "---" getrennt
      comments = commentsContent.split('---').map(c => c.trim()).filter(c => c.length > 0);
      log(`${comments.length} Kommentar(e) aus comments.txt geladen`, 'info');
    }
  }
  
  console.log('\n--- Post-Vorschau ---');
  console.log(postText);
  if (comments.length > 0) {
    console.log('\n--- Kommentare ---');
    comments.forEach((c, i) => console.log(`[${i + 1}] ${c.substring(0, 80)}${c.length > 80 ? '...' : ''}`));
  }
  console.log('--- Ende Vorschau ---\n');
  
  if (!test) {
    const confirm = readline.question(`\nIn ${GROUPS.length} Gruppen posten? (j/n): `);
    if (confirm.toLowerCase() !== 'j') {
      log('Abgebrochen.', 'warning');
      return;
    }
  }
  
  const browser = await initBrowser();
  const page = await browser.newPage();
  
  try {
    const isLoggedIn = await checkLogin(page);
    
    if (!isLoggedIn) {
      log('Du bist nicht bei Facebook eingeloggt!', 'error');
      log('Bitte logge dich im Browser-Fenster ein und starte dann neu.', 'warning');
      
      // Warte auf manuellen Login
      console.log('\nDrücke ENTER wenn du eingeloggt bist...');
      readline.question('');
      
      const stillNotLoggedIn = !(await checkLogin(page));
      if (stillNotLoggedIn) {
        log('Immer noch nicht eingeloggt. Abbruch.', 'error');
        await browser.close();
        return;
      }
    }
    
    log('Login erfolgreich!', 'success');
    
    if (test) {
      log('Test-Modus: Nur Login geprüft.', 'info');
      await browser.close();
      return;
    }
    
    // In alle Gruppen posten
    const results = [];
    
    for (let i = 0; i < GROUPS.length; i++) {
      const group = GROUPS[i];
      log(`\n[${i + 1}/${GROUPS.length}] ${group.name}`, 'info');
      
      const result = await postToGroup(page, group, postText, dryRun);
      results.push({ group: group.name, ...result });
      
      // Kommentare hinzufügen wenn Post erfolgreich war
      if (result.success && comments.length > 0) {
        await randomDelay({ min: 3000, max: 5000 });
        const commentResult = await addCommentToOwnPost(page, group, comments, dryRun);
        results[results.length - 1].comments = commentResult;
      }
      
      // Verzögerung zwischen Gruppen (außer bei letzter)
      if (i < GROUPS.length - 1) {
        const delay = Math.floor(Math.random() * (DELAYS.betweenGroups.max - DELAYS.betweenGroups.min)) + DELAYS.betweenGroups.min;
        log(`Warte ${Math.round(delay / 1000)} Sekunden...`, 'wait');
        await page.waitForTimeout(delay);
      }
    }
    
    // Zusammenfassung
    console.log('\n================================');
    console.log('📊 ZUSAMMENFASSUNG\n');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Erfolgreich: ${successful}`);
    console.log(`❌ Fehlgeschlagen: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFehlgeschlagene Gruppen:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.group}: ${r.error}`);
      });
    }
    
    // Ergebnisse speichern
    const logFile = path.join(__dirname, 'logs', `${new Date().toISOString().split('T')[0]}.json`);
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
    log(`Log gespeichert: ${logFile}`, 'info');
    
  } catch (error) {
    log(`Kritischer Fehler: ${error.message}`, 'error');
    console.error(error);
  } finally {
    await browser.close();
  }
}

// ============ CLI ============

const args = process.argv.slice(2);
const options = {
  test: args.includes('--test'),
  dryRun: args.includes('--dry'),
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Facebook Gruppen Auto-Poster

Nutzung:
  node bot.js --test          Testet nur den Login
  node bot.js --post          Postet in alle Gruppen
  node bot.js --post --dry    Simuliert nur (kein echtes Posten)

Konfiguration:
  1. Bearbeite die GROUPS Liste in bot.js
  2. Erstelle eine post.txt mit deinem Post-Text
  3. Führe den Bot aus

Hinweis:
  Beim ersten Start öffnet sich ein Browser-Fenster.
  Logge dich dort bei Facebook ein - der Login wird gespeichert.
`);
} else {
  runBot(options);
}
