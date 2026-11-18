'use strict';
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
applyDevice();
renderAll();
applyWall();
loadDublin();
fetch('layout.default.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
  if (!j || !j.layout) return;
  sharedLayout = j;
  if (stockLayout()) { data.layout = {}; if ('hideTop' in j) data.settings.hideTop = !!j.hideTop; applyTop(); renderAll(); }
}).catch(() => { });
loadFeed(); loadNews();
setSyncState(sync.state === 'off' ? 'off' : 'ok');
if (sync.token) { lastPull = Date.now(); syncNow(); }
const qs = new URLSearchParams(location.search);
if (qs.has('add') || qs.has('voice')) setTimeout(() => openQuickAdd(undefined, { voice: qs.has('voice') }), 50);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
window.__hd = { get data() { return data; } }; // handy for debugging in the console
