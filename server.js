const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const ROOT = __dirname;
const MAX_BODY = 2 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf'
};

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30000 })
  : null;

async function initDb() {
  if (!pool) {
    console.warn('DATABASE_URL is not set. Running without PostgreSQL.');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_storage (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('PostgreSQL connected and app_storage is ready.');
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function handleStorage(req, res, parsed) {
  if (!pool) return sendJson(res, 503, { error: 'DATABASE_URL is not configured' });

  if (req.method === 'GET') {
    const keys = (parsed.query.keys || '').split(',').map(s => s.trim()).filter(Boolean);
    const prefixes = (parsed.query.prefixes || '').split(',').map(s => s.trim()).filter(Boolean);
    const clauses = [];
    const params = [];
    if (keys.length) {
      params.push(keys);
      clauses.push(`key = ANY($${params.length}::text[])`);
    }
    for (const prefix of prefixes) {
      params.push(prefix + '%');
      clauses.push(`key LIKE $${params.length}`);
    }
    if (!clauses.length) return sendJson(res, 200, {});
    const result = await pool.query(`SELECT key, value FROM app_storage WHERE ${clauses.join(' OR ')}`, params);
    const out = {};
    for (const row of result.rows) out[row.key] = row.value;
    return sendJson(res, 200, out);
  }

  const body = await readBody(req);
  if (req.method === 'POST') {
    if (typeof body.key !== 'string' || body.key.length > 200) return sendJson(res, 400, {error:'Invalid key'});
    const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value ?? '');
    if (Buffer.byteLength(value, 'utf8') > MAX_BODY) return sendJson(res, 413, {error:'Value too large'});
    await pool.query(`
      INSERT INTO app_storage(key, value, updated_at) VALUES($1, $2, NOW())
      ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
    `, [body.key, value]);
    return sendJson(res, 200, {ok:true});
  }

  if (req.method === 'DELETE') {
    if (body.all === true) {
      await pool.query('TRUNCATE app_storage');
    } else if (typeof body.key === 'string') {
      await pool.query('DELETE FROM app_storage WHERE key=$1', [body.key]);
    } else {
      return sendJson(res, 400, {error:'Invalid key'});
    }
    return sendJson(res, 200, {ok:true});
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return sendJson(res, 405, {error:'Method not allowed'});
}

async function requestHandler(req, res) {
  try {
    const parsed = url.parse(req.url || '/', true);
    if (parsed.pathname === '/health') return sendJson(res, 200, {ok:true});
    if (parsed.pathname === '/api/storage') return await handleStorage(req, res, parsed);
    if (parsed.pathname === '/railway-sync.js') {
      const p = path.join(ROOT, 'railway-sync.js');
      res.writeHead(200, {'Content-Type': MIME['.js'], 'Cache-Control':'no-cache'});
      return fs.createReadStream(p).pipe(res);
    }

    let pathname = decodeURIComponent(parsed.pathname || '/');
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.resolve(ROOT, '.' + pathname);
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) return sendJson(res, 403, {error:'Forbidden'});

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
        return res.end('Not found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control':'no-cache'});
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, {error:'Internal Server Error'});
  }
}

initDb()
  .then(() => {
    const server = http.createServer(requestHandler);
    server.listen(PORT, HOST, () => console.log(`Server listening on http://${HOST}:${PORT}`));
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
