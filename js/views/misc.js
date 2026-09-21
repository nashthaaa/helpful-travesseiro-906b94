import { html, icon } from '../ui.js';

export function notFoundView({ what = 'page' } = {}) {
  return {
    title: 'Page not found',
    body: html`
      <section class="sheet sheet--short" style="--paper-tilt:-.2deg">
        <p class="label">Page not found</p>
        <h1 class="display display--md">That ${what} isn't in the book.</h1>
        <p class="hand hand--lg">maybe it was torn out, or never written down.</p>
        <div class="actions">
          <a class="btn" href="#/recipes">${icon('left')} Back to all recipes</a>
        </div>
      </section>`,
  };
}

// Placeholder until Stage 3 builds the real add / edit form.
export function editorStubView({ path }) {
  const editing = path.startsWith('/edit');
  return {
    title: editing ? 'Edit recipe' : 'Add a recipe',
    body: html`
      <section class="sheet sheet--short" style="--paper-tilt:.2deg">
        <p class="label">Coming in the next stage</p>
        <h1 class="display display--md">${editing ? 'Edit a recipe' : 'Add a recipe'}</h1>
        <p class="lede">This is a design preview. The form for ${editing ? 'editing' : 'adding'} recipes, with photo uploads and saving for everyone in the kitchen, gets built once you're happy with how the pages look.</p>
        <div class="actions">
          <a class="btn" href="#/recipes">${icon('left')} Back to the recipes</a>
        </div>
      </section>`,
  };
}
