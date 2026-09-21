# Sherbourne 8 · The Kitchen Notebook

A shared cookbook for a small group of friends. Static site, no build step:
plain HTML, CSS and ES modules, with hash routing so it can be hosted anywhere
(GitHub Pages, Netlify, Cloudflare Pages).

## Run it locally

```bash
python3 serve.py
```

Then open http://localhost:5173. (Any static file server works; ES modules
need `http://`, not `file://`.)

## Layout

```
index.html          page shell + header/footer
css/style.css       the whole visual system (tokens at the top)
js/app.js           hash router
js/store.js         data layer: the only file that knows where recipes live
js/seed.js          Stage 2 seed data (moves into the database in Stage 3)
js/ui.js            escaping html`` template, photo prints, stipple placeholder, amount scaling
js/views/*.js       home, collection, recipe, cook (cooking mode), misc
assets/photos/      food photographs (cropped from the original mockups)
assets/fonts/       DM Mono + Covered By Your Grace, self-hosted
```

## Status

Stage 2 (visual design): home, recipe spreads, collection index, cooking mode.
Recipes are read-only seed data. Add / edit, image upload, and shared storage
arrive in Stage 3 (Supabase).
