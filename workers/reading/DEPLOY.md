# Deploying the reading Worker

Everything below runs from the repository root, on the Mac where wrangler is already logged in. Nothing here costs money: the account is on Workers Free, so D1, Workers AI and cron run out in an error, never a charge.

## On the reader first

CrossPoint 2.0.0, Settings → Connectivity → CrossPoint Sync, signed in to the hosted service:

- **Send Document Metadata** on, or every book shows up under its file name.
- **Sync Clippings** on, or there is no vocabulary.

Then open a book and press Sync once, so the service has something to return.

## 1. Create the database

```bash
npx wrangler@4.146.0 d1 create busahin-reading
```

Copy the `database_id` it prints into `workers/reading/wrangler.toml`, replacing `REPLACE-WITH-THE-ID-FROM-D1-CREATE`, and commit that change.

## 2. Apply the schema

```bash
npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/schema.sql --config workers/reading/wrangler.toml
```

## 3. Load the dictionary

```bash
node scripts/reading-dict.mjs
```

```bash
npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/dict.sql --config workers/reading/wrangler.toml
```

The first command downloads WikDict's English to Turkish StarDict (CC BY-SA 4.0) to a temporary folder and writes `workers/reading/dict.sql` (about 49,000 rows, 4.6 MB, ignored by git). The first load writes about 49,000 rows, half of D1's free daily allowance of 100,000, so do it on its own day. A reload later costs about twice that (the file deletes every row, then inserts them again, close to the whole day's 100,000), so only reload when you want a newer WikDict, and on a day with nothing else to write.

## 3b. Load the example sentences (another day)

```bash
node scripts/reading-examples.mjs
```

```bash
npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/examples.sql --config workers/reading/wrangler.toml
```

The script downloads three Tatoeba exports (English sentences, Turkish sentences and the links between them, about 38 MB, CC BY 2.0 FR) to a temporary folder and needs `dict.sql` from step 3. It keeps up to three short, clean sentences with their Turkish for each dictionary word, capped at 40,000 rows, so loading them fits in one day's free D1 writes; do it on a different day from the dictionary. `examples.sql` (4.5 MB) is ignored by git.

**Upgrading a database made from the first version** (before manual words, examples and recordings): apply `workers/reading/upgrades/0002-private-words.sql` once, then `schema.sql` again, as its first lines say. A new database needs neither.

## 4. Set the secrets

| Secret | What it holds |
|---|---|
| `SYNC_USER` | The CrossPoint Sync username the reader signs in with. |
| `SYNC_KEY` | The lowercase MD5 hex of that account's password: what the reader itself sends as `x-auth-key`. Not the password. |
| `READING_TOKEN` | A random string of at least 32 characters. It opens the private page (`/api/reading/app`, where you type it once and a cookie remembers it for a year on that browser) and the private routes (`today` with the word of the day, `cards`, `words`, `audio`, `cards.csv`, `sentences`, `review`, `sync`). Keep it in your password manager. |
| `NTFY_TOPIC` | The ntfy topic the morning notification goes to. Anyone who knows the name can read it, so make it unguessable. |

Each command reads the value from the terminal, so it never lands in shell history:

```bash
npx wrangler@4.146.0 secret put SYNC_USER --config workers/reading/wrangler.toml
```

```bash
read -rs P && printf %s "$P" | md5 | npx wrangler@4.146.0 secret put SYNC_KEY --config workers/reading/wrangler.toml; unset P
```

```bash
openssl rand -hex 32 | tee /dev/tty | npx wrangler@4.146.0 secret put READING_TOKEN --config workers/reading/wrangler.toml
```

```bash
printf 'reading-%s' "$(openssl rand -hex 12)" | tee /dev/tty | npx wrangler@4.146.0 secret put NTFY_TOPIC --config workers/reading/wrangler.toml
```

The last two print the value once so you can save it.

## 5. Deploy

Deploy the Worker **before** merging the site change that adds `/reading/`. Until the Worker is live, `busahin.com/api/reading/summary` falls through to the assistant Worker, which answers 403, so the page (linked from Misc) would show its failure state.

```bash
npx wrangler@4.146.0 deploy --config workers/reading/wrangler.toml
```

It takes `busahin.com/api/reading*`, which is more specific than the assistant's `busahin.com/api/*`, so it wins for those paths. It adds two cron triggers; Workers Free allows five per account.

## 6. Check it

Pull once now instead of waiting up to thirty minutes (`TOKEN` is the `READING_TOKEN`):

```bash
curl -s -X POST -H "authorization: Bearer $TOKEN" https://busahin.com/api/reading/sync
```

It answers with what changed, for example `{"changed":["progress","activity","overview","clippings"],"books":3,"days":12,"clippings":9,"translated":2}`. A `503` means CrossPoint Sync refused or failed; `npx wrangler@4.146.0 tail --config workers/reading/wrangler.toml` shows why (`HTTP 401` is a wrong `SYNC_USER` or `SYNC_KEY`).

```bash
curl -s https://busahin.com/api/reading/summary
```

```bash
curl -s https://busahin.com/api/reading/today
```

That one is the day and the streak only. With the token it also carries the word of the day (word, IPA, Turkish, definition) and the card counts, which is what a phone widget would read:

```bash
curl -s -H "authorization: Bearer $TOKEN" https://busahin.com/api/reading/today
```

```bash
curl -s -H "authorization: Bearer $TOKEN" -o reading-cards.csv https://busahin.com/api/reading/cards.csv
```

Then open https://busahin.com/reading/ and https://busahin.com/tr/reading/. Public answers are cached at the edge for five minutes.

## 7. Book titles on the public page

The public page shows a book only under a real title: its own metadata title, or one you set. A book synced without metadata is never shown under its file name. Titles containing any of `HIDE_TITLES` (in `wrangler.toml`) stay off the page. To see every book and what the page shows for it, and to hide one or give it a title:

```bash
curl -s -H "authorization: Bearer $TOKEN" https://busahin.com/api/reading/books
```

```bash
curl -s -X POST -H "authorization: Bearer $TOKEN" -H "content-type: application/json" -d '{"document":"<hash>","hidden":true}' https://busahin.com/api/reading/books
```

```bash
curl -s -X POST -H "authorization: Bearer $TOKEN" -H "content-type: application/json" -d '{"document":"<hash>","title":"Klara and the Sun"}' https://busahin.com/api/reading/books
```

`"title": null` goes back to the book's own title, `"hidden": false` shows it again. The public page changes at once (its stored answer is rebuilt), give or take the five-minute edge cache.

## 8. The private words page

Open https://busahin.com/api/reading/app on the phone, type the token, and add it to the home screen. Each card shows the word, its pronunciation (a human recording from Wikimedia Commons when one exists, otherwise the phone's own voice), the Turkish meaning, a definition, the sentence it was clipped from with its Turkish, and up to three Tatoeba examples. Again and Good review it; words you add by hand can be edited and deleted there. The page is served by the Worker, never by the static site, so nothing about it is public.

Recordings are copied once into the `busahin-files` bucket under `reading/audio/` with random names and served by the files Worker at files.busahin.com; at most 100 new ones a day. The Worker identifies itself to Wikimedia as `busahin-reading/1 (https://busahin.com/)`, as Wikimedia's API policy asks.

## 9. Phone and watch

Install the ntfy app, add a subscription on the default server (ntfy.sh) with the `NTFY_TOPIC` name, and allow its notifications on the watch in the Galaxy Wearable app. The first one arrives at 08:00 Istanbul time.

## Using it

- **Anki:** File → Import the CSV. The header lines set the separator and columns; the word is the first field, so importing a newer export updates cards instead of duplicating them.
- **A review** from anywhere that can send a request:

  ```bash
  curl -s -X POST -H "authorization: Bearer $TOKEN" -H "content-type: application/json" -d '{"term":"ubiquitous","grade":"good"}' https://busahin.com/api/reading/review
  ```

  `good` moves the card up a Leitner box (1, 2, 4, 8, 16 days), `again` sends it back to box 1.
- **Sentences with translations:** `GET /api/reading/sentences` with the same header.

## Limits it lives within

| What | Where it stops |
|---|---|
| Requests | 30 a minute per visitor and 300 for the site (rate-limit bindings), on every route. |
| Translations | 10 a run, 40 a day, counted as attempts in the `daily` table. A sentence the model fails on is tried at most five times and goes to the back after each try, so it never holds up the rest. Workers AI's free allowance is shared with the assistant; 40 short sentences use a small part of it. |
| CrossPoint Sync | Five small GETs per pull, every thirty minutes. The service documents rate limits only for registration and failed sign-ins. |
| D1 writes | An unchanged answer writes nothing but its fetch time; a changed one rewrites only the rows that changed. The public summary is one stored row, rewritten each pull. |
| D1 reads | A public request reads one row (the stored summary). Private routes find a card's clipping through partial indexes, so they read a few rows per card, not every clipping. |
| Bad answers | A 200 answer without the documented lists is refused before anything is written, and no delete runs against an empty list. |
| Recordings | 100 Wikimedia lookups a day (three small GETs each) and at most one R2 write each; a word with no recording is asked about again after 30 days. Five per pull are fetched ahead for new words. At a few KB each, a year of new words stays far inside R2's free 10 GB and million writes a month. |
| Examples | 40,000 rows, loaded once. |
