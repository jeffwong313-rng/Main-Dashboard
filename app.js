/* Home Dashboard — vanilla JS, no build step.
   Data lives in this browser's localStorage. Optional sync across devices via a private GitHub Gist (Settings). */
(() => {
'use strict';

/* ================= helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lines = (s, comma = false) => String(s).split(comma ? /[\n,]+/ : /\n+/).map(x => x.trim()).filter(Boolean);
const find = (arr, id) => arr.find(x => x.id === id);
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dstr(new Date());
const parseDate = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const daysFromToday = d => Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const money = n => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
const linkify = s => esc(s).replace(/https?:\/\/(?:(?!&quot;|&#39;|&lt;|&gt;)[^\s])+/g, u => {
  const clean = u.replace(/[.,;:!?)]+$/, ''); const tail = u.slice(clean.length);
  return `<a href="${clean}" target="_blank" rel="noopener noreferrer">${clean}</a>${tail}`;
});
const cleanUrl = v => {
  v = String(v || '').trim(); if (!v) return '';
  try { const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : 'https://' + v); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; }
};
function fmtTime(hhmm) { const [h, m] = hhmm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function fmtStamp(ms) {
  const d = new Date(ms), t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const diff = daysFromToday(d) * -1;
  if (diff === 0) return 'Today ' + t; if (diff === 1) return 'Yesterday ' + t;
  const o = { month: 'short', day: 'numeric' }; if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString([], o) + ', ' + t;
}
function fmtDay(str) {
  const d = parseDate(str), diff = daysFromToday(d);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ================= icons ================= */
const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  cloudsun: '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  cloudmoon: '<path d="M13 16a3 3 0 1 1 0 6H7a5 5 0 1 1 4.9-6Z"/><path d="M10.1 9A6 6 0 0 1 16 4a4.24 4.24 0 0 0 6 6 6 6 0 0 1-3 5.197"/>',
  rain: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>',
  storm: '<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>',
  snow: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/>',
  fog: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  utensils: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18"/><path d="M17 21V3c-2.5 1.5-4 4.5-4 8h4"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  dollar: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  cloud: '<path d="M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></g>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;
const hydrateIcons = (root = document) => $$('[data-icon]', root).forEach(el => { el.innerHTML = icon(el.dataset.icon) + el.innerHTML; el.removeAttribute('data-icon'); });

/* ================= state ================= */
const KEY = 'hd.v1.data', THEME_KEY = 'hd.v1.theme', SYNC_KEY = 'hd.v1.sync', WX_KEY = 'hd.v1.wx', QA_KEY = 'hd.v1.qaType';
const lsGet = (k, d = null) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };

const defaults = () => ({
  v: 1, updated: 0, todos: [], shop: [], notes: [], recipes: [], watch: [], events: [], meals: {}, chores: [], bills: [], links: [],
  layout: {}, pins: {}, order: {}, settings: { name: '', units: 'f', city: null }
});
function normalize(d) {
  const base = defaults(); const out = Object.assign(base, d || {});
  out.settings = Object.assign(defaults().settings, (d && d.settings) || {});
  out.layout = (d && d.layout) || {};
  ['todos', 'shop', 'notes', 'recipes', 'watch', 'events', 'chores', 'bills', 'links'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  if (!out.meals || typeof out.meals !== 'object') out.meals = {};
  ['pins', 'order'].forEach(k => { if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {}; });
  return out;
}
let data = (() => { try { const d = JSON.parse(lsGet(KEY)); if (d && d.v === 1) return normalize(d); } catch { } return defaults(); })();
// Drop events that ended more than 30 days ago so the list stays tidy.
data.events = data.events.filter(e => daysFromToday(parseDate(e.date)) >= -30);

function persist() { if (!lsSet(KEY, JSON.stringify(data))) toast('Could not save: browser storage is full or blocked'); }
function save() { data.updated = Date.now(); persist(); scheduleSync(); }

/* ================= layout ================= */
const ALL = ['todo', 'shop', 'notes', 'events', 'calendar', 'weather', 'recipes', 'watch', 'meals', 'bills', 'chores', 'links'];
const COLS = { desktop: 12, tablet: 6, mobile: 2 };
const MINC = { desktop: 3, tablet: 2, mobile: 1 };
const MINR = 4;
const DEF = {
  desktop: {
    order: ['todo', 'shop', 'notes', 'events', 'calendar', 'weather', 'recipes', 'watch', 'meals', 'bills', 'chores', 'links'],
    items: { todo: { c: 4, r: 9 }, shop: { c: 4, r: 9 }, notes: { c: 4, r: 9 }, events: { c: 4, r: 8 }, calendar: { c: 5, r: 11 }, weather: { c: 3, r: 8 }, recipes: { c: 5, r: 8 }, watch: { c: 4, r: 9 }, meals: { c: 6, r: 9 }, bills: { c: 3, r: 8 }, chores: { c: 3, r: 8 }, links: { c: 12, r: 4 } }
  },
  tablet: {
    order: ['todo', 'shop', 'notes', 'events', 'calendar', 'weather', 'recipes', 'watch', 'bills', 'meals', 'chores', 'links'],
    items: { todo: { c: 3, r: 9 }, shop: { c: 3, r: 9 }, notes: { c: 6, r: 6 }, events: { c: 3, r: 8 }, calendar: { c: 6, r: 11 }, weather: { c: 3, r: 8 }, recipes: { c: 3, r: 8 }, watch: { c: 3, r: 9 }, bills: { c: 3, r: 8 }, meals: { c: 6, r: 9 }, chores: { c: 3, r: 7 }, links: { c: 3, r: 7 } }
  },
  mobile: {
    order: ['todo', 'shop', 'notes', 'events', 'calendar', 'recipes', 'watch', 'meals', 'bills', 'chores', 'weather', 'links'],
    items: { todo: { c: 2, r: 8 }, shop: { c: 2, r: 8 }, notes: { c: 2, r: 8 }, events: { c: 2, r: 6 }, calendar: { c: 2, r: 12 }, recipes: { c: 2, r: 7 }, watch: { c: 2, r: 9 }, meals: { c: 2, r: 9 }, bills: { c: 2, r: 7 }, chores: { c: 2, r: 6 }, weather: { c: 2, r: 5 }, links: { c: 2, r: 4 } }
  }
};
const mqMobile = matchMedia('(max-width: 699px)'), mqTablet = matchMedia('(max-width: 1099px)');
const bp = () => mqMobile.matches ? 'mobile' : mqTablet.matches ? 'tablet' : 'desktop';
function layout() {
  const b = bp(), D = DEF[b];
  const L = (data.layout[b] = data.layout[b] || { order: [], items: {}, hidden: [] });
  L.hidden = L.hidden || []; L.items = L.items || {};
  if (!L.order || (!L.order.length && !L.hidden.length)) L.order = [...D.order];
  ALL.forEach(id => {
    if (!L.items[id]) L.items[id] = { ...D.items[id] };
    L.items[id].c = clamp(L.items[id].c, MINC[b], COLS[b]);
    if (!L.order.includes(id) && !L.hidden.includes(id)) L.order.push(id);
  });
  L.order = L.order.filter(id => W[id] && !L.hidden.includes(id));
  return L;
}

/* ================= toast / undo ================= */
let toastTimer;
function toast(msg, opts = {}) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>${opts.undo ? '<button type="button" data-undo>Undo</button>' : ''}`;
  t.classList.add('show');
  t.onclick = e => { if (e.target.closest('[data-undo]') && opts.undo) { opts.undo(); t.classList.remove('show'); } };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), opts.undo ? 6000 : 2600);
}
function undoable(label, fn, ...ids) {
  const snap = JSON.stringify(data);
  fn(); touched(...ids);
  toast(label, { undo: () => { data = normalize(JSON.parse(snap)); save(); renderAll(); } });
}
const remove = (key, id, wid) => undoable('Deleted', () => { data[key] = data[key].filter(x => x.id !== id); }, wid);

/* ================= sheet (dialog) ================= */
const sheet = $('#sheet');
function openSheet(html, { title = '', onOpen, cls = '', accent } = {}) {
  sheet.className = 'sheet ' + cls;
  sheet.innerHTML = `<div class="sheet-card"${accent ? ` style="--accent:${accent}"` : ''}><header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button></header><div class="sheet-body">${html}</div></div>`;
  if (!sheet.open) sheet.showModal();
  onOpen && onOpen($('.sheet-body', sheet));
}
sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.close(); });

/* ================= inline editing ================= */
function inlineEdit(span, { wid, onSave, multiline = false, allowEmpty = false, list = '', type = 'text' }) {
  const raw = span.dataset.raw != null ? span.dataset.raw : span.textContent;
  const inp = document.createElement(multiline ? 'textarea' : 'input');
  inp.className = 'inline-edit'; inp.value = raw;
  if (!multiline) { inp.type = type; if (list) inp.setAttribute('list', list); if (type === 'number') inp.step = '0.01'; } else inp.rows = clamp(raw.split('\n').length + 1, 3, 10);
  span.replaceWith(inp); inp.focus(); if (inp.select) inp.select();
  let finished = false;
  const finish = commit => {
    if (finished) return; finished = true;
    const v = inp.value.trim();
    if (commit && v !== raw && (v || allowEmpty)) onSave(v); else renderWidget(wid);
  };
  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); finish(true); }
  });
  inp.addEventListener('blur', () => finish(true));
}

/* ================= widgets ================= */
const W = {};
const empty = (t, s) => `<div class="empty"><strong>${esc(t)}</strong><span>${esc(s)}</span></div>`;
const delBtn = `<button class="icon-btn del" data-act="del" aria-label="Delete">${icon('x')}</button>`;

W.todo = {
  title: 'To-Do', icon: 'list', accent: '#2fb8a6',
  add: { fields: [{ k: 't', ph: 'Add a task', type: 'textarea' }], submit(v) { lines(v.t).forEach(t => data.todos.unshift({ id: uid(), t, done: false, created: Date.now() })); touched('todo'); } },
  count: () => data.todos.filter(t => !t.done).length,
  render() {
    if (!data.todos.length) return empty('Nothing to do', 'Tap + to add a task.');
    const open = data.todos.filter(t => !t.done), done = data.todos.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const row = t => `<li class="row${t.done ? ' is-done' : ''}" data-id="${t.id}"><button class="chk" data-act="toggle" aria-label="${t.done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button><div class="row-main"><span class="txt" data-act="edit">${esc(t.t)}</span><small class="meta">${fmtStamp(t.created)}</small></div>${delBtn}</li>`;
    return `<ul class="rows">${open.map(row).join('')}</ul>` + (done.length ? `<div class="sep"><span>Completed (${done.length})</span><button class="link" data-act="clearDone">Clear</button></div><ul class="rows">${done.slice(0, 40).map(row).join('')}</ul>` : '');
  },
  act: {
    toggle: ({ id }) => { const t = find(data.todos, id); t.done = !t.done; t.doneAt = t.done ? Date.now() : null; touched('todo'); },
    del: ({ id }) => remove('todos', id, 'todo'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'todo', onSave: v => { find(data.todos, id).t = v; touched('todo'); } }),
    clearDone: () => undoable('Cleared completed tasks', () => { data.todos = data.todos.filter(t => !t.done); }, 'todo')
  }
};

W.shop = {
  title: 'Shopping', icon: 'cart', accent: '#e8a23a',
  add: {
    fields: [{ k: 't', ph: 'Add items, separated by commas', type: 'textarea' }],
    submit(v) {
      let dup = 0;
      lines(v.t, true).forEach(t => {
        if (data.shop.some(x => !x.done && x.t.toLowerCase() === t.toLowerCase())) { dup++; return; }
        data.shop.unshift({ id: uid(), t, done: false, created: Date.now() });
      });
      touched('shop'); if (dup) toast(dup === 1 ? 'Already on the list' : `${dup} items were already on the list`);
    }
  },
  count: () => data.shop.filter(t => !t.done).length,
  render() {
    if (!data.shop.length) return empty('List is empty', 'Tap + and type items, like "milk, eggs, rice".');
    const open = data.shop.filter(t => !t.done), done = data.shop.filter(t => t.done);
    const row = t => `<li class="row${t.done ? ' is-done' : ''}" data-id="${t.id}"><button class="chk" data-act="toggle" aria-label="${t.done ? 'Put back on list' : 'Check off'}">${icon('check')}</button><div class="row-main"><span class="txt" data-act="edit">${esc(t.t)}</span></div>${delBtn}</li>`;
    return `<ul class="rows">${open.map(row).join('')}</ul>` + (done.length ? `<div class="sep"><span>In the cart (${done.length})</span><button class="link" data-act="clearDone">Clear</button></div><ul class="rows">${done.map(row).join('')}</ul>` : '');
  },
  act: {
    toggle: ({ id }) => { const t = find(data.shop, id); t.done = !t.done; touched('shop'); },
    del: ({ id }) => remove('shop', id, 'shop'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'shop', onSave: v => { find(data.shop, id).t = v; touched('shop'); } }),
    clearDone: () => undoable('Cleared checked items', () => { data.shop = data.shop.filter(t => !t.done); }, 'shop')
  }
};

const WTYPES = [['tv', 'TV shows'], ['movie', 'Movies'], ['special', 'Specials']];
let watchTab = 'all', watchShowDone = false;
W.watch = {
  title: 'Watch list', icon: 'film', accent: '#c25fd0',
  add: {
    fields: [{ k: 't', ph: 'Add a title' }, { k: 'type', type: 'select', options: [['tv', 'TV show'], ['movie', 'Movie'], ['special', 'Special']], val: 'tv' }],
    primary: 't',
    submit(v) {
      const t = v.t.trim(), type = ['tv', 'movie', 'special'].includes(v.type) ? v.type : 'tv';
      if (data.watch.some(x => !x.done && x.type === type && x.t.toLowerCase() === t.toLowerCase())) { toast('Already on the list'); return false; }
      data.watch.unshift({ id: uid(), t, type, done: false, created: Date.now() }); watchTab = type; touched('watch');
    }
  },
  count: () => data.watch.filter(x => !x.done).length,
  render() {
    const n = k => data.watch.filter(x => !x.done && (k === 'all' || x.type === k)).length, doneN = data.watch.filter(x => x.done).length;
    const tabs = [['all', 'All'], ...WTYPES].map(([k, l]) => `<button type="button" class="rchip${watchTab === k ? ' on' : ''}" data-act="wtab" data-k="${k}">${l} ${n(k)}</button>`).join('');
    const chips = `<div class="rchips" role="group" aria-label="Filter by type">${tabs}<button type="button" class="rchip${watchShowDone ? ' on' : ''}" data-act="wshow" aria-pressed="${watchShowDone}">Watched ${doneN}</button></div>`;
    const typeName = k => (WTYPES.find(x => x[0] === k) || [0, 'Other'])[1];
    const row = t => `<li class="row${t.done ? ' is-done' : ''}" data-id="${t.id}"><button class="chk" data-act="toggle" aria-label="${t.done ? 'Put back on the list' : 'Mark as watched'}">${icon('check')}</button><div class="row-main"><span class="txt" data-act="edit">${esc(t.t)}</span>${t.done ? `<small class="meta">${typeName(t.type).replace(/s$/, '')}${t.doneAt ? ' · watched ' + new Date(t.doneAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</small>` : ''}</div>${delBtn}</li>`;
    const open = data.watch.filter(x => !x.done && (watchTab === 'all' || x.type === watchTab));
    let html = '';
    if (watchTab === 'all') WTYPES.forEach(([k, l]) => { const g = open.filter(x => x.type === k); if (g.length) html += `<h4 class="grp">${l}</h4><ul class="rows">${g.map(row).join('')}</ul>`; });
    else html = open.length ? `<ul class="rows">${open.map(row).join('')}</ul>` : '';
    if (!open.length && !(watchShowDone && doneN)) html = empty(data.watch.some(x => !x.done) ? 'Nothing here' : 'Nothing to watch yet', data.watch.some(x => !x.done) ? 'Try another tab.' : 'Tap + to add a show, movie or special.');
    if (watchShowDone) {
      const done = data.watch.filter(x => x.done && (watchTab === 'all' || x.type === watchTab)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
      html += done.length ? `<div class="sep"><span>Watched (${done.length})</span></div><ul class="rows">${done.map(row).join('')}</ul>` : '';
    }
    return `<div class="wl">${chips}${html}</div>`;
  },
  act: {
    wtab: ({ el }) => { watchTab = el.dataset.k; renderWidget('watch'); },
    wshow: () => { watchShowDone = !watchShowDone; renderWidget('watch'); },
    toggle: ({ id }) => {
      const t = find(data.watch, id); t.done = !t.done; if (t.done) t.doneAt = Date.now(); else delete t.doneAt; touched('watch');
      if (t.done && !watchShowDone) toast('Marked as watched', { undo: () => { t.done = false; delete t.doneAt; touched('watch'); } });
    },
    del: ({ id }) => remove('watch', id, 'watch'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'watch', onSave: v => { find(data.watch, id).t = v; touched('watch'); } })
  }
};

W.notes = {
  title: 'Notes', icon: 'note', accent: '#8b7cf0',
  add: { fields: [{ k: 't', ph: 'Jot something down', type: 'textarea', multi: true }], submit(v) { data.notes.unshift({ id: uid(), t: v.t.trim(), created: Date.now() }); touched('notes'); } },
  count: () => data.notes.length,
  render() {
    if (!data.notes.length) return empty('No notes yet', 'Tap + to jot something down. Each note is saved with the time.');
    return `<ul class="notes-list" style="padding-top:2px">${[...data.notes].sort((a, b) => b.created - a.created).map(n =>
      `<li class="note" data-id="${n.id}"><div class="note-txt" data-act="edit" data-raw="${esc(n.t)}">${linkify(n.t)}</div><div class="note-foot"><span>${fmtStamp(n.created)}${n.edited ? ', edited' : ''}</span>${delBtn}</div></li>`).join('')}</ul>`;
  },
  act: {
    del: ({ id }) => remove('notes', id, 'notes'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'notes', multiline: true, onSave: v => { const n = find(data.notes, id); n.t = v; n.edited = Date.now(); touched('notes'); } })
  }
};

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

W.events = {
  title: 'Upcoming', icon: 'calendar', accent: '#3b9ae8',
  add: {
    fields: [{ k: 't', ph: 'Add an event' }, { k: 'date', type: 'date', def: todayStr }, { k: 'time', type: 'time' }],
    submit(v) { data.events.push({ id: uid(), t: v.t.trim(), date: v.date || todayStr(), time: v.time || '', created: Date.now() }); touched('events'); }
  },
  upcoming() { return data.events.filter(e => daysFromToday(parseDate(e.date)) >= 0).sort((a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99'))); },
  count() { return this.upcoming().length; },
  render() {
    const list = this.upcoming(); if (!list.length) return empty('Nothing scheduled', 'Tap + to add an appointment or plan.');
    return `<ul class="rows">${list.map(e => { const d = parseDate(e.date); return `<li class="row" data-id="${e.id}"><div class="datepill${daysFromToday(d) === 0 ? ' is-today' : ''}"><span>${d.toLocaleDateString([], { month: 'short' })}</span><b>${d.getDate()}</b></div><div class="row-main"><span class="txt" data-act="edit">${esc(e.t)}</span><small class="meta">${fmtDay(e.date)}${e.time ? ', ' + fmtTime(e.time) : ''}</small></div>${delBtn}</li>`; }).join('')}</ul>`;
  },
  act: {
    del: ({ id }) => remove('events', id, 'events'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'events', onSave: v => { find(data.events, id).t = v; touched('events'); } })
  }
};

/* ---- calendar: month grid with holidays + Upcoming events ---- */
const nthDow = (y, m, dow, n) => {
  if (n > 0) return 1 + ((dow - new Date(y, m, 1).getDay() + 7) % 7) + 7 * (n - 1);
  const last = new Date(y, m + 1, 0); return last.getDate() - ((last.getDay() - dow + 7) % 7);
};
const holCache = {};
function holidays(y) {
  if (holCache[y]) return holCache[y];
  const h = {}, add = (m, d, n) => { const k = `${y}-${pad(m + 1)}-${pad(d)}`; h[k] = h[k] ? h[k] + ' / ' + n : n; };
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, mm = Math.floor((a + 11 * hh + 22 * l) / 451);
  add(0, 1, "New Year's Day"); add(0, nthDow(y, 0, 1, 3), 'Martin Luther King Jr. Day'); add(1, 14, "Valentine's Day"); add(1, nthDow(y, 1, 1, 3), "Presidents' Day");
  add(2, 17, "St. Patrick's Day"); add(Math.floor((hh + l - 7 * mm + 114) / 31) - 1, ((hh + l - 7 * mm + 114) % 31) + 1, 'Easter');
  add(4, 5, 'Cinco de Mayo'); add(4, nthDow(y, 4, 0, 2), "Mother's Day"); add(4, nthDow(y, 4, 1, -1), 'Memorial Day'); add(5, 19, 'Juneteenth');
  add(5, nthDow(y, 5, 0, 3), "Father's Day"); add(6, 4, 'Independence Day'); add(8, nthDow(y, 8, 1, 1), 'Labor Day');
  add(9, nthDow(y, 9, 1, 2), "Columbus / Indigenous Peoples' Day"); add(9, 31, 'Halloween'); add(10, 11, 'Veterans Day'); add(10, nthDow(y, 10, 4, 4), 'Thanksgiving');
  add(11, 24, 'Christmas Eve'); add(11, 25, 'Christmas Day'); add(11, 31, "New Year's Eve");
  return (holCache[y] = h);
}
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1), calSel = todayStr();
const calGo = m => { calMonth = m; calSel = monthKey(m) === monthKey() ? todayStr() : dstr(m); renderWidget('calendar'); };
W.calendar = {
  title: 'Calendar', icon: 'calendar', accent: '#2fb7a3',
  count() { const k = monthKey(calMonth); return data.events.filter(e => e.date.startsWith(k)).length; },
  render() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth(), first = calMonth.getDay(), dim = new Date(y, m + 1, 0).getDate(), weeks = Math.ceil((first + dim) / 7);
    const hol = holidays(y), by = {}, today = todayStr();
    data.events.forEach(e => (by[e.date] = by[e.date] || []).push(e));
    let cells = '';
    for (let i = 0; i < weeks * 7; i++) {
      const dn = i - first + 1; if (dn < 1 || dn > dim) { cells += '<span class="cal-c out"></span>'; continue; }
      const k = `${y}-${pad(m + 1)}-${pad(dn)}`, ev = by[k] || [];
      cells += `<button type="button" class="cal-c${k === today ? ' today' : ''}${k === calSel ? ' sel' : ''}" data-act="day" data-d="${k}" aria-label="${esc(parseDate(k).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))}${hol[k] ? ', ' + esc(hol[k]) : ''}${ev.length ? ', ' + ev.length + ' event' + (ev.length > 1 ? 's' : '') : ''}"><b>${dn}</b><i class="dots">${hol[k] ? '<u class="h"></u>' : ''}${ev.slice(0, 3).map(() => '<u class="e"></u>').join('')}</i></button>`;
    }
    const sd = parseDate(calSel), hs = holidays(sd.getFullYear())[calSel], evs = (by[calSel] || []).slice().sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    const rows = (hs ? `<li class="row cal-hol"><span class="cal-flag" aria-hidden="true"></span><div class="row-main"><span>${esc(hs)}</span><small class="meta">Holiday</small></div></li>` : '') +
      evs.map(e => `<li class="row" data-id="${e.id}"><span class="cal-flag ev" aria-hidden="true"></span><div class="row-main"><span class="txt" data-act="edit">${esc(e.t)}</span>${e.time ? `<small class="meta">${fmtTime(e.time)}</small>` : ''}</div>${delBtn}</li>`).join('');
    return `<div class="cal-h"><button type="button" class="icon-btn" data-act="prev" aria-label="Previous month" style="transform:scaleX(-1)">${icon('chevron')}</button><strong>${calMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong><button type="button" class="icon-btn" data-act="next" aria-label="Next month">${icon('chevron')}</button><span class="spacer"></span><button type="button" class="chip-btn" data-act="today">Today</button></div>
    <div class="cal-g cal-dow" aria-hidden="true">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<span>${x}</span>`).join('')}</div>
    <div class="cal-g">${cells}</div>
    <div class="cal-day"><h4>${sd.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h4><ul class="rows">${rows || '<li class="muted cal-none">Nothing on this day.</li>'}</ul></div>
    <form class="addrow cal-add" data-cform autocomplete="off"><input name="t" placeholder="Add an event" aria-label="Add an event"><input name="time" type="time" aria-label="Time"><button class="go" type="submit" aria-label="Add">${icon('plus')}</button></form>`;
  },
  act: {
    day: ({ el }) => { calSel = el.dataset.d; renderWidget('calendar'); },
    prev: () => calGo(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1)),
    next: () => calGo(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1)),
    today: () => calGo(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    del: ({ id }) => remove('events', id, 'events'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'calendar', onSave: v => { find(data.events, id).t = v; touched('events'); } })
  },
  onSubmit(f) {
    const fd = new FormData(f), t = fd.get('t').toString().trim(); if (!t) { $('input[name=t]', f).focus(); return; }
    data.events.push({ id: uid(), t, date: calSel, time: fd.get('time') || '', created: Date.now() }); touched('events');
    const i = $('.cal-add input', cards.calendar); if (i) i.focus();
  }
};

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
W.meals = {
  title: 'Dinner plan', icon: 'utensils', accent: '#6d7ae6',
  count: () => Object.values(data.meals).filter(Boolean).length,
  render() {
    const today = (new Date().getDay() + 6) % 7;
    const any = Object.values(data.meals).some(Boolean);
    return DOW.map((d, i) => {
      const t = data.meals[i];
      return `<div class="meal${i === today ? ' today' : ''}"><span class="dow">${d}</span><span class="txt${t ? '' : ' placeholder'}" data-act="edit" data-day="${i}" data-raw="${esc(t || '')}">${t ? esc(t) : 'Plan dinner'}</span></div>`;
    }).join('') + (any ? `<div class="foot"><button class="link" data-act="clear">Clear week</button></div>` : '');
  },
  act: {
    edit: ({ el }) => { const i = el.dataset.day; inlineEdit(el, { wid: 'meals', allowEmpty: true, list: 'recipeTitles', onSave: v => { if (v) data.meals[i] = v; else delete data.meals[i]; touched('meals'); } }); },
    clear: () => undoable('Cleared the week', () => { data.meals = {}; }, 'meals')
  }
};

const EVERY = [[1, 'Daily'], [2, 'Every 2 days'], [7, 'Weekly'], [14, 'Every 2 weeks'], [30, 'Monthly'], [90, 'Every 3 months']];
const everyLabel = n => (EVERY.find(e => e[0] === n) || [n, `Every ${n} days`])[1].toLowerCase();
W.chores = {
  title: 'Chores', icon: 'repeat', accent: '#e9803f',
  add: { fields: [{ k: 't', ph: 'Add a recurring chore' }, { k: 'every', type: 'select', options: EVERY, val: 7 }], submit(v) { data.chores.push({ id: uid(), t: v.t.trim(), every: +v.every || 7, last: null, created: Date.now() }); touched('chores'); } },
  due(c) { return c.last ? Math.round((startOfDay(c.last) - startOfDay(new Date())) / DAY) + c.every : 0; },
  count() { return data.chores.filter(c => this.due(c) <= 0).length; },
  render() {
    if (!data.chores.length) return empty('No chores yet', 'Add things like "water plants" or "change filters" with how often they repeat.');
    return `<ul class="rows">${[...data.chores].sort((a, b) => this.due(a) - this.due(b)).map(c => {
      const d = this.due(c); const pill = d < 0 ? `<span class="pill late">${-d}d overdue</span>` : d === 0 ? `<span class="pill soon">Due today</span>` : `<span class="pill">${d === 1 ? 'Tomorrow' : 'In ' + d + ' days'}</span>`;
      return `<li class="row" data-id="${c.id}"><div class="row-main"><span class="txt" data-act="edit">${esc(c.t)}</span><small class="meta">${everyLabel(c.every)}</small></div>${pill}<button class="done-btn" data-act="done" aria-label="Mark done">${icon('check')}</button>${delBtn}</li>`;
    }).join('')}</ul>`;
  },
  act: {
    done: ({ id }) => { const c = find(data.chores, id); c.last = Date.now(); touched('chores'); toast(`Done. Next in ${everyLabel(c.every).replace('every ', '')}`); },
    del: ({ id }) => remove('chores', id, 'chores'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'chores', onSave: v => { find(data.chores, id).t = v; touched('chores'); } })
  }
};

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const billDay = b => { const n = new Date(); return Math.min(b.day, daysInMonth(n.getFullYear(), n.getMonth())); };
W.bills = {
  title: 'Bills', icon: 'dollar', accent: '#2fa56e',
  add: { fields: [{ k: 't', ph: 'Bill name' }, { k: 'amt', type: 'number', ph: 'Amount', attrs: 'step="0.01" min="0" inputmode="decimal"' }, { k: 'day', type: 'number', ph: 'Day', attrs: 'min="1" max="31" inputmode="numeric" title="Day of the month it is due"' }], submit(v) { data.bills.push({ id: uid(), t: v.t.trim(), amt: Math.max(0, parseFloat(v.amt) || 0), day: clamp(parseInt(v.day) || 1, 1, 31), paid: {}, created: Date.now() }); touched('bills'); } },
  unpaid() { const k = monthKey(); return data.bills.filter(b => !b.paid[k]); },
  count() { return this.unpaid().length; },
  render() {
    if (!data.bills.length) return empty('No bills yet', 'Add rent, utilities and subscriptions with the day of the month they are due.');
    const k = monthKey(), total = data.bills.reduce((s, b) => s + b.amt, 0), left = this.unpaid().reduce((s, b) => s + b.amt, 0), pct = total ? Math.round((total - left) / total * 100) : 0;
    const today = new Date().getDate(); const mon = new Date().toLocaleDateString([], { month: 'short' });
    return `<div class="bill-sum"><b>${money(left)}</b><span>left of ${money(total)} this month</span><div class="bar"><i style="width:${pct}%"></i></div></div><ul class="rows">${[...data.bills].sort((a, b) => billDay(a) - billDay(b)).map(b => {
      const paid = !!b.paid[k], late = !paid && billDay(b) < today;
      return `<li class="row${paid ? ' is-done' : ''}" data-id="${b.id}"><button class="chk" data-act="pay" aria-label="${paid ? 'Mark unpaid' : 'Mark paid'}">${icon('check')}</button><div class="row-main"><span class="txt" data-act="edit">${esc(b.t)}</span><small class="meta">${late ? '<span style="color:var(--danger)">Past due, ' : '('}${mon} ${billDay(b)}${late ? '</span>' : ')'}</small></div><span class="amt" data-act="editAmt" data-raw="${b.amt}">${money(b.amt)}</span>${delBtn}</li>`;
    }).join('')}</ul>`;
  },
  act: {
    pay: ({ id }) => { const b = find(data.bills, id), k = monthKey(); if (b.paid[k]) delete b.paid[k]; else b.paid[k] = Date.now(); touched('bills'); },
    del: ({ id }) => remove('bills', id, 'bills'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'bills', onSave: v => { find(data.bills, id).t = v; touched('bills'); } }),
    editAmt: ({ el, id }) => inlineEdit(el, { wid: 'bills', type: 'number', onSave: v => { const n = parseFloat(v); if (isFinite(n) && n >= 0) { find(data.bills, id).amt = n; touched('bills'); } else renderWidget('bills'); } })
  }
};

W.links = {
  title: 'Quick links', icon: 'link', accent: '#d46bb0',
  add: { primary: 'url', fields: [{ k: 'url', ph: 'Web address', attrs: 'inputmode="url" autocapitalize="off"' }, { k: 't', ph: 'Name (optional)' }], submit(v) { const url = cleanUrl(v.url); if (!url) { toast('That web address does not look right'); return false; } data.links.push({ id: uid(), t: v.t.trim() || new URL(url).hostname.replace(/^www\./, ''), url, created: Date.now() }); touched('links'); } },
  count: () => data.links.length,
  render() {
    if (!data.links.length) return empty('No links yet', 'Tap + to pin the sites you use most.');
    return `<div class="chips">${data.links.map(l => `<span class="chip-wrap" data-id="${l.id}"><a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span class="chip-ic">${esc(l.t.trim().charAt(0).toUpperCase())}</span>${esc(l.t)}</a>${delBtn}</span>`).join('')}</div>`;
  },
  act: { del: ({ id }) => remove('links', id, 'links') }
};

/* ---- weather (Open-Meteo, no key) ---- */
const WMO = c => c === 0 ? ['☀️', 'Clear'] : c === 1 ? ['🌤️', 'Mostly clear'] : c === 2 ? ['⛅', 'Partly cloudy'] : c === 3 ? ['☁️', 'Overcast'] : c <= 48 ? ['🌫️', 'Fog'] : c <= 57 ? ['🌦️', 'Drizzle'] : c <= 67 ? ['🌧️', 'Rain'] : c <= 77 ? ['❄️', 'Snow'] : c <= 82 ? ['🌦️', 'Showers'] : c <= 86 ? ['🌨️', 'Snow showers'] : ['⛈️', 'Thunderstorm'];
let wx = (() => { try { return JSON.parse(lsGet(WX_KEY)); } catch { return null; } })();
let wxState = '', wxEditing = false, wxResults = [];
async function loadWeather(force) {
  const c = data.settings.city; if (!c) return;
  const key = `${c.lat},${c.lon},${data.settings.units}`;
  if (!force && wx && wx.key === key && Date.now() - wx.at < 15 * 60e3) return;
  wxState = 'loading'; renderWidget('weather');
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=${data.settings.units === 'c' ? 'celsius' : 'fahrenheit'}&timezone=auto&forecast_days=5`;
    const r = await fetch(u); if (!r.ok) throw 0; const j = await r.json(); if (!j.current) throw 0;
    wx = { key, at: Date.now(), cur: j.current, daily: j.daily }; lsSet(WX_KEY, JSON.stringify(wx)); wxState = '';
  } catch { wxState = 'error'; }
  renderWidget('weather');
}
const wxSearchForm = `<form class="wx-search" data-wxsearch><input name="q" placeholder="Search for a city" autocomplete="off" aria-label="City"><button class="btn primary" type="submit">Search</button></form><ul class="wx-results">${'' }</ul>`;
W.weather = {
  title: 'Weather', icon: 'cloud', accent: '#4fb3c8',
  count: () => 0,
  render() {
    const c = data.settings.city;
    if (!c || wxEditing) {
      return `<div class="wx">${c ? '' : '<p class="muted" style="margin:0 0 10px">Show the forecast for your area.</p>'}<button class="btn primary" data-act="geo" type="button">Use my location</button>${wxSearchForm.replace('<ul class="wx-results"></ul>', `<ul class="wx-results">${wxResults.map((r, i) => `<li><button type="button" data-act="pick" data-i="${i}">${esc(r.name)}${r.admin1 ? ', ' + esc(r.admin1) : ''}${r.country_code ? ' (' + esc(r.country_code) + ')' : ''}</button></li>`).join('')}</ul>`)}${c ? '<button class="link" data-act="cancelLoc" type="button">Cancel</button>' : ''}</div>`;
    }
    if (!wx || wx.key !== `${c.lat},${c.lon},${data.settings.units}`) return `<div class="wx"><p class="muted">${wxState === 'error' ? 'Could not load the forecast. Check your connection.' : 'Loading the forecast'}</p>${wxState === 'error' ? '<button class="btn" data-act="refresh" type="button">Try again</button>' : ''}</div>`;
    const u = data.settings.units === 'c' ? '°' : '°', cur = wx.cur, [em, desc] = WMO(cur.weather_code);
    const days = wx.daily.time.map((t, i) => `<div>${i === 0 ? 'Today' : parseDate(t).toLocaleDateString([], { weekday: 'short' })}<span class="e">${WMO(wx.daily.weather_code[i])[0]}</span><b>${Math.round(wx.daily.temperature_2m_max[i])}${u}</b>${Math.round(wx.daily.temperature_2m_min[i])}${u}</div>`).join('');
    return `<div class="wx"><div class="wx-now"><span class="wx-emoji">${em}</span><div><div class="wx-temp">${Math.round(cur.temperature_2m)}${u}</div><div class="wx-desc">${desc}, feels like ${Math.round(cur.apparent_temperature)}${u}</div></div></div><div class="wx-days">${days}</div><div class="wx-loc"><span>${esc(c.name)}</span><button class="link" data-act="change" type="button">Change</button></div></div>`;
  },
  act: {
    geo: () => {
      if (!navigator.geolocation) return toast('Location is not available on this device');
      navigator.geolocation.getCurrentPosition(p => { data.settings.city = { name: 'My location', lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }; wxEditing = false; save(); loadWeather(true); }, () => toast('Could not get your location. Search for a city instead.'), { timeout: 10000 });
    },
    pick: ({ el }) => { const r = wxResults[+el.dataset.i]; if (!r) return; data.settings.city = { name: [r.name, r.admin1].filter(Boolean).join(', '), lat: +r.latitude.toFixed(2), lon: +r.longitude.toFixed(2) }; wxEditing = false; wxResults = []; save(); loadWeather(true); },
    change: () => { wxEditing = true; renderWidget('weather'); },
    cancelLoc: () => { wxEditing = false; renderWidget('weather'); },
    refresh: () => loadWeather(true)
  },
  async onSubmit(form) {
    const q = new FormData(form).get('q').toString().trim(); if (!q) return;
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`); const j = await r.json();
      wxResults = j.results || []; if (!wxResults.length) toast('No cities found. Try another spelling.');
    } catch { toast('Search failed. Check your connection.'); }
    renderWidget('weather'); const inp = $('.wx-search input', cards.weather); if (inp) inp.value = q;
  }
};

/* ================= recipes: viewer + editor ================= */
function openSheetRecipe(r) {
  const groups = () => { const g = []; r.ing.forEach(i => { let x = g.find(y => y.n === i.group); if (!x) g.push(x = { n: i.group, l: [] }); x.l.push(i); }); return g; };
  const ingHtml = mult => r.ing.length ? groups().map(g => `<h4 class="grp">${esc(g.n)}</h4><ul class="ing">${g.l.map(i => `<li><label><input type="checkbox" value="${esc(ingText(i, mult, false))}"><span>${esc(ingText(i, mult))}</span></label></li>`).join('')}</ul>`).join('') : '<p class="muted">No ingredients listed.</p>';
  const stepsOf = ph => r.steps.filter(x => x.phase === ph).map(x => x.text);
  const ol = a => `<ol>${a.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`;
  const prep = stepsOf('Prep'), cook = stepsOf('Cook');
  const facts = [r.category, r.cuisine, r.servings && r.servings + ' servings', r.prep && 'Prep ' + r.prep + ' min', r.cook && 'Cook ' + r.cook + ' min'].filter(Boolean);
  const src = /^https?:\/\//i.test(r.source) ? `<a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">${esc(new URL(r.source).hostname.replace(/^www\./, ''))}</a>` : esc(r.source);
  const mults = [[0.5, '½'], [1, '×1'], [2, '×2'], [3, '×3'], [4, '×4']];
  let mult = 1;
  openSheet(
    `${facts.length ? `<p class="rmeta">${facts.map(esc).join(' · ')}</p>` : ''}
    ${r.equipment ? `<p class="rmeta"><b>Equipment</b> ${esc(r.equipment)}</p>` : ''}${r.source ? `<p class="rmeta"><b>Source</b> ${src}</p>` : ''}
    <h3 class="sub">Ingredients <small>tick what you need to buy</small></h3>
    <div class="scale" role="group" aria-label="Scale the recipe">${mults.map(([m, l]) => `<button type="button" class="rchip${m === 1 ? ' on' : ''}" data-mult="${m}">${l}</button>`).join('')}</div>
    <div data-ings>${ingHtml(1)}</div>
    ${prep.length ? `<h3 class="sub">Prep</h3><div class="steps">${ol(prep)}</div>` : ''}
    <h3 class="sub">Cooking instructions</h3>
    <div class="steps">${cook.length ? ol(cook) : '<p class="muted">No steps written yet. Add them in the Sheet\'s Steps tab.</p>'}</div>
    ${r.notes ? `<h3 class="sub">Notes</h3><div class="steps"><p>${esc(r.notes)}</p></div>` : ''}
    <div class="actions wrap">${r.ing.length ? '<button class="btn primary" type="button" data-addshop></button>' : ''}<a class="btn ghost" href="${SHEET_URL}" target="_blank" rel="noopener noreferrer">${icon('external')} Open in Google Sheets</a></div>`,
    {
      title: r.title, accent: W.recipes.accent, onOpen(b) {
        const btn = $('[data-addshop]', b);
        const picked = () => $$('.ing input:checked', b).map(i => i.value);
        const label = () => { if (btn) btn.textContent = picked().length ? `Add ${picked().length} to Shopping` : 'Add all to Shopping'; };
        label(); b.addEventListener('change', label);
        $$('[data-mult]', b).forEach(m => m.addEventListener('click', () => {
          mult = +m.dataset.mult * r.scale; $$('[data-mult]', b).forEach(x => x.classList.toggle('on', x === m));
          $('[data-ings]', b).innerHTML = ingHtml(mult); label();
        }));
        btn && btn.addEventListener('click', () => {
          const items = picked().length ? picked() : r.ing.map(i => ingText(i, mult, false)); let n = 0;
          items.forEach(t => { if (!data.shop.some(x => !x.done && x.t.toLowerCase() === t.toLowerCase())) { data.shop.unshift({ id: uid(), t, done: false, created: Date.now() }); n++; } });
          touched('shop'); sheet.close(); toast(n ? `Added ${n} item${n === 1 ? '' : 's'} to Shopping` : 'Everything is already on your list');
        });
      }
    });
}
function openRecipe(id) {
  const sr = feed.recipes.find(x => x.id === id); if (sr) return openSheetRecipe(sr);
  const r = find(data.recipes, id); if (!r) return;
  const stepLines = lines(r.steps).map(s => s.replace(/^\s*(?:step\s*)?\d+[.)]\s*/i, ''));
  openSheet(
    `${r.url ? `<a class="btn ghost" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} Open original</a>` : ''}
    <h3 class="sub">Ingredients <small>tick what you need to buy</small></h3>
    ${r.ing.length ? `<ul class="ing">${r.ing.map(i => `<li><label><input type="checkbox" value="${esc(i)}"><span>${esc(i)}</span></label></li>`).join('')}</ul>` : '<p class="muted">No ingredients listed.</p>'}
    <h3 class="sub">Steps</h3>
    <div class="steps">${stepLines.length > 1 ? `<ol>${stepLines.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : stepLines.length ? `<p>${esc(stepLines[0])}</p>` : '<p class="muted">No steps written.</p>'}</div>
    <div class="actions wrap">${r.ing.length ? '<button class="btn primary" type="button" data-addshop></button>' : ''}<button class="btn" type="button" data-edit>Edit</button><button class="btn danger" type="button" data-del>Delete</button></div>`,
    {
      title: r.title, accent: W.recipes.accent, onOpen(b) {
        const btn = $('[data-addshop]', b);
        const picked = () => $$('.ing input:checked', b).map(i => i.value);
        const label = () => { if (btn) btn.textContent = picked().length ? `Add ${picked().length} to Shopping` : 'Add all to Shopping'; };
        label(); b.addEventListener('change', label);
        btn && btn.addEventListener('click', () => {
          const items = picked().length ? picked() : r.ing; let n = 0;
          items.forEach(t => { if (!data.shop.some(x => !x.done && x.t.toLowerCase() === t.toLowerCase())) { data.shop.unshift({ id: uid(), t, done: false, created: Date.now() }); n++; } });
          touched('shop'); sheet.close(); toast(n ? `Added ${n} item${n === 1 ? '' : 's'} to Shopping` : 'Everything is already on your list');
        });
        $('[data-edit]', b).addEventListener('click', () => openRecipeEditor(id));
        $('[data-del]', b).addEventListener('click', () => { sheet.close(); remove('recipes', id, 'recipes'); });
      }
    });
}
function openRecipeEditor(id) {
  const r = id ? find(data.recipes, id) : { title: '', ing: [], steps: '', url: '' };
  openSheet(`<form class="form" id="rf">
    <label>Recipe name<input name="title" required value="${esc(r.title)}" placeholder="Weeknight chili" autocomplete="off"></label>
    <label>Ingredients <small>one per line</small><textarea name="ing" rows="6" placeholder="2 cups rice&#10;1 onion">${esc(r.ing.join('\n'))}</textarea></label>
    <label>Steps <small>one per line, or paste a paragraph</small><textarea name="steps" rows="6">${esc(r.steps)}</textarea></label>
    <label>Link <small>optional</small><input name="url" inputmode="url" autocapitalize="off" value="${esc(r.url || '')}" placeholder="https://"></label>
    <div class="actions"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">Save recipe</button></div></form>`,
    {
      title: id ? 'Edit recipe' : 'New recipe', accent: W.recipes.accent, onOpen(b) {
        $('input[name=title]', b).focus();
        $('#rf', b).addEventListener('submit', e => {
          e.preventDefault(); const f = new FormData(e.target);
          const rec = { title: f.get('title').toString().trim(), ing: lines(f.get('ing')), steps: f.get('steps').toString().trim(), url: cleanUrl(f.get('url')) };
          if (!rec.title) return;
          if (id) Object.assign(r, rec); else data.recipes.unshift({ id: uid(), created: Date.now(), ...rec });
          touched('recipes'); sheet.close(); toast('Recipe saved');
        });
      }
    });
}

/* ================= KPI strip ================= */
const goto = id => { const c = cards[id]; if (!c) return toast('That card is hidden. Turn it on in Customize.'); c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); };
function spark(vals) {
  const w = 84, h = 30, bw = 8, gap = (w - bw * vals.length) / (vals.length - 1), m = Math.max(1, ...vals);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${vals.map((v, i) => { const bh = Math.max(3, Math.round(v / m * (h - 2))); return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${h - bh}" width="${bw}" height="${bh}" rx="2.5" fill="currentColor" opacity="${i === vals.length - 1 ? 1 : .4}"/>`; }).join('')}</svg>`;
}
function renderKpis() {
  const t0 = startOfDay(new Date()).getTime();
  const openT = data.todos.filter(t => !t.done).length, doneToday = data.todos.filter(t => t.doneAt && t.doneAt >= t0).length;
  const week = Array.from({ length: 7 }, (_, i) => { const a = t0 - (6 - i) * DAY, b = a + DAY; return data.todos.filter(t => t.doneAt && t.doneAt >= a && t.doneAt < b).length; });
  const ev = W.events.upcoming()[0];
  const tile = (id, color, label, val, sub, extra = '', small = false) => `<button class="kpi" data-goto="${id}" style="--accent:${color}"><span class="kpi-label">${label}</span><span class="kpi-val${small ? ' small' : ''}">${val}</span><span class="kpi-sub">${sub}</span>${extra}</button>`;
  $('#kpiTiles').innerHTML =
    tile('todo', W.todo.accent, 'Open tasks', openT, doneToday ? `${doneToday} finished today` : 'None finished today', spark(week)) +
    tile('events', W.events.accent, 'Next up' + (ev ? ' · ' + fmtDay(ev.date) + (ev.time ? ', ' + fmtTime(ev.time) : '') : ''), ev ? esc(ev.t) : 'Nothing', '', '', true);
}
/* ---- Dublin, CA forecast (top right): 8 AM / 12 PM / 4 PM / 8 PM, today + 3 days ---- */
function wxKind(c, day) {
  if (c === 0) return day ? ['sun', 'Sunny'] : ['moon', 'Clear'];
  if (c === 1) return day ? ['cloudsun', 'Mostly sunny'] : ['cloudmoon', 'Mostly clear'];
  if (c === 2) return day ? ['cloudsun', 'Partly cloudy'] : ['cloudmoon', 'Partly cloudy'];
  if (c === 3) return ['cloud', 'Cloudy'];
  if (c === 45 || c === 48) return ['fog', 'Fog'];
  if (c >= 51 && c <= 57) return ['rain', 'Drizzle'];
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return ['rain', 'Rain'];
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return ['snow', 'Snow'];
  if (c >= 95) return ['storm', 'Thunderstorms'];
  return ['cloud', 'Cloudy'];
}
const DUB_KEY = 'hd.v1.dub', DUB_HOURS = ['08', '12', '16', '20'], DUB_LABELS = ['8 AM', '12 PM', '4 PM', '8 PM'];
let dub = (() => { try { return JSON.parse(lsGet(DUB_KEY)); } catch { return null; } })(), dubErr = false;
function renderDublin() {
  const el = $('#dubWx'); if (!el) return;
  const title = `<button type="button" class="dwx-title" data-dubrefresh aria-label="Dublin, CA forecast. Tap to refresh"><b>Dublin, CA</b><small>°F/°C · rain</small></button>`;
  if (!dub || !dub.t || !dub.t.length) { el.innerHTML = title + `<span class="muted dwx-msg">${dubErr ? 'Could not load the forecast.' : 'Loading forecast…'}</span>`; return; }
  const days = [...new Set(dub.t.map(x => x.slice(0, 10)))].slice(0, 4);
  const laNow = new Date().toLocaleString('en-CA', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' }); // "2026-11-03, 09"
  const nowDay = laNow.slice(0, 10), nowHr = +laNow.slice(-2);
  const short = { '08': '8a', '12': '12p', '16': '4p', '20': '8p' };
  const body = days.map((d, di) => `<div class="dwx-d"><span class="dwx-day">${di === 0 ? 'Today' : esc(parseDate(d).toLocaleDateString([], { weekday: 'short' }))}</span><div class="dwx-s">` + DUB_HOURS.map(h => {
    const i = dub.t.indexOf(`${d}T${h}:00`), c = i < 0 ? null : dub.c[i], pr = i < 0 ? null : dub.p[i], past = d === nowDay && +h < nowHr;
    const wk = i < 0 || !dub.w || dub.w[i] == null ? null : wxKind(dub.w[i], dub.d ? dub.d[i] === 1 : +h < 19);
    return `<span class="dwx-c${past ? ' past' : ''}"${wk ? ` title="${wk[1]}"` : ''}>${wk ? `<i class="wi k-${wk[0]}" role="img" aria-label="${wk[1]}">${icon(wk[0])}</i>` : ''}<b>${c == null ? '–' : Math.round(c * 9 / 5 + 32) + '/' + Math.round(c) + '°'}</b><small>${short[h]} <em>${pr == null ? '–' : pr + '%'}</em></small></span>`;
  }).join('') + '</div></div>').join('');
  el.innerHTML = title + `<div class="dwx-row" role="list" aria-label="Forecast, today and the next 3 days">${body}</div>` + (dubErr ? '<span class="muted dwx-msg" title="Showing the last saved forecast">offline</span>' : '');
}
async function loadDublin(force) {
  renderDublin();
  if (!force && dub && dub.w && Date.now() - dub.at < 30 * 60e3) return;
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.70&longitude=-121.94&hourly=temperature_2m,precipitation_probability,weather_code,is_day&forecast_days=4&timezone=America%2FLos_Angeles');
    if (!r.ok) throw 0; const j = await r.json(); if (!j.hourly || !j.hourly.time) throw 0;
    dub = { at: Date.now(), t: j.hourly.time, c: j.hourly.temperature_2m, p: j.hourly.precipitation_probability, w: j.hourly.weather_code, d: j.hourly.is_day }; lsSet(DUB_KEY, JSON.stringify(dub)); dubErr = false;
  } catch { dubErr = true; }
  renderDublin();
}
$('#dubWx').addEventListener('click', e => { if (e.target.closest('[data-dubrefresh]')) loadDublin(true); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadDublin(); });
$('#kpis').addEventListener('click', e => { const k = e.target.closest('[data-goto]'); if (k) goto(k.dataset.goto); });

/* ================= cards / grid ================= */
const grid = $('#grid'), cards = {}, searchQ = {};
let editing = false;

function makeCard(id) {
  const w = W[id], el = document.createElement('section');
  el.className = 'card'; el.dataset.id = id; el.style.setProperty('--accent', w.accent); el.setAttribute('aria-label', w.title);
  el.innerHTML = `<header class="card-h"><span class="grip" aria-hidden="true">${icon('grip')}</span><span class="card-ic">${icon(w.icon)}</span><h3>${esc(w.title)}</h3><span class="badge" data-badge hidden></span><span class="spacer"></span>${w.add ? `<button class="icon-btn add" data-add aria-label="Add to ${esc(w.title)}" aria-expanded="false">${icon('plus')}</button>` : ''}<button class="icon-btn hide" data-hide aria-label="Hide ${esc(w.title)}">${icon('x')}</button></header><div class="addslot"></div>${w.search ? `<div class="tools" hidden><input type="search" placeholder="Search ${esc(w.title.toLowerCase())}" aria-label="Search ${esc(w.title)}"></div>` : ''}<div class="body"></div><span class="resize" aria-hidden="true"></span>`;
  el.addEventListener('click', ev => {
    if (editing) {
      if (ev.target.closest('[data-hide]')) hideWidget(id);
      return;
    }
    if (ev.target.closest('[data-add]')) return openAdd(id);
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
  }, 1000);
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
document.addEventListener('click', e => { if (justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);

function touched(...ids) { save(); if (ids.includes('events') && !ids.includes('calendar')) ids.push('calendar'); ids.forEach(renderWidget); renderKpis(); fillDatalist(); }
function fillDatalist() { $('#recipeTitles').innerHTML = allRecipes().map(r => `<option value="${esc(r.title)}">`).join(''); }

/* ---- quick-add rows inside cards ---- */
function buildForm(id) {
  const spec = W[id].add, f = document.createElement('form'); f.className = 'addrow'; f.autocomplete = 'off'; f.noValidate = true;
  f.innerHTML = spec.fields.map(fl => {
    const attrs = `name="${fl.k}" ${fl.attrs || ''}`;
    if (fl.type === 'textarea') return `<textarea ${attrs} rows="1" placeholder="${esc(fl.ph || '')}" aria-label="${esc(fl.ph || '')}"></textarea>`;
    if (fl.type === 'select') return `<select ${attrs} aria-label="How often">${fl.options.map(([v, l]) => `<option value="${v}"${v === fl.val ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
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

function applySize(card, it) { card.style.gridColumn = `span ${it.c}`; card.style.gridRow = `span ${it.r}`; }
function buildGrid() {
  const L = layout(); grid.innerHTML = ''; Object.keys(cards).forEach(k => delete cards[k]);
  L.order.forEach(id => { const c = makeCard(id); cards[id] = c; applySize(c, L.items[id]); grid.appendChild(c); renderWidget(id); });
  renderTray();
}
function renderAll() { renderHeader(); buildGrid(); renderKpis(); fillDatalist(); loadWeather(); }

function renderHeader() {
  const h = new Date().getHours(), g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  $('#hello').textContent = data.settings.name ? `${g}, ${data.settings.name}` : g;
  $('#today').textContent = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
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
function hideWidget(id) { const L = layout(); L.hidden.push(id); L.order = L.order.filter(x => x !== id); save(); cards[id].remove(); delete cards[id]; renderTray(); }
$('#hiddenChips').addEventListener('click', e => {
  const b = e.target.closest('[data-show]'); if (!b) return; const L = layout(), id = b.dataset.show;
  L.hidden = L.hidden.filter(x => x !== id); L.order.push(id); save(); buildGrid(); renderKpis(); cards[id] && cards[id].scrollIntoView({ block: 'center' });
});
$('#btnReset').addEventListener('click', () => { if (!confirm('Put all cards back in their original size and order?')) return; data.layout[bp()] = null; delete data.layout[bp()]; save(); buildGrid(); });
$('#btnDone').addEventListener('click', () => setEditing(false));
$('#btnEdit').addEventListener('click', () => setEditing(!editing));

let scrollY = null, raf = 0;
function edgeScroll(y) { scrollY = y; if (!raf) raf = requestAnimationFrame(tick); }
function tick() { raf = 0; if (scrollY == null) return; const m = 80, h = innerHeight; let d = 0; if (scrollY < m) d = -(m - scrollY) / 4; else if (scrollY > h - m) d = (scrollY - (h - m)) / 4; if (d) { scrollBy(0, d); raf = requestAnimationFrame(tick); } }
const stopEdgeScroll = () => { scrollY = null; };

grid.addEventListener('pointerdown', e => {
  if (!editing || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const card = e.target.closest('.card'); if (!card) return;
  if (e.target.closest('.resize')) return startResize(e, card);
  if (e.target.closest('.card-h') && !e.target.closest('button')) startDrag(e, card);
});
function startResize(e, card) {
  e.preventDefault(); const id = card.dataset.id, L = layout(), it = L.items[id], b = bp(), cols = COLS[b];
  const cs = getComputedStyle(grid), gap = parseFloat(cs.columnGap) || 14, rowH = parseFloat(cs.gridAutoRows) || 32, rowGap = parseFloat(cs.rowGap) || 14;
  const colW = (grid.clientWidth - gap * (cols - 1)) / cols, sx = e.clientX, sy = e.clientY, sc = it.c, sr = it.r, t = e.target;
  card.classList.add('resizing'); t.setPointerCapture(e.pointerId);
  const move = ev => {
    edgeScroll(ev.clientY);
    const c = clamp(Math.round(sc + (ev.clientX - sx) / (colW + gap)), MINC[b], cols), r = clamp(Math.round(sr + (ev.clientY - sy) / (rowH + rowGap)), MINR, 40);
    if (c !== it.c || r !== it.r) { it.c = c; it.r = r; applySize(card, it); }
  };
  const up = () => { t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', up); t.removeEventListener('pointercancel', up); card.classList.remove('resizing'); stopEdgeScroll(); save(); };
  t.addEventListener('pointermove', move); t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
}
function startDrag(e, card) {
  e.preventDefault(); const id = card.dataset.id, L = layout(), hd = $('.card-h', card); let last = 0;
  card.classList.add('dragging'); hd.setPointerCapture(e.pointerId);
  const applyOrder = () => L.order.forEach((x, i) => { if (cards[x]) cards[x].style.order = i; });
  const move = ev => {
    edgeScroll(ev.clientY);
    if (Date.now() - last < 140) return;
    const over = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.classList && x.classList.contains('card') && x !== card); if (!over) return;
    const from = L.order.indexOf(id), to = L.order.indexOf(over.dataset.id); if (from < 0 || to < 0 || from === to) return;
    L.order.splice(from, 1); L.order.splice(to, 0, id); applyOrder(); last = Date.now();
  };
  const up = () => {
    hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
    card.classList.remove('dragging'); stopEdgeScroll(); L.order.forEach(x => { if (cards[x]) { cards[x].style.order = ''; grid.appendChild(cards[x]); } }); save();
  };
  hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
}
const onBp = () => { buildGrid(); renderKpis(); };
mqMobile.addEventListener('change', onBp); mqTablet.addEventListener('change', onBp);

/* ================= quick add (floating +) ================= */
const QA = [
  { k: 'todo', label: 'Task', ph: 'What needs doing?', add: t => lines(t).forEach(x => data.todos.unshift({ id: uid(), t: x, done: false, created: Date.now() })), wid: 'todo', to: 'To-Do' },
  { k: 'shop', label: 'Shopping', ph: 'Milk, eggs, rice', add: t => lines(t, true).forEach(x => { if (!data.shop.some(s => !s.done && s.t.toLowerCase() === x.toLowerCase())) data.shop.unshift({ id: uid(), t: x, done: false, created: Date.now() }); }), wid: 'shop', to: 'Shopping' },
  { k: 'notes', label: 'Note', ph: 'Jot something down', add: t => data.notes.unshift({ id: uid(), t: t.trim(), created: Date.now() }), wid: 'notes', to: 'Notes' },
  { k: 'events', label: 'Event', ph: 'What is happening?', add: (t, extra) => data.events.push({ id: uid(), t: t.trim(), date: extra.date || todayStr(), time: extra.time || '', created: Date.now() }), wid: 'events', to: 'Upcoming', extra: true }
];
function openQuickAdd(type) {
  type = type || lsGet(QA_KEY, 'todo'); if (!QA.some(q => q.k === type)) type = 'todo';
  openSheet(`<form class="qa" id="qa"><div class="seg" role="radiogroup" aria-label="What to add">${QA.map(q => `<label><input type="radio" name="type" value="${q.k}"${q.k === type ? ' checked' : ''}><span>${q.label}</span></label>`).join('')}</div>
    <textarea name="t" rows="2" class="form-ta" style="background:var(--field);border:1px solid transparent;border-radius:14px;padding:12px;font-size:16px"></textarea>
    <div class="extra" hidden><input type="date" name="date" aria-label="Date"><input type="time" name="time" aria-label="Time"></div>
    <div class="actions"><button class="btn" type="button" data-close>Done</button><button class="btn primary" type="submit">Add</button></div>
    <ul class="qa-log" aria-live="polite"></ul></form>`,
    {
      title: 'Quick add', cls: 'top', onOpen(b) {
        const f = $('#qa', b), ta = $('[name=t]', f), extra = $('.extra', f), log = $('.qa-log', f);
        const cur = () => QA.find(q => q.k === f.type.value);
        const sync = () => { const q = cur(); ta.placeholder = q.ph; extra.hidden = !q.extra; if (q.extra && !$('[name=date]', f).value) $('[name=date]', f).value = todayStr(); lsSet(QA_KEY, q.k); sheet.querySelector('.sheet-card').style.setProperty('--accent', W[q.wid].accent); };
        f.addEventListener('change', e => { if (e.target.name === 'type') { sync(); ta.focus(); } });
        ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); } });
        f.addEventListener('submit', e => {
          e.preventDefault(); const q = cur(), v = ta.value; if (!v.trim()) { ta.focus(); return; }
          q.add(v, { date: $('[name=date]', f).value, time: $('[name=time]', f).value }); touched(q.wid);
          const li = document.createElement('li'); li.innerHTML = `<b>${icon('check')}</b>${esc(v.trim().split('\n')[0].slice(0, 60))} added to ${q.to}`; li.firstChild.style.display = 'inline-flex'; li.firstChild.style.verticalAlign = 'middle'; log.prepend(li);
          ta.value = ''; ta.focus(); if (navigator.vibrate) navigator.vibrate(8);
        });
        sync(); ta.focus();
      }
    });
}
$('#fab').addEventListener('click', () => openQuickAdd());
document.addEventListener('keydown', e => {
  if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !sheet.open && !editing) { e.preventDefault(); openQuickAdd(); }
});

/* ================= theme ================= */
function applyTheme() {
  const pref = lsGet(THEME_KEY, 'auto'), dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = $('meta[name=theme-color]'); if (m) m.content = dark ? '#0f161d' : '#eaeef2';
  const b = $('#btnTheme'); b.innerHTML = icon(dark ? 'sun' : 'moon');
}
$('#btnTheme').addEventListener('click', () => { lsSet(THEME_KEY, document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); applyTheme(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ================= sync (private GitHub Gist) ================= */
const FILE = 'main-dashboard.json';
let sync = Object.assign({ token: '', gistId: '', last: 0, state: 'off', err: '' }, (() => { try { return JSON.parse(lsGet(SYNC_KEY)) || {}; } catch { return {}; } })());
const saveSyncCfg = () => lsSet(SYNC_KEY, JSON.stringify(sync));
let syncing = false, syncQueued = false, syncTimer = 0;
const hasData = d => ['todos', 'shop', 'notes', 'recipes', 'watch', 'events', 'chores', 'bills', 'links'].some(k => (d[k] || []).length) || Object.keys(d.meals || {}).length > 0;
function setSyncState(s, err = '') { sync.state = sync.token ? s : 'off'; sync.err = err; $('#syncDot').dataset.s = sync.state; const el = $('#syncStatus'); if (el) el.innerHTML = syncStatusHtml(); }
function syncStatusHtml() {
  if (!sync.token) return '<i></i>Not connected. Data is saved on this device only.';
  const map = { ok: ['ok', `Up to date${sync.last ? ', last synced ' + fmtStamp(sync.last) : ''}`], syncing: ['', 'Syncing'], pending: ['', 'Changes waiting to sync'], error: ['err', sync.err || 'Sync problem'], off: ['', 'Not connected'] };
  const [c, t] = map[sync.state] || map.ok; return `<i class="${c}"></i>${esc(t)}`;
}
function scheduleSync() { if (!sync.token) return; clearTimeout(syncTimer); setSyncState('pending'); syncTimer = setTimeout(() => syncNow(), 1500); }
async function gh(path, init = {}) {
  const r = await fetch('https://api.github.com' + path, { ...init, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + sync.token, 'X-GitHub-Api-Version': '2022-11-28', ...(init.body ? { 'Content-Type': 'application/json' } : {}) } });
  if (!r.ok) { const e = new Error('GitHub ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
async function syncNow({ first = false } = {}) {
  if (!sync.token) return;
  if (syncing) { syncQueued = true; return; }
  syncing = true; setSyncState('syncing');
  try {
    if (!sync.gistId) { const list = await gh('/gists?per_page=100'); const g = list.find(x => x.files && x.files[FILE]); if (g) sync.gistId = g.id; }
    const push = async () => { await gh('/gists/' + sync.gistId, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(data) } } }) }); };
    if (!sync.gistId) {
      const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Home Dashboard data (managed by the app, safe to ignore)', public: false, files: { [FILE]: { content: JSON.stringify(data) } } }) });
      sync.gistId = g.id;
    } else {
      const g = await gh('/gists/' + sync.gistId); const f = g.files && g.files[FILE]; let text = f && f.content;
      if (f && f.truncated) text = await (await fetch(f.raw_url)).text();
      let remote = null; try { remote = JSON.parse(text); } catch { }
      if (!remote || remote.v !== 1) await push();
      else if (first && hasData(data) && hasData(remote)) {
        if (confirm('Found your dashboard in the cloud.\n\nOK: use the cloud copy on this device (replaces what is here).\nCancel: keep this device and overwrite the cloud copy.')) adopt(remote); else await push();
      }
      else if (remote.updated > data.updated) adopt(remote);
      else if (remote.updated < data.updated) await push();
    }
    sync.last = Date.now(); saveSyncCfg(); setSyncState('ok');
  } catch (e) {
    const msg = e.status === 401 ? 'GitHub rejected the token. Reconnect in Settings.' : e.status === 403 || e.status === 404 ? 'GitHub denied access. The token needs the gist permission.' : 'Could not reach GitHub. Will retry.';
    setSyncState('error', msg);
  } finally {
    syncing = false; if (syncQueued) { syncQueued = false; scheduleSync(); }
  }
}
function adopt(remote) { data = normalize(remote); persist(); renderAll(); }
let lastPull = 0;
function pullIfStale() { if (sync.token && Date.now() - lastPull > 20000 && !editing) { lastPull = Date.now(); syncNow(); } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { renderHeader(); renderKpis(); Object.keys(cards).forEach(renderWidget); pullIfStale(); loadWeather(); } });
setInterval(() => { if (document.visibilityState === 'visible') pullIfStale(); }, 45000);

/* ================= settings sheet ================= */
function openSettings() {
  const pref = lsGet(THEME_KEY, 'auto');
  openSheet(`<div class="form">
    <label>Your name <small>used in the greeting</small><input type="text" id="setName" value="${esc(data.settings.name)}" placeholder="Optional" autocomplete="given-name"></label>
    <div><div class="muted" style="font-weight:650;font-size:14px;margin-bottom:6px;color:var(--text)">Theme</div><div class="seg" id="setTheme">${['auto', 'light', 'dark'].map(t => `<label><input type="radio" name="theme" value="${t}"${pref === t ? ' checked' : ''}><span>${t[0].toUpperCase() + t.slice(1)}</span></label>`).join('')}</div></div>
    <div><div class="muted" style="font-weight:650;font-size:14px;margin-bottom:6px;color:var(--text)">Temperature</div><div class="seg" id="setUnits">${[['f', '°F'], ['c', '°C']].map(([v, l]) => `<label><input type="radio" name="units" value="${v}"${data.settings.units === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
  </div>
  <div class="set-group"><h3>Sync across devices</h3>
    <p>Keeps your dashboard identical on your phone, laptop and tablet using a private GitHub Gist (a hidden file in your own GitHub account). Create a token once, then paste it on each device.</p>
    <div class="status-line" id="syncStatus">${syncStatusHtml()}</div>
    ${sync.token ? `<div class="row2"><button class="btn primary" type="button" id="syncNow">Sync now</button><button class="btn danger" type="button" id="syncOff">Disconnect this device</button></div>` :
      `<ol class="muted" style="margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.5"><li>Open <a href="https://github.com/settings/tokens/new?scopes=gist&description=Home%20Dashboard" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">GitHub token page</a> (classic token, only the <b>gist</b> box ticked).</li><li>Tap Generate token, copy it, and paste it below.</li></ol><div class="row2"><input type="password" id="tok" placeholder="Paste token" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="GitHub token"><button class="btn primary" type="button" id="syncOn">Connect</button></div>`}
    <p style="margin-top:10px;font-size:13px">Latest change wins if two devices edit at once, so the app checks for updates whenever you come back to it. Keep passwords and card numbers out of this app.</p>
  </div>
  <div class="set-group"><h3>Your data</h3><div class="row2"><button class="btn" type="button" id="exp">Download backup</button><button class="btn" type="button" id="imp">Restore from backup</button><button class="btn" type="button" id="lockNow">Lock this device</button><input type="file" id="impFile" accept="application/json,.json" hidden></div></div>`,
    {
      title: 'Settings', onOpen(b) {
        $('#setName', b).addEventListener('input', e => { data.settings.name = e.target.value.trim(); save(); renderHeader(); });
        $('#setTheme', b).addEventListener('change', e => { lsSet(THEME_KEY, e.target.value); applyTheme(); });
        $('#setUnits', b).addEventListener('change', e => { data.settings.units = e.target.value; save(); loadWeather(true); });
        const on = $('#syncOn', b); on && on.addEventListener('click', () => { const t = $('#tok', b).value.trim(); if (!t) return; sync = { ...sync, token: t, gistId: '', state: 'syncing', err: '' }; saveSyncCfg(); sheet.close(); syncNow({ first: true }); });
        const now = $('#syncNow', b); now && now.addEventListener('click', () => { lastPull = Date.now(); syncNow(); });
        const off = $('#syncOff', b); off && off.addEventListener('click', () => { if (!confirm('Disconnect this device? Your data stays here and in the cloud copy.')) return; sync = { token: '', gistId: '', last: 0, state: 'off', err: '' }; saveSyncCfg(); setSyncState('off'); sheet.close(); toast('Disconnected'); });
        $('#exp', b).addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `home-dashboard-${todayStr()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
        $('#lockNow', b).addEventListener('click', () => { try { localStorage.removeItem(AUTH_KEY); } catch { } location.reload(); });
        $('#imp', b).addEventListener('click', () => $('#impFile', b).click());
        $('#impFile', b).addEventListener('change', async e => {
          const f = e.target.files[0]; if (!f) return;
          try { const d = JSON.parse(await f.text()); if (!d || d.v !== 1) throw 0; if (!confirm('Replace everything on this device with this backup?')) return; data = normalize(d); save(); sheet.close(); renderAll(); toast('Backup restored'); } catch { toast('That file is not a Home Dashboard backup'); }
        });
      }
    });
}
$('#btnSettings').addEventListener('click', openSettings);

/* ================= password gate ================= */
// Client-side only: keeps casual visitors out and remembers this device once unlocked. Not real security.
const AUTH_KEY = 'hd.v1.auth';
async function sha(p) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hd-v1:' + p)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
$('#gateForm').addEventListener('submit', async e => {
  e.preventDefault(); const inp = $('#gatePw'), err = $('#gateErr'), f = e.currentTarget;
  try {
    const h = await sha(inp.value.trim());
    if (h === window.__H) { lsSet(AUTH_KEY, h); document.documentElement.classList.remove('locked'); inp.value = ''; err.hidden = true; return; }
    err.textContent = 'That password is not right. Try again.';
  } catch { err.textContent = 'This browser cannot check the password here. Open the https link.'; }
  err.hidden = false; inp.value = ''; inp.focus(); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
});
if (document.documentElement.classList.contains('locked')) setTimeout(() => $('#gatePw').focus(), 50);

/* ================= boot ================= */
hydrateIcons();
applyTheme();
renderAll();
loadDublin();
loadFeed();
setSyncState(sync.state === 'off' ? 'off' : 'ok');
if (sync.token) { lastPull = Date.now(); syncNow(); }
if (new URLSearchParams(location.search).has('add')) setTimeout(() => openQuickAdd(), 50);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
window.__hd = { get data() { return data; } }; // handy for debugging in the console
})();
