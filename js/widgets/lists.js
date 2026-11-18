'use strict';
/* ================= widgets ================= */
const NEWS_COLORS = { 'World': '#3b82c4', 'U.S.': '#d9534f', 'Politics': '#8b5cf6', 'Economy': '#2fa56e', 'Finance': '#0e9f8e', 'Local': '#e8873a', 'Sports': '#e5677f', 'Tech': '#4f6ef0', 'Science': '#17a2b8', 'Health': '#c25fd0', 'Entertainment': '#d6a31c' };
const TAG_DEFAULTS = [['Travel', '#3b9ae8'], ['Important Days', '#e5677f'], ['Friends', '#e8a23a'], ['Family', '#2fb7a3']];
const TAG_EXTRA = ['#8b7cf0', '#c25fd0', '#7bb83d', '#e0884b', '#5a9fb0', '#d1648c'];
const TAGGED = { todo: 'todos', shop: 'shop', notes: 'notes', events: 'events', watch: 'watch', chores: 'chores', bills: 'bills', links: 'links' };
const allTags = () => { const m = new Map(); TAG_DEFAULTS.forEach(([n]) => m.set(n.toLowerCase(), n)); Object.values(TAGGED).forEach(k => (data[k] || []).forEach(e => { if (e.tag && !m.has(e.tag.toLowerCase())) m.set(e.tag.toLowerCase(), e.tag); })); return [...m.values()]; };
const usedTags = () => { const m = new Map(); Object.values(TAGGED).forEach(k => (data[k] || []).forEach(e => { if (e.tag && !m.has(e.tag.toLowerCase())) m.set(e.tag.toLowerCase(), e.tag); })); (data.newsFav || []).forEach(t => { if (!m.has(t.toLowerCase())) m.set(t.toLowerCase(), t); }); return [...m.values()].sort((a, b) => a.localeCompare(b)); };
const TAGF = { k: 'tag', ph: 'Tag (optional)', attrs: 'list="eventTags" maxlength="24" autocapitalize="words"' };
const tagAct = (wid, key) => ({ el, id }) => inlineEdit(el, { wid, list: 'eventTags', allowEmpty: true, onSave: v => { byId(data[key], id).tag = canonTag(v); touched(wid); } });
const canonTag = t => { t = String(t || '').trim().replace(/\s+/g, ' ').slice(0, 24); if (!t) return ''; return allTags().find(x => x.toLowerCase() === t.toLowerCase()) || Object.keys(NEWS_COLORS).find(x => x.toLowerCase() === t.toLowerCase()) || t.charAt(0).toUpperCase() + t.slice(1); };
const tagColor = t => { const k = t.toLowerCase(), d = TAG_DEFAULTS.find(x => x[0].toLowerCase() === k); if (d) return d[1]; const nk = Object.keys(NEWS_COLORS).find(x => x.toLowerCase() === k); if (nk) return NEWS_COLORS[nk]; let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TAG_EXTRA[h % TAG_EXTRA.length]; };
const tagChip = (e, editable = true, cls = '') => e.tag ? `<span class="evtag${cls}" style="--tg:${tagColor(e.tag)}"${editable ? ` data-act="editTag" data-raw="${esc(e.tag)}" title="Change tag"` : ''}>${esc(e.tag)}</span>` : (editable ? `<span class="evtag none${cls}" data-act="editTag" data-raw="" title="Add a tag">+ Tag</span>` : '');
const W = {};
const empty = (t, s) => `<div class="empty"><strong>${esc(t)}</strong><span>${esc(s)}</span></div>`;
const delBtn = `<button class="icon-btn del" data-act="del" aria-label="Delete">${icon('x')}</button>`;

W.todo = {
  title: 'To-Do', icon: 'list', accent: '#2fb8a6',
  add: { fields: [{ k: 't', ph: 'Add a task', type: 'textarea' }, TAGF], submit(v) { const tag = canonTag(v.tag); lines(v.t).forEach(t => data.todos.unshift({ id: uid(), t, tag, done: false, created: Date.now() })); touched('todo'); } },
  count: () => data.todos.filter(t => !t.done).length,
  render() {
    if (!data.todos.length) return empty('Nothing to do', 'Tap + to add a task.');
    const open = data.todos.filter(t => !t.done), done = data.todos.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const row = t => `<li class="row${t.done ? ' is-done' : ''}" data-id="${t.id}"><button class="chk" data-act="toggle" aria-label="${t.done ? 'Mark not done' : 'Mark done'}">${icon('check')}</button><div class="row-main"><span class="txt" data-act="edit">${esc(t.t)}</span><small class="meta">${fmtStamp(t.created)}</small></div>${tagChip(t, true, ' sm')}${delBtn}</li>`;
    return `<ul class="rows">${open.map(row).join('')}</ul>` + (done.length ? `<div class="sep"><span>Completed (${done.length})</span><button class="link" data-act="clearDone">Clear</button></div><ul class="rows">${done.slice(0, 40).map(row).join('')}</ul>` : '');
  },
  act: {
    toggle: ({ id }) => { const t = byId(data.todos, id); t.done = !t.done; t.doneAt = t.done ? Date.now() : null; touched('todo'); },
    del: ({ id }) => remove('todos', id, 'todo'),
    editTag: tagAct('todo', 'todos'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'todo', onSave: v => { byId(data.todos, id).t = v; touched('todo'); } }),
    clearDone: () => undoable('Cleared completed tasks', () => { data.todos = data.todos.filter(t => !t.done); }, 'todo')
  }
};

W.shop = {
  title: 'Shopping', icon: 'cart', accent: '#e8a23a',
  add: {
    fields: [{ k: 't', ph: 'Add items, separated by commas', type: 'textarea' }, TAGF],
    submit(v) {
      let dup = 0;
      lines(v.t, true).forEach(t => {
        if (data.shop.some(x => !x.done && x.t.toLowerCase() === t.toLowerCase())) { dup++; return; }
        data.shop.unshift({ id: uid(), t, tag: canonTag(v.tag), done: false, created: Date.now() });
      });
      touched('shop'); if (dup) toast(dup === 1 ? 'Already on the list' : `${dup} items were already on the list`);
    }
  },
  count: () => data.shop.filter(t => !t.done).length,
  render() {
    if (!data.shop.length) return empty('List is empty', 'Tap + and type items, like "milk, eggs, rice".');
    const open = data.shop.filter(t => !t.done), done = data.shop.filter(t => t.done);
    const row = t => `<li class="row${t.done ? ' is-done' : ''}" data-id="${t.id}"><button class="chk" data-act="toggle" aria-label="${t.done ? 'Put back on list' : 'Check off'}">${icon('check')}</button><div class="row-main"><span class="txt" data-act="edit">${esc(t.t)}</span></div>${tagChip(t, true, ' sm')}${delBtn}</li>`;
    return `<ul class="rows">${open.map(row).join('')}</ul>` + (done.length ? `<div class="sep"><span>In the cart (${done.length})</span><button class="link" data-act="clearDone">Clear</button></div><ul class="rows">${done.map(row).join('')}</ul>` : '');
  },
  act: {
    toggle: ({ id }) => { const t = byId(data.shop, id); t.done = !t.done; touched('shop'); },
    del: ({ id }) => remove('shop', id, 'shop'),
    editTag: tagAct('shop', 'shop'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'shop', onSave: v => { byId(data.shop, id).t = v; touched('shop'); } }),
    clearDone: () => undoable('Cleared checked items', () => { data.shop = data.shop.filter(t => !t.done); }, 'shop')
  }
};

const WTYPES = [['tv', 'TV shows'], ['movie', 'Movies'], ['special', 'Specials']];
let watchTab = 'all', watchShowDone = false;
W.watch = {
  title: 'Watch list', icon: 'film', accent: '#c25fd0',
  add: {
    fields: [{ k: 't', ph: 'Add a title' }, { k: 'type', type: 'select', options: [['tv', 'TV show'], ['movie', 'Movie'], ['special', 'Special']], val: 'tv' }, TAGF],
    primary: 't',
    submit(v) {
      const t = v.t.trim(), type = ['tv', 'movie', 'special'].includes(v.type) ? v.type : 'tv';
      if (data.watch.some(x => !x.done && x.type === type && x.t.toLowerCase() === t.toLowerCase())) { toast('Already on the list'); return false; }
      data.watch.unshift({ id: uid(), t, type, tag: canonTag(v.tag), done: false, created: Date.now() }); watchTab = type; touched('watch');
    }
  },
  count: () => data.watch.filter(x => !x.done).length,
  render() {
    const n = k => data.watch.filter(x => !x.done && (k === 'all' || x.type === k)).length, doneN = data.watch.filter(x => x.done).length;
    const tabs = [['all', 'All'], ...WTYPES].map(([k, l]) => `<button type="button" class="rchip${watchTab === k ? ' on' : ''}" data-act="wtab" data-k="${k}">${l} ${n(k)}</button>`).join('');
    const chips = `<div class="rchips" role="group" aria-label="Filter by type">${tabs}<button type="button" class="rchip${watchShowDone ? ' on' : ''}" data-act="wshow" aria-pressed="${watchShowDone}">Watched ${doneN}</button></div>`;
    const typeName = k => (WTYPES.find(x => x[0] === k) || [0, 'Other'])[1];
    const row = t => `<li class="row${t.done ? ' is-done' : ''}" data-id="${t.id}"><button class="chk" data-act="toggle" aria-label="${t.done ? 'Put back on the list' : 'Mark as watched'}">${icon('check')}</button><div class="row-main"><span class="txt" data-act="edit">${esc(t.t)}</span>${t.done ? `<small class="meta">${typeName(t.type).replace(/s$/, '')}${t.doneAt ? ' · watched ' + new Date(t.doneAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</small>` : ''}</div>${tagChip(t, true, ' sm')}${delBtn}</li>`;
    const open = data.watch.filter(x => !x.done && (watchTab === 'all' || x.type === watchTab));
    let html = '';
    if (watchTab === 'all') WTYPES.forEach(([k, l]) => { const g = open.filter(x => x.type === k); if (g.length) html += `<h4 class="grp">${l}</h4><ul class="rows">${g.map(row).join('')}</ul>`; });
    else html = open.length ? `<ul class="rows">${open.map(row).join('')}</ul>` : '';
    if (!open.length && !(watchShowDone && doneN)) html = empty(data.watch.some(x => !x.done) ? 'Nothing here' : 'Nothing to watch yet', data.watch.some(x => !x.done) ? 'Try another tab.' : 'Tap + to add a show, movie or special.');
    if (watchShowDone) {
      const done = data.watch.filter(x => x.done && (watchTab === 'all' || x.type === watchTab)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
      html += done.length ? `<div class="sep"><span>Watched (${done.length})</span></div><ul class="rows">${done.map(row).join('')}</ul>` : '';
    }
    return `<div class="wl">${chips}${html}</div>`;
  },
  act: {
    editTag: tagAct('watch', 'watch'),
    wtab: ({ el }) => { watchTab = el.dataset.k; renderWidget('watch'); },
    wshow: () => { watchShowDone = !watchShowDone; renderWidget('watch'); },
    toggle: ({ id }) => {
      const t = byId(data.watch, id); t.done = !t.done; if (t.done) t.doneAt = Date.now(); else delete t.doneAt; touched('watch');
      if (t.done && !watchShowDone) toast('Marked as watched', { undo: () => { t.done = false; delete t.doneAt; touched('watch'); } });
    },
    del: ({ id }) => remove('watch', id, 'watch'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'watch', onSave: v => { byId(data.watch, id).t = v; touched('watch'); } })
  }
};

W.notes = {
  title: 'Notes', icon: 'note', accent: '#8b7cf0',
  add: { fields: [{ k: 't', ph: 'Jot something down', type: 'textarea', multi: true }, TAGF], submit(v) { data.notes.unshift({ id: uid(), t: v.t.trim(), tag: canonTag(v.tag), created: Date.now() }); touched('notes'); } },
  count: () => data.notes.length,
  render() {
    if (!data.notes.length) return empty('No notes yet', 'Tap + to jot something down. Each note is saved with the time.');
    return `<ul class="notes-list" style="padding-top:2px">${[...data.notes].sort((a, b) => b.created - a.created).map(n =>
      `<li class="note" data-id="${n.id}"><div class="note-txt" data-act="edit" data-raw="${esc(n.t)}">${linkify(n.t)}</div><div class="note-foot"><span>${fmtStamp(n.created)}${n.edited ? ', edited' : ''}</span>${tagChip(n, true, ' sm')}${delBtn}</div></li>`).join('')}</ul>`;
  },
  act: {
    editTag: tagAct('notes', 'notes'),
    del: ({ id }) => remove('notes', id, 'notes'),
    edit: ({ el, id }) => inlineEdit(el, { wid: 'notes', multiline: true, onSave: v => { const n = byId(data.notes, id); n.t = v; n.edited = Date.now(); touched('notes'); } })
  }
};
