// Who's signed in, and the magic-link flow for signing in. Browsing and
// cooking never need this — only adding, editing and deleting recipes do.

import { getClient, configured } from './supabase-client.js';

let user = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(user));

export const currentUser = () => user;
export const isSignedIn = () => !!user;

// Calls `fn` now with the current state, and again whenever it changes.
// Returns a function that stops listening.
export function onAuthChange(fn) {
  listeners.add(fn);
  fn(user);
  return () => listeners.delete(fn);
}

export async function init() {
  if (!configured) return;
  const { data } = await getClient().auth.getSession();
  user = data.session?.user || null;
  notify();
  getClient().auth.onAuthStateChange((_event, session) => {
    user = session?.user || null;
    notify();
  });
}

// Emails a one-time sign-in link. The link brings them back to this same
// page, already signed in — see the onAuthStateChange hook in app.js.
export async function sendMagicLink(email) {
  const { error } = await getClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await getClient().auth.signOut();
}
