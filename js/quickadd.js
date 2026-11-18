'use strict';
/* ================= quick add (floating +) ================= */
const QA = [
  { k: 'todo', label: 'Task', ph: 'What needs doing?', add: t => lines(t).forEach(x => data.todos.unshift({ id: uid(), t: x, done: false, created: Date.now() })), wid: 'todo', to: 'To-Do' },
  { k: 'shop', label: 'Shopping', ph: 'Milk, eggs, rice', add: t => lines(t, true).forEach(x => { if (!data.shop.some(s => !s.done && s.t.toLowerCase() === x.toLowerCase())) data.shop.unshift({ id: uid(), t: x, done: false, created: Date.now() }); }), wid: 'shop', to: 'Shopping' },
  { k: 'notes', label: 'Note', ph: 'Jot something down', add: t => data.notes.unshift({ id: uid(), t: t.trim(), created: Date.now() }), wid: 'notes', to: 'Notes' },
  { k: 'events', label: 'Event', ph: 'What is happening?', add: (t, extra) => data.events.push({ id: uid(), t: t.trim(), tag: canonTag(extra.tag), date: extra.date || todayStr(), end: extra.end && extra.end > (extra.date || todayStr()) ? extra.end : '', time: extra.time || '', created: Date.now() }), wid: 'events', to: 'Upcoming', extra: true }
];
function openQuickAdd(type, { voice = false } = {}) {
  type = type || lsGet(QA_KEY, 'todo'); if (!QA.some(q => q.k === type)) type = 'todo';
  openSheet(`<form class="qa" id="qa"><div class="seg" role="radiogroup" aria-label="What to add">${QA.map(q => `<label><input type="radio" name="type" value="${q.k}"${q.k === type ? ' checked' : ''}><span>${q.label}</span></label>`).join('')}</div>
    <textarea name="t" rows="2" class="form-ta" style="background:var(--field);border:1px solid transparent;border-radius:14px;padding:12px;font-size:calc(16px * var(--fs))"></textarea>
    <div class="extra" hidden><input type="date" name="date" aria-label="From date"><input type="date" name="end" aria-label="To date (optional)" title="To date (optional)"><input type="time" name="time" aria-label="Time"><input name="tag" list="eventTags" maxlength="24" placeholder="Tag (optional)" aria-label="Tag"></div>
    <div class="actions">${voiceBtnHtml()}<span class="spacer"></span><button class="btn" type="button" data-close>Done</button><button class="btn primary" type="submit">Add</button></div>
    <ul class="qa-log" aria-live="polite"></ul></form>`,
    {
      title: 'Quick add', cls: 'top', onOpen(b) {
        const f = $('#qa', b), ta = $('[name=t]', f), extra = $('.extra', f), log = $('.qa-log', f);
        const cur = () => QA.find(q => q.k === f.type.value);
        const sync = () => { const q = cur(); ta.placeholder = q.ph; extra.hidden = !q.extra; if (q.extra && !$('[name=date]', f).value) $('[name=date]', f).value = todayStr(); lsSet(QA_KEY, q.k); sheet.querySelector('.sheet-card').style.setProperty('--accent', W[q.wid].accent); };
        f.addEventListener('change', e => { if (e.target.name === 'type') { sync(); ta.focus(); } });
        ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); } });
        f.addEventListener('submit', e => {
          e.preventDefault(); const q = cur(), v = ta.value; if (!v.trim()) { ta.focus(); return; }
          q.add(v, { date: $('[name=date]', f).value, end: $('[name=end]', f).value, time: $('[name=time]', f).value, tag: $('[name=tag]', f).value }); if (q.extra) $('[name=tag]', f).value = ''; touched(q.wid);
          const li = document.createElement('li'); li.innerHTML = `<b>${icon('check')}</b>${esc(v.trim().split('\n')[0].slice(0, 60))} added to ${q.to}`; li.firstChild.style.display = 'inline-flex'; li.firstChild.style.verticalAlign = 'middle'; log.prepend(li);
          ta.value = ''; ta.focus(); if (navigator.vibrate) navigator.vibrate(8);
        });
        sync(); bindVoice(f, ta, { auto: voice }); if (!voice) ta.focus();
      }
    });
}
$('#fab').addEventListener('click', () => openQuickAdd(curPhone ? (PTABS.find(t => t.k === ptab) || {}).qa : undefined));
document.addEventListener('keydown', e => {
  if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !sheet.open && !editing) { e.preventDefault(); openQuickAdd(); }
});
