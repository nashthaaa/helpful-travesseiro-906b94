-- Flat 61 — initial schema and starter content.
-- Run once: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).

create table if not exists public.recipes (
  id text primary key,
  title text not null,
  contributor text not null,
  category text not null check (category in ('breakfast','lunch','dinner','dessert','snacks')),
  tagline text,
  servings int,
  quote text,
  note jsonb,                              -- { text, by }
  ingredients jsonb not null default '[]', -- [{ amount, unit, item, note }]
  steps jsonb not null default '[]',       -- ["...", ...]
  photo jsonb,                             -- { src, w, h, caption }
  photos jsonb not null default '[]',
  memories jsonb not null default '[]',
  sample boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.recipes enable row level security;

drop policy if exists "recipes are readable by anyone" on public.recipes;
create policy "recipes are readable by anyone"
  on public.recipes for select
  using (true);

drop policy if exists "signed-in friends can add recipes" on public.recipes;
create policy "signed-in friends can add recipes"
  on public.recipes for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "signed-in friends can edit any recipe" on public.recipes;
create policy "signed-in friends can edit any recipe"
  on public.recipes for update
  using (auth.role() = 'authenticated');

drop policy if exists "signed-in friends can delete any recipe" on public.recipes;
create policy "signed-in friends can delete any recipe"
  on public.recipes for delete
  using (auth.role() = 'authenticated');

-- Starter content: the one real recipe from the mockups, plus five sample
-- recipes to delete once real ones are added. The pasta's photos point at
-- files published with the site itself (assets/photos/...), not storage.
insert into public.recipes
  (id, title, contributor, category, tagline, servings, quote, note, ingredients, steps, photo, photos, memories, sample, created_at)
values
  ('shifaas-veggie-pasta', 'Shifaa''s Veggie Pasta', 'Shifaa', 'dinner', 'For weeknights, new roommates, and the last tomato in the fridge.', 2, 'The first thing we made in the new flat. It tasted like arriving.', '{"text": "The vegetables are only a suggestion. The point is to use what is almost going bad.", "by": "Shifaa"}'::jsonb, '[{"amount": 250, "unit": "g", "item": "fusilli or whatever is open"}, {"amount": 2, "unit": "handfuls", "item": "cherry tomatoes, halved"}, {"amount": 1, "unit": "", "item": "small courgette", "note": "sliced"}, {"amount": 2, "unit": "cloves", "item": "garlic, finely chopped"}, {"amount": 3, "unit": "tbsp", "item": "cream cheese or soft cheese"}, {"amount": null, "unit": "", "item": "lemon, parmesan, basil", "note": "to finish"}]'::jsonb, '["Put the pasta water on first. Salt it until it tastes like the sea, then cook the pasta just shy of done.", "Let the tomatoes and courgette catch some colour in olive oil. Add garlic only when the room smells good.", "Loosen the cheese with a splash of pasta water. Toss everything together until glossy.", "Finish with lemon, basil, and too much parmesan. Eat from the warm pan if you want."]'::jsonb, '{"src": "assets/photos/veggie-pasta-portrait.jpg", "w": 680, "h": 850, "alt": "A bowl of creamy fusilli with halved cherry tomatoes, courgette and basil, on a blue linen cloth", "caption": "best eaten at the table"}'::jsonb, '[{"src": "assets/photos/veggie-pasta-bowl.jpg", "w": 684, "h": 680, "alt": "The same bowl of pasta seen from above, with a glass of water and a small dish of parmesan beside it", "caption": "leave the spoon in"}]'::jsonb, '[{"src": "assets/photos/old-kitchen-2018.jpg", "w": 504, "h": 432, "alt": "Black and white photograph of three friends laughing around a kitchen table", "caption": "the old kitchen, 2018"}]'::jsonb, false, '2026-09-21T12:00:00Z'),
  ('sample-sunday-pancakes', 'Sunday Pancakes', 'Sample cook', 'breakfast', null, 4, null, null, '[{"amount": 200, "unit": "g", "item": "plain flour"}, {"amount": 2, "unit": "tsp", "item": "baking powder"}, {"amount": 1, "unit": "pinch", "item": "salt"}, {"amount": 300, "unit": "ml", "item": "milk"}, {"amount": 1, "unit": "", "item": "egg"}, {"amount": 2, "unit": "tbsp", "item": "butter, melted", "note": "plus more for the pan"}]'::jsonb, '["Whisk the flour, baking powder and salt together in a large bowl.", "Add the milk, egg and melted butter. Stir until just combined; a few lumps are fine.", "Cook spoonfuls in a hot, buttered pan until bubbles appear, then flip and cook until golden."]'::jsonb, null, '[]'::jsonb, '[]'::jsonb, true, '2026-09-21T11:50:00Z'),
  ('sample-tomato-soup', 'Tomato Soup', 'Sample cook', 'lunch', null, 4, null, null, '[{"amount": 1, "unit": "tbsp", "item": "olive oil"}, {"amount": 1, "unit": "", "item": "onion, chopped"}, {"amount": 2, "unit": "cloves", "item": "garlic, sliced"}, {"amount": 800, "unit": "g", "item": "tinned tomatoes"}, {"amount": 500, "unit": "ml", "item": "vegetable stock"}, {"amount": null, "unit": "", "item": "salt and pepper", "note": "to taste"}]'::jsonb, '["Soften the onion in the oil over a gentle heat, then add the garlic for a minute.", "Add the tomatoes and stock. Simmer for 20 minutes.", "Blend until smooth, season, and serve with something to dip."]'::jsonb, null, '[]'::jsonb, '[]'::jsonb, true, '2026-09-21T11:40:00Z'),
  ('sample-egg-fried-rice', 'Egg Fried Rice', 'Sample cook', 'dinner', null, 2, null, null, '[{"amount": 300, "unit": "g", "item": "cooked rice, cold"}, {"amount": 2, "unit": "", "item": "eggs"}, {"amount": 2, "unit": "", "item": "spring onions, sliced"}, {"amount": 1, "unit": "tbsp", "item": "soy sauce"}, {"amount": 1, "unit": "tbsp", "item": "neutral oil"}]'::jsonb, '["Heat the oil in a wide pan until it shimmers. Scramble the eggs quickly and push them aside.", "Add the rice and press it into the pan so it crisps in places.", "Stir in the soy sauce and spring onions, and serve straight away."]'::jsonb, null, '[]'::jsonb, '[]'::jsonb, true, '2026-09-21T11:30:00Z'),
  ('sample-lemon-loaf', 'Lemon Loaf', 'Sample cook', 'dessert', null, 8, null, null, '[{"amount": 200, "unit": "g", "item": "self-raising flour"}, {"amount": 150, "unit": "g", "item": "caster sugar"}, {"amount": 100, "unit": "g", "item": "butter, softened"}, {"amount": 3, "unit": "", "item": "eggs"}, {"amount": 2, "unit": "", "item": "lemons", "note": "zest and juice"}]'::jsonb, '["Beat the butter and sugar until pale, then beat in the eggs one at a time.", "Fold in the flour and lemon zest, then spoon into a lined loaf tin.", "Bake at 170\u00b0C for about 45 minutes. Pour the lemon juice over while it is still warm."]'::jsonb, null, '[]'::jsonb, '[]'::jsonb, true, '2026-09-21T11:20:00Z'),
  ('sample-crispy-chickpeas', 'Crispy Chickpeas', 'Sample cook', 'snacks', null, 2, null, null, '[{"amount": 1, "unit": "tin", "item": "chickpeas, drained and dried"}, {"amount": 1, "unit": "tbsp", "item": "olive oil"}, {"amount": 1, "unit": "tsp", "item": "smoked paprika"}, {"amount": null, "unit": "", "item": "salt", "note": "to taste"}]'::jsonb, '["Toss the chickpeas with the oil, paprika and salt.", "Roast at 200\u00b0C for 25 to 30 minutes, shaking the tray halfway."]'::jsonb, null, '[]'::jsonb, '[]'::jsonb, true, '2026-09-21T11:10:00Z')
on conflict (id) do nothing;

-- Photo storage: a public bucket so <img src> works with no extra lookups;
-- only signed-in friends may upload, replace or delete.
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

drop policy if exists "recipe photos are readable by anyone" on storage.objects;
create policy "recipe photos are readable by anyone"
  on storage.objects for select
  using (bucket_id = 'recipe-photos');

drop policy if exists "signed-in friends can upload recipe photos" on storage.objects;
create policy "signed-in friends can upload recipe photos"
  on storage.objects for insert
  with check (bucket_id = 'recipe-photos' and auth.role() = 'authenticated');

drop policy if exists "signed-in friends can replace recipe photos" on storage.objects;
create policy "signed-in friends can replace recipe photos"
  on storage.objects for update
  using (bucket_id = 'recipe-photos' and auth.role() = 'authenticated');

drop policy if exists "signed-in friends can delete recipe photos" on storage.objects;
create policy "signed-in friends can delete recipe photos"
  on storage.objects for delete
  using (bucket_id = 'recipe-photos' and auth.role() = 'authenticated');

-- Small shared, site-wide bits of handwriting — right now just the line
-- under "Our Kitchen" on the homepage.
create table if not exists public.settings (
  key text primary key,
  value text not null
);

alter table public.settings enable row level security;

drop policy if exists "settings are readable by anyone" on public.settings;
create policy "settings are readable by anyone"
  on public.settings for select
  using (true);

drop policy if exists "signed-in friends can change settings" on public.settings;
create policy "signed-in friends can change settings"
  on public.settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into public.settings (key, value) values
  ('heroHand', 'cook something. write it down. pass it on.')
on conflict (key) do nothing;
