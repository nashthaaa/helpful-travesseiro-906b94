import { html, print, icon, cap, ingredientAmount, chunkByGroup, ed } from '../ui.js';
import { dottedPrint, mountDots } from '../dots.js';
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
  const memories = r.memories || [];
  // No food photo, but a photo of the people who made it? Let that stand in
  // as the main picture instead of leaving an empty "photo to come" — a real
  // notebook would do the same.
  const memoryIsHero = !r.photo && memories.length > 0;
  const asideMemory = memoryIsHero ? null : memories[0];
  const [, ...moreMemories] = memories; // page 3's leftovers, same list either way
  // Shrink the title if it's long overall, OR if it has one unbroken run of
  // characters long enough to force an ugly mid-word break at full size —
  // "New Years'Cake!" (no space before "Cake") is exactly this case: not a
  // long title by character count, but "Years'Cake!" alone doesn't fit.
  const longestWord = Math.max(...r.title.split(/\s+/).map((w) => w.length));
  const long = (r.title.length > 26 || longestWord > 10) ? 'display--long' : '';
  const cookBtn = html`<a class="btn" href="#/recipe/${r.id}/cook">${icon('pot')} Start cooking</a>`;
  const factsEnd = [r.servings ? `serves ${r.servings}` : '', r.category].filter(Boolean).join(' · ');

  const body = html`
    ${editBar(html`<a class="pagebar__link" href="#/recipes">${icon('left')} All recipes</a>`, html`<a class="pagebar__link" href="#/edit/${r.id}">Edit recipe</a>`)}

    <div class="recipe" data-recipe="${r.id}">
      <section class="sheet spread spread--title" id="page-1" aria-labelledby="r-title">
        ${r.sample ? html`<p class="stamp">Sample recipe · delete it once you have added your own</p>` : ''}
        <div class="spread__cols">
          <div class="spread__text">
            <p class="bracket bracket--left">[ <span ${ed(scope, 'tagline', 'a line for the top of the page')}>${r.tagline || ''}</span> ]</p>
            <h1 class="display ${long}" id="r-title" ${ed(scope, 'title', 'name this recipe')}>${r.title}</h1>
            <p class="meta byline">by <span ${ed(scope, 'contributor', 'who cooked this?')}>${r.contributor}</span>${factsEnd ? ` · ${factsEnd}` : ''}</p>
            <blockquote class="hand hand--lg quote" ${ed(scope, 'quote', 'add a quote')}>${r.quote || ''}</blockquote>
            <div class="actions">${cookBtn}</div>
          </div>

          <div class="spread__media">
            ${memoryIsHero
              ? html`<div class="memory memory--hero">${print(memories[0], { seed: memories[0].src, tilt: 1.2, tape: 'top', variant: 'print--polaroid', ratio: 1.17, edit: { scope, path: 'memories.0.caption' } })}</div>`
              : html`${dottedPrint(r.photo, { seed: r.id, tilt: 1.4, ratio: 0.8, caption: r.photo?.caption, edit: { scope, path: 'photo.caption' } })}
                     ${asideMemory ? html`<div class="memory">${print(asideMemory, { seed: asideMemory.src, tilt: -3, tape: 'top', variant: 'print--polaroid', ratio: 1.17, edit: { scope, path: 'memories.0.caption' } })}</div>` : ''}`}
          </div>
        </div>
        ${turn({ next: 2 })}
      </section>

      <section class="sheet spread spread--gather" id="page-2" aria-labelledby="r-gather">
        <div class="spread__cols">
          <div class="spread__text">
            <h2 class="display display--md" id="r-gather">Gather these first.</h2>
            ${chunkByGroup(r.ingredients, (i) => i.group).map(({ group, items }) => html`
              ${group ? html`<p class="part-label">${group}</p>` : ''}
              <ul class="ing">
                ${items.map((i) => html`
                  <li>
                    <span class="ing__amt">${ingredientAmount(i)}</span>
                    <span class="ing__item">${i.item}${i.amount != null && i.note ? html`<span class="ing__note">${i.note}</span>` : ''}</span>
                  </li>`)}
              </ul>`)}
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
            <h2 class="display display--md" id="r-method">Then make it.</h2>
            ${chunkByGroup(r.steps, (s) => s.group).map(({ group, items }) => html`
              ${group ? html`<p class="part-label">${group}</p>` : ''}
              <ol class="steps">
                ${items.map((s) => html`<li><p>${s.text}</p></li>`)}
              </ol>`)}
          </div>
          ${(extraPhoto || moreMemories.length) ? html`
          <div class="spread__media spread__media--quiet">
            ${extraPhoto ? dottedPrint(extraPhoto, { seed: extraPhoto.src, tilt: 0, variant: 'print--plain', ratio: 1, edit: { scope, path: 'photos.0.caption' } }) : ''}
            ${morePhotos.map((p, i) => dottedPrint(p, { seed: p.src, tilt: 0, variant: 'print--plain', edit: { scope, path: `photos.${i + 1}.caption` } }))}
            ${moreMemories.map((m, i) => html`<div class="memory">${print(m, { seed: m.src, tilt: 2.6, tape: 'top', variant: 'print--polaroid', edit: { scope, path: `memories.${i + 1}.caption` } })}</div>`)}
          </div>` : ''}
        </div>
        ${turn({ prev: 2, extra: html`<div class="turn__cook">${cookBtn}</div>` })}
      </section>
    </div>`;

  // Left / right arrow keys turn the page, like the notebook.
  function mount(root) {
    setupEditing(root);
    const stopDots = mountDots(root);
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
    mount.off = () => { document.removeEventListener('keydown', onKey); stopDots(); };
  }

  return { title: r.title, body, mount, unmount: () => mount.off?.() };
}
