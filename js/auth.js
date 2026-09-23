// Who's signed in, and signing in. Browsing and cooking never need this —
// only adding, editing and deleting recipes do.
//
// Everyone in the kitchen shares one account (see supabase/schema.sql's
// guide) — signing in just means typing the one shared password. Sessions
// persist, so this is a once-per-device thing, not a once-per-visit one.

import { getClient, configured } from './supabase-client.js';
import { SHARED_LOGIN_EMAIL } from './supabase-config.js';

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

export async function signIn(password) {
  const { error } = await getClient().auth.signInWithPassword({ email: SHARED_LOGIN_EMAIL, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? "That password isn't right." : error.message);
}

export async function signOut() {
  await getClient().auth.signOut();
}
