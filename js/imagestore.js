// Local photo storage for recipes added or edited on this device, using
// IndexedDB (plenty of room for photos, unlike localStorage). Every photo is
// downscaled before it's stored, so a phone photo that starts at 10+ MB takes
// almost no space and the page stays fast.
//
// A stored photo is referred to elsewhere as the string "idb:<id>" — see
// isRef/refId/toRef. store.js turns that reference into a real, showable URL.

const DB = 'sb8', STORE = 'images', VERSION = 1;
let dbp;

function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function await1(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getBlob(id) {
  const db = await openDb();
  return await1(db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
}

async function putBlob(id, blob) {
  const db = await openDb();
  return await1(db.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, id));
}

async function deleteBlob(id) {
  const db = await openDb();
  return await1(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Reads a File the person picked, downscales it, and stores it. Returns the
// id, its (downscaled) size, and a URL ready to put straight into <img src>.
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

  const id = newId();
  await putBlob(id, blob);
  urlCache.set(id, URL.createObjectURL(blob));
  return { id, w, h, url: urlCache.get(id) };
}

const urlCache = new Map();

// A showable URL for a stored photo id, or null if it isn't there any more.
export async function url(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await getBlob(id).catch(() => null);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urlCache.set(id, u);
  return u;
}

export async function remove(id) {
  urlCache.delete(id);
  await deleteBlob(id).catch(() => {});
}

export const REF_PREFIX = 'idb:';
export const isRef = (src) => typeof src === 'string' && src.startsWith(REF_PREFIX);
export const refId = (src) => src.slice(REF_PREFIX.length);
export const toRef = (id) => REF_PREFIX + id;
