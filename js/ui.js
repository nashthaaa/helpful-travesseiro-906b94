// Small rendering helpers shared by every view.
// `html` escapes every interpolated value unless it was produced by `html` / `raw`,
// so recipe text typed by friends can never inject markup.

const RAW = Symbol('raw');
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const raw = (s) => ({ [RAW]: String(s) });

export function str(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(str).join('');
  if (typeof v === 'object' && RAW in v) return v[RAW];
  return String(v).replace(/[&<>"']/g, (c) => ESC[c]);
}

export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += str(v) + strings[i + 1]; });
  return raw(out);
}

/* ---------- small pure helpers ---------- */

export const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'dessert', 'snacks'];
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
export const pad2 = (n) => String(n).padStart(2, '0');

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rng(seed) {
  let a = hash(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic "hand-placed" tilt so a print always leans the same way.
export function tiltFor(seed, max = 2.4) {
  const r = rng(seed)();
  const sign = r < 0.5 ? -1 : 1;
  return +(sign * (0.8 + (r * 2 % 1) * (max - 0.8))).toFixed(2);
}

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'recipe';
}

/* ---------- amounts (for servings scaling) ---------- */

const FRACS = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, '']];

export function formatAmount(n, unit = '') {
  if (n == null || Number.isNaN(n)) return '';
  if (n >= 100 && /^(g|ml)$/i.test(unit)) n = Math.round(n / 5) * 5;
  if (n >= 10) return String(Math.round(n * 10) / 10).replace(/\.0$/, '');
  const whole = Math.floor(n);
  const frac = n - whole;
  let best = FRACS[0];
  for (const f of FRACS) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  if (best[0] === 1) return String(whole + 1);
  if (!best[1]) return String(whole || (n > 0 ? '¼' : 0));
  return (whole ? String(whole) : '') + best[1];
}

const UNIT_BASES = ['handful', 'clove', 'pinch', 'slice', 'can', 'tin', 'sprig', 'bunch', 'stick', 'knob', 'splash', 'dash', 'cup', 'pack', 'packet', 'jar'];
export function unitFor(unit, amount) {
  if (!unit) return '';
  const lower = unit.toLowerCase();
  const base = UNIT_BASES.find((b) => lower === b || lower === b + 's' || lower === b + 'es');
  if (!base) return unit;
  if (amount != null && amount > 1) return /(ch|sh|s|x)$/.test(base) ? base + 'es' : base + 's';
  return base;
}

export function ingredientAmount(ing, factor = 1) {
  if (ing.amount == null) return ing.note || '';
  const scaled = ing.amount * factor;
  return [formatAmount(scaled, ing.unit), unitFor(ing.unit, scaled)].filter(Boolean).join(' ');
}

/* ---------- icons ---------- */

const ICONS = {
  right: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  left: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1zM14 7l3 3"/>',
  pot: '<path d="M4 10h16v6a4 4 0 01-4 4H8a4 4 0 01-4-4v-6zM2 10h2M20 10h2M8 6c0-1.5 1-1.5 1-3M13 6c0-1.5 1-1.5 1-3"/>',
};
export const icon = (name, cls = '') => raw(
  `<svg class="icon ${cls}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`
);

/* ---------- editable handwriting ---------- */

// Marks an element as click-to-edit while "Edit handwriting" is switched on.
// Keep the element's text directly between the tags so :empty works.
export const ed = (scope, path, ph = 'add some handwriting') => raw(`data-edit="${str(scope)}|${str(path)}" data-ph="${str(ph)}"`);

/* ---------- photos ---------- */

// A stippled blue-ink "plate", drawn where a recipe has no photograph yet.
// Echoes the dotted pen drawings in the notebook; clearly a placeholder.
export function placeholder(seed, ratio = 0.8, label = 'photo to come') {
  const W = 400, H = Math.round(W / ratio);
  const r = rng('ph:' + seed);
  const cx = W / 2, cy = H / 2 - H * 0.02;
  const R = Math.min(W, H) * 0.34;
  const dot = (x, y) => `M${x.toFixed(1)} ${y.toFixed(1)}h.1`;
  let fine = '', bold = '';
  for (let i = 0; i < 560; i++) { // rim, dense on the outer edge
    const a = r() * Math.PI * 2;
    const rr = R * (1 - Math.pow(r(), 2.6) * 0.42) + (r() - 0.5) * 5;
    const p = dot(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    if (i % 5) fine += p; else bold += p;
  }
  for (let i = 0; i < 300; i++) { // inner well of the plate
    const a = r() * Math.PI * 2;
    const rr = R * (0.52 + r() * 0.2);
    fine += dot(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  for (let i = 0; i < 90; i++) { // faint centre
    const a = r() * Math.PI * 2;
    const rr = R * 0.5 * Math.sqrt(r());
    fine += dot(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  for (let i = 0; i < 220; i++) { // cast shadow, lower right
    const a = r() * Math.PI;
    const rr = R * (1.0 + r() * 0.16);
    bold += dot(cx + R * 0.1 + Math.cos(a) * rr * 1.02, cy + R * 0.12 + Math.sin(a) * rr);
  }
  for (let i = 0; i < 150; i++) { // scattered specks
    const x = r() * W, y = r() * H;
    if (Math.hypot(x - cx, y - cy) > R * 1.3) fine += dot(x, y);
  }
  return raw(
    `<div class="ph" style="aspect-ratio:${W}/${H}" role="img" aria-label="${str(label)}">` +
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">` +
    `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" fill="none"/>` +
    `<path class="ph__fine" d="${fine}"/><path class="ph__bold" d="${bold}"/></svg>` +
    `<span class="ph__label">${str(label)}</span></div>`
  );
}

// <figure class="print"> with the optional tape / tilt / caption treatments.
export function print(photo, opts = {}) {
  const { seed = photo?.src || 'x', tilt = tiltFor(seed), tape = '', variant = '', ratio, cover = false, eager = false, sizes, caption = photo?.caption, phLabel, edit } = opts;
  const media = photo?.src
    ? html`<img src="${photo.src}" alt="${photo.alt || caption || ''}"${photo.w ? raw(` width="${photo.w}" height="${photo.h}"`) : ''}${cover && ratio ? raw(` style="aspect-ratio:${ratio};object-fit:cover"`) : ''} ${eager ? raw('fetchpriority="high"') : raw('loading="lazy"')} decoding="async"${sizes ? raw(` sizes="${str(sizes)}"`) : ''}>`
    : placeholder(seed, ratio || 0.8, phLabel);
  return html`<figure class="print ${variant}" style="--tilt:${tilt}deg">${tape ? raw(`<span class="tape tape--${tape}" aria-hidden="true"></span>`) : ''}${media}${caption || edit ? html`<figcaption ${edit ? ed(edit.scope, edit.path, edit.ph || 'add a caption') : ''}>${caption || ''}</figcaption>` : ''}</figure>`;
}
