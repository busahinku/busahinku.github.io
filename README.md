# busahin.com

Personal site of Burak Sahin Kucuk: a working notebook of statistics reports, course notes, and side projects. Statistics + Computer Engineering student at METU, Ankara.

Live at [busahin.com](https://busahin.com), in English and Turkish (`/tr/`).

## Stack

- [Astro 5](https://astro.build) (static output) with MDX, KaTeX, and Shiki
- Vanilla CSS with custom properties; three themes (light / dark / paper)
- Melodrama + Inter, self-hosted
- Firebase (Firestore) for view counts, likes, and comments; loaded lazily
- GitHub Pages behind Cloudflare

## Development

```sh
npm install
npm run dev       # dev server at localhost:4321
npm run build     # static build into dist/
npm run preview   # serve the built site
```

Firebase credentials go in `.env` (see `.env.example`). The site builds and runs without them; the engagement widgets just stay idle.

## Content

Content lives in `src/content/{blog,projects,courses}` as Markdown/MDX with frontmatter. Set `draft: true` to keep an entry out of every listing, feed, and generated page. Every English page has a Turkish mirror under `src/pages/tr/`.

## Design notes

The identity is editorial minimalism: table-of-contents style lists with dotted leaders, numbered rows, dashed dividers, and as little chrome as possible. House rules: no em dashes, no uppercase eyebrow labels, and both languages ship together.
