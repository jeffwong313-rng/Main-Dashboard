'use strict';
/* ================= settings sheet ================= */
function openSettings() {
  const pref = lsGet(THEME_KEY, 'auto');
  openSheet(`<div class="form">
    <label>Your name <small>used in the greeting</small><input type="text" id="setName" value="${esc(data.settings.name)}" placeholder="Optional" autocomplete="given-name"></label>
    <div><div class="muted" style="font-weight:650;font-size:14px;margin-bottom:6px;color:var(--text)">Theme</div><div class="seg" id="setTheme">${['auto', 'light', 'dark'].map(t => `<label><input type="radio" name="theme" value="${t}"${pref === t ? ' checked' : ''}><span>${t[0].toUpperCase() + t.slice(1)}</span></label>`).join('')}</div></div>
    <div><div class="muted" style="font-weight:650;font-size:14px;margin-bottom:6px;color:var(--text)">Temperature</div><div class="seg" id="setUnits">${[['f', '°F'], ['c', '°C']].map(([v, l]) => `<label><input type="radio" name="units" value="${v}"${data.settings.units === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
  </div>
  ${deviceSettingsHtml()}
  <div class="set-group"><h3>Cards <small>turn on or off, nothing is deleted</small></h3>
    <div class="swlist" id="cardToggles">${ALL.filter(id => W[id]).map(id => `<label class="swrow"><span>${esc(W[id].title)}</span><input type="checkbox" role="switch" data-card="${id}"${isCardHidden(id) ? '' : ' checked'}></label>`).join('')}<label class="swrow"><span>Summary tiles and forecast</span><input type="checkbox" role="switch" data-top${data.settings.hideTop ? '' : ' checked'}></label></div>
  </div>
  <div class="set-group"><h3>Layout for everyone <small>make this arrangement the starting layout on other devices</small></h3>
    <p>Arrange and hide cards how you like, then copy the layout code and send it to Claude to publish as the new default. Devices you have not customized pick it up automatically.</p>
    <div class="row2"><button class="btn" type="button" id="layCopy">Copy layout code</button><button class="btn" type="button" id="layReset">Use the shared layout here</button></div>
    <textarea id="layCode" readonly hidden rows="4" style="width:100%;margin-top:8px;font-size:12px" aria-label="Layout code"></textarea>
  </div>
  <div class="set-group"><h3>Sync across devices</h3>
    <p>Keeps your dashboard identical on your phone, laptop and tablet using a private GitHub Gist (a hidden file in your own GitHub account). Create a token once, then paste it on each device.</p>
    <div class="status-line" id="syncStatus">${syncStatusHtml()}</div>
    ${sync.token ? `<div class="tokrow"><span class="muted">Token on this device</span><button type="button" class="tokbtn" id="tokShow" data-shown="0" title="Tap to reveal, tap again to copy">Reveal token</button></div>` : ''}
    ${sync.token ? `<div class="row2"><button class="btn primary" type="button" id="syncNow">Sync now</button><button class="btn danger" type="button" id="syncOff">Disconnect this device</button></div>` :
      `<ol class="muted" style="margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.5"><li>Open <a href="https://github.com/settings/tokens/new?scopes=gist&description=Home%20Dashboard" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">GitHub token page</a> (classic token, only the <b>gist</b> box ticked).</li><li>Tap Generate token, copy it, and paste it below.</li></ol><div class="row2"><input type="password" id="tok" placeholder="Paste token" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="GitHub token"><button class="btn primary" type="button" id="syncOn">Connect</button></div>`}
    <p style="margin-top:10px;font-size:13px">Latest change wins if two devices edit at once, so the app checks for updates whenever you come back to it. Keep passwords and card numbers out of this app.</p>
  </div>
  <div class="set-group"><h3>Your data</h3><div class="row2"><button class="btn" type="button" id="exp">Download backup</button><button class="btn" type="button" id="imp">Restore from backup</button><button class="btn" type="button" id="lockNow">Lock this device</button><input type="file" id="impFile" accept="application/json,.json" hidden></div></div>`,
    {
      title: 'Settings', onOpen(b) {
        bindDeviceSettings(b);
        $('#cardToggles', b).addEventListener('change', e => {
          const t = e.target;
          if (t.matches('[data-top]')) { data.settings.hideTop = !t.checked; save(); applyTop(); return; }
          if (t.dataset.card) setCardHidden(t.dataset.card, !t.checked);
        });
        $('#layCopy', b).addEventListener('click', async () => {
          const code = JSON.stringify({ layout: data.layout, hideTop: !!data.settings.hideTop }), ta = $('#layCode', b);
          ta.value = code; ta.hidden = false; ta.select();
          try { await navigator.clipboard.writeText(code); toast('Layout code copied'); } catch { toast('Select the code below and copy it'); }
        });
        $('#layReset', b).addEventListener('click', () => {
          if (!confirm('Replace this device\'s layout with the shared one?')) return;
          data.layout = {}; if (sharedLayout && 'hideTop' in sharedLayout) data.settings.hideTop = !!sharedLayout.hideTop;
          save(); applyTop(); renderAll(); sheet.close && sheet.close();
        });
        $('#setName', b).addEventListener('input', e => { data.settings.name = e.target.value.trim(); save(); renderHeader(); });
        $('#setTheme', b).addEventListener('change', e => { lsSet(THEME_KEY, e.target.value); applyTheme(); });
        $('#setUnits', b).addEventListener('change', e => { data.settings.units = e.target.value; save(); loadWeather(true); });
        const on = $('#syncOn', b); on && on.addEventListener('click', () => { const t = $('#tok', b).value.trim(); if (!t) return; sync = { ...sync, token: t, gistId: '', state: 'syncing', err: '' }; saveSyncCfg(); sheet.close(); syncNow({ first: true }); });
        const ts = $('#tokShow', b); ts && ts.addEventListener('click', async () => {
          if (ts.dataset.shown !== '1') { ts.dataset.shown = '1'; ts.textContent = sync.token; return; }
          try { await navigator.clipboard.writeText(sync.token); toast('Token copied'); } catch { const r = document.createRange(); r.selectNodeContents(ts); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Select and copy the token'); }
        });
        const now = $('#syncNow', b); now && now.addEventListener('click', () => { lastPull = Date.now(); syncNow(); });
        const off = $('#syncOff', b); off && off.addEventListener('click', () => { if (!confirm('Disconnect this device? Your data stays here and in the cloud copy.')) return; sync = { token: '', gistId: '', last: 0, state: 'off', err: '' }; saveSyncCfg(); setSyncState('off'); sheet.close(); toast('Disconnected'); });
        $('#exp', b).addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `home-dashboard-${todayStr()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
        $('#lockNow', b).addEventListener('click', () => { try { localStorage.removeItem(AUTH_KEY); } catch { } location.reload(); });
        $('#imp', b).addEventListener('click', () => $('#impFile', b).click());
        $('#impFile', b).addEventListener('change', async e => {
          const f = e.target.files[0]; if (!f) return;
          try { const d = JSON.parse(await f.text()); if (!d || d.v !== 1) throw 0; if (!confirm('Replace everything on this device with this backup?')) return; data = normalize(d); save(); sheet.close(); renderAll(); toast('Backup restored'); } catch { toast('That file is not a Home Dashboard backup'); }
        });
      }
    });
}
$('#btnSettings').addEventListener('click', openSettings);
