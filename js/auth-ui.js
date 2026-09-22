// Small, reusable sign-in UI: an inline "email me a link" form (used on the
// recipe editor and the quick handwriting-edit prompt) and the persistent
// signed-in-as / sign-in control in the site header.

import { html, str, icon } from './ui.js';
import { isSignedIn, currentUser, onAuthChange, sendMagicLink, signOut } from './auth.js';
import { configured } from './supabase-client.js';

// ---------- inline "sign in to continue" panel ----------

export function signInPanel(prompt = 'Sign in to make changes.') {
  return html`
    <div class="signin" data-signin>
      <p class="hand hand--lg">${prompt}</p>
      ${configured ? html`
        <form class="signin__form" data-signin-form>
          <label class="sr-only" for="signin-email">Your email</label>
          <input class="input" id="signin-email" type="email" required placeholder="you@example.com" autocomplete="email">
          <button class="btn" type="submit">Email me a link</button>
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
    const email = form.querySelector('input').value.trim();
    if (!email) return;
    const btn = form.querySelector('button');
    btn.disabled = true;
    msg.hidden = true;
    try {
      await sendMagicLink(email);
      form.hidden = true;
      msg.hidden = false;
      msg.textContent = `Check ${email} for a link — this page will unlock as soon as you open it.`;
    } catch (err) {
      msg.hidden = false;
      msg.textContent = err.message || "That couldn't be sent. Try again.";
    } finally {
      btn.disabled = false;
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
