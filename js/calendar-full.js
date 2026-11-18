'use strict';
/* ================= full-screen calendar (Outlook-style month with multi-day bars) ================= */
let fullOpen = false, fullMonth = null, fullSel = todayStr();
const fullOff = new Set();
const HOL_COLOR = '#8e9aa8', NOTAG_COLOR = '#7f93b0';
const legendKeys = () => { const m = new Map(); TAG_DEFAULTS.forEach(([n]) => m.set(n.toLowerCase(), n)); data.events.forEach(e => { if (e.tag && !m.has(e.tag.toLowerCase())) m.set(e.tag.toLowerCase(), e.tag); }); return [...m.values()]; };
const evColor = e => e.tag === '__hol' ? HOL_COLOR : e.tag ? tagColor(e.tag) : NOTAG_COLOR;
const evKey = e => e.tag === '__hol' ? '__hol' : (e.tag || '').toLowerCase();
function fullEvents(from, to) {
  const out = data.events.filter(e => e.date <= to && evEnd(e) >= from).map(e => ({ ...e, end: evEnd(e) }));
  for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) { const h = holidays(y); Object.keys(h).forEach(k => { if (k >= from && k <= to) out.push({ id: 'h:' + k, t: h[k], date: k, end: k, tag: '__hol' }); }); }
  return out.filter(e => !fullOff.has(evKey(e)));
}
function weekHtml(days, evs, m) {
  const d0 = days[0], d6 = days[6], mine = evs.filter(e => e.date <= d6 && e.end >= d0).map(e => ({ e, s: Math.max(0, days.indexOf(e.date < d0 ? d0 : e.date)), f: days.indexOf(e.end > d6 ? d6 : e.end) }))
    .sort((a, b) => (a.s - b.s) || ((b.f - b.s) - (a.f - a.s)) || a.e.t.localeCompare(b.e.t));
  const lanes = [];
  mine.forEach(it => { let l = lanes.findIndex(end => end < it.s); if (l < 0) { l = lanes.length; lanes.push(-1); } lanes[l] = it.f; it.l = l; });
  const bars = mine.map(it => `<button type="button" class="cbar${it.e.date < d0 ? ' cl' : ''}${it.e.end > d6 ? ' cr' : ''}" style="grid-column:${it.s + 1}/${it.f + 2};grid-row:${it.l + 1};--c:${evColor(it.e)}" data-fd="${days[it.s]}" title="${esc(it.e.t)}${it.e.end !== it.e.date ? ' (' + shortDay(it.e.date) + ' to ' + shortDay(it.e.end) + ')' : ''}">${it.e.time && it.e.date >= d0 ? `<i>${esc(fmtTime(it.e.time))}</i> ` : ''}${esc(it.e.t)}</button>`).join('');
  const today = todayStr();
  const cells = days.map(k => { const d = parseDate(k); return `<button type="button" class="ccell${k === today ? ' today' : ''}${k === fullSel ? ' sel' : ''}${d.getMonth() !== m ? ' out' : ''}" data-fd="${k}" aria-label="${esc(d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))}"><span>${d.getDate() === 1 ? d.toLocaleDateString([], { month: 'short' }) + ' ' : ''}${d.getDate()}</span></button>`; }).join('');
  return `<div class="cwk" style="--lanes:${Math.max(lanes.length, 1)}"><div class="cdays">${cells}</div><div class="cbars">${bars}</div></div>`;
}
function renderFull() {
  const b = $('.sheet-body', sheet); if (!fullOpen || !b) return;
  const y = fullMonth.getFullYear(), m = fullMonth.getMonth(), first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay()), weeks = Math.ceil((first.getDay() + new Date(y, m + 1, 0).getDate()) / 7);
  const wk = []; for (let w = 0; w < weeks; w++) wk.push([...Array(7)].map((_, i) => dstr(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i))));
  const evs = fullEvents(wk[0][0], wk[weeks - 1][6]);
  const leg = [...legendKeys().map(t => [t.toLowerCase(), t, tagColor(t)]), ['', 'Other', NOTAG_COLOR], ['__hol', 'Holidays', HOL_COLOR]];
  const legend = `<div class="clegend" role="group" aria-label="Legend: tap to show or hide">${leg.map(([k, l, c]) => `<button type="button" class="clg${fullOff.has(k) ? ' off' : ''}" style="--c:${c}" data-leg="${esc(k)}" aria-pressed="${!fullOff.has(k)}"><i></i>${esc(l)}</button>`).join('')}</div>`;
  const sd = parseDate(fullSel), dayEv = fullEvents(fullSel, fullSel).sort((a, c) => (a.time || '').localeCompare(c.time || ''));
  const list = dayEv.map(e => e.tag === '__hol' ? `<li class="crow"><i style="--c:${HOL_COLOR}"></i><div><span>${esc(e.t)}</span><small>Holiday</small></div></li>` : `<li class="crow" data-id="${e.id}"><i style="--c:${evColor(e)}"></i><div><span class="txt" data-act="fedit" data-raw="${esc(e.t)}">${esc(e.t)}</span><small>${e.tag ? esc(e.tag) + ' · ' : ''}${rangeText(e)}${e.time ? ', ' + fmtTime(e.time) : ''}</small></div><button class="icon-btn del" data-act="fdel" aria-label="Delete">${icon('x')}</button></li>`).join('');
  const keep = $('#fullForm [name=t]', b) ? $('#fullForm [name=t]', b).value : '';
  b.innerHTML = `<div class="cfull">
    <div class="cbar-top"><button type="button" class="icon-btn" data-nav="-1" aria-label="Previous month" style="transform:scaleX(-1)">${icon('chevron')}</button><h3>${fullMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h3><button type="button" class="icon-btn" data-nav="1" aria-label="Next month">${icon('chevron')}</button><button type="button" class="chip-btn" data-nav="0">Today</button></div>
    ${legend}
    <div class="cdow">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => `<span>${x}</span>`).join('')}</div>
    <div class="cgrid">${wk.map(days => weekHtml(days, evs, m)).join('')}</div>
    <div class="cday"><h4>${sd.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h4><ul class="clist">${list || '<li class="muted">Nothing on this day.</li>'}</ul>
    <form id="fullForm" class="addrow" autocomplete="off"><input name="t" placeholder="Add an event" aria-label="Add an event" value="${esc(keep)}"><input name="tag" list="eventTags" maxlength="24" placeholder="Tag" aria-label="Tag"><label class="fl"><span>From</span><input name="date" type="date" value="${fullSel}"></label><label class="fl"><span>To (optional)</span><input name="end" type="date"></label><label class="fl"><span>Time</span><input name="time" type="time"></label><button class="go" type="submit" aria-label="Add">${icon('plus')}</button></form></div></div>`;
}
function openCalFull() {
  fullMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1); fullSel = monthKey(fullMonth) === monthKey() ? todayStr() : dstr(fullMonth);
  fullOpen = true;
  openSheet('', { title: 'Calendar', cls: 'cal-full', accent: W.calendar.accent, onOpen(b) {
    b.addEventListener('click', e => {
      const n = e.target.closest('[data-nav]'), l = e.target.closest('[data-leg]'), d = e.target.closest('[data-fd]'), a = e.target.closest('[data-act]');
      if (n) { const v = +n.dataset.nav; fullMonth = v ? new Date(fullMonth.getFullYear(), fullMonth.getMonth() + v, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1); fullSel = v === 0 ? todayStr() : monthKey(fullMonth) === monthKey() ? todayStr() : dstr(fullMonth); renderFull(); }
      else if (l) { const k = l.dataset.leg; fullOff.has(k) ? fullOff.delete(k) : fullOff.add(k); renderFull(); }
      else if (d) { fullSel = d.dataset.fd; renderFull(); }
      else if (a && a.dataset.act === 'fdel') { const id = a.closest('[data-id]').dataset.id; undoable('Deleted', () => { data.events = data.events.filter(x => x.id !== id); }, 'events'); }
      else if (a && a.dataset.act === 'fedit') { const id = a.closest('[data-id]').dataset.id; inlineEdit(a, { wid: 'events', onSave: v => { byId(data.events, id).t = v; touched('events'); } }); }
    });
    b.addEventListener('submit', e => {
      e.preventDefault(); const f = e.target, fd = new FormData(f), t = String(fd.get('t') || '').trim(); if (!t) return;
      const date = fd.get('date') || fullSel, end = fd.get('end');
      data.events.push({ id: uid(), t, tag: canonTag(fd.get('tag')), date, end: end && end > date ? end : '', time: fd.get('time') || '', created: Date.now() });
      fullSel = date; touched('events');
    });
    renderFull();
  } });
}
sheet.addEventListener('close', () => { fullOpen = false; });
