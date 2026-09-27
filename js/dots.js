// A photograph shown as live blue-pen stippling that reveals full colour
// from wherever you touch it — the homepage collage's treatment, reusable
// anywhere a food photo should feel drawn rather than printed.

import { html, raw, placeholder, ed } from './ui.js';
import { stipple } from './stipple.js';

// The dotted photo itself: a canvas drawn live from `photo`, with the real
// image underneath, clipped to a circle that grows from wherever you touch
// or hover. `ratio` gives it its own size (a recipe photo, standalone);
// omit it when the surrounding element already has one (a collage piece).
export function dotsMedia(photo, { seed = photo?.src || 'x', zoom = 1, px = 50, py = 50, ratio, phLabel } = {}) {
  const vars = `--zoom:${zoom};--px:${px};--py:${py}${ratio ? `;aspect-ratio:${ratio}` : ''}`;
  if (!photo?.src) return html`<div class="dots" style="${vars}">${placeholder(seed, ratio || 0.8, phLabel)}</div>`;
  return html`
    <div class="dots" data-reveal style="${vars}">
      <canvas class="dots__canvas" data-stipple data-seed="${seed}" data-zoom="${zoom}" data-px="${px}" data-py="${py}"></canvas>
      <div class="dots__reveal"><img src="${photo.src}" alt="${photo.alt || ''}" crossorigin="anonymous" loading="lazy" decoding="async"></div>
    </div>`;
}

// A print()-style figure (tilt, tape, caption, click-to-edit caption) whose
// photo is dotted-with-reveal instead of plain.
export function dottedPrint(photo, opts = {}) {
  const { seed = photo?.src || 'x', tilt = 0, tape = '', variant = '', ratio, zoom = 1, px = 50, py = 50, caption = photo?.caption, phLabel, edit } = opts;
  const media = dotsMedia(photo, { seed, zoom, px, py, ratio: ratio || (photo?.w && photo?.h ? photo.w / photo.h : 0.8), phLabel });
  return html`<figure class="print ${variant}" style="--tilt:${tilt}deg">${tape ? raw(`<span class="tape tape--${tape}" aria-hidden="true"></span>`) : ''}${media}${caption || edit ? html`<figcaption ${edit ? ed(edit.scope, edit.path, edit.ph || 'add a caption') : ''}>${caption || ''}</figcaption>` : ''}</figure>`;
}

// Draws every dotted photo under `root`, redraws them if the page resizes,
// and makes touching or hovering one reveal its colour from that point.
// Returns a cleanup function.
export function mountDots(root) {
  const pieces = [...root.querySelectorAll('[data-reveal]')];
  if (!pieces.length) return () => {};

  async function draw(piece) {
    const cv = piece.querySelector('[data-stipple]');
    const img = piece.querySelector('.dots__reveal img');
    if (!cv || !img) return;
    try { await img.decode(); } catch { /* broken image: fall back below */ }
    const ok = stipple(cv, img, { zoom: +cv.dataset.zoom, px: +cv.dataset.px, py: +cv.dataset.py, seed: cv.dataset.seed });
    piece.classList.toggle('no-dots', !ok);
  }
  pieces.forEach(draw);

  let timer, first = true;
  const ro = new ResizeObserver(() => {
    if (first) { first = false; return; } // the initial observe() call fires once immediately
    clearTimeout(timer);
    timer = setTimeout(() => pieces.forEach(draw), 200);
  });
  pieces.forEach((p) => ro.observe(p));

  const origin = (piece, e) => {
    const r = piece.getBoundingClientRect();
    piece.style.setProperty('--ox', `${((e.clientX - r.left) / r.width) * 100}%`);
    piece.style.setProperty('--oy', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const onEnter = (e) => { const p = e.target.closest('[data-reveal]'); if (p && pieces.includes(p)) origin(p, e); };
  const onClick = (e) => {
    const p = e.target.closest('[data-reveal]');
    if (!p || !pieces.includes(p)) return;
    origin(p, e);
    p.classList.toggle('is-on');
  };
  root.addEventListener('pointerover', onEnter);
  root.addEventListener('click', onClick);

  return () => {
    ro.disconnect();
    clearTimeout(timer);
    root.removeEventListener('pointerover', onEnter);
    root.removeEventListener('click', onClick);
  };
}
