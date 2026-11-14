'use strict';
// ===== Helpers =====
const $ = (s, r = document) => r.querySelector(s);
const main = $('#main'), statusEl = $('#status'), dlg = $('#dlg');
const IMAGES = { koshari: 'Koshari', pizza: 'Pizza', curry: 'Curry', salad: 'Salad', pancakes: 'Pancakes', soup: 'Soup' };
const CUISINES = ['American', 'Egyptian', 'French', 'Greek', 'Indian', 'Italian', 'Other'];
const DIETS = ['Vegan', 'Vegetarian', 'Gluten-free'];
const PAGE = 5;
let recipes = [], page = 1;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = t => t.split('\n').map(x => x.trim()).filter(Boolean);
const say = m => { statusEl.textContent = ''; setTimeout(() => { statusEl.textContent = m; }, 60); }; // live-region announcement
const user = () => sessionStorage.getItem('user');
const api = async (u, o) => { const r = await fetch(u, o); if (!r.ok) throw new Error(r.status); return r.json(); };
const img = (r, cls) => `<img class="${cls}" src="img/${esc(r.image)}.svg" alt="Illustration of ${esc(r.title)}" width="400" height="300">`;

function field(id, label, type = 'text', o = {}) {
  const d = (o.hint ? id + '-hint ' : '') + id + '-err';
  const ctl = type === 'textarea'
    ? `<textarea id="${id}" rows="${o.rows || 5}" aria-describedby="${d}" ${o.attrs || ''}></textarea>`
    : `<input id="${id}" type="${type}" aria-describedby="${d}" ${o.attrs || ''}>`;
  return `<div class="field"><label for="${id}">${label}</label>${o.hint ? `<span class="hint" id="${id}-hint">${o.hint}</span>` : ''}${ctl}<span class="err" id="${id}-err"></span></div>`;
}

// Error summary + inline errors (shared by every form -> consistency)
function showErrors(form, errs) {
  form.querySelectorAll('.err').forEach(e => e.textContent = '');
  form.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
  const box = form.querySelector('.summary');
  if (!errs.length) { box.hidden = true; return true; }
  errs.forEach(e => { form.querySelector('#' + e.id).setAttribute('aria-invalid', 'true'); form.querySelector('#' + e.id + '-err').textContent = 'Error: ' + e.msg; });
  box.innerHTML = `<h2 tabindex="-1">${errs.length > 1 ? errs.length + ' problems need fixing' : '1 problem needs fixing'}</h2><ul>${errs.map(e => `<li><a href="#" data-f="${e.id}">${esc(e.msg)}</a></li>`).join('')}</ul>`;
  box.hidden = false;
  box.onclick = ev => { const a = ev.target.closest('a[data-f]'); if (a) { ev.preventDefault(); form.querySelector('#' + a.dataset.f).focus(); } };
  box.querySelector('h2').focus();
  return false;
}
function busy(f, on, txt) {
  const b = f.querySelector('button[type=submit]');
  if (on) { b.dataset.t = b.textContent; b.textContent = txt; b.disabled = true; f.setAttribute('aria-busy', 'true'); say(txt); }
  else { b.textContent = b.dataset.t; b.disabled = false; f.removeAttribute('aria-busy'); }
}
async function load() {
  main.setAttribute('aria-busy', 'true');
  main.innerHTML = '<h1 tabindex="-1">Loading</h1><p>Loading recipes…</p>';
  try { recipes = await api('/api/recipes'); main.removeAttribute('aria-busy'); return true; }
  catch { main.removeAttribute('aria-busy'); main.innerHTML = '<h1 tabindex="-1">Something went wrong</h1><p>We could not load the recipes.</p><button class="btn" id="retry" type="button">Try again</button>'; $('#retry').onclick = route; return false; }
}
const card = r => `<li class="card">${img(r, '')}<div><h3>${esc(r.title)}</h3><p>${esc(r.cuisine)} · ${r.minutes} min · ${esc(r.difficulty)}</p><button class="btn small" type="button" data-open="${r.id}">View <span class="sr">${esc(r.title)}</span></button></div></li>`;
const bindOpen = () => main.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openRecipe(+b.dataset.open));
function openRecipe(id) {
  const r = recipes.find(x => x.id === id); if (!r) return;
  dlg.innerHTML = `<div class="dlgin"><h2 id="dt">${esc(r.title)}</h2>${img(r, 'hero')}<p>${esc(r.cuisine)} · ${r.minutes} minutes · ${esc(r.difficulty)}${r.diet.length ? ' · ' + esc(r.diet.join(', ')) : ''}${r.rest ? ' · includes ' + r.rest + ' min resting time' : ''}</p>
  <h3>Ingredients</h3><ul>${lines(r.ingredients).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
  <h3>Method</h3><ol>${lines(r.method).map(i => `<li>${esc(i)}</li>`).join('')}</ol>
  <button class="btn" type="button" id="close">Close</button></div>`;
  dlg.showModal(); $('#close').onclick = () => dlg.close();
}

// ===== Task 2: Sign-in =====
function signin() {
  main.innerHTML = `<h1 tabindex="-1">Sign in</h1><p>Demo sign-in: any username and password will work.</p>
  <form id="f" class="card narrow" novalidate><div class="summary" hidden></div>
  ${field('username', 'Username', 'text', { attrs: 'autocomplete="username"' })}
  ${field('password', 'Password', 'password', { attrs: 'autocomplete="current-password"' })}
  <button class="btn" type="submit">Sign in</button></form>`;
  const f = $('#f');
  f.onsubmit = async e => {
    e.preventDefault();
    const u = f.username.value.trim(), p = f.password.value, errs = [];
    if (!u) errs.push({ id: 'username', msg: 'Enter your username' });
    if (!p) errs.push({ id: 'password', msg: 'Enter your password' });
    if (!showErrors(f, errs)) return;
    busy(f, true, 'Signing in…');
    await new Promise(r => setTimeout(r, 900)); // simulated delay
    try {
      const r = await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
      sessionStorage.setItem('user', r.name); location.hash = 'dashboard'; say('Signed in as ' + r.name);
    } catch { busy(f, false); showErrors(f, [{ id: 'username', msg: 'Could not sign in. Check your connection and try again' }]); }
  };
}

// ===== Task 3: Dashboard =====
async function dashboard() {
  if (!await load()) return;
  const latest = recipes.slice(-3).reverse();
  main.innerHTML = `<h1 tabindex="-1">Welcome, ${esc(user())}</h1>
  <ul class="stats"><li><strong>${recipes.length}</strong> recipes saved</li><li><strong>${recipes.filter(r => r.minutes <= 30).length}</strong> ready in 30 minutes or less</li><li><strong>${new Set(recipes.map(r => r.cuisine)).size}</strong> cuisines</li></ul>
  <p class="actions"><a class="btn" href="#add">Add a recipe</a><a class="btn alt" href="#recipes">Browse all recipes</a></p>
  <h2>Latest additions</h2><ul class="cards">${latest.map(card).join('')}</ul>`;
  bindOpen();
}

// ===== Task 4: Data-entry form =====
function add() {
  main.innerHTML = `<h1 tabindex="-1">Add a recipe</h1><p>Fields marked * are required. After saving, the form clears so you can add another straight away.</p>
  <form id="f" class="card" novalidate><div class="summary" hidden></div>
  ${field('title', 'Recipe name *', 'text', { attrs: 'maxlength="100" autocomplete="off"' })}
  <div class="field"><label for="cuisine">Cuisine *</label><select id="cuisine" aria-describedby="cuisine-err"><option value="">Choose a cuisine</option>${CUISINES.map(c => `<option>${c}</option>`).join('')}</select><span class="err" id="cuisine-err"></span></div>
  <fieldset><legend>Difficulty</legend>${['Easy', 'Medium', 'Hard'].map((d, i) => `<label class="inl"><input type="radio" name="difficulty" value="${d}" ${i ? '' : 'checked'}> ${d}</label>`).join('')}</fieldset>
  ${field('minutes', 'Total time in minutes *', 'number', { hint: 'Whole number from 1 to 600', attrs: 'min="1" max="600" inputmode="numeric"' })}
  <fieldset><legend>Dietary labels (optional)</legend>${DIETS.map(d => `<label class="inl"><input type="checkbox" name="diet" value="${d}"> ${d}</label>`).join('')}</fieldset>
  <div class="field"><label class="inl"><input type="checkbox" id="needsRest" aria-controls="restBox"> Needs marinating or resting time</label></div>
  <div id="restBox" hidden>${field('rest', 'Resting time in minutes *', 'number', { attrs: 'min="1" max="600"' })}</div>
  <div class="field"><label for="image">Dish picture</label><select id="image">${Object.entries(IMAGES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
  <img id="pv" src="img/koshari.svg" alt="Preview of the Koshari picture" width="400" height="300">
  ${field('ingredients', 'Ingredients *', 'textarea', { hint: 'One ingredient per line' })}
  ${field('method', 'Method *', 'textarea', { hint: 'One step per line', rows: 6 })}
  <button class="btn" type="submit">Save recipe</button></form>`;
  const f = $('#f');
  $('#needsRest').onchange = e => { $('#restBox').hidden = !e.target.checked; };            // dynamic section
  $('#image').onchange = e => { $('#pv').src = `img/${e.target.value}.svg`; $('#pv').alt = `Preview of the ${IMAGES[e.target.value]} picture`; };
  f.onsubmit = async e => {
    e.preventDefault();
    const v = id => f.querySelector('#' + id).value.trim(), errs = [];
    const mins = id => /^\d+$/.test(v(id)) && +v(id) >= 1 && +v(id) <= 600;
    if (!v('title')) errs.push({ id: 'title', msg: 'Enter a recipe name' });
    if (!v('cuisine')) errs.push({ id: 'cuisine', msg: 'Choose a cuisine' });
    if (!mins('minutes')) errs.push({ id: 'minutes', msg: 'Enter total time as a whole number from 1 to 600' });
    if ($('#needsRest').checked && !mins('rest')) errs.push({ id: 'rest', msg: 'Enter resting time as a whole number from 1 to 600' });
    if (!v('ingredients')) errs.push({ id: 'ingredients', msg: 'Enter at least one ingredient' });
    if (!v('method')) errs.push({ id: 'method', msg: 'Enter at least one method step' });
    if (!showErrors(f, errs)) return;
    busy(f, true, 'Saving recipe…');
    try {
      await api('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        title: v('title'), cuisine: v('cuisine'), difficulty: f.difficulty.value, minutes: v('minutes'), image: v('image'),
        diet: [...f.querySelectorAll('[name=diet]:checked')].map(c => c.value), rest: $('#needsRest').checked ? v('rest') : 0,
        ingredients: v('ingredients'), method: v('method') }) });
      const t = v('title'); busy(f, false); f.reset(); $('#restBox').hidden = true; $('#pv').src = 'img/koshari.svg';
      say(`Recipe "${t}" saved. The form is ready for the next recipe.`); $('#title').focus();
    } catch { busy(f, false); showErrors(f, [{ id: 'title', msg: 'Could not save the recipe. Check your connection and try again' }]); }
  };
}

// ===== Task 4: Sortable / filterable table =====
async function recipesView() {
  if (!await load()) return;
  page = 1;
  main.innerHTML = `<h1 tabindex="-1">All recipes</h1>
  <form class="filters card" role="search" aria-label="Filter recipes" id="flt">
    <div class="field"><label for="q">Search by title or ingredient</label><input id="q" type="search" autocomplete="off"></div>
    <div class="field"><label for="c">Cuisine</label><select id="c"><option value="">All cuisines</option>${CUISINES.map(c => `<option>${c}</option>`).join('')}</select></div>
    <div class="field"><label for="s">Sort by</label><select id="s"><option value="title">Title (A to Z)</option><option value="minutes">Time (shortest first)</option><option value="new">Newest first</option></select></div>
  </form>
  <p id="count" aria-live="polite"></p>
  <div class="scroll" role="region" aria-label="Recipes table, scrollable" tabindex="0"><table><caption class="sr">Recipes</caption>
  <thead><tr><th scope="col">Picture</th><th scope="col">Recipe</th><th scope="col">Cuisine</th><th scope="col">Time</th><th scope="col">Difficulty</th><th scope="col">Actions</th></tr></thead><tbody id="tb"></tbody></table></div>
  <div class="pager"><button class="btn small" id="prev" type="button">Previous</button><span id="pgi"></span><button class="btn small" id="next" type="button">Next</button></div>`;
  const q = $('#q'), c = $('#c'), s = $('#s');
  function draw() {
    const term = q.value.trim().toLowerCase();
    let rows = recipes.filter(r => (!c.value || r.cuisine === c.value) && (!term || (r.title + ' ' + r.ingredients).toLowerCase().includes(term)));
    rows.sort((a, b) => s.value === 'minutes' ? a.minutes - b.minutes : s.value === 'new' ? b.id - a.id : a.title.localeCompare(b.title));
    const pages = Math.max(1, Math.ceil(rows.length / PAGE)); page = Math.min(page, pages);
    const vis = rows.slice((page - 1) * PAGE, page * PAGE);
    $('#count').textContent = rows.length ? `Showing ${(page - 1) * PAGE + 1} to ${(page - 1) * PAGE + vis.length} of ${rows.length} recipes${rows.length < recipes.length ? ` (filtered from ${recipes.length})` : ''}` : 'No recipes shown';
    $('#tb').innerHTML = vis.length ? vis.map(r => `<tr><td>${img(r, 'tiny')}</td><th scope="row">${esc(r.title)}</th><td>${esc(r.cuisine)}</td><td>${r.minutes} min</td><td>${esc(r.difficulty)}</td>
      <td><button class="btn small" type="button" data-open="${r.id}">View <span class="sr">${esc(r.title)}</span></button> <button class="btn small danger" type="button" data-del="${r.id}">Delete <span class="sr">${esc(r.title)}</span></button></td></tr>`).join('')
      : `<tr><td colspan="6"><strong>No recipes match your search.</strong> Try different words or <button class="btn small alt" type="button" id="clr">clear the filters</button>.</td></tr>`;
    const fa = document.activeElement;
    $('#prev').disabled = page <= 1; $('#next').disabled = page >= pages; $('#pgi').textContent = `Page ${page} of ${pages}`;
    if (fa && fa.disabled) (fa.id === 'prev' ? $('#next') : $('#prev')).focus();
    bindOpen();
    $('#tb').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      const r = recipes.find(x => x.id === +b.dataset.del);
      if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
      try { await api('/api/recipes/' + r.id, { method: 'DELETE' }); recipes = recipes.filter(x => x.id !== r.id); say(`"${r.title}" deleted`); draw(); q.focus(); }
      catch { say('Could not delete the recipe. Try again.'); }
    });
    const clr = $('#clr'); if (clr) clr.onclick = () => { q.value = ''; c.value = ''; draw(); q.focus(); };
  }
  $('#flt').onsubmit = e => e.preventDefault();
  [q, c, s].forEach(el => el.oninput = () => { page = 1; draw(); });
  $('#prev').onclick = () => { page--; draw(); }; $('#next').onclick = () => { page++; draw(); };
  draw();
}

// ===== Router =====
const views = { signin, dashboard, recipes: recipesView, add };
async function route() {
  const h = location.hash.slice(1) || 'dashboard';
  if (!user() && h !== 'signin') { location.hash = 'signin'; return; }
  if (user() && h === 'signin') { location.hash = 'dashboard'; return; }
  $('#nav').hidden = !user();
  document.querySelectorAll('#nav a').forEach(a => a.getAttribute('href') === '#' + h ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  await (views[h] || dashboard)();
  const h1 = $('h1', main); document.title = h1.textContent + ' – Taste Ledger'; h1.focus();
}
$('#out').onclick = () => { sessionStorage.clear(); location.hash = 'signin'; say('You have signed out'); };
window.addEventListener('hashchange', route);
route();
