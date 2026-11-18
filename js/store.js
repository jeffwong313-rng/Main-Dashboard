'use strict';
/* ================= state ================= */
const KEY = 'hd.v1.data', THEME_KEY = 'hd.v1.theme', SYNC_KEY = 'hd.v1.sync', WX_KEY = 'hd.v1.wx', QA_KEY = 'hd.v1.qaType';
const lsGet = (k, d = null) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };

const defaults = () => ({
  v: 1, updated: 0, todos: [], shop: [], notes: [], recipes: [], watch: [], events: [], meals: {}, chores: [], bills: [], links: [],
  layout: {}, pins: {}, order: {}, settings: { name: '', units: 'f', city: null }, newsFav: []
});
function normalize(d) {
  const base = defaults(); const out = Object.assign(base, d || {});
  out.settings = Object.assign(defaults().settings, (d && d.settings) || {});
  out.layout = (d && d.layout) || {};
  ['todos', 'shop', 'notes', 'recipes', 'watch', 'events', 'chores', 'bills', 'links'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  if (!out.meals || typeof out.meals !== 'object') out.meals = {};
  if (!Array.isArray(out.newsFav)) out.newsFav = [];
  ['pins', 'order'].forEach(k => { if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {}; });
  return out;
}
let data = (() => { try { const d = JSON.parse(lsGet(KEY)); if (d && d.v === 1) return normalize(d); } catch { } return defaults(); })();
// Drop events that ended more than 30 days ago so the list stays tidy.
data.events = data.events.filter(e => daysFromToday(parseDate(evEnd(e))) >= -30);

function persist() { if (!lsSet(KEY, JSON.stringify(data))) toast('Could not save: browser storage is full or blocked'); }
function save() { data.updated = Date.now(); persist(); scheduleSync(); }
