/**
 * Facebook Bot Server
 * 
 * Kleiner HTTP-Server, der den Bot von der JobOn App aus steuern lässt.
 * Läuft lokal auf deinem Mac.
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://ijp-portal.onrender.com/api/v1';

const PORT = 3847; // Ungewöhnlicher Port für lokalen Zugriff

let botProcess = null;
let botStatus = 'idle'; // 'idle', 'running', 'finished', 'error'
let botLogs = [];

// CORS Headers für lokalen Zugriff
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  botLogs.push(logEntry);
  // Nur letzte 100 Logs behalten
  if (botLogs.length > 100) botLogs.shift();
}

// Gruppen aus Datei laden
function loadGroups() {
  const groupsFile = path.join(__dirname, 'groups.json');
  if (fs.existsSync(groupsFile)) {
    return JSON.parse(fs.readFileSync(groupsFile, 'utf-8'));
  }
  return [];
}

// Gruppen speichern
function saveGroups(groups) {
  const groupsFile = path.join(__dirname, 'groups.json');
  fs.writeFileSync(groupsFile, JSON.stringify(groups, null, 2));
}

// Post-Text speichern
function savePost(text) {
  const postFile = path.join(__dirname, 'post.txt');
  fs.writeFileSync(postFile, text);
}

// Kommentare speichern
function saveComments(comments) {
  const commentsFile = path.join(__dirname, 'comments.txt');
  if (!comments || comments.length === 0) {
    // Keine Kommentare = Datei löschen
    if (fs.existsSync(commentsFile)) {
      fs.unlinkSync(commentsFile);
    }
    return;
  }
  // Kommentare mit --- trennen
  const content = comments.join('\n---\n');
  fs.writeFileSync(commentsFile, content);
}

// Kommentare laden
function loadComments() {
  const commentsFile = path.join(__dirname, 'comments.txt');
  if (fs.existsSync(commentsFile)) {
    const content = fs.readFileSync(commentsFile, 'utf-8').trim();
    if (content) {
      return content.split('---').map(c => c.trim()).filter(c => c.length > 0);
    }
  }
  return [];
}

// Post-Text laden
function loadPost() {
  const postFile = path.join(__dirname, 'post.txt');
  if (fs.existsSync(postFile)) {
    return fs.readFileSync(postFile, 'utf-8').trim();
  }
  return '';
}

// Bot starten
function startBot(options = {}) {
  if (botProcess) {
    return { success: false, error: 'Bot läuft bereits' };
  }

  const args = ['bot.js', '--post', '--auto'];
  if (options.dryRun) args.push('--dry');

  botStatus = 'running';
  botLogs = [];
  log('Bot wird gestartet...');

  botProcess = spawn('node', args, {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  botProcess.stdout.on('data', (data) => {
    log(data.toString().trim());
  });

  botProcess.stderr.on('data', (data) => {
    log(`ERROR: ${data.toString().trim()}`);
  });

  botProcess.on('close', (code) => {
    botStatus = code === 0 ? 'finished' : 'error';
    log(`Bot beendet mit Code ${code}`);
    botProcess = null;
  });

  botProcess.on('error', (err) => {
    botStatus = 'error';
    log(`Bot Fehler: ${err.message}`);
    botProcess = null;
  });

  return { success: true, message: 'Bot gestartet' };
}

// Bot stoppen
function stopBot() {
  if (!botProcess) {
    return { success: false, error: 'Bot läuft nicht' };
  }

  botProcess.kill('SIGTERM');
  botProcess = null;
  botStatus = 'idle';
  log('Bot gestoppt');

  return { success: true, message: 'Bot gestoppt' };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Body parsen für POST requests
  let body = '';
  if (req.method === 'POST') {
    for await (const chunk of req) {
      body += chunk;
    }
  }

  try {
    // Status abrufen
    if (url.pathname === '/status' && req.method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        status: botStatus,
        logs: botLogs.slice(-20),
        groups: loadGroups().length,
        post: loadPost(),
        comments: loadComments()
      }));
      return;
    }

    // Gruppen abrufen
    if (url.pathname === '/groups' && req.method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(loadGroups()));
      return;
    }

    // Gruppen speichern
    if (url.pathname === '/groups' && req.method === 'POST') {
      const groups = JSON.parse(body);
      saveGroups(groups);
      
      // Auch bot.js aktualisieren
      updateBotGroups(groups);
      
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, count: groups.length }));
      return;
    }

    // Post-Text setzen
    if (url.pathname === '/post' && req.method === 'POST') {
      const { text, comments } = JSON.parse(body);
      savePost(text);
      if (comments !== undefined) {
        saveComments(comments);
      }
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Kommentare setzen
    if (url.pathname === '/comments' && req.method === 'POST') {
      const { comments } = JSON.parse(body);
      saveComments(comments);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, count: comments ? comments.length : 0 }));
      return;
    }

    // Kommentare abrufen
    if (url.pathname === '/comments' && req.method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ comments: loadComments() }));
      return;
    }

    // Bot starten
    if (url.pathname === '/start' && req.method === 'POST') {
      const options = body ? JSON.parse(body) : {};
      const result = startBot(options);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result));
      return;
    }

    // Bot stoppen
    if (url.pathname === '/stop' && req.method === 'POST') {
      const result = stopBot();
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result));
      return;
    }

    // Logs abrufen
    if (url.pathname === '/logs' && req.method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ logs: botLogs }));
      return;
    }

    // API Proxy - Login
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const { email, password } = JSON.parse(body);
      const postData = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      
      const apiReq = https.request(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, corsHeaders);
          res.end(data);
        });
      });
      
      apiReq.on('error', (e) => {
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: e.message }));
      });
      
      apiReq.write(postData);
      apiReq.end();
      return;
    }

    // API Proxy - Posts laden
    if (url.pathname === '/api/posts' && req.method === 'GET') {
      const token = req.headers.authorization;
      
      https.get(`${API_URL}/facebook/posts`, {
        headers: { 'Authorization': token }
      }, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, corsHeaders);
          res.end(data);
        });
      }).on('error', (e) => {
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: e.message }));
      });
      return;
    }

    // API Proxy - Gruppen laden
    if (url.pathname === '/api/groups' && req.method === 'GET') {
      const token = req.headers.authorization;
      
      https.get(`${API_URL}/facebook/groups`, {
        headers: { 'Authorization': token }
      }, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, corsHeaders);
          res.end(data);
        });
      }).on('error', (e) => {
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: e.message }));
      });
      return;
    }

    // App HTML ausliefern
    if (url.pathname === '/' || url.pathname === '/app') {
      const appFile = path.join(__dirname, 'app.html');
      const html = fs.readFileSync(appFile, 'utf-8');
      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(html);
      return;
    }

    // 404
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (error) {
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Bot.js mit Gruppen aktualisieren
function updateBotGroups(groups) {
  const botFile = path.join(__dirname, 'bot.js');
  let content = fs.readFileSync(botFile, 'utf-8');
  
  // Gruppen-Array generieren
  const groupsCode = groups.map(g => 
    `  { url: '${g.url}', name: '${g.name}', own: ${g.type === 'own'} },`
  ).join('\n');
  
  // Ersetze die GROUPS Konstante
  content = content.replace(
    /const GROUPS = \[[\s\S]*?\];/,
    `const GROUPS = [\n${groupsCode}\n];`
  );
  
  fs.writeFileSync(botFile, content);
  log(`${groups.length} Gruppen in bot.js aktualisiert`);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🤖 Facebook Bot Server läuft auf http://localhost:${PORT}\n`);
  console.log('Endpoints:');
  console.log('  GET  /status  - Bot-Status abrufen');
  console.log('  GET  /groups  - Gruppen abrufen');
  console.log('  POST /groups  - Gruppen speichern');
  console.log('  POST /post    - Post-Text setzen');
  console.log('  POST /start   - Bot starten');
  console.log('  POST /stop    - Bot stoppen');
  console.log('  GET  /logs    - Logs abrufen');
  console.log('\nDrücke Ctrl+C zum Beenden.\n');
});
