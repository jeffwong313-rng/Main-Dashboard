'use strict';
/* ================= sync (private GitHub Gist) ================= */
const FILE = 'main-dashboard.json';
let sync = Object.assign({ token: '', gistId: '', last: 0, state: 'off', err: '' }, (() => { try { return JSON.parse(lsGet(SYNC_KEY)) || {}; } catch { return {}; } })());
const saveSyncCfg = () => lsSet(SYNC_KEY, JSON.stringify(sync));
let syncing = false, syncQueued = false, syncTimer = 0;
// the copy this device and the cloud last agreed on; lets sync merge item by item instead of "newest file wins"
const BASE_KEY = 'hd.v1.syncBase';
const loadBase = () => { try { return JSON.parse(lsGet(BASE_KEY)); } catch { return null; } };
const saveBase = d => { if (!lsSet(BASE_KEY, JSON.stringify(d))) { try { localStorage.removeItem(BASE_KEY); } catch { } } };
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
    const push = async (d = data) => { await gh('/gists/' + sync.gistId, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(d) } } }) }); };
    const snap = JSON.stringify(data); // this device as it was when the sync started
    if (!sync.gistId) {
      const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'Home Dashboard data (managed by the app, safe to ignore)', public: false, files: { [FILE]: { content: JSON.stringify(data) } } }) });
      sync.gistId = g.id; saveBase(data);
    } else {
      const g = await gh('/gists/' + sync.gistId); const f = g.files && g.files[FILE]; let text = f && f.content;
      if (f && f.truncated) text = await (await fetch(f.raw_url)).text();
      let remote = null; try { remote = JSON.parse(text); } catch { }
      if (!remote || remote.v !== 1) { await push(); saveBase(data); }
      else if (first && hasData(data) && hasData(remote)) {
        if (confirm('Found your dashboard in the cloud.\n\nOK: use the cloud copy on this device (replaces what is here).\nCancel: keep this device and overwrite the cloud copy.')) { adopt(remote); saveBase(remote); } else { await push(); saveBase(data); }
      }
      else {
        const base = loadBase();
        // no agreed copy yet (first sync after this update): fall back once to "newest wins" so nothing deleted comes back
        let merged = base ? normalize(mergeData(base, JSON.parse(snap), remote)) : remote.updated > data.updated ? normalize(remote) : JSON.parse(snap);
        // anything typed while we were talking to GitHub is merged on top, and sent on the next pass
        if (JSON.stringify(data) !== snap) { merged = normalize(mergeData(JSON.parse(snap), data, merged)); syncQueued = true; }
        if (!same(merged, remote)) await push(merged);
        saveBase(merged);
        if (!same(merged, data)) { const fromCloud = !same(merged, JSON.parse(snap)); adopt(merged); if (fromCloud && !syncQueued) toast('Updated with changes from another device'); }
      }
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
