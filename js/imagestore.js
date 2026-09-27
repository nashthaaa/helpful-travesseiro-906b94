// Photo and video storage, backed by a public Supabase Storage bucket.
// Photos are downscaled before upload, so a phone photo that starts at
// 10+ MB takes barely any space. Videos aren't re-encoded (browsers can't do
// that cheaply) — just capped to a sane size and uploaded as-is.
//
// A file's "src" everywhere else in the app is simply its public URL —
// nothing else needs to know it came from Supabase.

import { getClient } from './supabase-client.js';

const BUCKET = 'recipe-photos';
const MAX_VIDEO_BYTES = 120 * 1024 * 1024; // 120 MB — a generous clip, not someone's whole camera roll

function publicUrlPrefix() {
  return getClient().storage.from(BUCKET).getPublicUrl('').data.publicUrl;
}

// True for a file this app uploaded (as opposed to one of the original
// mockup photos, which live alongside the site itself, not in storage).
export function isUploaded(src) {
  try { return typeof src === 'string' && src.startsWith(publicUrlPrefix()); }
  catch { return false; } // Supabase not configured yet
}

async function uploadBlob(blob, ext, contentType) {
  const path = `${crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await getClient().storage.from(BUCKET).upload(path, blob, { contentType, upsert: false });
  if (error) throw new Error(`That upload didn't go through (${error.message}). Are you signed in?`);
  return getClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function putImage(file) {
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
  const url = await uploadBlob(blob, 'jpg', 'image/jpeg');
  return { url, w, h, type: 'image' };
}

// Reads the video's own dimensions so the player can reserve the right
// amount of space instead of jumping around as it loads. Best-effort: a
// format the browser can't probe just plays without a size hint.
function probeVideo(file) {
  return new Promise((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => { resolve({ w: el.videoWidth || null, h: el.videoHeight || null }); URL.revokeObjectURL(el.src); };
    el.onerror = () => { resolve({ w: null, h: null }); URL.revokeObjectURL(el.src); };
    el.src = URL.createObjectURL(file);
  });
}

async function putVideo(file) {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`That video is too big (${Math.round(file.size / 1024 / 1024)} MB) — trim it to under ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB and try again.`);
  }
  const { w, h } = await probeVideo(file);
  const ext = (file.name.match(/\.(\w+)$/)?.[1] || 'mp4').toLowerCase();
  const url = await uploadBlob(file, ext, file.type || 'video/mp4');
  return { url, w, h, type: 'video' };
}

// Reads a File the person picked and uploads it, returning a URL ready to
// use in <img src> or <video src> along with { w, h, type }.
export async function put(file) {
  return file.type.startsWith('video/') ? putVideo(file) : putImage(file);
}

// Frees a file this app uploaded. Safe to call on one that came from
// somewhere else (a bundled asset, say) — it's simply left alone.
export async function remove(src) {
  if (!isUploaded(src)) return;
  const path = src.slice(publicUrlPrefix().length);
  await getClient().storage.from(BUCKET).remove([path]).catch(() => {});
}
