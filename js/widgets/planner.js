'use strict';
/* ---- event tags: Travel, Important Days, Friends, Family + any you type ---- */
let evFilter = 'All';
W.events = {
  title: 'Upcoming', icon: 'calendar', accent: '#3b9ae8',
  add: {
    fields: [{ k: 't', ph: 'Add an event' }, { k: 'tag', ph: 'Tag', attrs: 'list="eventTags" maxlength="24" autocapitalize="words"' }, { k: 'date', type: 'date', def: todayStr, lbl: 'From' }, { k: 'end', type: 'date', lbl: 'To (optional)' }, { k: 'time', type: 'time' }],
    primary: 't',
    submit(v) { const date = v.date || todayStr(); data.events.push({ id: uid(), t: v.t.trim(), tag: canonTag(v.tag), date, end: v.end && v.end > date ? v.end : '', time: v.time || '', created: Date.now() }); touched('events'); }
  },
  upcoming() { return data.events.filter(e => daysFromToday(parseDate(evEnd(e))) >= 0).sort((a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99'))); },
  count() { return this.upcoming().length; },
  render() {
    const all = this.upcoming(); if (!all.length) return empty('Nothing scheduled', 'Tap + to add an appointment or plan.');
    const used = [...new Set(all.map(e => e.tag).filter(Boolean))];
    if (evFilter !== 'All' && !used.includes(evFilter)) evFilter = 'All';
    const list = evFilter === 'All' ? all : all.filter(e => e.tag === evFilter);
    const chips = used.length ? `<div class="rchips" role="group" aria-label="Filter by tag"><button type="button" class="rchip${evFilter === 'All' ? ' on' : ''}" data-act="etag" data-k="All">All</button>${used.map(t => `<button type="button" class="rchip${evFilter === t ? ' on' : ''}" style="--accent:${tagColor(t)}" data-act="etag" data-k="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : '';
    return chips + `<ul class="rows">${list.map(e => { const d = parseDate(e.date), now = daysFromToday(d) <= 0 && daysFromToday(parseDate(evEnd(e))) >= 0; return `<li class="row" data-id="${e.id}">${tagChip(e)}<div class="datepill${now ? ' is-today' : ''}"><span>${d.toLocaleDateString([], { month: 'short' })}</span><b>${d.getDate()}</b></div><div class="row-main"><span class="txt" data-act="edit">${esc(e.t)}</span><small class="meta" data-act="editEnd" data-raw="${esc(e.end || '')}" title="Tap to set or change the end date">${rangeText(e)}${e.time ? ', ' + fmtTime(e.time) : ''}</small></div>${delBtn}</li>`; }).join('')}</ul>`;
  },
  act: {
    del: ({ id }) => remove('events', id, 'events'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'events', onSave: v => { byId(data.events, id).t = v; touched('events'); } }),
    editEnd: ({ el, id }) => { const e = byId(data.events, id); el.dataset.raw = e.end || e.date; inlineEdit(el, { wid: 'events', type: 'date', allowEmpty: true, onSave: v => { e.end = v && v > e.date ? v : ''; touched('events'); } }); },
    editTag: ({ el, id }) => inlineEdit(el, { wid: 'events', list: 'eventTags', allowEmpty: true, onSave: v => { byId(data.events, id).tag = canonTag(v); touched('events'); } }),
    etag: ({ el }) => { evFilter = el.dataset.k; renderWidget('events'); }
  }
};

/* ---- calendar: month grid with holidays + Upcoming events ---- */
const nthDow = (y, m, dow, n) => {
  if (n > 0) return 1 + ((dow - new Date(y, m, 1).getDay() + 7) % 7) + 7 * (n - 1);
  const last = new Date(y, m + 1, 0); return last.getDate() - ((last.getDay() - dow + 7) % 7);
};
const holCache = {};
function holidays(y) {
  if (holCache[y]) return holCache[y];
  const h = {}, add = (m, d, n) => { const k = `${y}-${pad(m + 1)}-${pad(d)}`; h[k] = h[k] ? h[k] + ' / ' + n : n; };
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, mm = Math.floor((a + 11 * hh + 22 * l) / 451);
  add(0, 1, "New Year's Day"); add(0, nthDow(y, 0, 1, 3), 'Martin Luther King Jr. Day'); add(1, 14, "Valentine's Day"); add(1, nthDow(y, 1, 1, 3), "Presidents' Day");
  add(2, 17, "St. Patrick's Day"); add(Math.floor((hh + l - 7 * mm + 114) / 31) - 1, ((hh + l - 7 * mm + 114) % 31) + 1, 'Easter');
  add(4, 5, 'Cinco de Mayo'); add(4, nthDow(y, 4, 0, 2), "Mother's Day"); add(4, nthDow(y, 4, 1, -1), 'Memorial Day'); add(5, 19, 'Juneteenth');
  add(5, nthDow(y, 5, 0, 3), "Father's Day"); add(6, 4, 'Independence Day'); add(8, nthDow(y, 8, 1, 1), 'Labor Day');
  add(9, nthDow(y, 9, 1, 2), "Columbus / Indigenous Peoples' Day"); add(9, 31, 'Halloween'); add(10, 11, 'Veterans Day'); add(10, nthDow(y, 10, 4, 4), 'Thanksgiving');
  add(11, 24, 'Christmas Eve'); add(11, 25, 'Christmas Day'); add(11, 31, "New Year's Eve");
  return (holCache[y] = h);
}
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1), calSel = todayStr();
const calGo = m => { calMonth = m; calSel = monthKey(m) === monthKey() ? todayStr() : dstr(m); renderWidget('calendar'); };
W.calendar = {
  title: 'Calendar', icon: 'calendar', accent: '#2fb7a3', expand: () => openCalFull(),
  count() { const k = monthKey(calMonth), a = k + '-01', z = k + '-31'; return data.events.filter(e => e.date <= z && evEnd(e) >= a).length; },
  render() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth(), first = calMonth.getDay(), dim = new Date(y, m + 1, 0).getDate(), weeks = Math.ceil((first + dim) / 7);
    const hol = holidays(y), by = {}, today = todayStr();
    data.events.forEach(e => { for (let d = parseDate(e.date), n = 0; n < 60 && dstr(d) <= evEnd(e); n++, d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) (by[dstr(d)] = by[dstr(d)] || []).push(e); });
    let cells = '';
    for (let i = 0; i < weeks * 7; i++) {
      const dn = i - first + 1; if (dn < 1 || dn > dim) { cells += '<span class="cal-c out"></span>'; continue; }
      const k = `${y}-${pad(m + 1)}-${pad(dn)}`, ev = by[k] || [];
      cells += `<button type="button" class="cal-c${k === today ? ' today' : ''}${k === calSel ? ' sel' : ''}" data-act="day" data-d="${k}" aria-label="${esc(parseDate(k).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))}${hol[k] ? ', ' + esc(hol[k]) : ''}${ev.length ? ', ' + ev.length + ' event' + (ev.length > 1 ? 's' : '') : ''}"><b>${dn}</b><i class="dots">${hol[k] ? '<u class="h"></u>' : ''}${ev.slice(0, 3).map(x => `<u class="e"${x.tag ? ` style="background:${tagColor(x.tag)}"` : ''}></u>`).join('')}</i></button>`;
    }
    const sd = parseDate(calSel), hs = holidays(sd.getFullYear())[calSel], evs = (by[calSel] || []).slice().sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    const rows = (hs ? `<li class="row cal-hol"><span class="cal-flag" aria-hidden="true"></span><div class="row-main"><span>${esc(hs)}</span><small class="meta">Holiday</small></div></li>` : '') +
      evs.map(e => `<li class="row" data-id="${e.id}"><span class="cal-flag ev" aria-hidden="true"${e.tag ? ` style="background:${tagColor(e.tag)}"` : ''}></span><div class="row-main"><span class="txt" data-act="edit">${esc(e.t)}</span>${e.tag ? `<small class="meta">${tagChip(e, false)}</small>` : ''}${e.time ? `<small class="meta">${fmtTime(e.time)}</small>` : ''}</div>${delBtn}</li>`).join('');
    return `<div class="cal-h"><button type="button" class="icon-btn" data-act="prev" aria-label="Previous month" style="transform:scaleX(-1)">${icon('chevron')}</button><strong>${calMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong><button type="button" class="icon-btn" data-act="next" aria-label="Next month">${icon('chevron')}</button><span class="spacer"></span><button type="button" class="chip-btn" data-act="today">Today</button></div>
    <div class="cal-g cal-dow" aria-hidden="true">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<span>${x}</span>`).join('')}</div>
    <div class="cal-g">${cells}</div>
    <div class="cal-day"><h4>${sd.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h4><ul class="rows">${rows || '<li class="muted cal-none">Nothing on this day.</li>'}</ul></div>
    <form class="addrow cal-add" data-cform autocomplete="off"><input name="t" placeholder="Add an event" aria-label="Add an event"><input name="tag" list="eventTags" maxlength="24" placeholder="Tag" aria-label="Tag"><input name="time" type="time" aria-label="Time"><button class="go" type="submit" aria-label="Add">${icon('plus')}</button></form>`;
  },
  act: {
    day: ({ el }) => { calSel = el.dataset.d; renderWidget('calendar'); },
    prev: () => calGo(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1)),
    next: () => calGo(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1)),
    today: () => calGo(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    del: ({ id }) => remove('events', id, 'events'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'calendar', onSave: v => { byId(data.events, id).t = v; touched('events'); } })
  },
  onSubmit(f) {
    const fd = new FormData(f), t = fd.get('t').toString().trim(); if (!t) { $('input[name=t]', f).focus(); return; }
    data.events.push({ id: uid(), t, tag: canonTag(fd.get('tag')), date: calSel, time: fd.get('time') || '', created: Date.now() }); touched('events');
    const i = $('.cal-add input', cards.calendar); if (i) i.focus();
  }
};

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
W.meals = {
  title: 'Dinner plan', icon: 'utensils', accent: '#6d7ae6',
  count: () => Object.values(data.meals).filter(Boolean).length,
  render() {
    const today = (new Date().getDay() + 6) % 7;
    const any = Object.values(data.meals).some(Boolean);
    return DOW.map((d, i) => {
      const t = data.meals[i];
      return `<div class="meal${i === today ? ' today' : ''}"><span class="dow">${d}</span><span class="txt${t ? '' : ' placeholder'}" data-act="edit" data-day="${i}" data-raw="${esc(t || '')}">${t ? esc(t) : 'Plan dinner'}</span></div>`;
    }).join('') + (any ? `<div class="foot"><button class="link" data-act="clear">Clear week</button></div>` : '');
  },
  act: {
    edit: ({ el }) => { const i = el.dataset.day; inlineEdit(el, { wid: 'meals', allowEmpty: true, list: 'recipeTitles', onSave: v => { if (v) data.meals[i] = v; else delete data.meals[i]; touched('meals'); } }); },
    clear: () => undoable('Cleared the week', () => { data.meals = {}; }, 'meals')
  }
};

const EVERY = [[1, 'Daily'], [2, 'Every 2 days'], [7, 'Weekly'], [14, 'Every 2 weeks'], [30, 'Monthly'], [90, 'Every 3 months']];
const everyLabel = n => (EVERY.find(e => e[0] === n) || [n, `Every ${n} days`])[1].toLowerCase();
W.chores = {
  title: 'Chores', icon: 'repeat', accent: '#e9803f',
  add: { fields: [{ k: 't', ph: 'Add a recurring chore' }, { k: 'every', type: 'select', options: EVERY, val: 7 }, TAGF], submit(v) { data.chores.push({ id: uid(), t: v.t.trim(), tag: canonTag(v.tag), every: +v.every || 7, last: null, created: Date.now() }); touched('chores'); } },
  due(c) { return c.last ? Math.round((startOfDay(c.last) - startOfDay(new Date())) / DAY) + c.every : 0; },
  count() { return data.chores.filter(c => this.due(c) <= 0).length; },
  render() {
    if (!data.chores.length) return empty('No chores yet', 'Add things like "water plants" or "change filters" with how often they repeat.');
    return `<ul class="rows">${[...data.chores].sort((a, b) => this.due(a) - this.due(b)).map(c => {
      const d = this.due(c); const pill = d < 0 ? `<span class="pill late">${-d}d overdue</span>` : d === 0 ? `<span class="pill soon">Due today</span>` : `<span class="pill">${d === 1 ? 'Tomorrow' : 'In ' + d + ' days'}</span>`;
      return `<li class="row" data-id="${c.id}"><div class="row-main"><span class="txt" data-act="edit">${esc(c.t)}</span><small class="meta">${everyLabel(c.every)}</small></div>${tagChip(c, true, ' sm')}${pill}<button class="done-btn" data-act="done" aria-label="Mark done">${icon('check')}</button>${delBtn}</li>`;
    }).join('')}</ul>`;
  },
  act: {
    done: ({ id }) => { const c = byId(data.chores, id); c.last = Date.now(); touched('chores'); toast(`Done. Next in ${everyLabel(c.every).replace('every ', '')}`); },
    editTag: tagAct('chores', 'chores'),
    del: ({ id }) => remove('chores', id, 'chores'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'chores', onSave: v => { byId(data.chores, id).t = v; touched('chores'); } })
  }
};

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const billDay = b => { const n = new Date(); return Math.min(b.day, daysInMonth(n.getFullYear(), n.getMonth())); };
W.bills = {
  title: 'Bills', icon: 'dollar', accent: '#2fa56e',
  add: { fields: [{ k: 't', ph: 'Bill name' }, { k: 'amt', type: 'number', ph: 'Amount', attrs: 'step="0.01" min="0" inputmode="decimal"' }, { k: 'day', type: 'number', ph: 'Day', attrs: 'min="1" max="31" inputmode="numeric" title="Day of the month it is due"' }, TAGF], submit(v) { data.bills.push({ id: uid(), t: v.t.trim(), tag: canonTag(v.tag), amt: Math.max(0, parseFloat(v.amt) || 0), day: clamp(parseInt(v.day) || 1, 1, 31), paid: {}, created: Date.now() }); touched('bills'); } },
  unpaid() { const k = monthKey(); return data.bills.filter(b => !b.paid[k]); },
  count() { return this.unpaid().length; },
  render() {
    if (!data.bills.length) return empty('No bills yet', 'Add rent, utilities and subscriptions with the day of the month they are due.');
    const k = monthKey(), total = data.bills.reduce((s, b) => s + b.amt, 0), left = this.unpaid().reduce((s, b) => s + b.amt, 0), pct = total ? Math.round((total - left) / total * 100) : 0;
    const today = new Date().getDate(); const mon = new Date().toLocaleDateString([], { month: 'short' });
    return `<div class="bill-sum"><b>${money(left)}</b><span>left of ${money(total)} this month</span><div class="bar"><i style="width:${pct}%"></i></div></div><ul class="rows">${[...data.bills].sort((a, b) => billDay(a) - billDay(b)).map(b => {
      const paid = !!b.paid[k], late = !paid && billDay(b) < today;
      return `<li class="row${paid ? ' is-done' : ''}" data-id="${b.id}"><button class="chk" data-act="pay" aria-label="${paid ? 'Mark unpaid' : 'Mark paid'}">${icon('check')}</button><div class="row-main"><span class="txt" data-act="edit">${esc(b.t)}</span><small class="meta">${late ? '<span style="color:var(--danger)">Past due, ' : '('}${mon} ${billDay(b)}${late ? '</span>' : ')'}</small></div>${tagChip(b, true, ' sm')}<span class="amt" data-act="editAmt" data-raw="${b.amt}">${money(b.amt)}</span>${delBtn}</li>`;
    }).join('')}</ul>`;
  },
  act: {
    pay: ({ id }) => { const b = byId(data.bills, id), k = monthKey(); if (b.paid[k]) delete b.paid[k]; else b.paid[k] = Date.now(); touched('bills'); },
    editTag: tagAct('bills', 'bills'),
    del: ({ id }) => remove('bills', id, 'bills'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'bills', onSave: v => { byId(data.bills, id).t = v; touched('bills'); } }),
    editAmt: ({ el, id }) => inlineEdit(el, { wid: 'bills', type: 'number', onSave: v => { const n = parseFloat(v); if (isFinite(n) && n >= 0) { byId(data.bills, id).amt = n; touched('bills'); } else renderWidget('bills'); } })
  }
};

W.links = {
  title: 'Quick links', icon: 'link', accent: '#d46bb0',
  add: { primary: 'url', fields: [{ k: 'url', ph: 'Web address', attrs: 'inputmode="url" autocapitalize="off"' }, { k: 't', ph: 'Name (optional)' }, TAGF], submit(v) { const url = cleanUrl(v.url); if (!url) { toast('That web address does not look right'); return false; } data.links.push({ id: uid(), t: v.t.trim() || new URL(url).hostname.replace(/^www\./, ''), url, tag: canonTag(v.tag), created: Date.now() }); touched('links'); } },
  count: () => data.links.length,
  render() {
    if (!data.links.length) return empty('No links yet', 'Tap + to pin the sites you use most.');
    return `<div class="chips">${data.links.map(l => `<span class="chip-wrap" data-id="${l.id}"><a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span class="chip-ic">${esc(l.t.trim().charAt(0).toUpperCase())}</span>${esc(l.t)}</a>${tagChip(l, true, ' sm')}${delBtn}</span>`).join('')}</div>`;
  },
  act: { editTag: tagAct('links', 'links'), del: ({ id }) => remove('links', id, 'links') }
};
