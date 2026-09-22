// Turns a photograph into blue-pen stippling, drawn live on a <canvas>.
// Dark areas get many dots, highlights get none, like the dotted drawings in
// the notebook. It works on any photo, so pictures friends upload later get
// the same treatment with no extra steps.
//
// The sampling mirrors how CSS shows the same photo (`object-fit: cover`,
// zoomed by `zoom` and positioned by `px`/`py` percentages), so the dotted
// version lines up exactly with the full-colour one that fades in over it.

import { rng } from './ui.js';

// Separable box blur, used to find the local average so detail can be boosted.
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  const span = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / span;
      sum += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / span;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

export function stipple(canvas, img, { zoom = 1, px = 50, py = 50, seed = 'dots', density = 1, ink = '#20369b' } = {}) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H || !img.naturalWidth) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  // 1. Look at the photo the way the page shows it, at half resolution.
  const sw = Math.max(8, Math.round(W / 2)), sh = Math.max(8, Math.round(H / 2));
  const off = document.createElement('canvas');
  off.width = sw; off.height = sh;
  const octx = off.getContext('2d', { willReadFrequently: true });
  const boxW = sw * zoom, boxH = sh * zoom;
  const s = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  octx.drawImage(img, (boxW - dw) * px / 100 - (boxW - sw) * px / 100, (boxH - dh) * py / 100 - (boxH - sh) * py / 100, dw, dh);
  let data;
  try { data = octx.getImageData(0, 0, sw, sh).data; } catch { return false; } // cross-origin photo without CORS

  // 2. Darkness map, stretched so every photo uses the full range of dots.
  const n = sw * sh;
  const dark = new Float32Array(n);
  const hist = new Uint32Array(64);
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    const d = 1 - (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255;
    dark[i] = d;
  }
  // Local contrast: push each pixel away from its neighbourhood average so
  // tomatoes, leaves and edges read as clusters of dots instead of an even tone.
  const avg = boxBlur(dark, sw, sh, Math.max(3, Math.round(sw / 14)));
  // Outlines: strong edges (a tomato against pasta, the rim of the bowl) get
  // dense dots, so the subject can still be recognised as a drawing.
  const soft = boxBlur(dark, sw, sh, 1);
  const edge = new Float32Array(n);
  let edgeMax = 1e-6;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const gx = soft[i + 1] - soft[i - 1], gy = soft[i + sw] - soft[i - sw];
      const e = Math.sqrt(gx * gx + gy * gy);
      edge[i] = e;
      if (e > edgeMax) edgeMax = e;
    }
  }
  for (let i = 0; i < n; i++) {
    const e = Math.min(1, (edge[i] / edgeMax) * 2.2);
    dark[i] = dark[i] + 1.1 * (dark[i] - avg[i]) + 0.55 * e;
  }
  for (let i = 0; i < n; i++) hist[Math.min(63, Math.max(0, (dark[i] * 64) | 0))]++;
  const pct = (p) => { let acc = 0; for (let b = 0; b < 64; b++) { acc += hist[b]; if (acc >= n * p) return b / 64; } return 1; };
  const lo = pct(0.04), hi = Math.max(lo + 0.1, pct(0.97));
  for (let i = 0; i < n; i++) {
    let d = (dark[i] - lo) / (hi - lo);
    d = d < 0 ? 0 : d > 1 ? 1 : d;
    dark[i] = d * d * (3 - 2 * d);
  }

  // 3. Scatter dots: more where it is dark, never closer than a minimum gap.
  const rand = rng(seed);
  const cell = 6;
  const gw = Math.ceil(W / cell) + 1, gh = Math.ceil(H / cell) + 1;
  const grid = new Array(gw * gh);
  const pts = [];
  const target = Math.round((W * H / 13) * density);
  for (let t = 0, max = target * 7; t < max && pts.length < target; t++) {
    const x = rand() * W, y = rand() * H;
    const d = dark[Math.min(sh - 1, (y / H * sh) | 0) * sw + Math.min(sw - 1, (x / W * sw) | 0)];
    if (rand() > Math.pow(d, 1.5) * 0.98 + 0.006) continue;
    const gap = 1.9 + (1 - d) * 3.6;
    const cx = (x / cell) | 0, cy = (y / cell) | 0;
    let clear = true;
    for (let gy = Math.max(0, cy - 1); gy <= Math.min(gh - 1, cy + 1) && clear; gy++) {
      for (let gx = Math.max(0, cx - 1); gx <= Math.min(gw - 1, cx + 1) && clear; gx++) {
        const bucket = grid[gy * gw + gx];
        if (!bucket) continue;
        for (const p of bucket) {
          const dx = p[0] - x, dy = p[1] - y;
          if (dx * dx + dy * dy < gap * gap) { clear = false; break; }
        }
      }
    }
    if (!clear) continue;
    const p = [x, y, d];
    pts.push(p);
    (grid[cy * gw + cx] ||= []).push(p);
  }

  // 4. Ink.
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = ink;
  ctx.beginPath();
  for (const [x, y, d] of pts) {
    const r = 0.5 + d * 0.5 + (rand() - 0.5) * 0.15;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  return true;
}
