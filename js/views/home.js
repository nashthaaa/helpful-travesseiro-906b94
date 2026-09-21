import { html, print, icon, cap, pad2, CATEGORIES, tiltFor } from '../ui.js';
import { listRecipes, featured, recent, categoryCounts, scrapbook } from '../store.js';

export async function homeView() {
  const all = await listRecipes();
  const feat = featured(all);
  const latest = recent(all, 3, feat?.id);
  const counts = categoryCounts(all);
  const { memories, notes } = scrapbook(all);

  const body = html`
    <section class="sheet sheet--hero" style="--paper-tilt:-.22deg" aria-labelledby="home-title">
      <p class="bracket">[ recipes from a shared kitchen, written down by the people who cooked them ]</p>

      <div class="hero">
        <div class="hero__text">
          <p class="label">Sherbourne 8 · Toronto · 2018–2024</p>
          <h1 class="display" id="home-title">Our<br>Kitchen</h1>
          <p class="hand hero__hand">cook something. write it down. pass it on.</p>
          <p class="lede">The recipes we cooked at Sherbourne 8, kept in one place. Add yours, fix ours, and keep the notebook going.</p>
          <div class="actions">
            <a class="btn" href="#/add">${icon('plus')} Add a recipe</a>
            <a class="btn btn--ghost" href="#/recipes">Browse the recipes ${icon('right')}</a>
          </div>
        </div>

        ${feat ? html`
        <div class="hero__feature">
          <p class="label">Featured${feat.number ? ` · Recipe no. ${pad2(feat.number)}` : ''}</p>
          <a class="hero__photo" href="#/recipe/${feat.id}" aria-label="Open ${feat.title}">
            ${print(feat.photo, { seed: feat.id, tilt: 2.2, tape: 'tl', eager: true, caption: feat.photo?.caption, ratio: 0.8, sizes: '(min-width: 1020px) 480px, 80vw' })}
          </a>
          ${feat.quote ? html`<p class="hand hero__quote">${feat.quote}</p>` : ''}
          <h2 class="hero__title"><a href="#/recipe/${feat.id}">${feat.title}</a></h2>
          <p class="meta">by ${feat.contributor} · ${feat.category}</p>
          <a class="link-arrow" href="#/recipe/${feat.id}">Open the recipe ${icon('right')}</a>
        </div>` : ''}
      </div>
    </section>

    <section class="sheet sheet--index" style="--paper-tilt:.2deg" aria-labelledby="index-title">
      <div class="index">
        <div class="contents">
          <p class="label">Contents</p>
          <h2 class="display display--md" id="index-title">Find something to make.</h2>
          <ul class="toc">
            ${CATEGORIES.map((c) => html`
              <li><a href="#/recipes?cat=${c}"><span>${cap(c)}</span><i class="leader" aria-hidden="true"></i><span class="toc__n">${counts[c] || 0}</span></a></li>`)}
            <li class="toc__all"><a href="#/recipes"><span>Every recipe</span><i class="leader" aria-hidden="true"></i><span class="toc__n">${all.length}</span></a></li>
          </ul>
        </div>

        <div class="recent">
          <p class="label">Recently added</p>
          <div class="recent__prints">
            ${latest.map((r, i) => html`
              <a class="recent__item recent__item--${i + 1}" href="#/recipe/${r.id}">
                ${print(r.photo, { seed: r.id, tilt: tiltFor(r.id, 2), ratio: [0.8, 1, 1.2][i], cover: true, caption: '', tape: i === 0 ? 'top' : '' })}
                <span class="recent__title">${r.title}</span>
                <span class="meta">${r.sample ? 'sample recipe' : `by ${r.contributor}`} · ${r.category}</span>
              </a>`)}
          </div>
        </div>
      </div>
    </section>

    ${(memories.length || notes.length) ? html`
    <section class="sheet sheet--scrap" style="--paper-tilt:-.16deg" aria-labelledby="scrap-title">
      <p class="label" id="scrap-title">Pinned to the fridge</p>
      <div class="scrap">
        ${memories[0] ? html`
          <a class="scrap__photo" href="#/recipe/${memories[0].recipe.id}">
            ${print(memories[0], { seed: memories[0].src, tilt: -3.2, tape: 'top', variant: 'print--polaroid', ratio: 1.17 })}
          </a>` : ''}
        ${notes[0] ? html`
          <blockquote class="scrap__note">
            <p class="hand hand--lg">${notes[0].text}</p>
            <footer class="meta">— ${notes[0].by || notes[0].recipe.contributor}, from <a href="#/recipe/${notes[0].recipe.id}">${notes[0].recipe.title}</a></footer>
          </blockquote>` : ''}
      </div>

      <div class="cta">
        <p class="hand hand--lg">cooked something worth keeping?</p>
        <a class="btn" href="#/add">${icon('plus')} Add a recipe</a>
      </div>
    </section>` : ''}
  `;

  return { title: 'Our Kitchen', body };
}
