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
