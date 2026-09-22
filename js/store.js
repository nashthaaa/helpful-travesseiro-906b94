// Data layer. Every view goes through these functions and nothing else, so
// Stage 3 can point them at Supabase instead without touching a single view.
//
// Until then, everything anyone adds or edits lives only in this browser:
// text in localStorage, photos in IndexedDB (see imagestore.js). A recipe
// someone edits is kept as a patch on top of the built-in seed data; a new
// recipe is stored whole. Nothing here is shared between people yet.

import { SEED } from './seed.js';
import { setPath, slugify } from './ui.js';
import { isRef, refId, remove as removeImage, url as imageUrl } from './imagestore.js';

const EDITS_KEY = 'sb8:edits';
const readEdits = () => { try { return JSON.parse(localStorage.getItem(EDITS_KEY)) || {}; } catch { return {}; } };
const writeEdits = (e) => { try { localStorage.setItem(EDITS_KEY, JSON.stringify(e)); return true; } catch { return false; } };

// Fields the quick "Edit handwriting" toggle can change in place, without
// opening the full recipe form.
const QUICK_EDITABLE = /^(quote|note\.text|photo\.caption|photos\.\d+\.caption|memories\.\d+\.caption)$/;
const SETTING_KEYS = ['heroHand'];
const SETTING_DEFAULTS = { heroHand: 'cook something. write it down. pass it on.' };

// The seed recipe (or a locally-added one) with every edit applied, but
// photo fields still as stored — an "idb:…" reference hasn't been turned
// into a URL yet. Used to build the recipe editor and to clean up photos.
function draft(id) {
  const edits = readEdits();
  if ((edits.deleted || []).includes(id)) return null;
  const seed = SEED.find((r) => r.id === id);
  let base = seed ? structuredClone(seed) : (edits.newRecipes?.[id] ? structuredClone(edits.newRecipes[id]) : null);
  if (!base) return null;
  const mine = edits.recipes?.[id];
  if (mine) {
    if (mine.__full) base = { ...base, ...mine.__full };
    for (const [path, value] of Object.entries(mine)) if (path !== '__full') setPath(base, path, value);
  }
  return base;
}

async function resolveImages(recipe) {
  const fix = async (obj) => {
    if (obj?.src && isRef(obj.src)) obj.src = (await imageUrl(refId(obj.src))) || undefined;
  };
  await fix(recipe.photo);
  await Promise.all((recipe.photos || []).map(fix));
  await Promise.all((recipe.memories || []).map(fix));
  recipe.photos = (recipe.photos || []).filter((p) => p.src);
  recipe.memories = (recipe.memories || []).filter((m) => m.src);
  if (recipe.photo && !recipe.photo.src) recipe.photo = null;
  return recipe;
}

export async function listRecipes() {
  const edits = readEdits();
  const deleted = new Set(edits.deleted || []);
  const ids = new Set([...SEED.map((r) => r.id), ...Object.keys(edits.newRecipes || {})].filter((id) => !deleted.has(id)));
  const recipes = [];
  for (const id of ids) {
    const r = draft(id);
    if (r) recipes.push(await resolveImages(r));
  }
  return recipes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getRecipe(id) {
  const r = draft(id);
  return r ? resolveImages(r) : null;
}

// Unresolved (photo fields still as "idb:…" / asset-path strings) — what the
// recipe editor prefills its form from.
export async function getRecipeDraft(id) {
  return draft(id);
}

export async function updateRecipeField(id, path, value) {
  if (!QUICK_EDITABLE.test(path)) return false;
  const edits = readEdits();
  if ((edits.deleted || []).includes(id)) return false;
  if (!SEED.some((r) => r.id === id) && !edits.newRecipes?.[id]) return false;
  edits.recipes = edits.recipes || {};
  edits.recipes[id] = { ...edits.recipes[id], [path]: String(value).trim() };
  return writeEdits(edits);
}

// Full save from the recipe editor. `data` already has every field the form
// collects; composite fields (ingredients, steps, photo, photos, memories,
// note) fully replace whatever was there before. Pass a falsy `id` to create
// a new recipe. Returns the id the recipe is saved under, or null on failure.
export async function saveRecipe(id, data) {
  const edits = readEdits();
  edits.deleted = (edits.deleted || []).filter((d) => d !== id);
  edits.recipes = edits.recipes || {};
  edits.newRecipes = edits.newRecipes || {};

  if (id && SEED.some((r) => r.id === id)) {
    edits.recipes[id] = { __full: data }; // replaces any earlier quick edits too
  } else if (id && edits.newRecipes[id]) {
    delete edits.recipes[id];
    edits.newRecipes[id] = { ...data, id, createdAt: edits.newRecipes[id].createdAt || new Date().toISOString() };
  } else {
    const stem = slugify(data.title) || 'recipe';
    const taken = (x) => SEED.some((r) => r.id === x) || edits.newRecipes[x];
    let newId = stem, n = 2;
    while (taken(newId)) newId = `${stem}-${n++}`;
    edits.newRecipes[newId] = { ...data, id: newId, createdAt: new Date().toISOString() };
    id = newId;
  }
  return writeEdits(edits) ? id : null;
}

export async function deleteRecipe(id) {
  const edits = readEdits();
  const raw = draft(id); // unresolved, so uploaded photos can be freed below
  if (raw) {
    const refs = [raw.photo, ...(raw.photos || []), ...(raw.memories || [])].filter(Boolean).map((p) => p.src).filter(isRef);
    for (const ref of refs) await removeImage(refId(ref));
  }
  if (edits.newRecipes?.[id]) delete edits.newRecipes[id];
  else edits.deleted = [...new Set([...(edits.deleted || []), id])];
  if (edits.recipes) delete edits.recipes[id];
  return writeEdits(edits);
}

export async function getSettings() {
  return { ...SETTING_DEFAULTS, ...(readEdits().settings || {}) };
}

export async function updateSetting(key, value) {
  if (!SETTING_KEYS.includes(key)) return false;
  const edits = readEdits();
  edits.settings = { ...edits.settings, [key]: String(value).trim() };
  return writeEdits(edits);
}

/* ---------- pure helpers over a list of recipes ---------- */

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function searchRecipes(list, { q = '', cat = '', by = '' } = {}) {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  return list.filter((r) => {
    if (cat && r.category !== cat) return false;
    if (by && r.contributor !== by) return false;
    if (!tokens.length) return true;
    const hay = norm([r.title, r.contributor, r.category, r.tagline, ...(r.ingredients || []).map((i) => i.item)].join(' | '));
    return tokens.every((t) => hay.includes(t));
  });
}

// When someone searches "tomato", tell them which ingredient matched.
export function ingredientHit(recipe, q) {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return '';
  if (tokens.every((t) => norm(recipe.title).includes(t))) return '';
  const hit = (recipe.ingredients || []).find((i) => tokens.some((t) => norm(i.item).includes(t)));
  return hit ? hit.item : '';
}

export const contributors = (list) => [...new Set(list.map((r) => r.contributor).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export function featured(list) {
  return list.find((r) => r.featured) || list.find((r) => !r.sample && r.photo) || list[0] || null;
}

export function recent(list, n, excludeId) {
  return list.filter((r) => r.id !== excludeId).slice(0, n);
}

export function categoryCounts(list) {
  const out = {};
  for (const r of list) out[r.category] = (out[r.category] || 0) + 1;
  return out;
}

export function scrapbook(list) {
  const memories = list.flatMap((r) => (r.memories || []).map((m) => ({ ...m, recipe: r })));
  const notes = list.filter((r) => r.note?.text).map((r) => ({ ...r.note, recipe: r }));
  return { memories, notes };
}

// Every real photograph in the book, split into food photos and memories —
// what the homepage collage draws from.
export function collagePhotos(list) {
  const food = [], memories = [];
  for (const r of list) {
    if (r.photo?.src) food.push(r.photo);
    for (const p of r.photos || []) if (p.src) food.push(p);
    for (const m of r.memories || []) if (m.src) memories.push(m);
  }
  return { food, memories };
}
