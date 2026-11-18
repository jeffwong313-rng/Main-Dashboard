'use strict';
/* ================= tag bar: every tag used anywhere, tap one to see everything that has it ================= */
let activeTag = '';
function tagMatches(tag) {
  const k = tag.toLowerCase(), groups = [];
  Object.entries(TAGGED).forEach(([wid, key]) => {
    if (isCardHidden(wid)) return;
    const hits = (data[key] || []).filter(e => e.tag && e.tag.toLowerCase() === k);
    if (hits.length) groups.push({ wid, title: W[wid].title, items: hits.map(e => ({ t: e.t.length > 90 ? e.t.slice(0, 89) + '…' : e.t, done: !!e.done || (wid === 'bills' && !!(e.paid || {})[monthKey()]), sub: wid === 'events' ? rangeText(e) : '' })) });
  });
  if (news && !isCardHidden('news')) {
    const seen = new Set(), hits = [...(news.top || []), ...Object.values(news.topics || {}).flat()].filter(s => s.topic.toLowerCase() === k && !seen.has(s.id) && seen.add(s.id)).slice(0, 5);
    if (hits.length) groups.push({ wid: 'news', title: 'News', news: hits });
  }
  return groups;
}
function renderTagBar() {
  const el = $('#tagBar'); if (!el) return;
  const tags = usedTags(); if (activeTag && !tags.some(t => t.toLowerCase() === activeTag.toLowerCase())) activeTag = '';
  el.hidden = !tags.length; if (!tags.length) { el.innerHTML = ''; return; }
  const chips = tags.map(t => `<button type="button" class="rchip tgchip${t.toLowerCase() === activeTag.toLowerCase() ? ' on' : ''}" style="--accent:${tagColor(t)}" data-tag="${esc(t)}" aria-pressed="${t.toLowerCase() === activeTag.toLowerCase()}">${esc(t)}</button>`).join('');
  let res = '';
  if (activeTag) {
    const g = tagMatches(activeTag);
    res = `<div class="tagres" role="region" aria-label="Everything tagged ${esc(activeTag)}">` + (g.length ? g.map(x => `<div class="tg-grp"><button type="button" class="tg-h" data-goto="${x.wid}" style="--accent:${W[x.wid].accent}">${esc(x.title)}</button><ul>` +
      (x.news ? x.news.map(n => `<li><a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}<small> ${esc(n.source)}</small></a></li>`).join('') : x.items.map(i => `<li class="${i.done ? 'is-done' : ''}"><button type="button" data-goto="${x.wid}">${esc(i.t)}${i.sub ? `<small> ${esc(i.sub)}</small>` : ''}</button></li>`).join('')) + '</ul></div>').join('') : '<p class="muted">Nothing is tagged this right now.</p>') + '</div>';
  }
  el.innerHTML = `<div class="rchips tg-row" role="group" aria-label="Filter everything by tag"><span class="tg-lbl">Tags</span>${chips}</div>${res}`;
}
$('#tagBar').addEventListener('click', e => {
  const g = e.target.closest('[data-goto]'); if (g) { goto(g.dataset.goto); return; }
  const c = e.target.closest('[data-tag]'); if (!c) return;
  activeTag = activeTag.toLowerCase() === c.dataset.tag.toLowerCase() ? '' : c.dataset.tag; renderTagBar();
});
