// Backend: dependency-light Node.js server.
// Storage: PostgreSQL when DATABASE_URL is set (used on Render), otherwise a JSON file (used locally).
const http = require('http'), fs = require('fs'), path = require('path');
let Pool; try { ({ Pool } = require('pg')); } catch { Pool = null; }
const FILE = path.join(__dirname, 'data', 'recipes.json');
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const useDb = !!(process.env.DATABASE_URL && Pool);
let pool;

const seed = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));
async function initStore() {
  if (!useDb) return console.log('Storage: JSON file');
  const url = process.env.DATABASE_URL;
  pool = new Pool({ connectionString: url, ssl: /\.render\.com/.test(url) ? { rejectUnauthorized: false } : false });
  await pool.query('CREATE TABLE IF NOT EXISTS recipes (id BIGINT PRIMARY KEY, data JSONB NOT NULL)');
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM recipes');
  if (rows[0].n === 0) for (const r of seed()) await pool.query('INSERT INTO recipes (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [r.id, JSON.stringify(r)]);
  console.log('Storage: PostgreSQL');
}
const store = {
  async list() { if (!useDb) return seed(); return (await pool.query('SELECT data FROM recipes ORDER BY id')).rows.map(r => r.data); },
  async add(r) { if (!useDb) { const all = seed(); all.push(r); fs.writeFileSync(FILE, JSON.stringify(all, null, 2)); return; } await pool.query('INSERT INTO recipes (id, data) VALUES ($1, $2)', [r.id, JSON.stringify(r)]); },
  async remove(id) { if (!useDb) { fs.writeFileSync(FILE, JSON.stringify(seed().filter(r => r.id !== id), null, 2)); return; } await pool.query('DELETE FROM recipes WHERE id = $1', [id]); }
};

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { r(JSON.parse(b)); } catch { r({}); } }); });
const clean = (s, n) => String(s || '').trim().slice(0, n);

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/login' && req.method === 'POST') {          // simulated sign-in
    const b = await body(req);
    return b.username && b.password ? send(res, 200, { ok: true, name: clean(b.username, 40) }) : send(res, 400, { error: 'Missing credentials' });
  }
  if (url.pathname === '/api/recipes' && req.method === 'GET') return send(res, 200, await store.list());
  if (url.pathname === '/api/recipes' && req.method === 'POST') {
    const b = await body(req);
    const r = { id: Date.now(), title: clean(b.title, 100), cuisine: clean(b.cuisine, 40), difficulty: clean(b.difficulty, 10),
      minutes: Math.max(1, Math.min(600, parseInt(b.minutes) || 0)), diet: Array.isArray(b.diet) ? b.diet.map(d => clean(d, 20)) : [],
      rest: parseInt(b.rest) || 0, image: clean(b.image, 20), ingredients: clean(b.ingredients, 3000), method: clean(b.method, 5000) };
    if (!r.title || !r.cuisine || !r.ingredients || !r.method) return send(res, 400, { error: 'Missing fields' });
    await store.add(r); return send(res, 201, r);
  }
  const m = url.pathname.match(/^\/api\/recipes\/(\d+)$/);
  if (m && req.method === 'DELETE') { await store.remove(+m[1]); return send(res, 200, { ok: true }); }
  let f = path.normalize(path.join(PUB, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}

initStore().then(() => {
  http.createServer((req, res) => handle(req, res).catch(e => { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Server error' }); }))
    .listen(process.env.PORT || 3000, () => console.log('Running on port ' + (process.env.PORT || 3000)));
}).catch(e => { console.error('Could not start storage:', e.message); process.exit(1); });
