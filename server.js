// Task 3 - Backend: dependency-free Node.js server with JSON-file persistence
const http = require('http'), fs = require('fs'), path = require('path');
const DATA = path.join(__dirname, 'data', 'recipes.json');
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const read = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
const write = d => fs.writeFileSync(DATA, JSON.stringify(d, null, 2));
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { r(JSON.parse(b)); } catch { r({}); } }); });
const clean = (s, n) => String(s || '').trim().slice(0, n);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/login' && req.method === 'POST') {          // simulated sign-in
    const b = await body(req);
    return b.username && b.password ? send(res, 200, { ok: true, name: clean(b.username, 40) }) : send(res, 400, { error: 'Missing credentials' });
  }
  if (url.pathname === '/api/recipes' && req.method === 'GET') return send(res, 200, read());
  if (url.pathname === '/api/recipes' && req.method === 'POST') {
    const b = await body(req);
    const r = { id: Date.now(), title: clean(b.title, 100), cuisine: clean(b.cuisine, 40), difficulty: clean(b.difficulty, 10),
      minutes: Math.max(1, Math.min(600, parseInt(b.minutes) || 0)), diet: Array.isArray(b.diet) ? b.diet.map(d => clean(d, 20)) : [],
      rest: parseInt(b.rest) || 0, image: clean(b.image, 20), ingredients: clean(b.ingredients, 3000), method: clean(b.method, 5000) };
    if (!r.title || !r.cuisine || !r.ingredients || !r.method) return send(res, 400, { error: 'Missing fields' });
    const all = read(); all.push(r); write(all); return send(res, 201, r);
  }
  const m = url.pathname.match(/^\/api\/recipes\/(\d+)$/);
  if (m && req.method === 'DELETE') { write(read().filter(r => r.id !== +m[1])); return send(res, 200, { ok: true }); }
  // static files
  let f = path.normalize(path.join(PUB, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Running on port ' + (process.env.PORT || 3000)));
