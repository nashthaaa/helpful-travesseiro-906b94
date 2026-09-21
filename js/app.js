// Tiny hash router. Hash URLs keep the site deployable on any static host
// (GitHub Pages, Netlify, Cloudflare Pages) with no server rewrites.
//
// A view is `async (ctx) => ({ title, body, mount?(root), unmount?() })`.

import { str } from './ui.js';
import { homeView } from './views/home.js';
import { collectionView } from './views/collection.js';
import { recipeView } from './views/recipe.js';
import { cookView } from './views/cook.js';
import { editorStubView, notFoundView } from './views/misc.js';

const main = document.getElementById('main');
const SITE = 'Sherbourne 8';

const routes = [
  [/^\/?$/, homeView, 'home'],
  [/^\/recipes\/?$/, collectionView, 'recipes'],
  [/^\/recipe\/([^/]+)\/?$/, recipeView, 'recipe'],
  [/^\/recipe\/([^/]+)\/cook\/?$/, cookView, 'cook'],
  [/^\/add\/?$/, editorStubView, 'add'],
  [/^\/edit\/([^/]+)\/?$/, editorStubView, 'add'],
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

async function show(id, view, ctx, name) {
  current?.unmount?.();
  current = null;
  let result;
  try {
    result = await view(ctx);
  } catch (err) {
    console.error(err);
    result = { title: 'Something went wrong', body: '<section class="sheet"><h1 class="display display--md">Something went wrong.</h1><p class="lede">This page could not be opened. Try going back to the <a href="#/">first page</a>.</p></section>' };
  }
  if (id !== renderId) return; // a newer navigation won the race

  document.body.dataset.view = name;
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

window.addEventListener('hashchange', render);
render();
