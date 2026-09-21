// Data layer. Every view goes through these functions and nothing else, so
// Stage 3 can replace the body of this file with Supabase calls without
// touching a single view.

import { SEED } from './seed.js';

export async function listRecipes() {
  return SEED.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getRecipe(id) {
  return SEED.find((r) => r.id === id) || null;
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
