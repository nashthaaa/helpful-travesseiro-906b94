import { html, print, icon, cap, ingredientAmount, ed } from '../ui.js';
import { getRecipe } from '../store.js';
import { editBar, setupEditing } from '../edit.js';
import { notFoundView } from './misc.js';

const PAGES = 3;

const turn = ({ prev, next, extra }) => html`
  <footer class="spread__turn">
    ${prev ? html`<button type="button" class="turn" data-goto="${prev}">${icon('left')} Previous page</button>` : html`<span></span>`}
    ${extra || ''}
    ${next ? html`<button type="button" class="turn" data-goto="${next}">Next page ${icon('right')}</button>` : html`<span></span>`}
  </footer>`;

export async function recipeView({ params: [id] }) {
  const r = await getRecipe(id);
  if (!r) return notFoundView({ what: 'recipe' });

  const scope = `recipe:${r.id}`;
  const [extraPhoto, ...morePhotos] = r.photos || [];
  const [memory, ...moreMemories] = r.memories || [];
  const long = r.title.length > 26 ? 'display--long' : '';
  const cookBtn = html`<a class="btn" href="#/recipe/${r.id}/cook">${icon('pot')} Start cooking</a>`;
  const facts = [`by ${r.contributor}`, r.servings ? `serves ${r.servings}` : '', r.category].filter(Boolean).join(' · ');

  const body = html`
    ${editBar(html`<a class="pagebar__link" href="#/recipes">${icon('left')} All recipes</a>`, html`<a class="pagebar__link" href="#/edit/${r.id}">Edit recipe</a>`)}

    <div class="recipe" data-recipe="${r.id}">
      <section class="sheet spread spread--title" id="page-1" aria-labelledby="r-title">
        ${r.sample ? html`<p class="stamp">Sample recipe · delete it once you have added your own</p>` : ''}
        <div class="spread__cols">
          <div class="spread__text">
            ${r.tagline ? html`<p class="bracket bracket--left">[ ${r.tagline.replace(/\.$/, '').toLowerCase()} ]</p>` : ''}
            <h1 class="display ${long}" id="r-title">${r.title}</h1>
            <p class="meta byline">${facts}</p>
            <blockquote class="hand hand--lg quote" ${ed(scope, 'quote', 'add a quote')}>${r.quote || ''}</blockquote>
            <div class="actions">${cookBtn}</div>
          </div>

          <div class="spread__media">
            ${print(r.photo, { seed: r.id, tilt: 1.4, eager: true, ratio: 0.8, caption: r.photo?.caption, edit: { scope, path: 'photo.caption' }, sizes: '(min-width: 1020px) 470px, 90vw' })}
            ${memory ? html`<div class="memory">${print(memory, { seed: memory.src, tilt: -3, tape: 'top', variant: 'print--polaroid', ratio: 1.17, edit: { scope, path: 'memories.0.caption' } })}</div>` : ''}
          </div>
        </div>
        ${turn({ next: 2 })}
      </section>

      <section class="sheet spread spread--gather" id="page-2" aria-labelledby="r-gather">
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
          </div>
          <div class="spread__side">
            <aside class="note ${r.note?.text ? '' : 'note--empty'}">
              <p class="hand hand--lg" ${ed(scope, 'note.text', 'add a small note')}>${r.note?.text || ''}</p>
              ${r.note?.text ? html`<p class="meta">${r.note.by || r.contributor}</p>` : ''}
            </aside>
          </div>
        </div>
        ${turn({ prev: 1, next: 3 })}
      </section>

      <section class="sheet spread spread--method" id="page-3" aria-labelledby="r-method">
        <div class="spread__cols ${extraPhoto || moreMemories.length ? '' : 'spread__cols--single'}">
          <div class="spread__text">
            <h2 class="display display--md" id="r-method">Make it slowly.</h2>
            <ol class="steps">
              ${r.steps.map((s) => html`<li><p>${s}</p></li>`)}
            </ol>
          </div>
          ${(extraPhoto || moreMemories.length) ? html`
          <div class="spread__media spread__media--quiet">
            ${extraPhoto ? print(extraPhoto, { seed: extraPhoto.src, tilt: 0, variant: 'print--plain', ratio: 1, edit: { scope, path: 'photos.0.caption' } }) : ''}
            ${morePhotos.map((p, i) => print(p, { seed: p.src, tilt: 0, variant: 'print--plain', edit: { scope, path: `photos.${i + 1}.caption` } }))}
            ${moreMemories.map((m, i) => html`<div class="memory">${print(m, { seed: m.src, tilt: 2.6, tape: 'top', variant: 'print--polaroid', edit: { scope, path: `memories.${i + 1}.caption` } })}</div>`)}
          </div>` : ''}
        </div>
        ${turn({ prev: 2, extra: html`<div class="turn__cook">${cookBtn}</div>` })}
      </section>
    </div>`;

  // Left / right arrow keys turn the page, like the notebook.
  function mount(root) {
    setupEditing(root);
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
