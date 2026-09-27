// The recipe form: add a new recipe, or change anything about an existing
// one — text, ingredients, steps, and every photo or video. Shared with
// everyone via Supabase; only signed-in friends can use it. Saves itself as
// you go, so leaving half-finished and coming back later just works.

import { html, str, icon, cap, CATEGORIES, setPath } from '../ui.js';
import { getRecipe, saveRecipe, deleteRecipe } from '../store.js';
import * as media from '../imagestore.js';
import { isSignedIn } from '../auth.js';
import { signInPanel, mountSignInPanel } from '../auth-ui.js';

const YOU_KEY = 'sb8:you';
const AUTOSAVE_MS = 1200;
const emptyIngredient = (group = '') => ({ amount: '', unit: '', item: '', note: '', group });
const emptyStep = (group = '') => ({ text: '', group });
const emptyMedia = () => ({ src: '', url: '', w: null, h: null, type: 'image', caption: '' });
const lastGroup = (rows) => rows[rows.length - 1]?.group || '';

// A photo or video already on the recipe, ready to preview — its "src" is
// already a showable URL, whether it's an upload or one of the original
// mockup photos.
const withPreview = (p) => (p?.src ? { src: p.src, url: p.src, w: p.w || null, h: p.h || null, type: p.type === 'video' ? 'video' : 'image', caption: p.caption || '' } : null);

export async function editorView({ params: [initialId] }) {
  let id = initialId; // reassigned once autosave creates a brand-new recipe

  // Check sign-in before touching the database at all, so this gate shows
  // up front — never a "recipe not found" or connection error underneath it.
  if (!isSignedIn()) {
    const body = html`
      <div class="editor">
        <p class="crumbs"><a href="${id ? `#/recipe/${id}` : '#/recipes'}">${icon('left')} ${id ? 'Back to the recipe' : 'All recipes'}</a></p>
        <section class="sheet sheet--short" aria-labelledby="ed-title">
          <p class="label">${id ? 'Editing a recipe' : 'A new page in the notebook'}</p>
          <h1 class="display display--md" id="ed-title">${id ? 'Sign in to edit' : 'Sign in to add a recipe'}</h1>
          ${signInPanel('sign in with the kitchen password to come in.')}
        </section>
      </div>`;
    return { title: id ? 'Edit recipe' : 'Add a recipe', body, mount: mountSignInPanel };
  }

  const existing = id ? await getRecipe(id) : null;
  if (id && !existing) return { title: 'Recipe not found', body: notFound() };

  const state = existing ? {
    title: existing.title || '',
    contributor: existing.contributor || '',
    category: existing.category || 'dinner',
    tagline: existing.tagline || '',
    servings: existing.servings || '',
    quote: existing.quote || '',
    note: { text: existing.note?.text || '', by: existing.note?.by || '' },
    ingredients: existing.ingredients?.length ? existing.ingredients.map((i) => ({ amount: i.amount ?? '', unit: i.unit || '', item: i.item || '', note: i.note || '', group: i.group || '' })) : [emptyIngredient()],
    steps: existing.steps?.length ? existing.steps.map((s) => (typeof s === 'string' ? { text: s, group: '' } : { text: s.text || '', group: s.group || '' })) : [emptyStep()],
    photo: withPreview(existing.photo),
    extra: (existing.photos || []).map(withPreview).filter(Boolean),
    memories: (existing.memories || []).map(withPreview).filter(Boolean),
  } : {
    title: '', contributor: (() => { try { return localStorage.getItem(YOU_KEY) || ''; } catch { return ''; } })(),
    category: 'dinner', tagline: '', servings: '', quote: '', note: { text: '', by: '' },
    ingredients: [emptyIngredient()], steps: [emptyStep()], photo: null, extra: [], memories: [],
  };

  const body = html`
    <div class="editor">
      <p class="crumbs"><a href="${id ? `#/recipe/${id}` : '#/recipes'}">${icon('left')} ${id ? 'Back to the recipe' : 'All recipes'}</a></p>

      <section class="sheet" aria-labelledby="ed-title">
        <div class="ed-head">
          <div>
            <p class="label">${id ? 'Editing' : 'A new page in the notebook'}</p>
            <h1 class="display display--md" id="ed-title">${id ? 'Edit recipe' : 'Add a recipe'}</h1>
          </div>
          <p class="save-status" id="save-status" role="status" aria-live="polite"></p>
        </div>
        ${existing?.sample ? html`<p class="stamp">This is a sample recipe — saving will replace it with yours.</p>` : ''}
        <p class="lede">Saves itself as you go, for everyone in the kitchen. Give it a name to start, then leave and come back to "Edit recipe" whenever.</p>

        <form class="form" novalidate>
          <div class="field-row field-row--2">
            <div class="field">
              <label class="label" for="f-title">Recipe name</label>
              <input class="input" id="f-title" data-f="title" value="${state.title}" required maxlength="80">
            </div>
            <div class="field">
              <label class="label" for="f-contributor">Your name</label>
              <input class="input" id="f-contributor" data-f="contributor" value="${state.contributor}" maxlength="40" placeholder="who's cooking?">
            </div>
          </div>

          <div class="field-row field-row--2">
            <div class="field">
              <label class="label" for="f-category">Course</label>
              <div class="select"><select id="f-category" data-f="category">
                ${CATEGORIES.map((c) => html`<option value="${c}" ${c === state.category ? 'selected' : ''}>${cap(c)}</option>`)}
              </select></div>
            </div>
            <div class="field">
              <label class="label" for="f-servings">Serves</label>
              <input class="input" id="f-servings" data-f="servings" type="number" min="1" max="50" value="${state.servings}">
            </div>
          </div>

          <div class="field">
            <label class="label" for="f-tagline">One line for the top of the page</label>
            <input class="input" id="f-tagline" data-f="tagline" value="${state.tagline}" maxlength="120" placeholder="for weeknights, new roommates…">
          </div>

          <div class="field">
            <label class="label" for="f-quote">A quote, in handwriting</label>
            <textarea class="input" id="f-quote" data-f="quote" rows="2" maxlength="240" placeholder="what does this recipe mean to you?">${state.quote}</textarea>
          </div>

          <div class="field">
            <p class="label">Main photo</p>
            <div id="photo-main">${renderMainPhoto(state.photo)}</div>
          </div>

          <div class="field">
            <p class="label">Ingredients</p>
            <div id="ing-rows" class="rows">${state.ingredients.map((i, idx) => renderIngredient(i, idx))}</div>
            <button type="button" class="add-row" data-action="add-ingredient">${icon('plus')} Add an ingredient</button>
          </div>

          <div class="field">
            <p class="label">Method</p>
            <div id="step-rows" class="rows">${state.steps.map((s, idx) => renderStep(s, idx))}</div>
            <button type="button" class="add-row" data-action="add-step">${icon('plus')} Add a step</button>
          </div>

          <div class="field-row field-row--2">
            <div class="field">
              <label class="label" for="f-note-text">A small note</label>
              <textarea class="input" id="f-note-text" data-f="note.text" rows="3" maxlength="240" placeholder="a tip, a swap, a warning">${state.note.text}</textarea>
            </div>
            <div class="field">
              <label class="label" for="f-note-by">Signed</label>
              <input class="input" id="f-note-by" data-f="note.by" value="${state.note.by}" maxlength="40" placeholder="defaults to your name">
            </div>
          </div>

          <div class="field">
            <p class="label">More photos &amp; videos</p>
            <div id="extra-rows" class="rows">${state.extra.map((p, idx) => renderMediaRow('extra', p, idx))}</div>
            <button type="button" class="add-row" data-action="add-extra">${icon('plus')} Add a photo or video</button>
          </div>

          <div class="field">
            <p class="label">Memories — the people who made it, if not the food itself</p>
            <div id="memory-rows" class="rows">${state.memories.map((p, idx) => renderMediaRow('memory', p, idx))}</div>
            <button type="button" class="add-row" data-action="add-memory">${icon('plus')} Add a photo or video</button>
          </div>

          <p class="form-msg" id="form-msg" role="alert" hidden></p>

          <div class="actions">
            <a class="btn" href="${id ? `#/recipe/${id}` : '#/recipes'}">Done — view recipe</a>
            <button type="button" class="btn btn--ghost" id="save-now">Save now</button>
            ${id ? html`<button type="button" class="linklike danger" id="delete-btn" data-action="delete">Delete this recipe</button>` : ''}
          </div>
        </form>
      </section>
    </div>`;

  function mount(root) {
    const form = root.querySelector('form');
    form.addEventListener('submit', (e) => e.preventDefault()); // belt-and-suspenders: nothing should ever navigate this away
    const msg = root.querySelector('#form-msg');
    const status = root.querySelector('#save-status');
    const doneLink = root.querySelector('.actions a.btn');
    const showMsg = (text, focusEl) => { msg.textContent = text; msg.hidden = false; msg.scrollIntoView({ block: 'center', behavior: 'smooth' }); focusEl?.focus(); };

    const sections = {
      ingredients: root.querySelector('#ing-rows'),
      steps: root.querySelector('#step-rows'),
      extra: root.querySelector('#extra-rows'),
      memories: root.querySelector('#memory-rows'),
    };
    const renderers = {
      ingredients: () => state.ingredients.map((i, idx) => renderIngredient(i, idx)),
      steps: () => state.steps.map((s, idx) => renderStep(s, idx)),
      extra: () => state.extra.map((p, idx) => renderMediaRow('extra', p, idx)),
      memories: () => state.memories.map((p, idx) => renderMediaRow('memory', p, idx)),
    };
    const refresh = (key) => { sections[key].innerHTML = str(renderers[key]()); };
    const refreshMain = () => { root.querySelector('#photo-main').innerHTML = str(renderMainPhoto(state.photo)); };

    // ---------- build + save (shared by autosave and the manual button) ----------

    function buildData() {
      const clean = (p) => (p?.src ? { src: p.src, w: p.w || undefined, h: p.h || undefined, type: p.type === 'video' ? 'video' : undefined, caption: p.caption.trim() || undefined } : null);
      return {
        title: state.title.trim(),
        contributor: state.contributor.trim() || 'Someone in the kitchen',
        category: state.category,
        tagline: state.tagline.trim() || undefined,
        servings: state.servings === '' ? undefined : +state.servings,
        quote: state.quote.trim() || undefined,
        note: state.note.text.trim() ? { text: state.note.text.trim(), by: state.note.by.trim() || undefined } : undefined,
        ingredients: state.ingredients
          .map((i) => ({ amount: i.amount === '' ? null : Number(i.amount), unit: (i.unit || '').trim(), item: (i.item || '').trim(), note: (i.note || '').trim(), group: (i.group || '').trim() || undefined }))
          .filter((i) => i.item),
        steps: state.steps
          .map((s) => ({ text: s.text.trim(), group: (s.group || '').trim() || undefined }))
          .filter((s) => s.text),
        photo: clean(state.photo),
        photos: state.extra.map(clean).filter(Boolean),
        memories: state.memories.map(clean).filter(Boolean),
        sample: false,
      };
    }

    let saving = false, pending = false, timer = null;

    async function saveNow() {
      if (!state.title.trim()) { status.textContent = ''; return; }
      if (saving) { pending = true; return; }
      saving = true;
      status.textContent = 'Saving…';
      try { localStorage.setItem(YOU_KEY, state.contributor.trim() || ''); } catch { /* private mode: fine */ }
      const savedId = await saveRecipe(id, buildData());
      saving = false;
      if (!savedId) {
        status.textContent = "Couldn't save — check your connection.";
      } else {
        if (!id) {
          // First save of a new recipe: now it has a real id. Swap the URL in
          // place (no navigation, so typing isn't interrupted) and point the
          // "done" / delete links at it from now on.
          id = savedId;
          history.replaceState(null, '', `#/edit/${id}`);
          doneLink.href = `#/recipe/${id}`;
          root.querySelector('.crumbs a').href = `#/recipe/${id}`;
          if (!root.querySelector('#delete-btn')) {
            const del = document.createElement('button');
            del.type = 'button'; del.className = 'linklike danger'; del.id = 'delete-btn'; del.dataset.action = 'delete';
            del.textContent = 'Delete this recipe';
            root.querySelector('.actions').appendChild(del);
          }
        }
        status.textContent = 'Saved just now.';
      }
      if (pending) { pending = false; saveNow(); }
    }

    function scheduleAutosave() {
      status.textContent = state.title.trim() ? 'Saving…' : '';
      clearTimeout(timer);
      timer = setTimeout(saveNow, AUTOSAVE_MS);
    }

    // Typing updates `state` directly; the input the person is looking at
    // already shows what they typed, so nothing needs to re-render here.
    form.addEventListener('input', (e) => {
      const el = e.target.closest('[data-f]');
      if (!el) return;
      const path = el.dataset.f;
      const value = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
      setPath(state, path, value);
      scheduleAutosave();
    });
    form.addEventListener('change', (e) => {
      if (e.target.matches('select[data-f]')) scheduleAutosave();
    });

    async function pickMedia(file, slot) {
      msg.hidden = true;
      try {
        const uploaded = await media.put(file);
        if (slot.old && media.isUploaded(slot.old)) await media.remove(slot.old);
        slot.set({ src: uploaded.url, url: uploaded.url, w: uploaded.w, h: uploaded.h, type: uploaded.type, caption: slot.caption });
        scheduleAutosave();
      } catch (err) {
        showMsg(err.message || "That file couldn't be used.");
      }
    }

    form.addEventListener('change', async (e) => {
      const input = e.target.closest('input[type=file]');
      if (!input) return;
      const file = input.files[0];
      if (!file) return;
      input.disabled = true;
      if (input.dataset.slot === 'main') {
        await pickMedia(file, { old: state.photo?.src, caption: state.photo?.caption || '', set: (p) => { state.photo = p; refreshMain(); } });
      } else {
        const [key, i] = [input.dataset.slot, +input.dataset.index];
        const row = state[key][i];
        await pickMedia(file, { old: row.src, caption: row.caption, set: (p) => { state[key][i] = p; refresh(key); } });
      }
      input.disabled = false;
    });

    form.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const i = btn.dataset.index != null ? +btn.dataset.index : null;

      if (action === 'add-ingredient') { state.ingredients.push(emptyIngredient(lastGroup(state.ingredients))); refresh('ingredients'); root.querySelector(`#ing-rows [data-index="${state.ingredients.length - 1}"] input`)?.focus(); }
      else if (action === 'remove-ingredient') { if (state.ingredients.length > 1) { state.ingredients.splice(i, 1); refresh('ingredients'); scheduleAutosave(); } }
      else if (action === 'add-step') { state.steps.push(emptyStep(lastGroup(state.steps))); refresh('steps'); root.querySelector(`#step-rows [data-index="${state.steps.length - 1}"] textarea`)?.focus(); }
      else if (action === 'remove-step') { if (state.steps.length > 1) { state.steps.splice(i, 1); refresh('steps'); scheduleAutosave(); } }
      else if (action === 'add-extra') { state.extra.push(emptyMedia()); refresh('extra'); }
      else if (action === 'remove-extra') { const [p] = state.extra.splice(i, 1); if (p?.src && media.isUploaded(p.src)) await media.remove(p.src); refresh('extra'); scheduleAutosave(); }
      else if (action === 'add-memory') { state.memories.push(emptyMedia()); refresh('memories'); }
      else if (action === 'remove-memory') { const [p] = state.memories.splice(i, 1); if (p?.src && media.isUploaded(p.src)) await media.remove(p.src); refresh('memories'); scheduleAutosave(); }
      else if (action === 'remove-main') { if (state.photo?.src && media.isUploaded(state.photo.src)) await media.remove(state.photo.src); state.photo = null; refreshMain(); scheduleAutosave(); }
      else if (action === 'delete') {
        if (btn.dataset.confirm) { clearTimeout(timer); if (id) await deleteRecipe(id); location.hash = '#/recipes'; }
        else { btn.dataset.confirm = '1'; btn.textContent = 'Click again to delete for good'; }
      }
    });

    root.querySelector('#save-now').addEventListener('click', () => {
      if (!state.title.trim()) return showMsg('Give the recipe a name first.', root.querySelector('#f-title'));
      clearTimeout(timer);
      saveNow();
    });

    // A tab close / navigation shouldn't lose the last few keystrokes.
    const onLeave = () => { if (timer) { clearTimeout(timer); saveNow(); } };
    window.addEventListener('beforeunload', onLeave);
    mount.off = () => { window.removeEventListener('beforeunload', onLeave); clearTimeout(timer); };
  }

  return { title: id ? `Edit ${existing.title}` : 'Add a recipe', body, mount, unmount: () => mount.off?.() };
}

function renderIngredient(i, idx) {
  return html`
    <div class="row-card" data-index="${idx}">
      <div class="field"><label class="label" for="ing-group-${idx}">Part (optional)</label><input class="input input--part" id="ing-group-${idx}" data-f="ingredients.${idx}.group" value="${i.group}" placeholder="e.g. for the cake — leave blank if there's just one part"></div>
      <div class="field-row field-row--3">
        <div class="field"><label class="label" for="ing-amt-${idx}">Amount</label><input class="input" id="ing-amt-${idx}" data-f="ingredients.${idx}.amount" type="number" step="any" min="0" value="${i.amount}"></div>
        <div class="field"><label class="label" for="ing-unit-${idx}">Unit</label><input class="input" id="ing-unit-${idx}" data-f="ingredients.${idx}.unit" value="${i.unit}" placeholder="g, tbsp, cloves…"></div>
        <div class="field"><label class="label" for="ing-item-${idx}">Ingredient</label><input class="input" id="ing-item-${idx}" data-f="ingredients.${idx}.item" value="${i.item}" placeholder="cherry tomatoes, halved"></div>
      </div>
      <div class="field"><label class="label" for="ing-note-${idx}">Note (optional)</label><input class="input" id="ing-note-${idx}" data-f="ingredients.${idx}.note" value="${i.note}" placeholder="to finish, sliced…"></div>
      <button type="button" class="row-card__remove icon-btn" data-action="remove-ingredient" data-index="${idx}" aria-label="Remove this ingredient">${icon('x')}</button>
    </div>`;
}

function renderStep(s, idx) {
  return html`
    <div class="row-card" data-index="${idx}">
      <div class="field"><label class="label" for="step-group-${idx}">Part (optional)</label><input class="input input--part" id="step-group-${idx}" data-f="steps.${idx}.group" value="${s.group}" placeholder="e.g. for the cake — leave blank if there's just one part"></div>
      <div class="field"><label class="label" for="step-${idx}">Step ${idx + 1}</label><textarea class="input" id="step-${idx}" data-f="steps.${idx}.text" rows="2">${s.text}</textarea></div>
      <button type="button" class="row-card__remove icon-btn" data-action="remove-step" data-index="${idx}" aria-label="Remove this step">${icon('x')}</button>
    </div>`;
}

function mediaPreview(p) {
  if (p?.type === 'video' && p.url) return html`<video src="${p.url}" muted playsinline></video>`;
  if (p?.url) return html`<img src="${p.url}" alt="">`;
  return html`<span class="photo-field__empty">${icon('plus')}</span>`;
}

function renderMainPhoto(p) {
  return html`
    <div class="photo-field">
      <label class="photo-field__preview" for="photo-main-input">${mediaPreview(p)}</label>
      <div class="photo-field__side">
        <input class="sr-only" id="photo-main-input" type="file" accept="image/*" data-slot="main">
        <label class="btn btn--small btn--ghost" for="photo-main-input">${p?.url ? 'Replace photo' : 'Choose a photo'}</label>
        ${p?.url ? html`<button type="button" class="linklike" data-action="remove-main">Remove</button>` : ''}
        <input class="input" data-f="photo.caption" value="${p?.caption || ''}" placeholder="a caption, in handwriting" aria-label="Photo caption" ${p?.url ? '' : 'hidden'}>
      </div>
    </div>`;
}

function renderMediaRow(key, p, idx) {
  // `key` names the row for ids/actions ("memory"); `field` is the actual
  // array on `state` it belongs to ("memories") — picking/replacing a file
  // needs the latter, or it silently writes to a property that doesn't exist.
  const field = key === 'extra' ? 'extra' : 'memories';
  return html`
    <div class="row-card photo-field" data-index="${idx}">
      <label class="photo-field__preview" for="${key}-input-${idx}">${mediaPreview(p)}</label>
      <div class="photo-field__side">
        <input class="sr-only" id="${key}-input-${idx}" type="file" accept="image/*,video/*" data-slot="${field}" data-index="${idx}">
        <label class="btn btn--small btn--ghost" for="${key}-input-${idx}">${p?.url ? 'Replace' : 'Choose a photo or video'}</label>
        <input class="input" data-f="${field}.${idx}.caption" value="${p?.caption || ''}" placeholder="a caption, in handwriting" aria-label="Caption">
      </div>
      <button type="button" class="row-card__remove icon-btn" data-action="remove-${key}" data-index="${idx}" aria-label="Remove this">${icon('x')}</button>
    </div>`;
}

function notFound() {
  return html`
    <section class="sheet sheet--short">
      <p class="label">Not found</p>
      <h1 class="display display--md">That recipe isn't in the book.</h1>
      <div class="actions"><a class="btn" href="#/recipes">${icon('left')} Back to all recipes</a></div>
    </section>`;
}
