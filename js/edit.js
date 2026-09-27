// "Edit this page": switch it on and every piece of writing on the page —
// handwritten quotes and notes, and the typed title/tagline/heading text —
// becomes click-to-edit. Off, the page stays exactly as spacious as reading it.

import { html, str, icon } from './ui.js';
import { updateRecipeField, updateSetting } from './store.js';
import { isSignedIn } from './auth.js';
import { signInPanel, mountSignInPanel } from './auth-ui.js';

export const editBar = (left = '', right = '') => html`
  <div class="pagebar">
    <div class="pagebar__side">${left}</div>
    <div class="pagebar__side">
      ${right}
      <button type="button" class="edit-toggle" data-edit-toggle aria-pressed="false">${icon('pencil')}<span>Edit this page</span></button>
    </div>
    <p class="pagebar__note" data-edit-note hidden>Tap any dashed text to change it — it's saved for everyone.</p>
    <div class="pagebar__signin" data-edit-signin hidden></div>
  </div>`;

async function save(scope, path, value) {
  if (scope === 'site') return updateSetting(path, value);
  if (scope.startsWith('recipe:')) return updateRecipeField(scope.slice(7), path, value);
  return false;
}

export function setupEditing(root) {
  const toggle = root.querySelector('[data-edit-toggle]');
  if (!toggle) return;
  const note = root.querySelector('[data-edit-note]');
  const signinSlot = root.querySelector('[data-edit-signin]');
  const label = toggle.querySelector('span');
  let on = false;

  const targets = () => root.querySelectorAll('[data-edit]');

  function closeEditor() {
    root.querySelectorAll('.inline-edit').forEach((f) => { f.previousElementSibling.hidden = false; f.remove(); });
  }

  function set(value) {
    on = value;
    closeEditor();
    signinSlot.hidden = true;
    document.body.classList.toggle('is-editing', on);
    toggle.setAttribute('aria-pressed', String(on));
    label.textContent = on ? 'Done editing' : 'Edit this page';
    note.hidden = !on;
    for (const el of targets()) {
      if (on) {
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `Edit: ${el.textContent.trim() || el.dataset.ph}`);
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    }
  }

  function open(el) {
    closeEditor();
    const [scope, path] = el.dataset.edit.split('|');
    const form = document.createElement('form');
    form.className = 'inline-edit';
    form.classList.toggle('inline-edit--hand', el.classList.contains('hand'));
    form.innerHTML = `
      <label class="sr-only" for="inline-edit-text">Edit this text</label>
      <textarea id="inline-edit-text" rows="3" maxlength="400"></textarea>
      <div class="inline-edit__row">
        <button class="btn btn--small" type="submit">Save</button>
        <button class="btn btn--small btn--ghost" type="button" data-cancel>Cancel</button>
        <span class="inline-edit__msg" role="status"></span>
      </div>`;
    const ta = form.querySelector('textarea');
    ta.value = el.textContent.trim();
    ta.placeholder = el.dataset.ph || '';
    el.hidden = true;
    el.after(form);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    const close = () => { el.hidden = false; form.remove(); el.focus(); };
    form.querySelector('[data-cancel]').addEventListener('click', close);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = ta.value.trim();
      const ok = await save(scope, path, value);
      if (!ok) { form.querySelector('.inline-edit__msg').textContent = "Couldn't save. Try again."; return; }
      el.textContent = value;
      el.setAttribute('aria-label', `Edit: ${value || el.dataset.ph}`);
      close();
    });
  }

  toggle.addEventListener('click', () => {
    if (!on && !isSignedIn()) {
      signinSlot.innerHTML = str(signInPanel('sign in to edit the text on this page.'));
      signinSlot.hidden = false;
      mountSignInPanel(signinSlot);
      return;
    }
    set(!on);
  });
  root.addEventListener('click', (e) => {
    if (!on) return;
    const el = e.target.closest('[data-edit]');
    if (el) { e.preventDefault(); open(el); }
  });
  root.addEventListener('keydown', (e) => {
    if (!on || (e.key !== 'Enter' && e.key !== ' ')) return;
    const el = e.target.closest?.('[data-edit]');
    if (el && e.target === el) { e.preventDefault(); open(el); }
  });
}
