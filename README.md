# Sherbourne 8 · The Kitchen Notebook

A shared cookbook for a small group of friends. Static site, no build step:
plain HTML, CSS and ES modules, with hash routing so it can be hosted anywhere
(GitHub Pages, Netlify, Cloudflare Pages). Data and photos live in Supabase.

## Run it locally

```bash
python3 serve.py
```

Then open http://localhost:5173. (A plain `python3 -m http.server` also
works, but `serve.py` disables caching so edits show up on a normal refresh.
ES modules need `http://`, not `file://`.)

## One-time setup (Supabase)

The site won't do anything until it's connected to a Supabase project:

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste in the whole of
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**. This creates the
   `recipes` and `settings` tables, their access rules, the photo storage
   bucket, and the starter content (the real recipe plus five samples).
3. **Authentication → Sign In / Providers → Email** → turn off "Allow new
   users to sign up" (only the one shared account below should be able to
   sign in).
4. **Authentication → Users → Add user** → create one account for the whole
   kitchen (any email, tick "Auto Confirm User") and set a password. Share
   that password with everyone in the kitchen however you like — it's the
   only credential anyone needs, and sessions persist per device.
5. **Authentication → URL Configuration → Redirect URLs** → add the URL(s)
   the site is served from (`http://localhost:5173/` for local dev).
6. **Settings → API** → copy the **Project URL** and **anon public** key
   into [`js/supabase-config.js`](js/supabase-config.js), along with the
   email from step 4 as `SHARED_LOGIN_EMAIL`.

That file is safe to commit — the anon key only grants what the database's
Row Level Security policies (in `schema.sql`) allow. Never put the
`service_role` key there or anywhere else in this project.

## Layout

```
index.html            page shell + header/footer
css/style.css         the whole visual system (tokens at the top)
js/app.js             hash router; also boots auth and re-renders on sign-in/out
js/store.js           data layer — the only file that reads/writes recipes
js/imagestore.js      photo uploads (downscales, then stores in Supabase Storage)
js/auth.js            the shared sign-in (Supabase Auth, one account for everyone)
js/auth-ui.js         sign-in panel + header widget
js/edit.js            "Edit handwriting" — quick inline edits to quotes/notes/captions
js/collage.js         the homepage's dotted-photo collage
js/stipple.js         turns a photo into blue-pen stippling, live, on <canvas>
js/ui.js              escaping html`` template, photo prints, amount scaling
js/views/*.js         home, collection, recipe, cook, editor (add/edit), misc
supabase/schema.sql   one-time DB setup: tables, RLS policies, starter content
js/seed.js            historical only — the source schema.sql's starter rows came from
assets/photos/        the original mockup photographs
assets/fonts/         DM Mono + Covered By Your Grace, self-hosted
```

## Status

Design (home, recipe spreads, collection index, cooking mode) and the full
recipe editor (every field, photo upload/replace/remove, delete) are done.
Backend wiring to Supabase is done in code; it's live once the one-time setup
above is complete — until then the site shows a clear "not connected yet"
message instead of the recipes.
