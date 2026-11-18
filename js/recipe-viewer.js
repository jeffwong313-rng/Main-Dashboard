'use strict';
/* ================= recipes: viewer + editor ================= */
function openSheetRecipe(r) {
  const groups = () => { const g = []; r.ing.forEach(i => { let x = g.find(y => y.n === i.group); if (!x) g.push(x = { n: i.group, l: [] }); x.l.push(i); }); return g; };
  const ingHtml = mult => r.ing.length ? groups().map(g => `<h4 class="grp">${esc(g.n)}</h4><ul class="ing">${g.l.map(i => `<li><label><input type="checkbox" value="${esc(ingText(i, mult, false))}"><span>${esc(ingText(i, mult))}</span></label></li>`).join('')}</ul>`).join('') : '<p class="muted">No ingredients listed.</p>';
  const stepsOf = ph => r.steps.filter(x => x.phase === ph).map(x => x.text);
  const ol = a => `<ol>${a.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`;
  const prep = stepsOf('Prep'), cook = stepsOf('Cook');
  const facts = [r.category, r.cuisine, r.servings && r.servings + ' servings', r.prep && 'Prep ' + r.prep + ' min', r.cook && 'Cook ' + r.cook + ' min'].filter(Boolean);
  const src = /^https?:\/\//i.test(r.source) ? `<a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">${esc(new URL(r.source).hostname.replace(/^www\./, ''))}</a>` : esc(r.source);
  const mults = [[0.5, '½'], [1, '×1'], [2, '×2'], [3, '×3'], [4, '×4']];
  let mult = 1;
  openSheet(
    `${facts.length ? `<p class="rmeta">${facts.map(esc).join(' · ')}</p>` : ''}
    ${r.equipment ? `<p class="rmeta"><b>Equipment</b> ${esc(r.equipment)}</p>` : ''}${r.source ? `<p class="rmeta"><b>Source</b> ${src}</p>` : ''}
    <h3 class="sub">Ingredients <small>tick what you need to buy</small></h3>
    <div class="scale" role="group" aria-label="Scale the recipe">${mults.map(([m, l]) => `<button type="button" class="rchip${m === 1 ? ' on' : ''}" data-mult="${m}">${l}</button>`).join('')}</div>
    <div data-ings>${ingHtml(1)}</div>
    ${prep.length ? `<h3 class="sub">Prep</h3><div class="steps">${ol(prep)}</div>` : ''}
    <h3 class="sub">Cooking instructions</h3>
    <div class="steps">${cook.length ? ol(cook) : '<p class="muted">No steps written yet. Add them in the Sheet\'s Steps tab.</p>'}</div>
    ${r.notes ? `<h3 class="sub">Notes</h3><div class="steps"><p>${esc(r.notes)}</p></div>` : ''}
    <div class="actions wrap">${r.ing.length ? '<button class="btn primary" type="button" data-addshop></button>' : ''}<a class="btn ghost" href="${SHEET_URL}" target="_blank" rel="noopener noreferrer">${icon('external')} Open in Google Sheets</a></div>`,
    {
      title: r.title, accent: W.recipes.accent, onOpen(b) {
        const btn = $('[data-addshop]', b);
        const picked = () => $$('.ing input:checked', b).map(i => i.value);
        const label = () => { if (btn) btn.textContent = picked().length ? `Add ${picked().length} to Shopping` : 'Add all to Shopping'; };
        label(); b.addEventListener('change', label);
        $$('[data-mult]', b).forEach(m => m.addEventListener('click', () => {
          mult = +m.dataset.mult * r.scale; $$('[data-mult]', b).forEach(x => x.classList.toggle('on', x === m));
          $('[data-ings]', b).innerHTML = ingHtml(mult); label();
        }));
        btn && btn.addEventListener('click', () => {
          const items = picked().length ? picked() : r.ing.map(i => ingText(i, mult, false)); let n = 0;
          items.forEach(t => { if (!data.shop.some(x => !x.done && x.t.toLowerCase() === t.toLowerCase())) { data.shop.unshift({ id: uid(), t, done: false, created: Date.now() }); n++; } });
          touched('shop'); sheet.close(); toast(n ? `Added ${n} item${n === 1 ? '' : 's'} to Shopping` : 'Everything is already on your list');
        });
      }
    });
}
function openRecipe(id) {
  const sr = feed.recipes.find(x => x.id === id); if (sr) return openSheetRecipe(sr);
  const r = byId(data.recipes, id); if (!r) return;
  const stepLines = lines(r.steps).map(s => s.replace(/^\s*(?:step\s*)?\d+[.)]\s*/i, ''));
  openSheet(
    `${r.url ? `<a class="btn ghost" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} Open original</a>` : ''}
    <h3 class="sub">Ingredients <small>tick what you need to buy</small></h3>
    ${r.ing.length ? `<ul class="ing">${r.ing.map(i => `<li><label><input type="checkbox" value="${esc(i)}"><span>${esc(i)}</span></label></li>`).join('')}</ul>` : '<p class="muted">No ingredients listed.</p>'}
    <h3 class="sub">Steps</h3>
    <div class="steps">${stepLines.length > 1 ? `<ol>${stepLines.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : stepLines.length ? `<p>${esc(stepLines[0])}</p>` : '<p class="muted">No steps written.</p>'}</div>
    <div class="actions wrap">${r.ing.length ? '<button class="btn primary" type="button" data-addshop></button>' : ''}<button class="btn" type="button" data-edit>Edit</button><button class="btn danger" type="button" data-del>Delete</button></div>`,
    {
      title: r.title, accent: W.recipes.accent, onOpen(b) {
        const btn = $('[data-addshop]', b);
        const picked = () => $$('.ing input:checked', b).map(i => i.value);
        const label = () => { if (btn) btn.textContent = picked().length ? `Add ${picked().length} to Shopping` : 'Add all to Shopping'; };
        label(); b.addEventListener('change', label);
        btn && btn.addEventListener('click', () => {
          const items = picked().length ? picked() : r.ing; let n = 0;
          items.forEach(t => { if (!data.shop.some(x => !x.done && x.t.toLowerCase() === t.toLowerCase())) { data.shop.unshift({ id: uid(), t, done: false, created: Date.now() }); n++; } });
          touched('shop'); sheet.close(); toast(n ? `Added ${n} item${n === 1 ? '' : 's'} to Shopping` : 'Everything is already on your list');
        });
        $('[data-edit]', b).addEventListener('click', () => openRecipeEditor(id));
        $('[data-del]', b).addEventListener('click', () => { sheet.close(); remove('recipes', id, 'recipes'); });
      }
    });
}
function openRecipeEditor(id) {
  const r = id ? byId(data.recipes, id) : { title: '', ing: [], steps: '', url: '' };
  openSheet(`<form class="form" id="rf">
    <label>Recipe name<input name="title" required value="${esc(r.title)}" placeholder="Weeknight chili" autocomplete="off"></label>
    <label>Ingredients <small>one per line</small><textarea name="ing" rows="6" placeholder="2 cups rice&#10;1 onion">${esc(r.ing.join('\n'))}</textarea></label>
    <label>Steps <small>one per line, or paste a paragraph</small><textarea name="steps" rows="6">${esc(r.steps)}</textarea></label>
    <label>Link <small>optional</small><input name="url" inputmode="url" autocapitalize="off" value="${esc(r.url || '')}" placeholder="https://"></label>
    <div class="actions"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">Save recipe</button></div></form>`,
    {
      title: id ? 'Edit recipe' : 'New recipe', accent: W.recipes.accent, onOpen(b) {
        $('input[name=title]', b).focus();
        $('#rf', b).addEventListener('submit', e => {
          e.preventDefault(); const f = new FormData(e.target);
          const rec = { title: f.get('title').toString().trim(), ing: lines(f.get('ing')), steps: f.get('steps').toString().trim(), url: cleanUrl(f.get('url')) };
          if (!rec.title) return;
          if (id) Object.assign(r, rec); else data.recipes.unshift({ id: uid(), created: Date.now(), ...rec });
          touched('recipes'); sheet.close(); toast('Recipe saved');
        });
      }
    });
}
