// Photo storage, backed by a public Supabase Storage bucket. Every photo is
// downscaled before it's uploaded, so a phone photo that starts at 10+ MB
// takes barely any space and the page stays fast.
//
// A photo's "src" everywhere else in the app is simply its public URL —
// nothing else needs to know it came from Supabase.

import { getClient } from './supabase-client.js';

const BUCKET = 'recipe-photos';

function publicUrlPrefix() {
  return getClient().storage.from(BUCKET).getPublicUrl('').data.publicUrl;
}

// True for a photo this app uploaded (as opposed to one of the original
// mockup photos, which live alongside the site itself, not in storage).
export function isUploaded(src) {
  try { return typeof src === 'string' && src.startsWith(publicUrlPrefix()); }
  catch { return false; } // Supabase not configured yet
}

// Reads a File the person picked, downscales it, uploads it, and returns a
// URL ready to put straight into <img src>.
export async function put(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("That file couldn't be read as a photo."); }

  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error("That photo couldn't be saved.");

  const path = `${crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await getClient().storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`That photo couldn't be uploaded (${error.message}). Are you signed in?`);

  return { url: getClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl, w, h };
}

// Frees a photo this app uploaded. Safe to call on a photo that came from
// somewhere else (a bundled asset, say) — it's simply left alone.
export async function remove(src) {
  if (!isUploaded(src)) return;
  const path = src.slice(publicUrlPrefix().length);
  await getClient().storage.from(BUCKET).remove([path]).catch(() => {});
}
