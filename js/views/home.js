import { html, print, icon, cap, CATEGORIES, ed } from '../ui.js';
import { listRecipes, featured, recent, categoryCounts, scrapbook, getSettings } from '../store.js';
import { editBar, setupEditing } from '../edit.js';

export async function homeView() {
  const [all, settings] = await Promise.all([listRecipes(), getSettings()]);
  const feat = featured(all);
  const latest = recent(all, 3, feat?.id);
  const counts = categoryCounts(all);
  const { memories, notes } = scrapbook(all);

  const body = html`
    ${editBar()}

    <section class="sheet" aria-labelledby="home-title">
      <p class="bracket">[ the recipes we cooked at sherbourne 8, written down by the people who cooked them ]</p>

      <div class="hero">
        <div class="hero__text">
          <h1 class="display" id="home-title">Our<br>Kitchen</h1>
          <p class="hand hand--lg hero__hand" ${ed('site', 'heroHand', 'a line to open the book')}>${settings.heroHand}</p>
          <div class="actions">
            <a class="btn" href="#/add">${icon('plus')} Add a recipe</a>
            <a class="link-arrow" href="#/recipes">Browse the recipes ${icon('right')}</a>
          </div>
        </div>

        ${feat ? html`
        <div class="hero__feature">
          <a class="hero__photo" href="#/recipe/${feat.id}" aria-label="Open ${feat.title}">
            ${print(feat.photo, { seed: feat.id, tilt: 1.4, eager: true, caption: '', ratio: 0.8, sizes: '(min-width: 1020px) 430px, 80vw' })}
          </a>
          <p class="hand hand--lg hero__quote" ${ed('recipe:' + feat.id, 'quote', 'add a quote')}>${feat.quote || ''}</p>
          <a class="hero__title" href="#/recipe/${feat.id}">${feat.title} ${icon('right')}</a>
        </div>` : ''}
      </div>
    </section>

    <section class="sheet" aria-labelledby="index-title">
      <div class="index">
        <div class="contents">
          <h2 class="display display--md" id="index-title">Find something to make.</h2>
          <ul class="toc">
            ${CATEGORIES.map((c) => html`
              <li><a href="#/recipes?cat=${c}"><span>${cap(c)}</span><i class="leader" aria-hidden="true"></i><span class="toc__n">${counts[c] || 0}</span></a></li>`)}
          </ul>
          <a class="link-arrow" href="#/recipes">All ${all.length} recipes ${icon('right')}</a>
        </div>

        <div class="recent">
          <p class="label">Recently added</p>
          <div class="recent__prints">
            ${latest.map((r, i) => html`
              <a class="recent__item recent__item--${i + 1}" href="#/recipe/${r.id}">
                ${print(r.photo, { seed: r.id, tilt: 0, variant: 'print--plain', ratio: [0.8, 1, 1.2][i], cover: true, caption: '' })}
                <span class="recent__title">${r.title}</span>
              </a>`)}
          </div>
        </div>
      </div>
    </section>

    ${(memories.length || notes.length) ? html`
    <section class="sheet" aria-label="Pinned to the fridge">
      <div class="scrap">
        ${memories[0] ? html`
          <a class="scrap__photo" href="#/recipe/${memories[0].recipe.id}" aria-label="${memories[0].caption || 'Open the recipe'}">
            ${print(memories[0], { seed: memories[0].src, tilt: -3, tape: 'top', variant: 'print--polaroid', ratio: 1.17 })}
          </a>` : ''}
        ${notes[0] ? html`
          <blockquote class="scrap__note">
            <p class="hand hand--lg" ${ed('recipe:' + notes[0].recipe.id, 'note.text', 'add a small note')}>${notes[0].text}</p>
            <footer class="meta">${notes[0].by || notes[0].recipe.contributor}, in <a href="#/recipe/${notes[0].recipe.id}">${notes[0].recipe.title}</a></footer>
          </blockquote>` : ''}
      </div>
    </section>` : ''}
  `;

  return { title: 'Our Kitchen', body, mount: setupEditing };
}
