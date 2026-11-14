# Ultimate Gaming Championship 2026 – website

Static site (HTML/CSS/JS) + Supabase (Postgres, Auth, Row Level Security).

## Setup (about 10 minutes)

1. Create a free project at https://supabase.com.
2. **SQL Editor** → paste all of `supabase/schema.sql` → Run. This creates the tables, security rules, and adds players **23** (Yassin Hassan Ahmed) and **24** (Rodaina Hassan Ahmed).
3. **Authentication → Users → Add user**: create your admin email + a strong password.
4. Back in the SQL Editor run (with your admin email):
   `insert into public.admins (user_id) select id from auth.users where email = 'YOUR_ADMIN_EMAIL';`
5. **Project Settings → API**: copy the Project URL and the **anon** key into `config.js`. (Never use the service_role key.)
6. In **Authentication → Providers → Email**, turn **off** "Allow new users to sign up" so nobody else can create accounts.
7. Edit the contact email in `index.html` (search for `CHANGE-ME`).
8. Upload the folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Open `index.html` locally to test.

## How security works
- The `players` table has no public access. Visitors can only call `lookup_player(id)`, which returns one exact-match player – phone numbers cannot be listed or scraped in bulk.
- Only users in the `admins` table can add/edit/delete/import players.
- Player ID is the primary key, so duplicates are impossible. Phone numbers are stored as text (leading zeros kept).

Note: by design, anyone who knows a valid Player ID sees that player's phone number. Player IDs here are short numbers (23, 24), so they can be guessed. If this concerns you, use longer random IDs.

## CSV / Excel import
Header row: `player_id, name, age, club_id, phone`. In Excel, format the phone column as **Text** so leading zeros are kept.
