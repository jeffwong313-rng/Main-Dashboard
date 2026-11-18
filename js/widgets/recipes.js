'use strict';
/* ---- recipe feed: the Google Sheet (live when shared, else the bundled snapshot) ---- */
const SHEET_ID = '1KyZI6fsmlOAoA-KaYU_zegpnRlZvO2WpHQj9aAr-lnk';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=1004`;
const FEED_KEY = 'hd.v1.feed';
let feed = { recipes: [], src: 'none' }, recCat = 'All';
const slug = t => 's-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function parseCsv(txt) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const h = (rows.shift() || []).map(x => x.trim());
  return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(h.map((k, i) => [k, (r[i] || '').trim()])));
}
function parseQty(v) {
  const t = String(v ?? '').trim(); if (!t) return null;
  let tot = 0;
  for (const part of t.split(/\s+/)) {
    const m = part.match(/^(\d+)\/(\d+)$/);
    if (m) tot += +m[1] / +m[2]; else if (!isNaN(+part)) tot += +part; else return null;
  }
  return tot || null;
}
function fmtQty(n) {
  if (n == null) return '';
  const whole = Math.floor(n + 1e-9), f = n - whole;
  if (f < 0.02) return String(whole);
  for (const [d, label] of [[1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [3 / 8, '3/8'], [1 / 2, '1/2'], [5 / 8, '5/8'], [2 / 3, '2/3'], [3 / 4, '3/4'], [7 / 8, '7/8']])
    if (Math.abs(f - d) < 0.02) return (whole ? whole + ' ' : '') + label;
  if (f > 0.98) return String(whole + 1);
  return String(Math.round(n * 100) / 100);
}
const PLURAL = { cup: 'cups', clove: 'cloves', can: 'cans', stick: 'sticks', pinch: 'pinches', dash: 'dashes', inch: 'inches', pack: 'packs', box: 'boxes', flower: 'flowers' };
function ingText(i, mult, note = true) {
  const q = i.qty == null ? null : i.qty * mult, plural = q != null && q > 1.02;
  const unit = i.unit === 'to taste' ? '' : (plural && PLURAL[i.unit]) || i.unit;
  const head = [q == null ? '' : fmtQty(q), unit, i.item].filter(Boolean).join(' ');
  return head + (i.unit === 'to taste' ? ', to taste' : '') + (note && i.note ? ', ' + i.note : '');
}
function buildFeed(raw) {
  const by = (rows, key) => { const m = {}; rows.forEach(r => (m[r.Recipe] = m[r.Recipe] || []).push(r)); return m; };
  const ings = by(raw.Ingredients), steps = by(raw.Steps);
  return raw.Recipes.filter(r => r.Recipe).map(r => {
    const prep = +r['Prep (min)'] || 0, cook = +r['Cook (min)'] || 0;
    return {
      id: slug(r.Recipe), title: r.Recipe, category: r.Category || '', cuisine: r.Cuisine || '', servings: r.Servings || '',
      prep, cook, total: prep + cook, scale: parseQty(r.Scale) || 1, equipment: r.Equipment || '', tags: r.Tags || '', source: r.Source || '', notes: r.Notes || '',
      ing: (ings[r.Recipe] || []).map(i => ({ group: i.Group || 'Other', qty: parseQty(i.Qty), unit: i.Unit || '', item: i.Item, note: i['Prep or note'] || '' })),
      steps: (steps[r.Recipe] || []).map(x => ({ phase: x.Phase === 'Prep' ? 'Prep' : 'Cook', text: x.Instruction }))
    };
  });
}
function setFeed(recipes, src) {
  if (!recipes.length) return;
  feed = { recipes, src };
  try { localStorage.setItem(FEED_KEY, JSON.stringify(recipes)); } catch { }
  if (cards.recipes) renderWidget('recipes');
  fillDatalist();
}
async function loadFeed() {
  try { const c = JSON.parse(localStorage.getItem(FEED_KEY) || 'null'); if (Array.isArray(c) && c.length) feed = { recipes: c, src: 'cache' }; } catch { }
  if (cards.recipes) renderWidget('recipes'); fillDatalist();
  try {
    const r = await fetch('recipes.json', { cache: 'no-cache' }); if (r.ok) setFeed(buildFeed(await r.json()), 'snapshot');
  } catch { }
  try { // live read of the Sheet: works only if the Sheet is shared as "anyone with the link can view"
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
    const get = async tab => { const r = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`, { signal: ctl.signal, credentials: 'omit' }); if (!r.ok) throw 0; const x = await r.text(); if (/^\s*</.test(x)) throw 0; return parseCsv(x); };
    const [Recipes, Ingredients, Steps] = await Promise.all([get('Recipes'), get('Ingredients'), get('Steps')]); clearTimeout(t);
    const rec = buildFeed({ Recipes, Ingredients: Ingredients.filter(i => i.Recipe), Steps: Steps.filter(i => i.Recipe) });
    if (rec.length) setFeed(rec, 'live');
  } catch { }
}
const allRecipes = () => [...feed.recipes, ...data.recipes.map(r => ({ id: r.id, title: r.title, local: true, category: 'My recipes', ing: r.ing, tags: '', cuisine: '' }))];
const metaLine = r => r.local ? `${r.ing.length} ingredient${r.ing.length === 1 ? '' : 's'}` : [r.category, r.cuisine, r.total ? r.total + ' min' : ''].filter(Boolean).join(' · ');
const recMatch = (r, q) => !q || [r.title, r.category, r.cuisine, r.tags].join(' ').toLowerCase().includes(q) || (r.local ? r.ing : r.ing.map(i => i.item)).some(i => i.toLowerCase().includes(q));

W.recipes = {
  title: 'Recipes', icon: 'book', accent: '#e5677f', search: true, alwaysSearch: true,
  add: { modal: () => openRecipeEditor() },
  count: () => allRecipes().length,
  render() {
    const all = allRecipes();
    if (!all.length) return empty('No recipes yet', 'Tap + to save one. You can send its ingredients to Shopping.');
    const cats = ['All', ...[...new Set(all.map(r => r.category).filter(Boolean))].sort()];
    if (!cats.includes(recCat)) recCat = 'All';
    const q = (searchQ.recipes || '').trim().toLowerCase();
    const list = all.filter(r => (recCat === 'All' || r.category === recCat) && recMatch(r, q)).sort((a, b) => a.title.localeCompare(b.title));
    const chips = `<div class="rchips" role="group" aria-label="Filter by category">${cats.map(c => `<button type="button" class="rchip${c === recCat ? ' on' : ''}" data-act="cat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
    if (!list.length) return chips + empty('No matches', 'Try a different word or category.');
    return chips + `<ul class="rows">${list.map(r => `<li class="row clickable" data-id="${esc(r.id)}" data-act="open"><div class="row-main"><span>${esc(r.title)}</span><small class="meta">${esc(metaLine(r))}</small></div><span style="color:var(--faint)">${icon('chevron')}</span></li>`).join('')}</ul>`;
  },
  act: {
    open: ({ id }) => openRecipe(id),
    cat: ({ el }) => { recCat = el.dataset.cat; renderWidget('recipes'); }
  }
};
