import { html, icon, ingredientAmount } from '../ui.js';
import { getRecipe } from '../store.js';
import { notFoundView } from './misc.js';

// Cooking mode: no scrapbook, big type, tick-off ingredients, scalable servings.
// Ticks and servings are remembered per recipe on this device only.

const key = (id) => `sb8:cook:${id}`;
const load = (id) => { try { return JSON.parse(localStorage.getItem(key(id))) || {}; } catch { return {}; } };
const save = (id, s) => { try { localStorage.setItem(key(id), JSON.stringify(s)); } catch { /* private mode: fine */ } };

export async function cookView({ params: [id] }) {
  const r = await getRecipe(id);
  if (!r) return notFoundView({ what: 'recipe' });

  const base = r.servings || 2;
  const saved = load(id);
  const state = {
    servings: Math.min(24, Math.max(1, +saved.servings || base)),
    ticked: new Set(saved.ticked || []),
    done: new Set(saved.done || []),
  };

  const body = html`
    <div class="cook">
      <div class="cook__bar">
        <a class="btn btn--ghost btn--small" href="#/recipe/${r.id}">${icon('left')} Back to the recipe</a>
        <label class="switch" id="wake-wrap" hidden>
          <input type="checkbox" id="wake" checked>
          <span class="switch__track" aria-hidden="true"></span>
          <span>Keep screen awake</span>
        </label>
      </div>

      <p class="label">Cooking mode</p>
      <h1 class="cook__title">${r.title}</h1>

      <div class="cook__servings">
        <span class="label" id="sv-label">Servings</span>
        <div class="stepper" role="group" aria-labelledby="sv-label">
          <button type="button" data-serv="-1" aria-label="Fewer servings">${icon('minus')}</button>
          <output id="sv" aria-live="polite">${state.servings}</output>
          <button type="button" data-serv="1" aria-label="More servings">${icon('plus')}</button>
        </div>
        <button type="button" class="linklike" id="sv-reset" hidden>Back to ${base}</button>
      </div>

      <h2 class="cook__h">Ingredients</h2>
      <ul class="cook__ing">
        ${r.ingredients.map((ing, i) => html`
          <li>
            <label class="tickrow">
              <input type="checkbox" data-i="${i}" ${state.ticked.has(i) ? 'checked' : ''}>
              <span class="tickbox" aria-hidden="true">${icon('check')}</span>
              <span class="tickrow__amt" data-amt="${i}">${ingredientAmount(ing, state.servings / base)}</span>
              <span class="tickrow__item">${ing.item}${ing.amount != null && ing.note ? html`<span class="ing__note">${ing.note}</span>` : ''}</span>
            </label>
          </li>`)}
      </ul>
      <p class="meta"><button type="button" class="linklike" id="untick">Untick everything</button></p>

      <h2 class="cook__h">Method</h2>
      <ol class="cook__steps">
        ${r.steps.map((s, i) => html`
          <li>
            <label class="steprow">
              <input type="checkbox" data-s="${i}" ${state.done.has(i) ? 'checked' : ''}>
              <span class="stepnum">${i + 1}</span>
              <span class="steptext">${s}</span>
            </label>
          </li>`)}
      </ol>
      <p class="meta">Tap a step when it's done.</p>

      ${r.note?.text ? html`<aside class="cook__note"><p class="label">${r.note.by || r.contributor} says</p><p class="hand hand--lg">${r.note.text}</p></aside>` : ''}
    </div>`;

  let lock = null;
  let wantLock = true;
  const acquire = async () => {
    try { if (wantLock && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen'); } catch { /* denied: fine */ }
  };
  const release = () => { lock?.release?.().catch(() => {}); lock = null; };
  const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };

  function mount(root) {
    const persist = () => save(id, { servings: state.servings, ticked: [...state.ticked], done: [...state.done] });
    const out = root.querySelector('#sv');
    const reset = root.querySelector('#sv-reset');

    const paint = () => {
      out.textContent = state.servings;
      reset.hidden = state.servings === base;
      const factor = state.servings / base;
      r.ingredients.forEach((ing, i) => { root.querySelector(`[data-amt="${i}"]`).textContent = ingredientAmount(ing, factor); });
    };
    paint();

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-serv]');
      if (b) { state.servings = Math.min(24, Math.max(1, state.servings + +b.dataset.serv)); paint(); persist(); }
    });
    reset.addEventListener('click', () => { state.servings = base; paint(); persist(); });
    root.querySelector('#untick').addEventListener('click', () => {
      state.ticked.clear();
      root.querySelectorAll('[data-i]').forEach((c) => { c.checked = false; });
      persist();
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.i != null) { t.checked ? state.ticked.add(+t.dataset.i) : state.ticked.delete(+t.dataset.i); persist(); }
      if (t.dataset.s != null) { t.checked ? state.done.add(+t.dataset.s) : state.done.delete(+t.dataset.s); persist(); }
      if (t.id === 'wake') { wantLock = t.checked; wantLock ? acquire() : release(); }
    });

    if ('wakeLock' in navigator) {
      root.querySelector('#wake-wrap').hidden = false;
      acquire();
      document.addEventListener('visibilitychange', onVisible);
    }
  }

  return {
    title: `Cooking · ${r.title}`,
    body,
    mount,
    unmount() { document.removeEventListener('visibilitychange', onVisible); release(); },
  };
}
