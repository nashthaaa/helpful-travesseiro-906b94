// Small, reusable sign-in UI: an inline "type the kitchen password" form
// (used on the recipe editor and the quick handwriting-edit prompt) and the
// persistent signed-in / sign-in control in the site header.

import { html, str, icon } from './ui.js';
import { isSignedIn, currentUser, onAuthChange, signIn, signOut } from './auth.js';
import { configured } from './supabase-client.js';

// ---------- inline "sign in to continue" panel ----------

export function signInPanel(prompt = 'Sign in to make changes.') {
  return html`
    <div class="signin" data-signin>
      <p class="hand hand--lg">${prompt}</p>
      ${configured ? html`
        <form class="signin__form" data-signin-form>
          <label class="sr-only" for="signin-password">The kitchen password</label>
          <input class="input" id="signin-password" type="password" required placeholder="the kitchen password" autocomplete="current-password">
          <button class="btn" type="submit">Sign in</button>
        </form>
        <p class="signin__msg" data-signin-msg role="status" hidden></p>` : html`
        <p class="lede">This cookbook isn't connected to its database yet — there's nothing to sign in to. (See <code>js/supabase-config.js</code>.)</p>`}
    </div>`;
}

export function mountSignInPanel(root) {
  const form = root.querySelector('[data-signin-form]');
  if (!form) return;
  const msg = root.querySelector('[data-signin-msg]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const password = input.value;
    if (!password) return;
    const btn = form.querySelector('button');
    btn.disabled = true;
    msg.hidden = true;
    try {
      await signIn(password);
      // Signing in re-renders the current page into its unlocked state —
      // see the onAuthChange hook in app.js — so there's nothing more to do.
    } catch (err) {
      msg.hidden = false;
      msg.textContent = err.message || "That couldn't be checked. Try again.";
      btn.disabled = false;
      input.select();
    }
  });
}

// ---------- header widget ----------

function headerHtml() {
  if (!configured) return '';
  const user = currentUser();
  return user
    ? html`<span class="auth-status"><span class="meta">${user.email}</span><button type="button" class="linklike" data-signout>Sign out</button></span>`
    : html`<a class="nav__link" href="#/add" data-nowrap>Sign in</a>`;
}

export function mountHeaderAuth(el) {
  const paint = () => { el.innerHTML = str(headerHtml()); };
  const off = onAuthChange(paint);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-signout]')) signOut();
  });
  return off;
}
