'use strict';
/* ================= wall display (mounted tablet) =================
   Per device (Settings → This device → Wall display mode):
   - screen stays awake, weather/news refresh every 15 min, the date rolls over at midnight
   - after 3 idle minutes it scrolls back to the top (and to Today on a phone)
   - after N idle minutes a screensaver: clock + date + weather + next event, over your photos
   - night (10 PM to 6 AM): dark theme and a dim clock instead of photos
   Photos are stored on this device only (IndexedDB), never synced or uploaded. */
const NIGHT_FROM = 22, NIGHT_TO = 6;
const isNight = (d = new Date()) => { const h = d.getHours(); return NIGHT_FROM > NIGHT_TO ? h >= NIGHT_FROM || h < NIGHT_TO : h >= NIGHT_FROM && h < NIGHT_TO; };
const nightOn = () => !!(devPrefs.wall && devPrefs.night && isNight());
let wakeLock = null, wallTimer = 0, wallRefresh = 0, wallDay = todayStr(), wallNight = null, lastActive = Date.now(), wentTop = false;

async function wake() {
  if (!devPrefs.wall || wakeLock || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch { }
}
function applyWall() {
  document.documentElement.classList.toggle('wall', !!devPrefs.wall);
  clearInterval(wallTimer); clearInterval(wallRefresh);
  if (!devPrefs.wall) { if (wakeLock) { wakeLock.release().catch(() => { }); wakeLock = null; } hideSaver(); applyTheme(); return; }
  wake(); lastActive = Date.now(); wallNight = null; wallTick();
  wallTimer = setInterval(wallTick, 15e3);
  wallRefresh = setInterval(() => { loadWeather(true); loadDublin(true); loadNews(); pullIfStale(); }, 15 * 60e3);
}
function wallTick() {
  if (todayStr() !== wallDay) { wallDay = todayStr(); renderAll(); } // past midnight: new date, new "today" everywhere
  else renderHeader();
  const n = nightOn(); if (n !== wallNight) { wallNight = n; applyTheme(); if (saverOn) showSaver(); }
  const idle = Date.now() - lastActive;
  const busy = sheet.open || editing || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
  if (busy) return;
  if (idle >= 3 * 60e3 && !wentTop) {
    wentTop = true; scrollTo({ top: 0, behavior: 'smooth' }); $$('.card .body').forEach(b => { b.scrollTop = 0; });
    if (curPhone && ptab !== 'home') setTab('home');
  }
  if (devPrefs.saver !== 'off' && idle >= (devPrefs.saverMin || 5) * 60e3 && !saverOn) showSaver();
  if (saverOn) renderSaverInfo();
}
['pointerdown', 'keydown', 'wheel'].forEach(t => addEventListener(t, () => { lastActive = Date.now(); wentTop = false; }, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); if (devPrefs.wall) wallTick(); } });

/* ---------- photos (IndexedDB, this device only) ---------- */
const photoDb = () => new Promise((res, rej) => {
  const r = indexedDB.open('hd-photos', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' });
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function photoTx(mode, fn) {
  const db = await photoDb();
  return new Promise((res, rej) => { const tx = db.transaction('p', mode), st = tx.objectStore('p'), out = fn(st); tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined); tx.onerror = () => rej(tx.error); });
}
const photoAll = () => photoTx('readonly', st => st.getAll()).catch(() => []);
const photoCount = () => photoTx('readonly', st => st.count()).catch(() => 0);
const photoClear = () => photoTx('readwrite', st => st.clear());
async function shrink(file, max = 1920) { // big phone photos would fill the storage quickly, so keep a screen-sized copy
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
  return new Promise(res => c.toBlob(res, 'image/jpeg', .86));
}
async function photoAdd(files) {
  let n = 0;
  for (const f of files) {
    try { const blob = await shrink(f); if (blob) { await photoTx('readwrite', st => st.put({ id: uid(), blob, added: Date.now() })); n++; } } catch { }
  }
  return n;
}

/* ---------- screensaver ---------- */
let saverOn = false, saverEl = null, saverPics = [], saverIdx = 0, saverTimer = 0, saverUrls = [];
async function showSaver() {
  if (!saverEl) {
    saverEl = document.createElement('div'); saverEl.id = 'saver'; saverEl.setAttribute('role', 'dialog'); saverEl.setAttribute('aria-label', 'Screensaver. Tap to close.');
    saverEl.innerHTML = '<img class="sv-img a" alt=""><img class="sv-img b" alt=""><div class="sv-shade"></div><div class="sv-info"></div><div class="sv-hint">Tap anywhere to go back</div>';
    // the tap that wakes it must not also press whatever is underneath
    saverEl.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); lastActive = Date.now(); setTimeout(hideSaver, 0); });
    saverEl.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    document.body.appendChild(saverEl);
  }
  saverOn = true; clearInterval(saverTimer); saverUrls.forEach(URL.revokeObjectURL); saverUrls = [];
  const night = nightOn(), photos = devPrefs.saver === 'photos' && !night;
  saverEl.classList.toggle('night', night); saverEl.classList.toggle('photos', photos); saverEl.hidden = false;
  $$('.sv-img', saverEl).forEach(i => { i.removeAttribute('src'); i.classList.remove('on'); });
  renderSaverInfo();
  if (photos) {
    saverPics = (await photoAll()).sort(() => Math.random() - .5); saverIdx = 0;
    if (saverPics.length) { nextPic(); if (saverPics.length > 1) saverTimer = setInterval(nextPic, 20e3); }
  }
}
function nextPic() {
  if (!saverOn || !saverPics.length) return;
  const imgs = $$('.sv-img', saverEl), show = imgs[saverIdx % 2], hide = imgs[(saverIdx + 1) % 2];
  const url = URL.createObjectURL(saverPics[saverIdx % saverPics.length].blob); saverUrls.push(url);
  show.onload = () => { show.classList.add('on'); hide.classList.remove('on'); while (saverUrls.length > 2) URL.revokeObjectURL(saverUrls.shift()); };
  show.src = url; saverIdx++;
}
function renderSaverInfo() {
  if (!saverEl) return; const now = new Date(), ev = W.events && W.events.upcoming ? W.events.upcoming()[0] : null;
  const t = wx && wx.cur && wx.cur.temperature_2m, w = Number.isFinite(t) ? `${WMO(wx.cur.weather_code)[0]} ${Math.round(t)}°` : '';
  $('.sv-info', saverEl).innerHTML = `<div class="sv-time">${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
    <div class="sv-date">${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}${w ? ` · ${esc(w)}` : ''}</div>
    ${ev ? `<div class="sv-ev">Next: ${esc(ev.t)} · ${esc(fmtDay(ev.date))}${ev.time ? ', ' + esc(fmtTime(ev.time)) : ''}</div>` : ''}`;
}
function hideSaver() {
  saverOn = false; clearInterval(saverTimer); if (saverEl) saverEl.hidden = true;
  saverUrls.forEach(URL.revokeObjectURL); saverUrls = [];
}

/* ---------- Settings → This device → Wall display ---------- */
function wallSettingsHtml() {
  return `<label class="swrow"><span>Wall display mode<small style="display:block;font-weight:500;color:var(--faint)">For a mounted tablet: keeps the screen on, refreshes weather and news, goes back to the top after 3 idle minutes.</small></span><input type="checkbox" role="switch" id="devWall"${devPrefs.wall ? ' checked' : ''}></label>
    <div id="wallOpts" class="wall-opts"${devPrefs.wall ? '' : ' hidden'}>
      <div class="muted dev-lbl">Screensaver</div>${segHtml('saver', devPrefs.saver, [['off', 'Off'], ['clock', 'Clock'], ['photos', 'Photos']])}
      <div class="muted dev-lbl">Start it after</div>${segHtml('saverMin', devPrefs.saverMin, [[2, '2 min'], [5, '5 min'], [10, '10 min'], [30, '30 min']])}
      <div class="muted dev-lbl">Photos <small style="font-weight:500;color:var(--faint)">kept on this tablet only</small></div>
      <div class="row2"><button class="btn" type="button" id="phAdd">Add photos</button><button class="btn" type="button" id="phClear">Remove all</button><span class="muted" id="phCount" style="align-self:center"></span><input type="file" id="phFile" accept="image/*" multiple hidden></div>
      <label class="swrow"><span>Night mode<small style="display:block;font-weight:500;color:var(--faint)">10 PM to 6 AM: dark theme, and a dim clock instead of photos.</small></span><input type="checkbox" role="switch" id="devNight"${devPrefs.night ? ' checked' : ''}></label>
      <div class="row2"><button class="btn" type="button" id="svPreview">Preview screensaver</button></div>
    </div>`;
}
function bindWallSettings(b) {
  const count = async () => { const n = await photoCount(); $('#phCount', b).textContent = n ? `${n} photo${n === 1 ? '' : 's'}` : 'No photos yet'; };
  count();
  $('#devWall', b).addEventListener('change', e => {
    devPrefs.wall = e.target.checked; saveDev(); applyWall(); $('#wallOpts', b).hidden = !devPrefs.wall;
    toast(devPrefs.wall ? ('wakeLock' in navigator ? 'Wall mode on. The screen will stay awake.' : 'Wall mode on. This browser cannot keep the screen awake, so set auto-lock to Never.') : 'Wall mode off');
  });
  $('#devNight', b).addEventListener('change', e => { devPrefs.night = e.target.checked; saveDev(); wallNight = null; applyWall(); });
  $('#phAdd', b).addEventListener('click', () => $('#phFile', b).click());
  $('#phFile', b).addEventListener('change', async e => {
    const files = [...e.target.files]; if (!files.length) return; $('#phCount', b).textContent = 'Adding…';
    const n = await photoAdd(files); e.target.value = ''; count();
    toast(n ? `Added ${n} photo${n === 1 ? '' : 's'}` : 'Those photos could not be added');
    if (n && devPrefs.saver !== 'photos') { devPrefs.saver = 'photos'; saveDev(); const r = $('[data-dev="saver"] input[value="photos"]', b); if (r) r.checked = true; }
  });
  $('#phClear', b).addEventListener('click', async () => { if (!confirm('Remove all screensaver photos from this tablet?')) return; await photoClear(); count(); });
  $('#svPreview', b).addEventListener('click', () => { sheet.close(); setTimeout(showSaver, 150); });
}
