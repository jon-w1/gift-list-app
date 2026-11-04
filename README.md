# Gift Lists

Family wishlists, gift suggestions and private gift ideas — without spoiling the surprise.
Built web-first (works fully in any phone or desktop browser, installable to the home screen),
and structured so a thin Expo app-store shell can wrap it later.

## What it does

| List | Who adds | Who sees it |
|---|---|---|
| **Wishlist** | The person (or their manager, for kids) | Everyone paired with them |
| **Suggestions** ("Mom would love this") | Anyone paired with the person | Everyone paired **except the person** |
| **My ideas** | You | **Only you** |

- **Claiming:** "I'll get this" on any wishlist item or suggestion. Everyone except the recipient sees who claimed it. Mark it bought from your **Shopping list**.
- **Pairing:** look someone up by email (instant; if they don't have an account yet, you're paired automatically when they sign up), or share your invite link.
- **People without accounts:** add kids/grandparents you manage. Everyone paired with you can see and shop their lists.
- **Items:** name, a free-form details box (size, color, notes), optional photo, optional link. Pasting a link fills in the name and picture.
- **Sign-in:** email + 6-digit code. No passwords.

The privacy rules are enforced **in the database** (Postgres row-level security), not just hidden in the UI — see `supabase/migrations/0001_init.sql` and the tests in `tests/db/`.

## Costs

Everything below runs on free tiers for a family-sized app: **Vercel Hobby**, **Supabase Free**, **Resend Free** (3,000 emails/month). A daily keep-alive (`vercel.json` → `/api/keepalive`) stops Supabase from pausing the project between holidays.

---

## One-time setup (all in the browser, ~30 minutes)

### 1. Supabase (database, sign-in, photos)

1. Create a free account at [supabase.com](https://supabase.com) → **New project**. Pick a region near you (e.g. *Central US*). Save the database password somewhere safe.
2. Create the database. **Either** (recommended) **Project Settings → Integrations → GitHub** → connect this repo with **Deploy to production** on, production branch `main`, Supabase directory `.` — every push to `main` then applies new files in `supabase/migrations/` automatically (watch the Supabase check on the commit in GitHub). **Or** by hand: **SQL Editor → New query** → paste `supabase/migrations/0001_init.sql` → **Run**, then the same for `0002_storage.sql`. Don't do both — hand-run SQL isn't recorded, so the integration would try to run it again.
3. Check: **Table Editor** lists six tables and **Storage** has an `item-photos` bucket.
4. **Authentication → Sign In / Providers → Email**: make sure Email is enabled. Leave "Confirm email" on.
5. **Authentication → Email Templates**: edit **both** "Confirm signup" and "Magic Link" so they send a code instead of a link. Subject: `Your Gift Lists code`, body:
   ```html
   <h2>Your Gift Lists code</h2>
   <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
   <p>Enter this code in Gift Lists to sign in. It expires in an hour.</p>
   ```
6. **Authentication → URL Configuration**: set **Site URL** to your Vercel address (after step 3), e.g. `https://gift-lists.vercel.app`.
7. **Project Settings → API**: copy the **Project URL** and the **anon / public** key for step 3.

### 2. Resend (sends the sign-in codes)

Supabase's built-in email only delivers to your own team's addresses, so family needs a real sender.

1. Create a free account at [resend.com](https://resend.com). Add and verify a domain you own (a few DNS records), or use a subdomain like `mail.yourdomain.com`.
2. **API Keys → Create** (sending access).
3. In Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password = your Resend API key
   - Sender email `gifts@yourdomain.com`, Sender name `Gift Lists`
4. **Authentication → Rate Limits**: raise "emails sent per hour" to something like 30.

### 3. Vercel (hosting)

1. Sign in at [vercel.com](https://vercel.com) with GitHub → **Add New → Project** → import this repo.
2. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
3. **Deploy.** Every change pushed to GitHub redeploys automatically.
4. Optional: **Settings → Domains** to use your own domain (then update the Supabase Site URL).

### 4. Invite the family

Sign in, pick your name, then **Family → + Add** to pair by email or share your invite link. Each person can tap **Add Gift Lists to your home screen** for app-like install instructions.

---

## Database changes

Schema changes are new numbered files in `supabase/migrations/` (`0003_….sql`, …), applied in order by the Supabase GitHub integration when pushed to `main`. **Never edit a migration that has already been applied** — add a new one instead. Keep them safe to apply to a database that already has family data in it.

## Day-to-day admin (no code)

- **See or fix data:** Supabase → **Table Editor** (`people`, `items`, `claims`, `connections`). Note: the table editor shows everything, including claims and suggestions — avoid peeking at your own list there!
- **Sign-in problems:** Supabase → **Authentication → Users** (and Resend → **Logs** for email delivery).
- **Changes to the app:** ask Claude to make them; they're pushed to GitHub and Vercel redeploys.

## Future app-store shell (optional)

The site already follows the rules a thin Expo WebView wrapper needs:

- Code-based sign-in (no magic links or Google OAuth, which break inside WebViews); long-lived cookie sessions.
- Every screen has a real URL (`/p/…`, `/invite/…`) for deep links / universal links.
- Safe-area insets, in-app back buttons, external links open in a new tab.
- Native extras are opt-in via `src/lib/native.ts` (`isNativeShell()`, `postToShell()`); nothing depends on them.
- `/api/unfurl?url=` is a stable endpoint a share-sheet extension can call ("Share → Gift Lists").
- Account deletion is built in (Settings → Delete my account), which Apple requires.

## Development

```bash
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm install
npm run dev
```

### Privacy tests

Requires a local Postgres 15+:

```bash
createdb gifttest
psql -d gifttest -f tests/db/supabase_stub.sql -f supabase/migrations/0001_init.sql
psql -d gifttest -f tests/db/privacy_test.sql   # ends with "ALL PRIVACY TESTS PASSED"
```

## Structure

```
supabase/migrations/   database schema, privacy rules (RLS), RPCs, storage bucket
tests/db/              privacy test suite (local Postgres only)
src/app/               pages (App Router) + server actions (actions.ts)
src/app/api/unfurl     link → name/picture lookup (SSRF-safe)
src/app/api/keepalive  daily ping so free Supabase never pauses
src/components/        UI pieces (ItemCard, ItemForm, Header…)
src/lib/               Supabase clients, native-shell bridge, photo helpers
```
