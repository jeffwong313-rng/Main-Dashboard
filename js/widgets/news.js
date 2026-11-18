'use strict';
/* ================= news (news.json is rebuilt at 6 AM, 12 PM and 6 PM Pacific by a GitHub Action) ================= */
let news = null, newsState = 'loading', newsView = 'top', newsAuto = false, newsPauseUntil = 0;
const newsColor = t => NEWS_COLORS[t] || '#8a8f98';
const ago = iso => { const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return m < 60 ? (m < 2 ? 'just now' : m + ' min ago') : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + ' d ago'; };
function renderNews(center) {
  const row = cards.news && cards.news.querySelector('.rchips'), left = row ? row.scrollLeft : 0;
  renderWidget('news');
  const r2 = cards.news && cards.news.querySelector('.rchips'); if (!r2) return;
  const on = r2.querySelector('.rchip.on');
  r2.scrollLeft = center && on ? on.offsetLeft - r2.clientWidth / 2 + on.offsetWidth / 2 : left;
}
function newsPicks() {
  if (!news) return [];
  const picks = (news.top || []).slice(0, 5), fav = data.newsFav || [];
  fav.forEach(t => {
    if (picks.some(p => p.topic === t)) return;
    const s = ((news.topics || {})[t] || [])[0]; if (!s) return;
    let i = picks.length - 1; while (i >= 0 && fav.includes(picks[i].topic)) i--;
    if (i >= 0) picks.splice(i, 1, s); else picks.push(s);
  });
  return picks.sort((a, b) => b.score - a.score);
}
async function loadNews() {
  try {
    const r = await fetch('news.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw 0;
    news = await r.json(); newsState = '';
  } catch { if (!news) newsState = 'none'; }
  renderWidget('news'); renderTagBar();
}
W.news = {
  title: 'News', icon: 'news', accent: '#5b6bd6',
  count: () => 0,
  render() {
    if (!news) return empty(newsState === 'loading' ? 'Loading the news' : 'No headlines yet', newsState === 'loading' ? '' : 'The first update arrives at the next 6 AM, 12 PM or 6 PM.');
    const fav = data.newsFav || [], topics = Object.keys(news.topics || {}).sort((a, b) => (fav.includes(b) - fav.includes(a)) || a.localeCompare(b));
    if (newsView !== 'top' && !topics.includes(newsView)) newsView = 'top';
    const chip = (k, l, extra = '') => `<button type="button" class="rchip${newsView === k ? ' on' : ''}" style="--accent:${k === 'top' ? '#5b6bd6' : newsColor(k)}" data-act="nview" data-k="${esc(k)}">${extra}${esc(l)}</button>`;
    const chips = `<div class="rchips" role="group" aria-label="Topic">${chip('top', 'Top 5')}${topics.map(t => chip(t, t, fav.includes(t) ? '★ ' : '')).join('')}</div>`;
    const list = newsView === 'top' ? newsPicks() : ((news.topics || {})[newsView] || []).slice(0, 5);
    const isFav = fav.includes(newsView);
    const favBar = newsView === 'top' ? '' : `<button type="button" class="newsfav${isFav ? ' on' : ''}" data-act="nfav" aria-pressed="${isFav}">${isFav ? '★ Favorite: always shown in Top 5' : '☆ Favorite this topic'}</button>`;
    const row = s => `<li class="newsrow"><a href="${esc(s.link)}" target="_blank" rel="noopener"><span class="nh"><span class="evtag" style="--tg:${newsColor(s.topic)}">${esc(s.topic)}</span><small class="meta">${esc(s.source)}${s.published ? ' · ' + ago(s.published) : ''}${s.outlets > 1 ? ' · ' + s.outlets + ' outlets' : ''}</small></span><span class="nt">${esc(s.title)}</span></a></li>`;
    const gen = news.generated ? `Updated ${new Date(news.generated).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · refreshes 6 AM, 12 PM, 6 PM` : '';
    return `${chips}${favBar}<ul class="newslist">${list.map(row).join('') || '<li class="muted" style="padding:10px 0">Nothing in this topic right now.</li>'}</ul><p class="newsfoot">${gen}<button type="button" class="newsauto" data-act="nauto" aria-pressed="${newsAuto}">${newsAuto ? '⏸ Rotating every 10 s' : '▶ Rotate topics'}</button></p>`;
  },
  act: {
    nview: ({ el }) => { newsView = el.dataset.k; newsPauseUntil = Date.now() + 45000; renderNews(false); },
    nauto: () => { newsAuto = !newsAuto; newsPauseUntil = 0; renderNews(false); },
    nfav: () => {
      const fav = data.newsFav = data.newsFav || [], i = fav.indexOf(newsView);
      if (i >= 0) fav.splice(i, 1); else fav.push(newsView);
      save(); renderNews(false); renderTagBar();
    }
  }
};
setInterval(() => {
  if (!newsAuto || !news || document.hidden || Date.now() < newsPauseUntil || editing || !cards.news || cards.news.matches(':hover') || sheet.open) return;
  const keys = ['top', ...Object.keys(news.topics || {}).filter(t => (news.topics[t] || []).length).sort((a, b) => ((data.newsFav || []).includes(b) - (data.newsFav || []).includes(a)) || a.localeCompare(b))];
  newsView = keys[(keys.indexOf(newsView) + 1) % keys.length]; renderNews(true);
}, 10000);
// touching or scrolling the topic row pauses the rotation so the chips don't move under your finger
['pointerdown', 'wheel', 'touchmove'].forEach(t => document.addEventListener(t, e => { if (e.target.closest && e.target.closest('.card[data-id="news"] .rchips')) newsPauseUntil = Date.now() + 45000; }, { passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && (!news || Date.now() - new Date(news.generated) > 20 * 60000)) loadNews(); });
