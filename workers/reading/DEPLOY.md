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

The first command downloads WikDict's English to Turkish StarDict (CC BY-SA 4.0) to a temporary folder and writes `workers/reading/dict.sql` (about 49,000 rows, 4.6 MB, ignored by git). Loading it writes about 49,000 rows, half of D1's free daily allowance of 100,000, so do it on its own day. Run both again only when you want a newer WikDict.

## 4. Set the secrets

| Secret | What it holds |
|---|---|
| `SYNC_USER` | The CrossPoint Sync username the reader signs in with. |
| `SYNC_KEY` | The lowercase MD5 hex of that account's password: what the reader itself sends as `x-auth-key`. Not the password. |
| `READING_TOKEN` | A random string of at least 32 characters. It opens the private routes (`today` with the word of the day, `cards.csv`, `sentences`, `review`, `sync`). Keep it in your password manager. |
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

## 7. Phone and watch

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
| Translations | 10 a run, 40 a day, counted as attempts in the `daily` table. Workers AI's free allowance is shared with the assistant; 40 short sentences use a small part of it. |
| CrossPoint Sync | Five small GETs per pull, every thirty minutes. The service documents rate limits only for registration and failed sign-ins. |
| D1 writes | An unchanged answer writes nothing but its fetch time; a changed one rewrites only the rows that changed. |
