'use strict';
/* ---- weather (Open-Meteo, no key) ---- */
const WMO = c => c === 0 ? ['☀️', 'Clear'] : c === 1 ? ['🌤️', 'Mostly clear'] : c === 2 ? ['⛅', 'Partly cloudy'] : c === 3 ? ['☁️', 'Overcast'] : c <= 48 ? ['🌫️', 'Fog'] : c <= 57 ? ['🌦️', 'Drizzle'] : c <= 67 ? ['🌧️', 'Rain'] : c <= 77 ? ['❄️', 'Snow'] : c <= 82 ? ['🌦️', 'Showers'] : c <= 86 ? ['🌨️', 'Snow showers'] : ['⛈️', 'Thunderstorm'];
let wx = (() => { try { return JSON.parse(lsGet(WX_KEY)); } catch { return null; } })();
let wxState = '', wxEditing = false, wxResults = [];
async function loadWeather(force) {
  const c = data.settings.city; if (!c) return;
  const key = `${c.lat},${c.lon},${data.settings.units}`;
  if (!force && wx && wx.key === key && Date.now() - wx.at < 15 * 60e3) return;
  wxState = 'loading'; renderWidget('weather');
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=${data.settings.units === 'c' ? 'celsius' : 'fahrenheit'}&timezone=auto&forecast_days=5`;
    const r = await fetch(u); if (!r.ok) throw 0; const j = await r.json(); if (!j.current) throw 0;
    wx = { key, at: Date.now(), cur: j.current, daily: j.daily }; lsSet(WX_KEY, JSON.stringify(wx)); wxState = '';
  } catch { wxState = 'error'; }
  renderWidget('weather');
}
const wxSearchForm = `<form class="wx-search" data-wxsearch><input name="q" placeholder="Search for a city" autocomplete="off" aria-label="City"><button class="btn primary" type="submit">Search</button></form><ul class="wx-results">${'' }</ul>`;
W.weather = {
  title: 'Weather', icon: 'cloud', accent: '#4fb3c8',
  count: () => 0,
  render() {
    const c = data.settings.city;
    if (!c || wxEditing) {
      return `<div class="wx">${c ? '' : '<p class="muted" style="margin:0 0 10px">Show the forecast for your area.</p>'}<button class="btn primary" data-act="geo" type="button">Use my location</button>${wxSearchForm.replace('<ul class="wx-results"></ul>', `<ul class="wx-results">${wxResults.map((r, i) => `<li><button type="button" data-act="pick" data-i="${i}">${esc(r.name)}${r.admin1 ? ', ' + esc(r.admin1) : ''}${r.country_code ? ' (' + esc(r.country_code) + ')' : ''}</button></li>`).join('')}</ul>`)}${c ? '<button class="link" data-act="cancelLoc" type="button">Cancel</button>' : ''}</div>`;
    }
    if (!wx || wx.key !== `${c.lat},${c.lon},${data.settings.units}`) return `<div class="wx"><p class="muted">${wxState === 'error' ? 'Could not load the forecast. Check your connection.' : 'Loading the forecast'}</p>${wxState === 'error' ? '<button class="btn" data-act="refresh" type="button">Try again</button>' : ''}</div>`;
    const u = data.settings.units === 'c' ? '°' : '°', cur = wx.cur, [em, desc] = WMO(cur.weather_code);
    const days = wx.daily.time.map((t, i) => `<div>${i === 0 ? 'Today' : parseDate(t).toLocaleDateString([], { weekday: 'short' })}<span class="e">${WMO(wx.daily.weather_code[i])[0]}</span><b>${Math.round(wx.daily.temperature_2m_max[i])}${u}</b>${Math.round(wx.daily.temperature_2m_min[i])}${u}</div>`).join('');
    return `<div class="wx"><div class="wx-now"><span class="wx-emoji">${em}</span><div><div class="wx-temp">${Math.round(cur.temperature_2m)}${u}</div><div class="wx-desc">${desc}, feels like ${Math.round(cur.apparent_temperature)}${u}</div></div></div><div class="wx-days">${days}</div><div class="wx-loc"><span>${esc(c.name)}</span><button class="link" data-act="change" type="button">Change</button></div></div>`;
  },
  act: {
    geo: () => {
      if (!navigator.geolocation) return toast('Location is not available on this device');
      navigator.geolocation.getCurrentPosition(p => { data.settings.city = { name: 'My location', lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }; wxEditing = false; save(); loadWeather(true); }, () => toast('Could not get your location. Search for a city instead.'), { timeout: 10000 });
    },
    pick: ({ el }) => { const r = wxResults[+el.dataset.i]; if (!r) return; data.settings.city = { name: [r.name, r.admin1].filter(Boolean).join(', '), lat: +r.latitude.toFixed(2), lon: +r.longitude.toFixed(2) }; wxEditing = false; wxResults = []; save(); loadWeather(true); },
    change: () => { wxEditing = true; renderWidget('weather'); },
    cancelLoc: () => { wxEditing = false; renderWidget('weather'); },
    refresh: () => loadWeather(true)
  },
  async onSubmit(form) {
    const q = new FormData(form).get('q').toString().trim(); if (!q) return;
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`); const j = await r.json();
      wxResults = j.results || []; if (!wxResults.length) toast('No cities found. Try another spelling.');
    } catch { toast('Search failed. Check your connection.'); }
    renderWidget('weather'); const inp = $('.wx-search input', cards.weather); if (inp) inp.value = q;
  }
};
