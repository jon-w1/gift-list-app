# Gift List App

Wishlists, gift suggestions and private gift ideas for family & friends — without spoiling the surprise.
Built web-first (works fully in any phone or desktop browser, installable to the home screen),
and structured so a thin Expo app-store shell can wrap it later.

## What it does

| List | Who adds | Who sees it |
|---|---|---|
| **Wishlist** | The person (or their manager, for kids) | Everyone paired with them |
| **Suggestions** ("Mom would love this") | Anyone paired with the person | Everyone paired **except the person** |
| **Your notepad for <name>** (private ideas) | You | **Only you** |

- **Bought:** "Mark bought" on any wishlist item, suggestion or private idea. Everyone except the recipient sees who bought it, so nobody doubles up.
- **Layout:** home is your own wishlist; the **Family & Friends** tab lists everyone you're paired with. A person's page shows their wishlist with family suggestions stacked underneath, plus a private **Your notepad for <name>** tab.
- **Pairing:** **Find or invite by email.** If they have an account you're paired instantly; if not, they're emailed an invite link and you're paired straight away.
- **People without accounts:** add kids/grandparents you manage. Everyone paired with you can see and shop their lists.
- **Items:** name, a free-form details box (size, color, notes), optional photo, optional link. Pasting a link fills in the name and picture.
- **Sign-in:** email + 6-digit code. No passwords.

The privacy rules are enforced **in the database** (Postgres row-level security), not just hidden in the UI — see `supabase/migrations/0001_init.sql` and the tests in `tests/db/`.

## Costs

Everything below runs on free tiers for a family-sized app: **Vercel Hobby**, **Supabase Free**, Gmail as the sender (about 500 emails/day). A daily keep-alive (`vercel.json` → `/api/keepalive`) stops Supabase from pausing the project between holidays.

---

## One-time setup (all in the browser, ~30 minutes)

### 1. Supabase (database, sign-in, photos)

1. Create a free account at [supabase.com](https://supabase.com) → **New project**. Pick a region near you (e.g. *Central US*). Save the database password somewhere safe.
2. Create the database. **Either** (recommended) **Project Settings → Integrations → GitHub** → connect this repo with **Deploy to production** on, production branch `main`, Supabase directory `.` — every push to `main` then applies new files in `supabase/migrations/` automatically (watch the Supabase check on the commit in GitHub). **Or** by hand: **SQL Editor → New query** → paste `supabase/migrations/0001_init.sql` → **Run**, then the same for `0002_storage.sql`. Don't do both — hand-run SQL isn't recorded, so the integration would try to run it again.
3. Check: **Table Editor** lists six tables and **Storage** has an `item-photos` bucket.
4. **Authentication → Sign In / Providers → Email**: make sure Email is enabled and set **Email OTP length** to `6`.
5. **Project Settings → API Keys** (or the **Connect** button): copy the **Project URL** and the **publishable** key (or the legacy **anon** key) for Vercel. Never use the secret / service_role key.

Email templates and the Site URL come later: templates can only be edited once custom SMTP (step 2) is on, and the Site URL needs the Vercel address (step 3).

### 2. Email sender (sends the sign-in codes)

Supabase's built-in email only delivers to your own team's addresses, and its default emails contain a link, not a code — so the app needs custom SMTP plus edited templates before anyone can sign in.

**Gmail (free, no domain needed — what we use):**
1. Create a Gmail account for the app (e.g. `giftlistapp26@gmail.com`), turn on **2-Step Verification**, then create an **App password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
2. Supabase → **Authentication → Emails → Set up SMTP** → enable custom SMTP:
   - Host `smtp.gmail.com`, Port `465`, Username = the Gmail address, Password = the app password
   - Sender email = the same Gmail address, Sender name `Gift List App`
3. **Authentication → Rate Limits**: raise "emails sent per hour" to about 30.

*Alternative if you own a domain:* [Resend](https://resend.com) — verify the domain, create an API key, and use Host `smtp.resend.com`, Port `465`, Username `resend`, Password = API key, Sender `gifts@yourdomain.com`. Switching sender later is only a Supabase SMTP settings change.

**Then edit the templates.** **Authentication → Emails → Templates**: edit **both** "Confirm sign up" and "Magic link or OTP" (paste into the **Source** tab, then **Save changes**). Subject: `Your Gift List App code`, body:
   ```html
   <h2>Your Gift List App code</h2>
   <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
   <p>Enter this code in Gift List App to sign in. It expires in an hour.</p>
   ```
**Invite email.** Also edit the **Invite user** template (used when someone invites a person who has no account yet). Subject: `{{ .Data.inviter_name }} invited you to Gift List App`, body:
   ```html
   <h2>{{ .Data.inviter_name }} invited you to Gift List App</h2>
   <p>Wishlists and gift ideas for family &amp; friends, without spoiling surprises.</p>
   <p><a href="{{ .Data.invite_url }}">Open Gift List App</a></p>
   <p>Sign in with this email address. You'll get a 6-digit code, no password needed.</p>
   ```

If emails still arrive with a "Sign in" link instead of a code, Supabase isn't using the saved template yet — change the subject (e.g. add "TEST"), save again, send a new code, then set it back. The app has no page for those links, so tapping them just returns to the login screen.

### 3. Vercel (hosting)

1. Sign in at [vercel.com](https://vercel.com) with GitHub → **Add New → Project** → import this repo. **Skip** the "Supabase — Add" integration card: it creates a *new* Supabase project instead of using yours.
2. Under **Settings → Environment Variables** add (all environments):
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase publishable (or anon) key
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase **secret** (service_role) key, used only on the server to email invites. Optional: without it, inviting by email still saves the pairing and offers a shareable invite link instead. Never give it a `NEXT_PUBLIC_` prefix.
3. **Deploy** (or **Redeploy** after changing variables). Every change pushed to GitHub redeploys automatically.
4. Back in Supabase → **Authentication → URL Configuration**: set **Site URL** to the Vercel address (e.g. `https://gift-list-app-9oiq.vercel.app`).
5. Optional: **Settings → Domains** to rename the address or use your own domain (then update the Supabase Site URL).

### 4. Invite family & friends

Sign in, pick your name, then **Family & Friends → + Add** to find or invite people by email. Each person can tap **Install App** (top right of My wishlist) for home-screen install instructions.

---

## Database changes

Schema changes are new numbered files in `supabase/migrations/` (`0003_….sql`, …), applied in order by the Supabase GitHub integration when pushed to `main`. **Never edit a migration that has already been applied** — add a new one instead. Keep them safe to apply to a database that already has family data in it.

## Day-to-day admin (no code)

- **See or fix data:** Supabase → **Table Editor** (`people`, `items`, `claims`, `connections`). Note: the table editor shows everything, including claims and suggestions — avoid peeking at your own list there!
- **Sign-in problems:** Supabase → **Authentication → Users** and **Authentication → Logs** for email delivery (the sending Gmail account's Sent folder shows every code email).
- **Changes to the app:** ask Claude to make them; they're pushed to GitHub and Vercel redeploys.

## Future app-store shell (optional)

The site already follows the rules a thin Expo WebView wrapper needs:

- Code-based sign-in (no magic links or Google OAuth, which break inside WebViews); long-lived cookie sessions.
- Every screen has a real URL (`/p/…`, `/invite/…`) for deep links / universal links.
- Safe-area insets, in-app back buttons, external links open in a new tab.
- Native extras are opt-in via `src/lib/native.ts` (`isNativeShell()`, `postToShell()`); nothing depends on them.
- `/api/unfurl?url=` is a stable endpoint a share-sheet extension can call ("Share → Gift List App").
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
