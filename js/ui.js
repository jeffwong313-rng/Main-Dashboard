'use strict';
/* ================= toast / undo ================= */
let toastTimer;
function toast(msg, opts = {}) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>${opts.undo ? '<button type="button" data-undo>Undo</button>' : ''}`;
  t.classList.add('show');
  t.onclick = e => { if (e.target.closest('[data-undo]') && opts.undo) { opts.undo(); t.classList.remove('show'); } };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), opts.undo ? 6000 : 2600);
}
function undoable(label, fn, ...ids) {
  const snap = JSON.stringify(data);
  fn(); touched(...ids);
  toast(label, { undo: () => { data = normalize(JSON.parse(snap)); save(); renderAll(); } });
}
const remove = (key, id, wid) => undoable('Deleted', () => { data[key] = data[key].filter(x => x.id !== id); }, wid);

/* ================= sheet (dialog) ================= */
const sheet = $('#sheet');
function openSheet(html, { title = '', onOpen, cls = '', accent } = {}) {
  sheet.className = 'sheet ' + cls;
  sheet.innerHTML = `<div class="sheet-card"${accent ? ` style="--accent:${accent}"` : ''}><header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button></header><div class="sheet-body">${html}</div></div>`;
  if (!sheet.open) sheet.showModal();
  onOpen && onOpen($('.sheet-body', sheet));
}
sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.close(); });

/* ================= inline editing ================= */
function inlineEdit(span, { wid, onSave, multiline = false, allowEmpty = false, list = '', type = 'text' }) {
  const raw = span.dataset.raw != null ? span.dataset.raw : span.textContent;
  const inp = document.createElement(multiline ? 'textarea' : 'input');
  inp.className = 'inline-edit'; inp.value = raw;
  if (!multiline) { inp.type = type; if (list) inp.setAttribute('list', list); if (type === 'number') inp.step = '0.01'; } else inp.rows = clamp(raw.split('\n').length + 1, 3, 10);
  span.replaceWith(inp); inp.focus(); if (inp.select) inp.select();
  let finished = false;
  const finish = commit => {
    if (finished) return; finished = true;
    const v = inp.value.trim();
    if (commit && v !== raw && (v || allowEmpty)) onSave(v); else renderWidget(wid);
  };
  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); finish(true); }
  });
  inp.addEventListener('blur', () => finish(true));
}
