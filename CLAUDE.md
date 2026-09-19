# busahin.com

Personal site of Burak Sahin Kucuk (statistics + computer engineering student at METU). Astro 5, static output, deployed to GitHub Pages behind Cloudflare. Live at https://busahin.com.

## Hard rules

- **No em dashes anywhere.** Rewrite with commas, colons, or periods.
- **No eyebrow text**: no uppercase, letter-spaced labels above headings.
- **Every English page has a Turkish mirror under `src/pages/tr/`.** Ship both together; the language switcher swaps `/` and `/tr` prefixes on the same path, so a missing mirror 404s.
- Copy is first-person and human. Nothing that reads like a template or AI ("Building digital experiences" energy is banned).

## Design identity

Editorial minimalism, Gates Notes leaning. Two faces, two jobs, both self-hosted from `public/fonts` and exposed as `--font-serif` / `--font-display`:

- **Merriweather** (variable serif) sets anything you read: body at weight 380, headings at 600, opsz 18 on body and 72 on headings. It is subset to Latin + Turkish and shipped without its kerning table, which alone was 240KB of per-master deltas.
- **Rockwell** sets the name on the homepage and nothing else, via `--font-display`. Rockwell itself is Monotype's and is **never** bundled: it sits first in the stack so anyone who already has it installed (it ships with Microsoft Office) gets the real face, and **Rokkitt**, an OFL geometric slab, is self-hosted as the fallback for everyone else. Sentence case, never uppercase. Do not spread it to headings, labels or link rows; one display face on one line is the whole point.

The homepage is left aligned and opens on a full screen of its own: `.intro` is `min-height: 100svh` with its contents centred, so name, intro, links and `Signature.astro` are the whole first view and the lists start below the fold. `svh` rather than `vh` so a phone's collapsing address bar cannot clip it. No rule between the signature and the lists. The header sits at `opacity: 0.55` and comes to full strength on hover or focus, since the nav is not what anyone came to look at; touch and e-ink get it at full strength instead.

`Signature.astro` is deliberately static. It uses `public/signature.svg` as a CSS mask so the same black, transparent SVG follows every site theme without animation. Replacing that one file replaces the homepage signature in both languages; see `SIGNATURE.md` for the Android export workflow.

Inter stays loaded only for the blog reader's optional "sans" font toggle. Table-of-contents style lists with `01/02` counters, dotted leaders, and dashed row dividers are the default for blog and courses. Projects is the one exception: `ArchiveList` takes `variant="gallery"` there and leads with the cover, because a project is recognised by sight before it is read. Do not spread the gallery to the text listings.

**Cover artwork is 16:10, always.** Draw it at **1600 x 1000 px** and it is never cropped: the card locks `aspect-ratio: 16 / 10`, so artwork at that ratio fills the frame exactly and anything else gets centre-cropped by `object-fit: cover`. Both the grid and the list view use the same ratio, only the width changes. The gallery is two columns at every width including phones, and the description is clamped (three lines in the grid, two in the list) so cards sitting side by side end up the same height. Never clamp the title; a cut-off name is unreadable, a cut-off summary is just shorter. The grid/list switch writes to `localStorage` under `archive-view`, which is a per-browser convenience and the only thing in there besides the theme. Article images bleed a step wider than the text column (`--blog-media-width` in `blog-post.css`). Backgrounds are flat: one solid `--bg-primary` per theme, no gradients, spotlights or noise. Four themes (light / dark / paper / eink) via `data-theme` on `<html>` and CSS custom properties in `src/styles/global.css`. One accent color per theme; never hardcode theme colors in components. Every page title uses `--page-title`, the same size as the name on the homepage; do not set a one-off `font-size` on an `h1`.

`/photos` is the one page with no chrome: no visible heading, no intro, no captions under the pictures, just `PhotoWall.astro` at near-full width (`bleed` on `Layout`) with 0.5rem gutters. The `h1` is there but `sr-only`, for the document outline and screen readers. The wall is CSS multi-column, not a grid, so every photograph keeps the exact shape it was taken in and the columns flow around it; never give it a fixed `aspect-ratio` or `object-fit: cover`, that is the projects grid's job and the opposite of what this page is for. Captions and place/date live in `src/data/photos.ts` and surface only in the detail view.

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
- Speed comes from prefetch (`prefetchAll` + viewport strategy) plus client-side routing. The root view-transition animation is disabled because even a short cross-fade makes an already completed navigation feel slower; `scroll-behavior: smooth` is scoped to `html:focus-within` instead of being a global default. Do not reintroduce a global smooth scroll or a page cross-fade.
- The footer is stuck to the bottom by a flex column on `body` (`min-height: 100svh`) with `flex: 1 0 auto` on `main`. Never go back to guessing the chrome height with `min-height: calc(100vh - Npx)`; that is what left a gap under the footer.
- Verify changes with `npx astro build`; check both languages and all four themes.
