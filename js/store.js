// Data layer. Every view goes through these functions and nothing else.
// Everything here is now genuinely shared: recipes live in Supabase, and
// what one person adds or edits, everyone sees.

import { slugify, setPath } from './ui.js';
import { getClient } from './supabase-client.js';
import { isUploaded, remove as removeImage } from './imagestore.js';

// Fields the quick "Edit handwriting" toggle can change in place, without
// opening the full recipe form.
const QUICK_EDITABLE = /^(quote|note\.text|photo\.caption|photos\.\d+\.caption|memories\.\d+\.caption)$/;
const SETTING_KEYS = ['heroHand'];
const SETTING_DEFAULTS = { heroHand: 'cook something. write it down. pass it on.' };

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    contributor: row.contributor,
    category: row.category,
    tagline: row.tagline || undefined,
    servings: row.servings || undefined,
    quote: row.quote || undefined,
    note: row.note || undefined,
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    photo: row.photo || null,
    photos: row.photos || [],
    memories: row.memories || [],
    sample: !!row.sample,
    createdAt: row.created_at,
  };
}

function toRow(data) {
  return {
    title: data.title,
    contributor: data.contributor,
    category: data.category,
    tagline: data.tagline ?? null,
    servings: data.servings ?? null,
    quote: data.quote ?? null,
    note: data.note ?? null,
    ingredients: data.ingredients ?? [],
    steps: data.steps ?? [],
    photo: data.photo ?? null,
    photos: data.photos ?? [],
    memories: data.memories ?? [],
    sample: !!data.sample,
  };
}

export async function listRecipes() {
  const { data, error } = await getClient().from('recipes').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(fromRow);
}

export async function getRecipe(id) {
  const { data, error } = await getClient().from('recipes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data) : null;
}

// Changes one handwritten field without touching the rest of the recipe.
// `quote` is its own column; the others live inside a jsonb column, so this
// reads that column, patches it in memory, and writes the whole thing back.
export async function updateRecipeField(id, path, value) {
  if (!QUICK_EDITABLE.test(path)) return false;
  const client = getClient();
  value = String(value).trim();

  if (path === 'quote') {
    const { error } = await client.from('recipes').update({ quote: value }).eq('id', id);
    return !error;
  }

  const column = path.split('.')[0]; // note | photo | photos | memories
  const subPath = path.slice(column.length + 1);
  const { data, error: readErr } = await client.from('recipes').select(column).eq('id', id).maybeSingle();
  if (readErr || !data) return false;
  const current = structuredClone(data[column] ?? (column === 'photos' || column === 'memories' ? [] : {}));
  setPath(current, subPath, value);
  const { error: writeErr } = await client.from('recipes').update({ [column]: current }).eq('id', id);
  return !writeErr;
}

async function uniqueId(title) {
  const stem = slugify(title) || 'recipe';
  const { data } = await getClient().from('recipes').select('id').ilike('id', `${stem}%`);
  const taken = new Set((data || []).map((r) => r.id));
  let id = stem, n = 2;
  while (taken.has(id)) id = `${stem}-${n++}`;
  return id;
}

// Full save from the recipe editor. `data` already has every field the form
// collects; composite fields (ingredients, steps, photo, photos, memories,
// note) fully replace whatever was there before. Pass a falsy `id` to create
// a new recipe. Returns the id the recipe is saved under, or null on failure.
export async function saveRecipe(id, data) {
  const client = getClient();
  const row = toRow(data);
  if (id) {
    const { error } = await client.from('recipes').update(row).eq('id', id);
    return error ? null : id;
  }
  const newId = await uniqueId(data.title);
  const { error } = await client.from('recipes').insert({ id: newId, ...row });
  return error ? null : newId;
}

export async function deleteRecipe(id) {
  const client = getClient();
  const { data } = await client.from('recipes').select('photo, photos, memories').eq('id', id).maybeSingle();
  if (data) {
    const urls = [data.photo, ...(data.photos || []), ...(data.memories || [])].filter(Boolean).map((p) => p.src).filter(isUploaded);
    await Promise.all(urls.map(removeImage));
  }
  const { error } = await client.from('recipes').delete().eq('id', id);
  return !error;
}

export async function getSettings() {
  const { data } = await getClient().from('settings').select('key, value');
  return { ...SETTING_DEFAULTS, ...Object.fromEntries((data || []).map((r) => [r.key, r.value])) };
}

export async function updateSetting(key, value) {
  if (!SETTING_KEYS.includes(key)) return false;
  const { error } = await getClient().from('settings').upsert({ key, value: String(value).trim() });
  return !error;
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
