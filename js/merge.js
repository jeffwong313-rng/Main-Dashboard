'use strict';
/* ================= three-way merge for sync =================
   base   = the copy both devices last agreed on (saved after every successful sync)
   local  = this device now, remote = the cloud copy now
   Rules, applied per list item (by id) and per field:
   - changed on one side only  -> take that side
   - changed on both sides     -> objects merge field by field; anything else keeps this device's version
   - deleted on one side, untouched on the other -> stays deleted
   - deleted on one side, edited on the other    -> the edit wins (nothing you just typed disappears)
   - added on either side      -> kept, in roughly the position it was added */
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isIdList = v => Array.isArray(v) && v.length > 0 && v.every(x => isObj(x) && typeof x.id === 'string');

function mergeValue(b, l, r) {
  if (same(l, r)) return l;
  if (same(l, b)) return r;
  if (same(r, b)) return l;
  if (isObj(l) && isObj(r)) return mergeObject(isObj(b) ? b : {}, l, r);
  if ((isIdList(l) || isIdList(r) || isIdList(b)) && Array.isArray(l) && Array.isArray(r)) return mergeIdList(Array.isArray(b) ? b : [], l, r);
  return l; // true conflict on a plain value: this device wins
}
function mergeObject(b, l, r) {
  const out = {}, keys = new Set([...Object.keys(l), ...Object.keys(r)]);
  keys.forEach(k => {
    const inL = k in l, inR = k in r, inB = k in b;
    if (inL && inR) { out[k] = mergeValue(b[k], l[k], r[k]); return; }
    // present on one side only: added there, or deleted on the other side
    const v = inL ? l[k] : r[k];
    if (!inB || !same(v, b[k])) out[k] = v; // added, or edited after the other side deleted it
  });
  return out;
}
function mergeIdList(b, l, r) {
  const B = new Map(b.map(x => [x.id, x])), L = new Map(l.map(x => [x.id, x])), R = new Map(r.map(x => [x.id, x]));
  const keep = id => {
    const lb = B.get(id), li = L.get(id), ri = R.get(id);
    if (li && ri) return mergeValue(lb, li, ri);
    const v = li || ri;
    return !lb || !same(v, lb) ? v : null; // untouched item deleted elsewhere -> drop
  };
  // this device's order first, then slot in items that only exist remotely after their remote neighbour
  const out = []; l.forEach(x => { const v = keep(x.id); if (v) out.push(v); });
  r.forEach((x, i) => {
    if (L.has(x.id)) return; const v = keep(x.id); if (!v) return;
    let at = 0; for (let j = i - 1; j >= 0; j--) { const k = out.findIndex(o => o.id === r[j].id); if (k >= 0) { at = k + 1; break; } }
    out.splice(at, 0, v);
  });
  return out;
}
// whole dashboard: every top-level key is merged with the rules above; "updated" is the newest of the two
function mergeData(base, local, remote) {
  const m = mergeObject(base || {}, local, remote);
  m.v = 1; m.updated = Math.max(local.updated || 0, remote.updated || 0);
  return m;
}
if (typeof module !== 'undefined') module.exports = { mergeData };
