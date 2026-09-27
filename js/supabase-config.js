// Public Supabase project settings.
//
// These are meant to be public — the anon key only ever lets someone do what
// the database's Row Level Security policies (see supabase/schema.sql) allow
// an anonymous or signed-in visitor to do. It is safe to commit this file.
//
// Never put the Supabase "service_role" / secret key here, or anywhere else
// in this project — that key bypasses Row Level Security entirely.
//
// Fill these in from your project: Supabase dashboard → Settings → API.
export const SUPABASE_URL = 'https://tskbdcohvcfokbafseqb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_ibMVSvfRMRLlo7dcJFGHyA_69CrbFzF';

// The one shared account everyone in the kitchen signs into (see the setup
// guide) — just its email, never its password. Not a secret: knowing this
// address doesn't let anyone in without the password too.
export const SHARED_LOGIN_EMAIL = 'kitchen@flat61.app';
