'use strict';
/* ================= device: view (phone / big screen) + controls (touch / mouse) =================
   Per-device, never synced: a wall tablet and a laptop can share data but behave differently.
   view  auto -> phone when the window is narrow (or a landscape phone), otherwise the big-screen grid
   input auto -> follows whatever you last used (finger/pen vs mouse), so 2-in-1 laptops switch on their own */
const DEV_KEY = 'hd.v1.device', PTAB_KEY = 'hd.v1.ptab', TIP_KEY = 'hd.v1.swipeTip';
const devPrefs = Object.assign({ view: 'auto', input: 'auto', wall: false }, (() => { try { return JSON.parse(lsGet(DEV_KEY)) || {}; } catch { return {}; } })());
const saveDev = () => lsSet(DEV_KEY, JSON.stringify(devPrefs));
const mqCoarse = matchMedia('(pointer: coarse)');
let lastPointer = mqCoarse.matches ? 'touch' : 'mouse';
const device = {
  get phone() {
    if (devPrefs.view !== 'auto') return devPrefs.view === 'phone';
    return innerWidth < 700 || (innerHeight < 500 && innerWidth < 1000 && mqCoarse.matches);
  },
  get touch() { return devPrefs.input !== 'auto' ? devPrefs.input === 'touch' : lastPointer === 'touch'; }
};
let curPhone = null;
function applyDevice() {
  const root = document.documentElement, ph = device.phone, t = device.touch;
  root.classList.toggle('view-phone', ph); root.classList.toggle('view-large', !ph);
  root.classList.toggle('touch', t); root.classList.toggle('mouse', !t);
  if (ph !== curPhone) { curPhone = ph; if (editing) setEditing(false); applyPhone(); }
  if (t && !lsGet(TIP_KEY) && document.querySelector('.card .rows > li.row')) { lsSet(TIP_KEY, '1'); setTimeout(() => toast('Tip: swipe a row right to finish it, left to delete it'), 1200); }
}
// switch input mode after the tap finishes, so targets don't resize under the finger mid-tap
addEventListener('pointerup', e => {
  if (devPrefs.input !== 'auto') return;
  const p = e.pointerType === 'mouse' ? 'mouse' : 'touch';
  if (p !== lastPointer) { lastPointer = p; setTimeout(applyDevice, 0); }
}, true);
let resizeRaf = 0;
addEventListener('resize', () => { if (!resizeRaf) resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; applyDevice(); }); });

/* ---------- phone view: one column, bottom tabs ---------- */
const PTABS = [
  { k: 'home', label: 'Today', icon: 'home', qa: 'todo' },
  { k: 'lists', label: 'Lists', icon: 'cart', qa: 'shop' },
  { k: 'plan', label: 'Plan', icon: 'calendar', qa: 'events' },
  { k: 'food', label: 'Food', icon: 'utensils', qa: 'shop' },
  { k: 'more', label: 'More', icon: 'dots', qa: 'notes' }
];
const PTAB_DEF = { todo: 'home', events: 'home', news: 'home', shop: 'lists', chores: 'lists', watch: 'lists', calendar: 'plan', bills: 'plan', meals: 'food', recipes: 'food', notes: 'more', links: 'more', weather: 'more' };
const ATTN = ['todo', 'shop', 'chores', 'bills']; // cards whose count means "needs you" (tab badges)
let ptab = lsGet(PTAB_KEY, 'home'); const ptabScroll = {};
const phoneCfg = () => { if (!data.phone || typeof data.phone !== 'object') data.phone = {}; data.phone.tab = data.phone.tab || {}; data.phone.order = data.phone.order || []; return data.phone; };
const phoneTabOf = id => { const t = data.phone && data.phone.tab && data.phone.tab[id]; return PTABS.some(x => x.k === t) ? t : (PTAB_DEF[id] || 'more'); };
const phoneOrder = () => {
  const o = (data.phone && data.phone.order) || [], base = DEF.mobile.order;
  const rank = id => { const i = o.indexOf(id); return i < 0 ? 1000 + base.indexOf(id) : i; };
  return [...ALL].sort((a, b) => rank(a) - rank(b));
};
function applyPhone() {
  const bar = $('#tabbar'); if (!bar) return;
  bar.hidden = !curPhone;
  const tops = [$('#kpis'), $('#kpiTiles')];
  if (!curPhone) { Object.values(cards).forEach(c => { c.classList.remove('off-tab'); c.style.order = ''; }); tops.forEach(el => el.classList.remove('off-tab')); const e = $('#tabEmpty'); e && e.remove(); return; }
  if (!PTABS.some(t => t.k === ptab)) ptab = 'home';
  const ord = phoneOrder(); let shown = 0;
  Object.entries(cards).forEach(([id, c]) => { const on = phoneTabOf(id) === ptab; c.classList.toggle('off-tab', !on); c.style.order = ord.indexOf(id); shown += on; });
  tops.forEach(el => el.classList.toggle('off-tab', ptab !== 'home'));
  let e = $('#tabEmpty');
  if (!shown) { if (!e) { e = document.createElement('div'); e.id = 'tabEmpty'; e.className = 'tab-empty'; grid.appendChild(e); } e.innerHTML = `${empty('Nothing on this tab', 'Tap the grid button at the top to choose which cards live here.')}`; }
  else if (e) e.remove();
  renderTabbar();
}
function renderTabbar() {
  const bar = $('#tabbar'); if (!bar || !curPhone) return;
  bar.innerHTML = PTABS.map(t => {
    const n = ATTN.filter(id => cards[id] && phoneTabOf(id) === t.k).reduce((s, id) => s + (W[id].count ? W[id].count() : 0), 0);
    return `<button type="button" data-tab="${t.k}"${t.k === ptab ? ' aria-current="page"' : ''}>${icon(t.icon)}<span>${t.label}</span>${n ? `<b>${n > 99 ? '99+' : n}</b>` : ''}</button>`;
  }).join('');
}
let tabbarQueued = false;
const queueTabbar = () => { if (tabbarQueued) return; tabbarQueued = true; requestAnimationFrame(() => { tabbarQueued = false; renderTabbar(); }); };
function setTab(k, { keepScroll = false } = {}) {
  if (k === ptab && !keepScroll) { scrollTo({ top: 0, behavior: 'smooth' }); return; } // tap the active tab again = back to top
  ptabScroll[ptab] = scrollY; ptab = k; lsSet(PTAB_KEY, k); applyPhone();
  if (!keepScroll) scrollTo(0, ptabScroll[k] || 0);
}
$('#tabbar').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { setTab(b.dataset.tab); if (navigator.vibrate) navigator.vibrate(6); } });

// Customize on a phone: pick each card's tab and order (dragging a grid makes no sense on one column)
function openPhoneArrange() {
  const draw = b => {
    const ord = phoneOrder();
    b.innerHTML = `<p class="muted" style="margin:0 0 4px">Choose which tab each card lives on and its order. Changes apply right away and sync to your other phones.</p>` +
      PTABS.map(t => {
        const ids = ord.filter(id => W[id] && phoneTabOf(id) === t.k);
        return `<div class="set-group pa-tab"><h3 class="pa-h">${icon(t.icon)} ${t.label}</h3>${ids.length ? ids.map((id, i) => `<div class="pa-row" data-id="${id}">
          <span class="pa-name${isCardHidden(id) ? ' off' : ''}">${esc(W[id].title)}</span>
          <button class="icon-btn" type="button" data-pa="up"${i ? '' : ' disabled'} aria-label="Move ${esc(W[id].title)} up">${icon('up')}</button>
          <button class="icon-btn" type="button" data-pa="down"${i < ids.length - 1 ? '' : ' disabled'} aria-label="Move ${esc(W[id].title)} down">${icon('down')}</button>
          <select data-pa="tab" aria-label="Tab for ${esc(W[id].title)}">${PTABS.map(x => `<option value="${x.k}"${x.k === t.k ? ' selected' : ''}>${x.label}</option>`).join('')}</select>
          <input type="checkbox" role="switch" data-pa="vis" aria-label="Show ${esc(W[id].title)}"${isCardHidden(id) ? '' : ' checked'}></div>`).join('') : '<p>No cards here.</p>'}</div>`;
      }).join('') + `<div class="actions"><button class="btn" type="button" data-pa="reset">Reset tabs</button><button class="btn primary" type="button" data-close>Done</button></div>`;
  };
  openSheet('', {
    title: 'Arrange phone tabs', onOpen(b) {
      draw(b);
      const move = (id, dir) => {
        const ord = phoneOrder(), tab = phoneTabOf(id), same = ord.filter(x => phoneTabOf(x) === tab), i = same.indexOf(id), j = i + dir;
        if (j < 0 || j >= same.length) return;
        const a = ord.indexOf(id), z = ord.indexOf(same[j]); [ord[a], ord[z]] = [ord[z], ord[a]];
        phoneCfg().order = ord; save(); applyPhone(); draw(b);
        const btn = $(`.pa-row[data-id="${id}"] [data-pa="${dir < 0 ? 'up' : 'down'}"]`, b); btn && !btn.disabled && btn.focus();
      };
      b.addEventListener('click', e => {
        const a = e.target.closest('[data-pa]'); if (!a) return; const row = a.closest('[data-id]');
        if (a.dataset.pa === 'up' || a.dataset.pa === 'down') move(row.dataset.id, a.dataset.pa === 'up' ? -1 : 1);
        if (a.dataset.pa === 'reset' && confirm('Put every card back on its original phone tab?')) { data.phone = {}; save(); applyPhone(); draw(b); }
      });
      b.addEventListener('change', e => {
        const a = e.target.closest('[data-pa]'); if (!a) return; const id = a.closest('[data-id]').dataset.id;
        if (a.dataset.pa === 'tab') { phoneCfg().tab[id] = a.value; save(); applyPhone(); draw(b); }
        if (a.dataset.pa === 'vis') { setCardHidden(id, !a.checked); draw(b); }
      });
    }
  });
}

/* ---------- touch: swipe a row right to finish it, left to delete it ---------- */
let sw = null, swBlock = false;
const SW_DONE = '[data-act="toggle"],[data-act="done"],[data-act="pay"]';
document.addEventListener('pointerdown', e => {
  sw = null;
  if (!device.touch || editing || e.pointerType === 'mouse') return;
  const row = e.target.closest('.card .rows > li.row'); if (!row || row.querySelector('.inline-edit')) return;
  if (e.target.closest('input, textarea, select')) return;
  const done = row.querySelector(SW_DONE), del = row.querySelector('[data-act="del"]');
  if (!done && !del) return;
  sw = { row, done, del, x: e.clientX, y: e.clientY, dx: 0, on: false, armed: false, pid: e.pointerId };
});
document.addEventListener('pointermove', e => {
  if (!sw || e.pointerId !== sw.pid) return;
  if (lp && lp.active) { sw = null; return; } // already lifted for reordering
  let dx = e.clientX - sw.x; const dy = e.clientY - sw.y;
  if (!sw.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
    if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    sw.on = true; if (lp) { clearTimeout(lp.timer); lp = null; }
    sw.hint = document.createElement('div'); sw.hint.className = 'swipe-hint';
    const r = sw.row; Object.assign(sw.hint.style, { left: r.offsetLeft + 'px', top: r.offsetTop + 'px', width: r.offsetWidth + 'px', height: r.offsetHeight + 'px' });
    const doneLabel = sw.done ? (sw.done.dataset.act === 'pay' ? (r.classList.contains('is-done') ? 'Unpaid' : 'Paid') : r.classList.contains('is-done') ? 'Undo' : 'Done') : '';
    sw.hint.innerHTML = `<span class="sh-l">${icon('check')}${doneLabel}</span><span class="sh-r">Delete${icon('trash')}</span>`;
    r.parentNode.insertBefore(sw.hint, r); r.classList.add('swiping');
  }
  if ((dx > 0 && !sw.done) || (dx < 0 && !sw.del)) dx *= .18; // rubber-band when there is no action that way
  sw.dx = dx;
  const lim = Math.min(120, sw.row.offsetWidth * .32), armed = (dx > lim && !!sw.done) || (dx < -lim && !!sw.del);
  if (armed !== sw.armed) { sw.armed = armed; if (armed && navigator.vibrate) navigator.vibrate(10); }
  sw.row.style.transform = `translateX(${dx}px)`;
  sw.hint.dataset.dir = dx > 0 ? 'l' : 'r'; sw.hint.classList.toggle('armed', armed);
});
const endSwipe = e => {
  if (!sw || (e && e.pointerId !== sw.pid)) return; const s = sw; sw = null;
  if (!s.on) return;
  swBlock = true; setTimeout(() => { swBlock = false; }, 80);
  const row = s.row, cleanup = () => { row.classList.remove('swiping'); row.style.transform = ''; row.style.transition = ''; s.hint.remove(); };
  row.style.transition = 'transform .18s ease';
  if (s.armed && (!e || e.type !== 'pointercancel')) {
    const btn = s.dx > 0 ? s.done : s.del, del = btn === s.del;
    row.style.transform = `translateX(${s.dx > 0 ? '' : '-'}${del ? 110 : 30}%)`;
    setTimeout(() => { cleanup(); btn.click(); }, 170);
  } else { row.style.transform = 'translateX(0)'; setTimeout(cleanup, 190); }
};
document.addEventListener('pointerup', endSwipe);
document.addEventListener('pointercancel', endSwipe);

/* ---------- wall display: screen stays on, data stays fresh, idles back to the top ---------- */
let wakeLock = null, wallTimer = 0, idleTimer = 0, wallDay = todayStr();
async function wake() {
  if (!devPrefs.wall || wakeLock || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch { }
}
function wallTick() {
  if (todayStr() !== wallDay) { wallDay = todayStr(); renderAll(); return; } // past midnight: new date, new "today" everywhere
  renderHeader();
}
let wallRefresh = 0;
function applyWall() {
  document.documentElement.classList.toggle('wall', !!devPrefs.wall);
  clearInterval(wallTimer); clearInterval(wallRefresh); clearTimeout(idleTimer);
  if (!devPrefs.wall) { if (wakeLock) { wakeLock.release().catch(() => { }); wakeLock = null; } return; }
  wake(); bumpIdle();
  wallTimer = setInterval(wallTick, 60e3);
  wallRefresh = setInterval(() => { loadWeather(true); loadDublin(true); loadNews(); pullIfStale(); }, 15 * 60e3);
}
function bumpIdle() {
  if (!devPrefs.wall) return; clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const busy = sheet.open || editing || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if (!busy) { scrollTo({ top: 0, behavior: 'smooth' }); $$('.card .body').forEach(b => { b.scrollTop = 0; }); if (curPhone && ptab !== 'home') setTab('home'); }
    bumpIdle();
  }, 3 * 60e3);
}
['pointerdown', 'keydown', 'wheel'].forEach(t => addEventListener(t, bumpIdle, { passive: true }));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); if (devPrefs.wall) wallTick(); } });

/* ---------- Settings → This device ---------- */
const deviceNow = () => `Right now: <b>${device.phone ? 'Phone view' : 'Big-screen view'}</b> with <b>${device.touch ? 'touch' : 'mouse'} controls</b>.`;
const segHtml = (name, cur, opts) => `<div class="seg" data-dev="${name}">${opts.map(([v, l]) => `<label><input type="radio" name="dev-${name}" value="${v}"${cur === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
function deviceSettingsHtml() {
  return `<div class="set-group"><h3>This device <small>only changes this screen, not your other devices</small></h3>
    <p id="devNow">${deviceNow()}</p>
    <div class="muted dev-lbl">Layout</div>${segHtml('view', devPrefs.view, [['auto', 'Auto'], ['phone', 'Phone'], ['large', 'Big screen']])}
    <div class="muted dev-lbl">Controls</div>${segHtml('input', devPrefs.input, [['auto', 'Auto'], ['touch', 'Touch'], ['mouse', 'Mouse']])}
    <label class="swrow"><span>Wall display mode<small style="display:block;font-weight:500;color:var(--faint)">For a mounted tablet: keeps the screen on, refreshes weather and news, goes back to the top after 3 idle minutes.</small></span><input type="checkbox" role="switch" id="devWall"${devPrefs.wall ? ' checked' : ''}></label>
  </div>`;
}
function bindDeviceSettings(b) {
  $$('[data-dev]', b).forEach(g => g.addEventListener('change', e => { devPrefs[g.dataset.dev] = e.target.value; saveDev(); applyDevice(); $('#devNow', b).innerHTML = deviceNow(); }));
  $('#devWall', b).addEventListener('change', e => { devPrefs.wall = e.target.checked; saveDev(); applyWall(); toast(devPrefs.wall ? ('wakeLock' in navigator ? 'Wall mode on. The screen will stay awake.' : 'Wall mode on. This browser cannot keep the screen awake, so set auto-lock to Never.') : 'Wall mode off'); });
}
