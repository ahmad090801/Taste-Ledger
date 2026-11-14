// Backend: dependency-light Node.js server.
// Storage: PostgreSQL when DATABASE_URL is set (used on Render), otherwise a JSON file (used locally).
const http = require('http'), fs = require('fs'), path = require('path');
let Pool; try { ({ Pool } = require('pg')); } catch { Pool = null; }
const FILE = path.join(__dirname, 'data', 'recipes.json');
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const useDb = !!(process.env.DATABASE_URL && Pool);
let pool;

const SEED = [{"id": 1, "title": "Koshari", "cuisine": "Egyptian", "difficulty": "Medium", "minutes": 60, "diet": ["Vegan"], "rest": 0, "image": "koshari", "ingredients": "1 cup rice\n1 cup brown lentils\n1 cup macaroni\n2 onions, sliced\n400 g tomato sauce\n1 tsp cumin\n2 tbsp vinegar", "method": "Cook lentils and rice together until tender.\nBoil the macaroni.\nFry onions until dark and crisp.\nSimmer tomato sauce with cumin and vinegar.\nLayer rice, lentils and pasta, then top with sauce and onions."}, {"id": 2, "title": "Margherita Pizza", "cuisine": "Italian", "difficulty": "Medium", "minutes": 45, "diet": ["Vegetarian"], "rest": 60, "image": "pizza", "ingredients": "500 g flour\n320 ml warm water\n7 g yeast\n200 g tomato passata\n200 g mozzarella\nFresh basil", "method": "Mix dough and let it rest for one hour.\nStretch the dough thinly.\nSpread passata, add mozzarella.\nBake at the highest oven setting for 8 minutes.\nTop with basil."}, {"id": 3, "title": "Chicken Curry", "cuisine": "Indian", "difficulty": "Medium", "minutes": 50, "diet": ["Gluten-free"], "rest": 30, "image": "curry", "ingredients": "600 g chicken thigh\n1 onion\n3 garlic cloves\n2 tbsp curry powder\n400 ml coconut milk\nFresh coriander", "method": "Marinate chicken in curry powder for 30 minutes.\nFry onion and garlic until soft.\nAdd chicken and brown it.\nPour in coconut milk and simmer for 25 minutes.\nServe with rice and coriander."}, {"id": 4, "title": "Greek Salad", "cuisine": "Greek", "difficulty": "Easy", "minutes": 15, "diet": ["Vegetarian", "Gluten-free"], "rest": 0, "image": "salad", "ingredients": "4 tomatoes\n1 cucumber\n1 red onion\n150 g feta\nHandful of olives\n3 tbsp olive oil\nOregano", "method": "Chop vegetables into chunks.\nCombine in a bowl with olives.\nTop with feta, oil and oregano."}, {"id": 5, "title": "Fluffy Pancakes", "cuisine": "American", "difficulty": "Easy", "minutes": 20, "diet": ["Vegetarian"], "rest": 10, "image": "pancakes", "ingredients": "200 g flour\n2 tsp baking powder\n1 egg\n300 ml milk\nButter\nMaple syrup", "method": "Whisk dry ingredients, then add egg and milk.\nRest the batter for 10 minutes.\nCook ladlefuls in a buttered pan until bubbles form, then flip.\nStack with butter and syrup."}, {"id": 6, "title": "Tomato Soup", "cuisine": "French", "difficulty": "Easy", "minutes": 35, "diet": ["Vegan", "Gluten-free"], "rest": 0, "image": "soup", "ingredients": "1 kg ripe tomatoes\n1 onion\n2 garlic cloves\n500 ml vegetable stock\nBasil", "method": "Soften onion and garlic.\nAdd chopped tomatoes and stock.\nSimmer for 20 minutes.\nBlend until smooth and season."}];
const seed = () => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : JSON.parse(JSON.stringify(SEED)));
const save = d => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); };
async function initStore() {
  if (!useDb) return console.log('Storage: JSON file');
  const url = process.env.DATABASE_URL;
  pool = new Pool({ connectionString: url, ssl: /\.render\.com/.test(url) ? { rejectUnauthorized: false } : false });
  await pool.query('CREATE TABLE IF NOT EXISTS recipes (id BIGINT PRIMARY KEY, data JSONB NOT NULL)');
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM recipes');
  if (rows[0].n === 0) for (const r of SEED) await pool.query('INSERT INTO recipes (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [r.id, JSON.stringify(r)]);
  console.log('Storage: PostgreSQL');
}
const store = {
  async list() { if (!useDb) return seed(); return (await pool.query('SELECT data FROM recipes ORDER BY id')).rows.map(r => r.data); },
  async add(r) { if (!useDb) { const all = seed(); all.push(r); save(all); return; } await pool.query('INSERT INTO recipes (id, data) VALUES ($1, $2)', [r.id, JSON.stringify(r)]); },
  async remove(id) { if (!useDb) { save(seed().filter(r => r.id !== id)); return; } await pool.query('DELETE FROM recipes WHERE id = $1', [id]); }
};

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { r(JSON.parse(b)); } catch { r({}); } }); });
const clean = (s, n) => String(s || '').trim().slice(0, n);

// Finds page files in public/ or, if they were uploaded loose, in the project root.
function findStatic(p) {
  const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
  const base = path.basename(rel);
  if (!/^[\w.-]+\.(html|css|js|svg)$/.test(base) || /^(server|package)/.test(base)) return null;
  for (const c of [path.join(PUB, rel), path.join(__dirname, rel), path.join(__dirname, base)]) {
    const n = path.normalize(c);
    if (n.startsWith(__dirname) && fs.existsSync(n) && fs.statSync(n).isFile()) return n;
  }
  return null;
}

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
  const f = findStatic(url.pathname);
  if (!f) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}

initStore().then(() => {
  http.createServer((req, res) => handle(req, res).catch(e => { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Server error' }); }))
    .listen(process.env.PORT || 3000, () => console.log('Running on port ' + (process.env.PORT || 3000)));
}).catch(e => { console.error('Could not start storage:', e.message); process.exit(1); });
