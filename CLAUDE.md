# busahin.com

Personal site of Burak Sahin Kucuk (statistics + computer engineering student at METU). Astro 5, static output, deployed to GitHub Pages behind Cloudflare. Live at https://busahin.com.

## Hard rules

- **No em dashes anywhere.** Rewrite with commas, colons, or periods.
- **No eyebrow text**: no uppercase, letter-spaced labels above headings.
- **Every English page has a Turkish mirror under `src/pages/tr/`.** Ship both together; the language switcher swaps `/` and `/tr` prefixes on the same path, so a missing mirror 404s.
- Copy is first-person and human. Nothing that reads like a template or AI ("Building digital experiences" energy is banned).

## Design identity

Editorial minimalism, Gates Notes leaning. **Newsreader** (variable serif, self-hosted from `public/fonts`) is the site-wide font for both body and headings: a free OFL newspaper serif built for on-screen reading. Body is weight 380 at text `opsz`; headings are weight 600 at display `opsz`. Inter stays loaded only for the blog reader's optional "sans" font toggle. Table-of-contents style lists with `01/02` counters, dotted leaders, and dashed row dividers instead of card grids. Article images bleed a step wider than the text column (`--media-bleed` in `blog-post.css`). Three themes (light / dark / paper) via `data-theme` on `<html>` and CSS custom properties in `src/styles/global.css`. One accent color per theme; never hardcode theme colors in components.

Shared building blocks: `ArchiveList.astro` (blog/projects/courses listings), `MiscPage.astro` + `MiscArchive.astro` (misc pages, data in `src/data/misc.ts`), `ContactPage.astro`.

## Content

`src/content/{blog,projects,courses}` with Zod schemas in `src/content.config.ts`. `draft: true` hides an entry from listings, slug pages, and RSS (all queries filter drafts; keep it that way). The old template placeholder posts are drafted, not deleted.

## Technical notes

- View transitions (`ClientRouter` in `BaseHead.astro`) are on: every component script must re-init via `document.addEventListener("astro:after-swap", ...)` and guard against double-init.
- No external CDNs: fonts and KaTeX CSS are local; a CSP `<meta>` in `BaseHead.astro` allowlists only Firebase, Spotify, YouTube, and Vimeo. If you add an external resource, update the CSP or it will be blocked silently.
- Firebase (views/likes/comments) must stay lazy: firestore at `requestIdleCallback`, auth only when the comment section becomes visible.
- `position: sticky` on the TOC depends on `overflow-x: clip` (not `hidden`) on html/body in `blog-post.css`.
- Verify changes with `npx astro build`; check both languages and all three themes.
