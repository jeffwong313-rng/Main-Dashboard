'use strict';
/* ================= layout ================= */
const ALL = ['todo', 'shop', 'notes', 'events', 'calendar', 'news', 'weather', 'recipes', 'watch', 'meals', 'bills', 'chores', 'links'];
const COLS = { desktop: 12, tablet: 6, mobile: 2 };
const MINC = { desktop: 3, tablet: 2, mobile: 1 };
const MINR = 4;
const DEF = {
  desktop: {
    order: ['todo', 'shop', 'notes', 'events', 'calendar', 'news', 'weather', 'recipes', 'watch', 'meals', 'bills', 'chores', 'links'],
    items: { todo: { c: 4, r: 9 }, shop: { c: 4, r: 9 }, notes: { c: 4, r: 9 }, events: { c: 4, r: 8 }, calendar: { c: 5, r: 11 }, news: { c: 4, r: 11 }, weather: { c: 3, r: 8 }, recipes: { c: 5, r: 8 }, watch: { c: 4, r: 9 }, meals: { c: 6, r: 9 }, bills: { c: 3, r: 8 }, chores: { c: 3, r: 8 }, links: { c: 12, r: 4 } }
  },
  tablet: {
    order: ['todo', 'shop', 'notes', 'events', 'calendar', 'news', 'weather', 'recipes', 'watch', 'bills', 'meals', 'chores', 'links'],
    items: { todo: { c: 3, r: 9 }, shop: { c: 3, r: 9 }, notes: { c: 6, r: 6 }, events: { c: 3, r: 8 }, calendar: { c: 6, r: 11 }, news: { c: 6, r: 9 }, weather: { c: 3, r: 8 }, recipes: { c: 3, r: 8 }, watch: { c: 3, r: 9 }, bills: { c: 3, r: 8 }, meals: { c: 6, r: 9 }, chores: { c: 3, r: 7 }, links: { c: 3, r: 7 } }
  },
  mobile: {
    order: ['todo', 'shop', 'notes', 'events', 'news', 'calendar', 'recipes', 'watch', 'meals', 'bills', 'chores', 'weather', 'links'],
    items: { todo: { c: 2, r: 8 }, shop: { c: 2, r: 8 }, notes: { c: 2, r: 8 }, events: { c: 2, r: 6 }, calendar: { c: 2, r: 12 }, news: { c: 2, r: 11 }, recipes: { c: 2, r: 7 }, watch: { c: 2, r: 9 }, meals: { c: 2, r: 9 }, bills: { c: 2, r: 7 }, chores: { c: 2, r: 6 }, weather: { c: 2, r: 5 }, links: { c: 2, r: 4 } }
  }
};
const mqMobile = matchMedia('(max-width: 699px)'), mqTablet = matchMedia('(max-width: 1099px)');
const bp = () => mqMobile.matches ? 'mobile' : mqTablet.matches ? 'tablet' : 'desktop';
const stockLayout = () => Object.entries(data.layout).every(([b, L]) => DEF[b] && !(L.hidden || []).length && JSON.stringify(L.order) === JSON.stringify(DEF[b].order) && ALL.every(id => !L.items[id] || (L.items[id].c === DEF[b].items[id].c && L.items[id].r === DEF[b].items[id].r)));
let sharedLayout = null; // layout.default.json: what a device shows until it is customized there
const sharedFor = b => sharedLayout && sharedLayout.layout && sharedLayout.layout[b] ? JSON.parse(JSON.stringify(sharedLayout.layout[b])) : null;
const cellsHit = (a, b) => a.x < b.x + b.c && b.x < a.x + a.c && a.y < b.y + b.r && b.y < a.y + a.r;
function firstFit(placed, c, r, cols) {
  for (let y = 1; y < 500; y++) for (let x = 1; x + c - 1 <= cols; x++) if (!placed.some(p => cellsHit({ x, y, c, r }, p))) return { x, y };
  return { x: 1, y: 500 };
}
function layout() {
  const b = bp(), D = DEF[b];
  const L = (data.layout[b] = data.layout[b] || sharedFor(b) || { order: [], items: {}, hidden: [] });
  L.hidden = L.hidden || []; L.items = L.items || {};
  if (!L.order || (!L.order.length && !L.hidden.length)) L.order = [...D.order];
  ALL.forEach(id => {
    if (!L.items[id]) L.items[id] = { ...D.items[id] };
    L.items[id].c = clamp(L.items[id].c, MINC[b], COLS[b]);
    if (!L.order.includes(id) && !L.hidden.includes(id)) L.order.push(id);
  });
  L.order = L.order.filter(id => W[id] && !L.hidden.includes(id));
  // free placement: every card owns a cell (x column, y row, in base grid units); anything unplaced or overlapping is dropped into the first free spot
  const placed = [];
  L.order.forEach(id => {
    const it = L.items[id];
    const ok = Number.isInteger(it.x) && Number.isInteger(it.y) && it.x >= 1 && it.y >= 1 && it.x + it.c - 1 <= COLS[b] && !placed.some(p => cellsHit(it, p));
    if (!ok) { const p = firstFit(placed, it.c, it.r, COLS[b]); it.x = p.x; it.y = p.y; }
    placed.push(it);
  });
  return L;
}
