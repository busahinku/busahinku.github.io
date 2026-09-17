# busahin.com

Personal site of Burak Sahin Kucuk (statistics + computer engineering student at METU). Astro 5, static output, deployed to GitHub Pages behind Cloudflare. Live at https://busahin.com.

## Hard rules

- **No em dashes anywhere.** Rewrite with commas, colons, or periods.
- **No eyebrow text**: no uppercase, letter-spaced labels above headings.
- **Every English page has a Turkish mirror under `src/pages/tr/`.** Ship both together; the language switcher swaps `/` and `/tr` prefixes on the same path, so a missing mirror 404s.
- Copy is first-person and human. Nothing that reads like a template or AI ("Building digital experiences" energy is banned).

## Design identity

Editorial minimalism, Gates Notes leaning. **Merriweather** (variable serif, self-hosted from `public/fonts`) is the site-wide font for both body and headings: a sturdy newspaper serif designed for comfortable on-screen reading. Body is weight 380; headings 600. opsz axis: text on body, display on headings. Inter stays loaded only for the blog reader's optional "sans" font toggle. Table-of-contents style lists with `01/02` counters, dotted leaders, and dashed row dividers instead of card grids. Article images bleed a step wider than the text column (`--blog-media-width` in `blog-post.css`). Four themes (light / dark / paper / eink) via `data-theme` on `<html>` and CSS custom properties in `src/styles/global.css`. One accent color per theme; never hardcode theme colors in components.

Shared building blocks: `ArchiveList.astro` (blog/projects/courses listings), `MiscPage.astro` + `MiscArchive.astro` (misc pages, data in `src/data/misc.ts`), `ContactPage.astro`.

## Content

`src/content/{blog,projects,courses}` with Zod schemas in `src/content.config.ts`. `draft: true` hides an entry from listings, slug pages, and RSS (all queries filter drafts; keep it that way). The old template placeholder posts are drafted, not deleted.

## Technical notes

- View transitions (`ClientRouter` in `BaseHead.astro`) are on: every component script must re-init via `document.addEventListener("astro:after-swap", ...)` and guard against double-init.
- No external CDNs: fonts and KaTeX CSS are local; a CSP `<meta>` in `BaseHead.astro` allowlists only Firebase, Spotify, YouTube, and Vimeo. If you add an external resource, update the CSP or it will be blocked silently.
- Firebase (views/likes/comments) must stay lazy: firestore at `requestIdleCallback`, auth only when the comment section becomes visible.
- `position: sticky` on the TOC depends on `overflow-x: clip` (not `hidden`) on html/body in `blog-post.css`.
- The e-ink theme flattens every accent to black and kills motion, so colour must never be the only cue: anything meaningful needs a border, underline, icon, or label too. It is auto-selected for `(update: slow)` or `(monochrome)` displays, and that detection is duplicated in `BaseHead.astro` (pre-paint) and `ThemeToggle.astro` (init); change both together.
- Only an explicit theme pick is written to `localStorage`. Never persist the detected theme, or the site can no longer follow the system.
- Verify changes with `npx astro build`; check both languages and all four themes.
