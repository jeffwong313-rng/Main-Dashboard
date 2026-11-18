'use strict';
/* ================= KPI strip ================= */
const goto = id => { const c = cards[id]; if (!c) return toast('That card is hidden. Turn it on in Customize.'); if (curPhone && phoneTabOf(id) !== ptab) setTab(phoneTabOf(id), { keepScroll: true }); c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); };
function spark(vals) {
  const w = 84, h = 30, bw = 8, gap = (w - bw * vals.length) / (vals.length - 1), m = Math.max(1, ...vals);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${vals.map((v, i) => { const bh = Math.max(3, Math.round(v / m * (h - 2))); return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${h - bh}" width="${bw}" height="${bh}" rx="2.5" fill="currentColor" opacity="${i === vals.length - 1 ? 1 : .4}"/>`; }).join('')}</svg>`;
}
function renderKpis() {
  applyTop();
  const t0 = startOfDay(new Date()).getTime();
  const openT = data.todos.filter(t => !t.done).length, doneToday = data.todos.filter(t => t.doneAt && t.doneAt >= t0).length;
  const week = Array.from({ length: 7 }, (_, i) => { const a = t0 - (6 - i) * DAY, b = a + DAY; return data.todos.filter(t => t.doneAt && t.doneAt >= a && t.doneAt < b).length; });
  const ev = W.events.upcoming()[0];
  const tile = (id, color, label, val, sub, extra = '', small = false) => `<button class="kpi" data-goto="${id}" style="--accent:${color}"><span class="kpi-label">${label}</span><span class="kpi-val${small ? ' small' : ''}">${val}</span><span class="kpi-sub">${sub}</span>${extra}</button>`;
  $('#kpiTiles').innerHTML =
    tile('todo', W.todo.accent, 'Open tasks', openT, doneToday ? `${doneToday} finished today` : 'None finished today', spark(week)) +
    tile('events', W.events.accent, 'Next up' + (ev ? ' · ' + (daysFromToday(parseDate(ev.date)) < 0 ? 'Until ' + shortDay(evEnd(ev)) : evEnd(ev) !== ev.date ? rangeText(ev).split(' · ')[0] : fmtDay(ev.date)) + (daysFromToday(parseDate(ev.date)) >= 0 && ev.time ? ', ' + fmtTime(ev.time) : '') : ''), ev ? esc(ev.t) : 'Nothing', '', '', true);
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
$('#kpiTiles').addEventListener('click', e => { const k = e.target.closest('[data-goto]'); if (k) goto(k.dataset.goto); });
