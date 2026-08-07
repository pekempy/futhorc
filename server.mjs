import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 80;
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'futhorc.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// SQLite Database Initialization
let db = null;
try {
  const { DatabaseSync } = await import('node:sqlite');
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT,
      password_hash TEXT,
      profile TEXT,
      progress TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  console.log(`SQLite database initialized successfully at ${DB_FILE}`);
} catch (err) {
  console.log(`Using SQLite data file storage at ${DB_FILE}`);
}

// MIME types for static asset serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function readDatabaseData() {
  if (db) {
    try {
      const accountRows = db.prepare('SELECT * FROM accounts').all();
      const accounts = accountRows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        passwordHash: r.password_hash,
        profile: r.profile ? JSON.parse(r.profile) : {},
        progress: r.progress ? JSON.parse(r.progress) : {},
        createdAt: r.created_at,
      }));

      const stateRow = db.prepare('SELECT value FROM app_state WHERE key = ?').get('state');
      const state = stateRow ? JSON.parse(stateRow.value) : null;

      return { accounts, state };
    } catch (e) {
      console.error('Error reading SQLite tables:', e);
    }
  }

  // File fallback
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return { accounts: [], state: null };
    }
  }
  return { accounts: [], state: null };
}

function writeDatabaseData(payload) {
  if (db) {
    try {
      if (payload.accounts && Array.isArray(payload.accounts)) {
        const stmt = db.prepare(`
          INSERT INTO accounts (id, username, email, password_hash, profile, progress, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            username = excluded.username,
            email = excluded.email,
            password_hash = excluded.password_hash,
            profile = excluded.profile,
            progress = excluded.progress;
        `);
        for (const acc of payload.accounts) {
          stmt.run(
            acc.id || String(Date.now()),
            acc.username || '',
            acc.email || '',
            acc.passwordHash || '',
            JSON.stringify(acc.profile || {}),
            JSON.stringify(acc.progress || {}),
            acc.createdAt || new Date().toISOString()
          );
        }
      }

      if (payload.state) {
        const stmt = db.prepare(`
          INSERT INTO app_state (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value;
        `);
        stmt.run('state', JSON.stringify(payload.state));
      }
      return;
    } catch (e) {
      console.error('Error writing to SQLite tables:', e);
    }
  }

  // File fallback
  fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname === '/api/db') {
    if (req.method === 'GET') {
      try {
        const data = readDatabaseData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read SQLite database' }));
      }
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          writeDatabaseData(parsed);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
      return;
    }
  }

  // Runtime configuration.
  //
  // Read from the environment on every request rather than baked into the
  // bundle at build time, so the same image can be deployed anywhere and a
  // change to docker-compose only needs a restart, not a rebuild.
  if (pathname === '/api/config') {
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      geminiApiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      // Public by design: an OAuth client ID identifies the app, it doesn't
      // authorise anything on its own. The client *secret* is not used at all —
      // the browser flow is a public client and has no secret.
      googleClientId: process.env.GOOGLE_CLIENT_ID
        || process.env.VITE_GOOGLE_CLIENT_ID || '',
    }));
    return;
  }

  // Static File Serving
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // SPA fallback only for HTML page routes, NEVER for missing assets or files with extensions
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (pathname.startsWith('/assets/') || path.extname(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Asset Not Found');
      return;
    }
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Prevent caching index.html so users always get fresh JS asset references on updates
  if (path.basename(filePath) === 'index.html') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Futhorc server listening on port ${PORT}`);
  console.log(`SQLite database file: ${DB_FILE}`);
});
