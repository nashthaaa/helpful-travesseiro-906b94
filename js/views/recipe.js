import { html, raw, print, placeholder, icon, cap, pad2, ingredientAmount } from '../ui.js';
import { getRecipe } from '../store.js';
import { notFoundView } from './misc.js';

const PAGES = 3;

const pager = (n) => html`
  <div class="pager" role="group" aria-label="Pages of this recipe">
    ${[1, 2, 3].map((i) => html`<button type="button" class="pager__dot" data-goto="${i}" aria-label="Go to page ${i}" ${i === n ? raw('aria-current="true"') : ''}></button>`)}
    <span class="pager__n">${pad2(n)} / ${pad2(PAGES)}</span>
  </div>`;

const turn = ({ prev, next, extra }) => html`
  <footer class="spread__turn">
    ${prev ? html`<button type="button" class="turn" data-goto="${prev}">${icon('left')} Previous page</button>` : html`<span></span>`}
    ${extra || ''}
    ${next ? html`<button type="button" class="turn" data-goto="${next}">Next page ${icon('right')}</button>` : html`<span></span>`}
  </footer>`;

export async function recipeView({ params: [id] }) {
  const r = await getRecipe(id);
  if (!r) return notFoundView({ what: 'recipe' });

  const cookHref = `#/recipe/${r.id}/cook`;
  const [extraPhoto, ...morePhotos] = r.photos || [];
  const [memory, ...moreMemories] = r.memories || [];
  const long = r.title.length > 26 ? 'display--long' : '';
  const label = r.number ? `Recipe no. ${pad2(r.number)} / a shared kitchen` : 'Sample recipe / a shared kitchen';

  const cookBtn = html`<a class="btn" href="${cookHref}">${icon('pot')} Start cooking</a>`;

  const body = html`
    <div class="recipe" data-recipe="${r.id}">
      <p class="crumbs"><a href="#/recipes">${icon('left')} All recipes</a></p>

      <section class="sheet spread spread--title" id="page-1" data-page="1" style="--paper-tilt:-.24deg" aria-labelledby="r-title">
        <header class="spread__top"><p class="label">${label}</p>${pager(1)}</header>
        ${r.sample ? html`<p class="stamp">Sample recipe · delete it once you have added your own</p>` : ''}

        <div class="spread__cols">
          <div class="spread__text">
            ${r.tagline ? html`<p class="bracket bracket--left">[ ${r.tagline.replace(/\.$/, '').toLowerCase()} ]</p>` : ''}
            <h1 class="display ${long}" id="r-title">${r.title}</h1>
            <p class="byline"><span class="label">Contributed by</span> <span class="byline__name">${r.contributor}</span></p>
            ${r.quote ? html`<blockquote class="hand hand--lg quote">${r.quote}</blockquote>` : ''}
            <dl class="facts">
              <div><dt class="label">Serves</dt><dd>${r.servings || '—'}</dd></div>
              <div><dt class="label">Course</dt><dd>${cap(r.category)}</dd></div>
              <div><dt class="label">Steps</dt><dd>${r.steps.length}</dd></div>
            </dl>
            <div class="actions">
              ${cookBtn}
              <a class="btn btn--ghost" href="#/edit/${r.id}">Edit recipe</a>
            </div>
          </div>

          <div class="spread__media">
            ${print(r.photo, { seed: r.id, tilt: 2.1, tape: 'tl', eager: true, ratio: 0.8, caption: r.photo?.caption, sizes: '(min-width: 1020px) 470px, 90vw' })}
            ${memory ? html`<div class="memory">${print(memory, { seed: memory.src, tilt: -3.4, tape: 'top', variant: 'print--polaroid', ratio: 1.17 })}</div>` : ''}
          </div>
        </div>
        ${turn({ next: 2 })}
      </section>

      <section class="sheet spread spread--gather" id="page-2" data-page="2" style="--paper-tilt:.2deg" aria-labelledby="r-gather">
        <header class="spread__top"><p class="label">Page two / shopping list</p>${pager(2)}</header>
        <div class="spread__cols">
          <div class="spread__text">
            <h2 class="display display--md" id="r-gather">Gather these first.</h2>
            <ul class="ing">
              ${r.ingredients.map((i) => html`
                <li>
                  <span class="ing__amt">${ingredientAmount(i)}</span>
                  <span class="ing__item">${i.item}${i.amount != null && i.note ? html`<span class="ing__note">${i.note}</span>` : ''}</span>
                </li>`)}
            </ul>
            ${r.servings ? html`<p class="meta ing__foot">Quantities are for ${r.servings}. Cooking mode can scale them.</p>` : ''}
          </div>
          <div class="spread__side">
            <div class="ornament" aria-hidden="true">${placeholder(r.id + ':plate', 1.15, '')}</div>
            ${r.note?.text ? html`
              <aside class="note">
                <p class="label">Small note</p>
                <p class="hand hand--lg">${r.note.text}</p>
                <p class="meta">— ${r.note.by || r.contributor}</p>
              </aside>` : ''}
          </div>
        </div>
        ${turn({ prev: 1, next: 3 })}
      </section>

      <section class="sheet spread spread--method" id="page-3" data-page="3" style="--paper-tilt:-.18deg" aria-labelledby="r-method">
        <header class="spread__top"><p class="label">Page three / no rushing</p>${pager(3)}</header>
        <div class="spread__cols ${extraPhoto || moreMemories.length ? '' : 'spread__cols--single'}">
          <div class="spread__text">
            <h2 class="display display--md" id="r-method">Make it slowly.</h2>
            <ol class="steps">
              ${r.steps.map((s) => html`<li><p>${s}</p></li>`)}
            </ol>
          </div>
          ${(extraPhoto || moreMemories.length) ? html`
          <div class="spread__media spread__media--quiet">
            ${extraPhoto ? print(extraPhoto, { seed: extraPhoto.src, tilt: -1.1, variant: 'print--plain', ratio: 1 }) : ''}
            ${morePhotos.map((p) => print(p, { seed: p.src, tilt: 1.4, variant: 'print--plain' }))}
            ${moreMemories.map((m) => html`<div class="memory">${print(m, { seed: m.src, tilt: 2.6, tape: 'top', variant: 'print--polaroid' })}</div>`)}
          </div>` : ''}
        </div>
        ${turn({ prev: 2, extra: html`<div class="turn__cook">${cookBtn}</div>` })}
      </section>
    </div>`;

  // Left / right arrow keys turn the page, like the notebook.
  function mount(root) {
    const pages = [...root.querySelectorAll('.spread')];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go = (n) => pages[n - 1]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    const current = () => {
      let idx = 0;
      pages.forEach((p, i) => { if (p.getBoundingClientRect().top < window.innerHeight * 0.4) idx = i; });
      return idx + 1;
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-goto]');
      if (b) go(+b.dataset.goto);
    });
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowRight') go(Math.min(PAGES, current() + 1));
      if (e.key === 'ArrowLeft') go(Math.max(1, current() - 1));
    };
    document.addEventListener('keydown', onKey);
    mount.off = () => document.removeEventListener('keydown', onKey);
  }

  return { title: r.title, body, mount, unmount: () => mount.off?.() };
}
