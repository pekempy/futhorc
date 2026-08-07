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

// This server stores nothing.
//
// It used to. There was an accounts table and a /api/db endpoint that would
// GET the whole thing — usernames, unsalted SHA-256 password hashes, emails,
// and a profile containing dates of birth, home addresses, parents' names —
// to anyone who asked, and POST would let anyone overwrite it. Both without
// authentication of any kind.
//
// All of it is gone. Identity is Google's problem now; progress lives in the
// browser and in the user's own hidden Drive folder. The only thing this
// process does is serve static files and read two environment variables.
//
// If you deployed the old version, the leftover database file still holds
// that data — see the warning below.
if (fs.existsSync(DB_FILE)) {
  console.warn(
    `\n  ⚠  ${DB_FILE} exists and is no longer used.\n` +
    '     It may still contain password hashes and personal details from the\n' +
    '     old account system. Nothing reads it any more, but it is worth\n' +
    '     deleting rather than leaving on disk.\n'
  );
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Same-origin only. There is no cross-origin API to support, and a wildcard
  // here would let any page on the internet read /api/config.
  res.setHeader('Vary', 'Origin');

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
      // authorise anything on its own. The client *secret* is not used at all -
      // the browser flow is a public client and has no secret.
      googleClientId: process.env.GOOGLE_CLIENT_ID
        || process.env.VITE_GOOGLE_CLIENT_ID || '',
    }));
    return;
  }

  // /api/config is the only endpoint. Anything else under /api/ is a 404 —
  // without this the SPA fallback below answers /api/db with index.html and a
  // cheerful 200, which looks like the old endpoint is still alive.
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
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
});
