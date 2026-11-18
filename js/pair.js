'use strict';
/* ================= add a device / sign out this device =================
   Add a device: a QR code / link that carries this device's sync key and Gist id in the URL fragment
   (after #, which browsers never send to any server). Opening it on another device unlocks the
   dashboard, connects sync and pulls everything down. Treat the code like a house key.
   Sign out: syncs any last changes, then removes everything the dashboard stored in this browser. */
const PAIR_RE = /(?:^|[#&?])pair=([A-Za-z0-9_-]+)/;
const b64u = {
  enc: s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))
};
const pairLink = () => `${location.origin}${location.pathname}#pair=${b64u.enc(JSON.stringify({ v: 1, t: sync.token, g: sync.gistId }))}`;
function readPair(text) {
  const m = String(text || '').trim().match(PAIR_RE) || String(text || '').trim().match(/^([A-Za-z0-9_-]{20,})$/);
  if (!m) return null;
  try { const p = JSON.parse(b64u.dec(m[1])); return p && p.t && p.g ? p : null; } catch { return null; }
}
async function applyPair(p) {
  if (!p) { toast('That code or link is not a valid device link'); return false; }
  if (sync.token === p.t && sync.gistId === p.g) { lsSet(AUTH_KEY, window.__H); document.documentElement.classList.remove('locked'); toast('This device is already set up'); return true; }
  if (!confirm('Set up this device with the shared home dashboard?\n\nIt will sync with your other devices from now on.')) return false;
  lsSet(AUTH_KEY, window.__H); document.documentElement.classList.remove('locked');
  if (!hasData(data)) { data.updated = 0; persist(); } // nothing here yet: the cloud copy simply wins
  try { localStorage.removeItem(BASE_KEY); } catch { }
  sync = { token: p.t, gistId: p.g, last: 0, state: 'syncing', err: '' }; saveSyncCfg();
  lastPull = Date.now(); await syncNow({ first: true });
  toast(sync.state === 'error' ? sync.err || 'Could not reach GitHub. It will try again shortly.' : 'This device is set up and synced');
  return true;
}
// a device link was opened: take it out of the address bar and history first, then set up
function pairFromUrl() {
  const m = location.hash.match(PAIR_RE); if (!m) return false;
  history.replaceState(null, '', location.pathname + location.search);
  setTimeout(() => applyPair(readPair('pair=' + m[1])), 300);
  return true;
}

/* ---------- the QR code sheet ---------- */
let qrLib = null;
const loadQr = () => qrLib || (qrLib = new Promise((res, rej) => {
  if (window.qrcode) return res(window.qrcode);
  const s = document.createElement('script'); s.src = 'js/vendor/qrcode.js'; s.onload = () => res(window.qrcode); s.onerror = () => { qrLib = null; rej(); };
  document.head.appendChild(s);
}));
async function openAddDevice() {
  if (!sync.token || !sync.gistId) { toast('Turn on sync first, then you can add devices'); return; }
  const link = pairLink();
  openSheet(`<div class="pair">
      <p style="margin:0">On the other phone, tablet or computer, <b>scan this with the camera</b>, or send yourself the link and open it there. It sets everything up in one step: no password and no token to type.</p>
      <div class="pair-qr" id="pairQr" role="img" aria-label="QR code that sets up another device"><span class="muted">Making the code…</span></div>
      <div class="row2 pair-btns">${navigator.share ? '<button class="btn primary" type="button" id="pairShare">Send link</button>' : ''}<button class="btn${navigator.share ? '' : ' primary'}" type="button" id="pairCopy">Copy link</button></div>
      <p class="muted pair-note"><b>Treat this like a house key.</b> Anyone with the code or link can see and change the dashboard, so send it only to your household and don't post a screenshot of it. If a link ever ends up in the wrong place, delete the token on GitHub (Settings → Developer settings → Tokens) and connect again with a new one; the old links stop working.</p>
      <p class="muted pair-note"><b>iPhone and iPad:</b> a home-screen app keeps its own storage, separate from Safari. Add the dashboard to the home screen first, open it, then go to Settings → Sync and paste the link.</p>
    </div>`, {
    title: 'Add a device', onOpen(b) {
      loadQr().then(qrcode => {
        const q = qrcode(0, 'L'); q.addData(link); q.make();
        $('#pairQr', b).innerHTML = q.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
      }).catch(() => { $('#pairQr', b).innerHTML = '<span class="muted">Could not make the QR code here. Use Copy link instead.</span>'; });
      const share = $('#pairShare', b);
      share && share.addEventListener('click', () => navigator.share({ title: 'Home dashboard', text: 'Open this to set up our home dashboard on your device:', url: link }).catch(() => { }));
      $('#pairCopy', b).addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(link); toast('Link copied'); }
        catch { prompt('Copy this link:', link); }
      });
    }
  });
}

/* ---------- sign out this device ---------- */
async function signOutDevice() {
  const synced = !!sync.token;
  if (!confirm(synced
    ? 'Sign out this device?\n\nThis removes the dashboard, its sync key and its settings from this browser. Everything stays in the cloud and on your other devices.'
    : 'Sign out this device?\n\nSync is off, so your dashboard only lives in this browser and will be deleted. Download a backup first if you want to keep it.')) return;
  if (synced) {
    toast('Saving your last changes…');
    for (let i = 0; syncing && i < 50; i++) await new Promise(r => setTimeout(r, 200)); // let a running sync finish
    await syncNow();
    if (sync.state === 'error' && !confirm('The latest changes on this device could not be saved to the cloud.\n\nSign out anyway and lose them?')) return;
  }
  clearTimeout(syncTimer);
  try { Object.keys(localStorage).filter(k => k.startsWith('hd.v1.')).forEach(k => localStorage.removeItem(k)); } catch { }
  try { indexedDB.deleteDatabase('hd-photos'); } catch { }
  try { if (window.caches) (await caches.keys()).forEach(k => caches.delete(k)); } catch { }
  location.replace(location.pathname);
}
