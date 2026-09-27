// Tiny hash router. Hash URLs keep the site deployable on any static host
// (GitHub Pages, Netlify, Cloudflare Pages) with no server rewrites.
//
// A view is `async (ctx) => ({ title, body, mount?(root), unmount?() })`.

import { html, str, icon, lockedGraphic } from './ui.js';
import { homeView } from './views/home.js';
import { collectionView } from './views/collection.js';
import { recipeView } from './views/recipe.js';
import { cookView } from './views/cook.js';
import { editorView } from './views/editor.js';
import { notFoundView } from './views/misc.js';
import * as auth from './auth.js';
import { mountHeaderAuth, signInPanel, mountSignInPanel } from './auth-ui.js';

const main = document.getElementById('main');
const SITE = 'Flat 61';

const routes = [
  [/^\/?$/, homeView, 'home'],
  [/^\/recipes\/?$/, collectionView, 'recipes'],
  [/^\/recipe\/([^/]+)\/?$/, recipeView, 'recipe'],
  [/^\/recipe\/([^/]+)\/cook\/?$/, cookView, 'cook'],
  [/^\/add\/?$/, editorView, 'add'],
  [/^\/edit\/([^/]+)\/?$/, editorView, 'add'],
];

let current = null;   // { unmount }
let lastPath = null;
let renderId = 0;

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path, query: new URLSearchParams(qs) };
}

async function render() {
  const id = ++renderId;
  const { path, query } = parse();

  for (const [re, view, name] of routes) {
    const m = path.match(re);
    if (!m) continue;
    const params = m.slice(1).map((p) => decodeURIComponent(p));
    return show(id, view, { params, query, path }, name);
  }
  return show(id, notFoundView, { params: [], query, path }, 'none');
}

// The whole cookbook is private: nothing renders — not even a recipe title —
// until someone's signed in with the shared kitchen password.
function signedOutGate() {
  return {
    title: 'Sign in',
    body: html`
      <section class="sheet sheet--short gate" aria-labelledby="gate-title">
        ${lockedGraphic()}
        <p class="label">Flat 61 · The Kitchen Notebook</p>
        <h1 class="display display--md" id="gate-title">This kitchen is locked.</h1>
        ${signInPanel("sign in with the kitchen password to come in.")}
      </section>`,
    mount: mountSignInPanel,
  };
}

async function show(id, view, ctx, name) {
  current?.unmount?.();
  current = null;
  let result;
  try {
    result = auth.isSignedIn() ? await view(ctx) : signedOutGate();
  } catch (err) {
    console.error(err);
    result = {
      title: 'Something went wrong',
      body: html`
        <section class="sheet sheet--short">
          <h1 class="display display--md">Something went wrong.</h1>
          <p class="lede">${err?.message || 'This page could not be opened.'}</p>
          <div class="actions"><a class="btn" href="#/">${icon('left')} Back to the first page</a></div>
        </section>`,
    };
  }
  if (id !== renderId) return; // a newer navigation won the race

  document.body.dataset.view = name;
  document.body.classList.remove('is-editing');
  document.title = result.title ? `${result.title} · ${SITE}` : `${SITE} · The Kitchen Notebook`;
  main.innerHTML = str(result.body);
  for (const a of document.querySelectorAll('[data-nav]')) {
    a.toggleAttribute('aria-current', a.dataset.nav === name || (name === 'recipe' && a.dataset.nav === 'recipes'));
    if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page');
  }
  current = { unmount: result.unmount };
  result.mount?.(main, ctx);

  if (ctx.path !== lastPath) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  lastPath = ctx.path;
}

document.querySelector('[data-skip]').addEventListener('click', (e) => {
  e.preventDefault(); // "#main" would otherwise be read as a route
  main.focus();
  main.scrollIntoView();
});

mountHeaderAuth(document.getElementById('auth-slot'));

window.addEventListener('hashchange', render);
render();

// Signing in or out can change what the current page should show (an
// editor's sign-in gate, an "Edit recipe" link) — re-render in place.
auth.onAuthChange(() => render());
auth.init();
