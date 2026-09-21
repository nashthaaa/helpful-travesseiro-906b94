import { html, str, print, icon, cap, pad2, CATEGORIES, tiltFor } from '../ui.js';
import { listRecipes, searchRecipes, ingredientHit, contributors } from '../store.js';

const RATIOS = [0.8, 1, 1.25, 0.8, 1, 1.25]; // a little variety down the page

function entry(r, i, q) {
  const hit = ingredientHit(r, q);
  return html`
    <li class="entry">
      <a class="entry__link" href="#/recipe/${r.id}">
        ${print(r.photo, { seed: r.id, tilt: tiltFor(r.id, 2), ratio: RATIOS[i % RATIOS.length], cover: true, caption: '', tape: i % 4 === 0 ? 'tl' : '', variant: i % 3 === 1 ? 'print--plain' : '' })}
        <span class="entry__meta label">${r.number ? `No. ${pad2(r.number)}` : 'Sample'} · ${r.category}</span>
        <span class="entry__title">${r.title}</span>
        <span class="meta">by ${r.contributor}</span>
        ${hit ? html`<span class="entry__hit">with ${hit}</span>` : ''}
        ${r.quote && !hit ? html`<span class="hand entry__quote">${r.quote}</span>` : ''}
      </a>
    </li>`;
}

export async function collectionView({ query }) {
  const all = await listRecipes();
  const cooks = contributors(all);
  const state = { q: query.get('q') || '', cat: query.get('cat') || '', by: query.get('by') || '' };
  if (!CATEGORIES.includes(state.cat)) state.cat = '';
  if (!cooks.includes(state.by)) state.by = '';

  const counts = {};
  for (const r of all) counts[r.category] = (counts[r.category] || 0) + 1;
  const tabs = [['', 'All', all.length], ...CATEGORIES.map((c) => [c, cap(c), counts[c] || 0])];

  const results = (s) => searchRecipes(all, s);
  const list = (s) => {
    const found = results(s);
    return found.length
      ? html`<ul class="entries">${found.map((r, i) => entry(r, i, s.q))}</ul>`
      : html`<div class="empty">
          <p class="hand hand--lg">nothing in the index matches that yet.</p>
          <p class="lede">Try another ingredient, or clear the filters. Or <a href="#/add">add the recipe yourself</a>.</p>
        </div>`;
  };
  const countText = (s) => { const n = results(s).length; return `${n} ${n === 1 ? 'recipe' : 'recipes'}`; };

  const body = html`
    <section class="sheet sheet--collection" style="--paper-tilt:.18deg" aria-labelledby="coll-title">
      <p class="bracket">[ ${all.length} ${all.length === 1 ? 'recipe' : 'recipes'}, cooked by ${cooks.length} ${cooks.length === 1 ? 'person' : 'people'} ]</p>
      <div class="coll-head">
        <div>
          <p class="label">The index</p>
          <h1 class="display" id="coll-title">All the<br>recipes</h1>
        </div>
        <p class="hand coll-head__hand">what are we making tonight?</p>
      </div>

      <form class="finder" role="search" aria-label="Search the recipes" autocomplete="off">
        <div class="finder__search">
          <label class="label" for="q">Search by recipe or ingredient</label>
          <div class="finder__field">
            <input id="q" name="q" type="search" value="${state.q}" placeholder="try: tomato, lemon, pancakes" enterkeyhint="search">
            <button class="finder__clear" type="button" data-clear aria-label="Clear search" ${state.q ? '' : 'hidden'}>${icon('x')}</button>
          </div>
        </div>
        <div class="finder__by">
          <label class="label" for="by">Cooked by</label>
          <div class="select">
            <select id="by" name="by">
              <option value="">Everyone</option>
              ${cooks.map((c) => html`<option value="${c}" ${c === state.by ? 'selected' : ''}>${c}</option>`)}
            </select>
          </div>
        </div>
        <fieldset class="finder__cats">
          <legend class="label">Course</legend>
          <div class="cats">
            ${tabs.map(([v, label, n]) => html`<button type="button" class="cat" data-cat="${v}" aria-pressed="${v === state.cat}">${label}<span class="cat__n">${n}</span></button>`)}
          </div>
        </fieldset>
      </form>

      <p class="count" id="count" role="status" aria-live="polite">${countText(state)}</p>
      <div id="results">${list(state)}</div>
    </section>`;

  function mount(root) {
    const q = root.querySelector('#q');
    const by = root.querySelector('#by');
    const clear = root.querySelector('[data-clear]');
    const cats = [...root.querySelectorAll('.cat')];
    const resultsEl = root.querySelector('#results');
    const countEl = root.querySelector('#count');

    const sync = () => {
      const s = { q: q.value.trim(), cat: state.cat, by: by.value };
      resultsEl.innerHTML = str(list(s));
      countEl.textContent = countText(s);
      clear.hidden = !q.value;
      cats.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
      const p = new URLSearchParams();
      if (s.q) p.set('q', s.q);
      if (s.cat) p.set('cat', s.cat);
      if (s.by) p.set('by', s.by);
      history.replaceState(null, '', '#/recipes' + (p.size ? '?' + p : ''));
    };

    q.addEventListener('input', sync);
    by.addEventListener('change', sync);
    clear.addEventListener('click', () => { q.value = ''; sync(); q.focus(); });
    cats.forEach((b) => b.addEventListener('click', () => { state.cat = b.dataset.cat; sync(); }));
    root.querySelector('.finder').addEventListener('submit', (e) => e.preventDefault());
  }

  return { title: 'All the recipes', body, mount };
}
