// Data layer. Every view goes through these functions and nothing else, so
// Stage 3 can replace the body of this file with Supabase calls without
// touching a single view.

import { SEED } from './seed.js';

// Edits made in the browser are kept as a small overlay on top of the seed
// data. In Stage 3 the same two update functions write to the shared database
// instead, and nothing that calls them has to change.
const EDITS_KEY = 'sb8:edits';
const readEdits = () => { try { return JSON.parse(localStorage.getItem(EDITS_KEY)) || {}; } catch { return {}; } };
const writeEdits = (e) => { try { localStorage.setItem(EDITS_KEY, JSON.stringify(e)); return true; } catch { return false; } };

// Only handwriting fields can be edited this way.
const EDITABLE = /^(quote|note\.text|photo\.caption|photos\.\d+\.caption|memories\.\d+\.caption)$/;
const SETTING_KEYS = ['heroHand'];
const SETTING_DEFAULTS = { heroHand: 'cook something. write it down. pass it on.' };

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) { o[k] = value; return; }
    if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[k];
  });
}

function withEdits(recipe) {
  const r = structuredClone(recipe);
  const mine = readEdits().recipes?.[r.id] || {};
  for (const [path, value] of Object.entries(mine)) if (EDITABLE.test(path)) setPath(r, path, value);
  return r;
}

export async function listRecipes() {
  return SEED.map(withEdits).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getRecipe(id) {
  const r = SEED.find((x) => x.id === id);
  return r ? withEdits(r) : null;
}

export async function updateRecipeField(id, path, value) {
  if (!EDITABLE.test(path) || !SEED.some((r) => r.id === id)) return false;
  const edits = readEdits();
  edits.recipes = edits.recipes || {};
  edits.recipes[id] = { ...edits.recipes[id], [path]: String(value).trim() };
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

// Every real photograph in the book, split into food photos and memories.
export function collagePhotos(list) {
  const food = [], memories = [];
  for (const r of list) {
    if (r.photo?.src) food.push(r.photo);
    for (const p of r.photos || []) if (p.src) food.push(p);
    for (const m of r.memories || []) if (m.src) memories.push(m);
  }
  return { food, memories };
}

export function scrapbook(list) {
  const memories = list.flatMap((r) => (r.memories || []).map((m) => ({ ...m, recipe: r })));
  const notes = list.filter((r) => r.note?.text).map((r) => ({ ...r.note, recipe: r }));
  return { memories, notes };
}
