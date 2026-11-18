'use strict';
const grid = $('#grid'), cards = {}, searchQ = {};
let editing = false;

function makeCard(id) {
  const w = W[id], el = document.createElement('section');
  el.className = 'card'; el.dataset.id = id; el.style.setProperty('--accent', w.accent); el.setAttribute('aria-label', w.title);
  el.innerHTML = `<header class="card-h"><span class="grip" aria-hidden="true">${icon('grip')}</span><span class="card-ic">${icon(w.icon)}</span><h3>${esc(w.title)}</h3><span class="badge" data-badge hidden></span><span class="spacer"></span>${w.expand ? `<button class="icon-btn" data-expand aria-label="Open ${esc(w.title)} full screen">${icon('expand')}</button>` : ''}${w.add ? `<button class="icon-btn add" data-add aria-label="Add to ${esc(w.title)}" aria-expanded="false">${icon('plus')}</button>` : ''}<button class="icon-btn hide" data-hide aria-label="Hide ${esc(w.title)}">${icon('x')}</button></header><div class="addslot"></div>${w.search ? `<div class="tools" hidden><input type="search" placeholder="Search ${esc(w.title.toLowerCase())}" aria-label="Search ${esc(w.title)}"></div>` : ''}<div class="body"></div><span class="resize" aria-hidden="true"></span>`;
  el.addEventListener('click', ev => {
    if (editing) {
      if (ev.target.closest('[data-hide]')) hideWidget(id);
      return;
    }
    if (ev.target.closest('[data-add]')) return openAdd(id);
    if (w.expand && (ev.target.closest('[data-expand]') || (ev.target.closest('.card-h') && !ev.target.closest('button')))) return w.expand();
    const pb = ev.target.closest('.pin-btn');
    if (pb && el.contains(pb)) { const prow = pb.closest('[data-id]'); if (prow && prow !== el) togglePin(id, prow.dataset.id); return; }
    const a = ev.target.closest('[data-act]'); if (!a || !el.contains(a)) return;
    if (a.dataset.act === 'edit' && ev.target.closest('a')) return;
    const row = a.closest('[data-id]'); const fn = w.act && w.act[a.dataset.act];
    if (fn) fn({ el: a, id: row && row !== el ? row.dataset.id : undefined, ev, card: el });
  });
  if (w.onSubmit) el.addEventListener('submit', ev => { const f = ev.target.closest('[data-wxsearch],[data-cform]'); if (f) { ev.preventDefault(); w.onSubmit(f); } });
  if (w.search) $('.tools input', el).addEventListener('input', e => { searchQ[id] = e.target.value; const b = $('.body', el); b.innerHTML = w.render(); decorate(id); });
  return el;
}

function renderWidget(id) {
  const card = cards[id]; if (!card) return;
  const w = W[id], body = $('.body', card), st = body.scrollTop;
  body.innerHTML = w.render(); decorate(id); body.scrollTop = st;
  const n = w.count ? w.count() : 0, b = $('[data-badge]', card); b.textContent = n || ''; b.hidden = !n;
  if (w.search) $('.tools', card).hidden = !w.alwaysSearch && data.recipes.length < 6;
  if (curPhone) queueTabbar();
}
/* ================= pin + reorder (all list cards) ================= */
const PINNABLE = ['todo', 'shop', 'notes', 'events', 'recipes', 'watch', 'chores', 'bills', 'links'];
function decorate(wid) {
  if (!PINNABLE.includes(wid) || !cards[wid]) return;
  const pins = new Set((data.pins && data.pins[wid]) || []), ord = (data.order && data.order[wid]) || [];
  const rank = id => { const i = ord.indexOf(id); return i < 0 ? 1e9 : i; };
  $$('.body ul, .body .chips', cards[wid]).forEach(c => {
    const items = Array.from(c.children).filter(x => x.dataset && x.dataset.id);
    if (!items.length) return;
    items.map((el, i) => ({ el, i })).sort((a, b) => (pins.has(a.el.dataset.id) ? 0 : 1) - (pins.has(b.el.dataset.id) ? 0 : 1) || rank(a.el.dataset.id) - rank(b.el.dataset.id) || a.i - b.i).forEach(o => c.appendChild(o.el));
    items.forEach(el => {
      const on = pins.has(el.dataset.id);
      el.classList.toggle('pinned', on); el.classList.add('pinnable');
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pin-btn'; btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Unpin' : 'Pin to top'); btn.innerHTML = icon('pin');
      const hand = document.createElement('span'); hand.className = 'grab-hand'; hand.setAttribute('aria-hidden', 'true'); hand.innerHTML = icon('hand');
      const ref = el.classList.contains('note') ? $('.note-foot', el).firstChild : ($(':scope > .row-main', el) || el.firstChild);
      ref.parentNode.insertBefore(hand, ref); ref.parentNode.insertBefore(btn, hand);
    });
  });
}
function togglePin(wid, id) {
  data.pins = data.pins || {}; const a = data.pins[wid] = data.pins[wid] || [], i = a.indexOf(id);
  if (i < 0) a.push(id); else a.splice(i, 1);
  save(); renderWidget(wid); toast(i < 0 ? 'Pinned to the top' : 'Unpinned');
}
function commitOrder(wid, before, after) {
  data.order = data.order || {}; const full = (data.order[wid] || []).slice();
  before.forEach(id => { if (!full.includes(id)) full.push(id); });
  const slots = before.map(id => full.indexOf(id)).sort((a, b) => a - b);
  after.forEach((id, i) => { full[slots[i]] = id; });
  data.order[wid] = full; save();
}
let lp = null, justDragged = false;
const idsIn = c => Array.from(c.children).filter(x => x.classList.contains('pinnable')).map(x => x.dataset.id);
document.addEventListener('pointerdown', e => {
  if (editing || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const row = e.target.closest('.pinnable'); if (!row) return;
  if (e.target.closest('button, input, textarea, select, .del, .chk')) return;
  if (e.target.closest('a') && !row.classList.contains('chip-wrap')) return;
  const card = row.closest('.card'); if (!card) return;
  lp = { row, card, wid: card.dataset.id, x: e.clientX, y: e.clientY, active: false };
  lp.timer = setTimeout(() => {
    if (!lp) return; lp.active = true; lp.before = idsIn(row.parentNode);
    row.classList.add('lifting'); if (navigator.vibrate) navigator.vibrate(25);
  }, device.touch ? 500 : 1000);
});
document.addEventListener('pointermove', e => {
  if (!lp) return;
  if (!lp.active) { if (Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) { clearTimeout(lp.timer); lp = null; } return; }
  const row = lp.row, b = $('.body', lp.card), r = b.getBoundingClientRect();
  if (e.clientY < r.top + 36) b.scrollTop -= 10; else if (e.clientY > r.bottom - 36) b.scrollTop += 10;
  const t = document.elementFromPoint(e.clientX, e.clientY), over = t && t.closest('.pinnable');
  if (over && over !== row && over.parentNode === row.parentNode) {
    const kids = Array.from(row.parentNode.children);
    if (kids.indexOf(over) < kids.indexOf(row)) over.before(row); else over.after(row);
  }
});
const endPress = () => {
  if (!lp) return; clearTimeout(lp.timer); const s0 = lp; lp = null;
  if (!s0.active) return;
  s0.row.classList.remove('lifting'); justDragged = true; setTimeout(() => { justDragged = false; }, 60);
  const after = idsIn(s0.row.parentNode);
  if (after.join() !== s0.before.join()) commitOrder(s0.wid, s0.before, after);
  renderWidget(s0.wid);
};
document.addEventListener('pointerup', endPress);
document.addEventListener('pointercancel', endPress);
document.addEventListener('touchmove', e => { if (lp && lp.active && e.cancelable) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (lp && e.target.closest('.pinnable')) e.preventDefault(); });
document.addEventListener('click', e => { if (justDragged || swBlock) { e.stopPropagation(); e.preventDefault(); } }, true);

function touched(...ids) { save(); if (ids.includes('events') && !ids.includes('calendar')) ids.push('calendar'); ids.forEach(renderWidget); renderKpis(); fillDatalist(); renderTagBar(); if (fullOpen) renderFull(); }
function fillDatalist() { const et = $('#eventTags'); if (et) et.innerHTML = allTags().map(t => `<option value="${esc(t)}">`).join(''); $('#recipeTitles').innerHTML = allRecipes().map(r => `<option value="${esc(r.title)}">`).join(''); }

/* ---- quick-add rows inside cards ---- */
function buildForm(id) {
  const spec = W[id].add, f = document.createElement('form'); f.className = 'addrow'; f.dataset.wid = id; f.autocomplete = 'off'; f.noValidate = true;
  f.innerHTML = spec.fields.map(fl => {
    const attrs = `name="${fl.k}" ${fl.attrs || ''}`;
    if (fl.type === 'textarea') return `<textarea ${attrs} rows="1" placeholder="${esc(fl.ph || '')}" aria-label="${esc(fl.ph || '')}"></textarea>`;
    if (fl.type === 'select') return `<select ${attrs} aria-label="How often">${fl.options.map(([v, l]) => `<option value="${v}"${v === fl.val ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    if (fl.lbl) return `<label class="fl"><span>${esc(fl.lbl)}</span><input ${attrs} type="${fl.type || 'text'}" aria-label="${esc(fl.lbl)}"></label>`;
    return `<input ${attrs} type="${fl.type || 'text'}" placeholder="${esc(fl.ph || '')}" aria-label="${esc(fl.ph || fl.k)}">`;
  }).join('') + `<button class="go" type="submit" aria-label="Add">${icon('plus')}</button>`;
  const first = $('[name]', f), prim = $(`[name="${spec.primary || spec.fields[0].k}"]`, f);
  const grow = t => { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; };
  f.addEventListener('input', e => { if (e.target.tagName === 'TEXTAREA') grow(e.target); });
  f.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAdd(id); }
    else if (e.key === 'Enter' && e.target.tagName === 'TEXTAREA' && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); }
  });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const vals = Object.fromEntries(new FormData(f)); const key = spec.primary || spec.fields[0].k;
    if (!String(vals[key] || '').trim()) { prim.focus(); return; }
    if (spec.submit(vals) === false) return;
    $$('input:not([type=date]):not([type=time]), textarea', f).forEach(x => { x.value = ''; if (x.tagName === 'TEXTAREA') x.style.height = 'auto'; });
    const en = $('[name=end]', f); if (en) en.value = '';
    first.focus(); if (navigator.vibrate) navigator.vibrate(8);
  });
  return f;
}
function openAdd(id) {
  const w = W[id]; if (w.add.modal) return w.add.modal();
  const card = cards[id], slot = $('.addslot', card), btn = $('[data-add]', card);
  if (!slot.firstChild) slot.appendChild(buildForm(id));
  const form = slot.firstChild;
  if (!form.hidden && btn.getAttribute('aria-expanded') === 'true') return closeAdd(id);
  form.hidden = false; btn.setAttribute('aria-expanded', 'true');
  w.add.fields.forEach(fl => { if (fl.def) { const i = $(`[name="${fl.k}"]`, form); if (!i.value) i.value = fl.def(); } });
  $('[name]', form).focus();
}
function closeAdd(id) { const card = cards[id]; if (!card) return; const slot = $('.addslot', card), btn = $('[data-add]', card); if (slot.firstChild) slot.firstChild.hidden = true; if (btn) btn.setAttribute('aria-expanded', 'false'); }

/* Fluid grid: the column count follows the actual width (not just 3 fixed sizes) and each card keeps its share of the row. */
let gridN = 0;
function colsFor() {
  const w = grid.clientWidth || window.innerWidth, b = bp();
  return b === 'mobile' ? (w < 520 ? 2 : 4) : b === 'tablet' ? (w < 880 ? 6 : 8) : (w < 1500 ? 12 : 16);
}
const spanFor = c => { const b = bp(); return clamp(Math.round(c * gridN / COLS[b]), 1, gridN); };
function applySize(card, it) {
  const f = gridN / COLS[bp()], x0 = Math.round((it.x - 1) * f) + 1, x1 = Math.max(x0 + 1, Math.round((it.x - 1 + it.c) * f) + 1);
  card.style.gridColumn = `${x0} / ${Math.min(x1, gridN + 1)}`; card.style.gridRow = `${it.y} / span ${it.r}`;
}
function fitGrid() {
  const n = colsFor(); if (n === gridN) return;
  gridN = n; grid.style.setProperty('--n', n);
  const L = layout(); Object.keys(cards).forEach(id => { if (L.items[id]) applySize(cards[id], L.items[id]); });
}
new ResizeObserver(fitGrid).observe(grid);
function buildGrid() {
  if (!gridN) { gridN = colsFor(); grid.style.setProperty('--n', gridN); }
  const L = layout(); applyColors(); grid.innerHTML = ''; Object.keys(cards).forEach(k => delete cards[k]);
  [...L.order].sort((a, b) => (L.items[a].y - L.items[b].y) || (L.items[a].x - L.items[b].x)).forEach(id => { const c = makeCard(id); cards[id] = c; applySize(c, L.items[id]); grid.appendChild(c); renderWidget(id); });
  renderTray(); applyPhone();
}
/* ================= dynamic colors: cards that touch never share a color ================= */
const COLORS = { teal: '#2fb8a6', amber: '#e8a23a', purple: '#8b7cf0', blue: '#3b9ae8', rose: '#e5677f', orange: '#e9803f', green: '#2fa56e', magenta: '#d46bb0', cyan: '#4fb3c8', lime: '#8fb83a', slate: '#7a8aa8' };
const FAMS = Object.keys(COLORS);
const FAM = { todo: 'teal', shop: 'amber', notes: 'purple', events: 'blue', calendar: 'lime', news: 'slate', weather: 'cyan', recipes: 'rose', watch: 'magenta', meals: 'purple', bills: 'green', chores: 'orange', links: 'magenta' };
const touching = (a, b) => a.x <= b.x + b.c && b.x <= a.x + a.c && a.y <= b.y + b.r && b.y <= a.y + a.r;
function applyColors() {
  const L = layout(), ids = [...L.order].sort((a, b) => (L.items[a].y - L.items[b].y) || (L.items[a].x - L.items[b].x)), got = {}, use = {};
  ids.forEach(id => {
    const it = L.items[id], nb = ids.filter(o => got[o] && touching(it, L.items[o])).map(o => got[o]);
    const mine = FAM[id] || null, prefs = [...(mine ? [mine] : []), ...FAMS.filter(f => f !== mine).sort((a, b) => (use[a] || 0) - (use[b] || 0))];
    const pick = prefs.find(f => !nb.includes(f)) || prefs[0]; got[id] = pick; use[pick] = (use[pick] || 0) + 1;
  });
  let changed = false;
  Object.keys(W).forEach(id => {
    const col = COLORS[got[id] || FAM[id]]; if (!col || W[id].accent === col) return;
    W[id].accent = col; changed = true; if (cards[id]) cards[id].style.setProperty('--accent', col);
  });
  if (changed && typeof renderKpis === 'function') renderKpis();
}
function renderAll() { renderHeader(); buildGrid(); renderKpis(); fillDatalist(); renderTagBar(); loadWeather(); }

function renderHeader() {
  const h = new Date().getHours(), g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  $('#hello').textContent = data.settings.name ? `${g}, ${data.settings.name}` : g;
  $('#today').textContent = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/* ================= customize mode ================= */
function setEditing(on) {
  editing = on; document.body.classList.toggle('editing', on);
  $('#editTray').hidden = !on; $('#btnEdit').classList.toggle('on', on); $('#btnEdit').setAttribute('aria-pressed', String(on));
  if (on) { sheet.open && sheet.close(); Object.keys(cards).forEach(closeAdd); renderTray(); $('#editTray').scrollIntoView({ block: 'nearest' }); }
}
function renderTray() {
  const L = layout(); const hid = L.hidden.filter(id => W[id]);
  $('#hiddenChips').innerHTML = hid.map(id => `<button class="chip-btn" data-show="${id}">${icon('plus')} ${esc(W[id].title)}</button>`).join('');
}
const isCardHidden = id => { const L = layout(); return L.hidden.includes(id); };
function setCardHidden(id, hide) {
  Object.keys(COLS).forEach(b => {
    const L = (data.layout[b] = data.layout[b] || { order: [], items: {}, hidden: [] }); L.hidden = L.hidden || []; L.order = L.order || [];
    if (hide) { if (!L.hidden.includes(id)) L.hidden.push(id); L.order = L.order.filter(x => x !== id); }
    else { L.hidden = L.hidden.filter(x => x !== id); if (!L.order.includes(id)) L.order.push(id); }
  });
  save(); buildGrid(); renderKpis(); if (editing) renderTray();
}
function applyTop() { $('#kpis').hidden = $('#kpiTiles').hidden = !!data.settings.hideTop; }
function hideWidget(id) { const L = layout(); L.hidden.push(id); L.order = L.order.filter(x => x !== id); save(); cards[id].remove(); delete cards[id]; renderTray(); }
$('#hiddenChips').addEventListener('click', e => {
  const b = e.target.closest('[data-show]'); if (!b) return; const L = layout(), id = b.dataset.show;
  L.hidden = L.hidden.filter(x => x !== id); L.order.push(id); save(); buildGrid(); renderKpis(); cards[id] && cards[id].scrollIntoView({ block: 'center' });
});
$('#btnReset').addEventListener('click', () => { if (!confirm('Put all cards back in their original size and order?')) return; data.layout[bp()] = null; delete data.layout[bp()]; save(); buildGrid(); });
$('#btnDone').addEventListener('click', () => setEditing(false));
$('#btnEdit').addEventListener('click', () => curPhone ? openPhoneArrange() : setEditing(!editing));

let edgeY = null, raf = 0;
function edgeScroll(y) { edgeY = y; if (!raf) raf = requestAnimationFrame(tick); }
function tick() { raf = 0; if (edgeY == null) return; const m = 80, h = innerHeight; let d = 0; if (edgeY < m) d = -(m - edgeY) / 4; else if (edgeY > h - m) d = (edgeY - (h - m)) / 4; if (d) { scrollBy(0, d); raf = requestAnimationFrame(tick); } }
const stopEdgeScroll = () => { edgeY = null; };

grid.addEventListener('pointerdown', e => {
  if (!editing || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const card = e.target.closest('.card'); if (!card) return;
  if (e.target.closest('.resize')) return startResize(e, card);
  if (e.target.closest('.card-h') && !e.target.closest('button')) startDrag(e, card);
});
function startResize(e, card) {
  e.preventDefault(); const id = card.dataset.id, L = layout(), it = L.items[id], b = bp(), cols = COLS[b];
  const cs = getComputedStyle(grid), gap = parseFloat(cs.columnGap) || 14, rowH = parseFloat(cs.gridAutoRows) || 32, rowGap = parseFloat(cs.rowGap) || 14;
  const step = (grid.clientWidth + gap) / cols, sx = e.clientX, sy = e.clientY, sc = it.c, sr = it.r, t = e.target;
  card.classList.add('resizing'); t.setPointerCapture(e.pointerId);
  const move = ev => {
    edgeScroll(ev.clientY);
    const c = clamp(Math.round(sc + (ev.clientX - sx) / step), MINC[b], cols), r = clamp(Math.round(sr + (ev.clientY - sy) / (rowH + rowGap)), MINR, 40);
    const others = L.order.filter(x => x !== id).map(x => L.items[x]);
    if ((c !== it.c || r !== it.r) && it.x + c - 1 <= cols && !others.some(o => cellsHit({ x: it.x, y: it.y, c, r }, o))) { it.c = c; it.r = r; applySize(card, it); applyColors(); }
  };
  const up = () => { t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', up); t.removeEventListener('pointercancel', up); card.classList.remove('resizing'); stopEdgeScroll(); save(); };
  t.addEventListener('pointermove', move); t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
}
function startDrag(e, card) {
  e.preventDefault(); const id = card.dataset.id, L = layout(), it = L.items[id], b = bp(), cols = COLS[b], hd = $('.card-h', card);
  const cs = getComputedStyle(grid), gap = parseFloat(cs.columnGap) || 14, rowH = parseFloat(cs.gridAutoRows) || 32, rowGap = parseFloat(cs.rowGap) || 14;
  const stepX = (grid.clientWidth + gap) / cols, stepY = rowH + rowGap;
  const gr = grid.getBoundingClientRect(), cr = card.getBoundingClientRect(), offX = e.clientX - cr.left, offY = e.clientY - cr.top;
  card.classList.add('dragging'); hd.setPointerCapture(e.pointerId);
  const others = () => L.order.filter(x => x !== id).map(x => L.items[x]);
  const move = ev => {
    edgeScroll(ev.clientY);
    const g = grid.getBoundingClientRect();
    const x = clamp(Math.round((ev.clientX - offX - g.left) / stepX) + 1, 1, cols - it.c + 1), y = Math.max(1, Math.round((ev.clientY - offY - g.top) / stepY) + 1);
    if ((x !== it.x || y !== it.y) && !others().some(o => cellsHit({ x, y, c: it.c, r: it.r }, o))) { it.x = x; it.y = y; applySize(card, it); applyColors(); }
  };
  const up = () => { hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up); card.classList.remove('dragging'); stopEdgeScroll(); save(); };
  hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
}
const onBp = () => { gridN = 0; applyDevice(); buildGrid(); fitGrid(); renderKpis(); };
mqMobile.addEventListener('change', onBp); mqTablet.addEventListener('change', onBp);
