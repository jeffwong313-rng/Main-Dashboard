'use strict';
/* ================= theme ================= */
function applyTheme() {
  const pref = lsGet(THEME_KEY, 'auto'), dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = $('meta[name=theme-color]'); if (m) m.content = dark ? '#0f161d' : '#eaeef2';
  const b = $('#btnTheme'); b.innerHTML = icon(dark ? 'sun' : 'moon');
}
$('#btnTheme').addEventListener('click', () => { lsSet(THEME_KEY, document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); applyTheme(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
