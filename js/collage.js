// The homepage collage: a few photographs cut out and laid on the page.
// Food photos are stippled in blue ink (and turn to colour when touched),
// the old-kitchen snapshot stays black and white. It is built from whatever
// photos the cookbook holds, so it grows with the book.

import { html, raw, placeholder, print } from './ui.js';
import { stipple } from './stipple.js';

// Each piece: where it sits (% of the collage), how it leans, and which photo it shows.
function dotted({ cls, photo, seed, x, y, w, ratio, r, i, zoom = 1, px = 50, py = 50, round = false, tape = '' }) {
  const media = photo?.src
    ? html`<canvas class="piece__dots" data-stipple data-seed="${seed}" data-zoom="${zoom}" data-px="${px}" data-py="${py}"></canvas>
           <div class="piece__reveal"><img src="${photo.src}" alt="" decoding="async" loading="eager"></div>`
    : placeholder(seed, ratio, '');
  return html`
    <div class="piece piece--${cls}" data-reveal style="--x:${x}%;--y:${y}%;--w:${w}%;--r:${r}deg;--i:${i};--zoom:${zoom};--px:${px};--py:${py}">
      <div class="piece__frame ${round ? 'is-round' : ''}" style="aspect-ratio:${ratio}">${media}</div>
      ${tape ? raw(`<span class="tape tape--${tape}" aria-hidden="true"></span>`) : ''}
    </div>`;
}

export function collageHtml({ food, memories }) {
  const at = (list, i) => (list.length ? list[i % list.length] : null);
  const memory = memories[0];
  return html`
    <div class="collage" aria-hidden="true">
      ${dotted({ cls: 'a', photo: at(food, 0), seed: 'collage-a', x: 0, y: 10.5, w: 60, ratio: 0.8, r: -2.5, i: 0 })}
      ${memory ? html`
        <div class="piece piece--b" style="--x:54%;--y:0%;--w:43%;--r:4deg;--i:2">
          ${print(memory, { seed: memory.src, tilt: 0, tape: 'top', variant: 'print--polaroid print--bw', ratio: 1.17 })}
          <svg class="doodle" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 22 L1 25"/><path d="M14 10 L9 4"/><path d="M27 6 L28 0"/></svg>
        </div>` : ''}
      ${dotted({ cls: 'c', photo: at(food, 1), seed: 'collage-c', x: 51, y: 59, w: 38, ratio: 1, r: 0, i: 1, zoom: food.length > 1 ? 1.15 : 1.9, px: 50, py: 50, round: true })}
      ${dotted({ cls: 'd', photo: at(food, 0), seed: 'collage-d', x: 5, y: 76, w: 25, ratio: 1, r: -6, i: 3, zoom: 2.6, px: 24, py: 62, tape: 'top' })}
    </div>`;
}

export function mountCollage(root) {
  const collage = root.querySelector('.collage');
  if (!collage) return () => {};
  const canvases = [...collage.querySelectorAll('[data-stipple]')];

  async function draw() {
    for (const cv of canvases) {
      const img = cv.parentElement.querySelector('img');
      try { await img.decode(); } catch { /* broken image: fall back below */ }
      const ok = stipple(cv, img, { zoom: +cv.dataset.zoom, px: +cv.dataset.px, py: +cv.dataset.py, seed: cv.dataset.seed });
      cv.closest('.piece').classList.toggle('no-dots', !ok);
    }
  }
  draw();

  // Redraw the dots if the window changes size.
  let timer, first = true;
  const ro = new ResizeObserver(() => {
    if (first) { first = false; return; }
    clearTimeout(timer);
    timer = setTimeout(draw, 200);
  });
  ro.observe(collage);

  // Colour spreads out from wherever you touch a piece. Tap toggles it on phones.
  const origin = (piece, e) => {
    const r = piece.getBoundingClientRect();
    piece.style.setProperty('--ox', `${((e.clientX - r.left) / r.width) * 100}%`);
    piece.style.setProperty('--oy', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const onEnter = (e) => { const p = e.target.closest?.('[data-reveal]'); if (p) origin(p, e); };
  const onClick = (e) => {
    const p = e.target.closest?.('[data-reveal]');
    if (!p) return;
    origin(p, e);
    p.classList.toggle('is-on');
  };
  collage.addEventListener('pointerover', onEnter);
  collage.addEventListener('click', onClick);

  return () => { ro.disconnect(); clearTimeout(timer); };
}
