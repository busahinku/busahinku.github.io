# Shelf: deploy and use

A private OPDS catalogue for the e-reader, at `https://busahin.com/api/shelf/opds`, and a page at `https://busahin.com/api/shelf/` to send an article by URL, upload an EPUB or delete one. Every route asks for HTTP Basic auth. Nothing on the public site links here.

## One-time setup

Run from the repository root. Wrangler is already logged in on this Mac.

1. Create the private bucket. Do not connect a custom domain or turn on r2.dev for it, and do not bind it to any other Worker: the shelf Worker is meant to be its only door.

   ```bash
   npx wrangler@4.146.0 r2 bucket create busahin-shelf
   ```

2. Set the two secrets. The Worker refuses to answer (503) until both exist and the password is at least 16 characters. A good password:

   ```bash
   openssl rand -base64 24
   ```

   ```bash
   npx wrangler@4.146.0 secret put SHELF_USER --config workers/shelf/wrangler.toml
   ```

   ```bash
   npx wrangler@4.146.0 secret put SHELF_PASSWORD --config workers/shelf/wrangler.toml
   ```

3. Deploy:

   ```bash
   npx wrangler@4.146.0 deploy --config workers/shelf/wrangler.toml
   ```

4. Check it. Without credentials the answer is an empty 401; with them, the catalogue:

   ```bash
   curl -si https://busahin.com/api/shelf/opds | head -5
   ```

   ```bash
   curl -s -u "$SHELF_USER:$SHELF_PASSWORD" https://busahin.com/api/shelf/opds
   ```

Secrets, by name: `SHELF_USER`, `SHELF_PASSWORD`. Nothing else. They live only in the Worker; never put them in the repo or the site.

Later deploys are step 3 alone. `node workers/shelf/check.mjs` runs the offline checks first.

## On the reader

Settings, OPDS servers, add a server:

- URL: `https://busahin.com/api/shelf/opds`
- Username and password: the two secrets.

The reader asks once without credentials, gets the empty 401, and from then on sends Basic auth with every request, downloads and covers included. The root lists "Everything, newest first", "Articles" and "Books"; each page holds 60 entries with a link to the next.

## Sending an article from the phone

The endpoint is `POST https://busahin.com/api/shelf/add` with Basic auth and a JSON body `{"url": "..."}`. It also accepts a form field `url`, or plain text with a link somewhere in it, so whatever a share sheet sends works. With `Accept: application/json` it answers `{"done": "added", "id": "...", "title": "..."}` or `{"error": "..."}`.

The `Authorization` header value is `Basic ` followed by the base64 of `user:password`:

```bash
printf '%s' "$SHELF_USER:$SHELF_PASSWORD" | base64
```

### iOS Shortcut

1. Shortcuts, new shortcut. In its details turn on "Show in Share Sheet" and let it receive URLs and Safari web pages.
2. Add "Get Contents of URL": URL `https://busahin.com/api/shelf/add`, Method `POST`, Headers `Authorization` = `Basic <the base64 above>` and `Accept` = `application/json`, Request Body `JSON` with a text field `url` set to Shortcut Input.
3. Add "Get Dictionary Value" for `title` from Contents of URL, then "Show Notification" with it. If the notification is empty, the page answered with an `error` instead; showing the whole dictionary says which.

### Android

With HTTP Shortcuts (open source, on F-Droid and Google Play): a new shortcut with method `POST`, URL `https://busahin.com/api/shelf/add`, Basic authentication with the two secrets, header `Accept: application/json`, and a JSON body `{"url": "{{shared}}"}`, where `shared` is a text variable set to receive its value from the share dialog. It then shows up in the share sheet.

### Bookmarklet

For a desktop browser. It opens the shelf page with the link already in the form, so nothing is added until you press Add:

```text
javascript:location.href='https://busahin.com/api/shelf/?url='+encodeURIComponent(location.href)
```

## What it costs, and why that is nothing

- Workers free plan: running out ends in an error, never a charge.
- R2 is the one product here with a bill behind its free allowance (10 GB stored, 1 million Class A and 10 million Class B operations a month, shared with `busahin-files`). The Worker keeps far below it: R2 is touched only after the password checks out, a Durable Object stops authenticated requests at 3,000 a day (at most three Class A operations each, about 280,000 a month), and new files are refused once the shelf holds 1,000 items or 2 GB.
- Wrong passwords: five a minute per visitor and twenty a minute site-wide, then 429. They never reach R2.
- Fetching articles: http and https on default ports, public addresses only (checked on the URL, on every redirect and on the DNS answers), 2 MB for the page, 300 KB per image (a cover and two pictures at most, JPEG or PNG), four redirects, ten seconds.
