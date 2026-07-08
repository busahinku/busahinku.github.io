# Content guide for busahin.com

This file describes everything the site can render in a blog, project, or course
entry. It exists so you can hand it to an AI along with a source document (a PDF,
a Word file, a draft) and say: *"Adapt this into a Markdown post for my site using
only what this guide supports."* If a feature is not listed here, it is not
supported. Do not invent components or syntax.

The site is built with Astro and MDX. Posts are `.mdx` files under
`src/content/{blog,projects,courses}/`. The file name becomes the URL slug:
`src/content/blog/my-post.mdx` serves at `/blog/my-post/`.

---

## 1. Hard writing rules

These are non-negotiable and apply to every piece of copy:

- **No em dashes.** Rewrite with commas, colons, or periods. This includes `—`
  anywhere in the text.
- **No eyebrow text.** Do not put uppercase, letter-spaced labels above headings.
- **First person and human.** Write like a person, not a template or a marketing
  page. Avoid filler like "In today's fast-paced world" or "Building digital
  experiences."
- The site has three themes (light, dark, paper). You never style for a theme;
  colors come from the design system automatically.

---

## 2. Frontmatter

Every file starts with a YAML frontmatter block between `---` fences. Fields
differ slightly per collection.

### Blog (`src/content/blog/`)

```yaml
---
title: The post title
description: One or two sentences. Shows in listings and as the meta description.
pubDate: Jan 25 2025          # required; also accepts 2025-01-25
updatedDate: Feb 02 2025      # optional
heroImage: ../../assets/my-post/cover.jpg   # optional; relative path to an asset
tags:                          # optional; list of short strings
  - statistics
  - r
category: tutorial             # one of the allowed values below; defaults to other
author: Burak Sahin Kucuk      # optional; this is the default
featured: false                # optional; true pins it as featured
draft: false                   # true hides it from the whole site
---
```

Blog `category` must be one of: `technology`, `tutorial`, `personal`, `design`,
`programming`, `philosophy`, `other`.

### Projects (`src/content/projects/`)

Same as blog, plus these optional project fields:

```yaml
github: https://github.com/user/repo   # optional URL
demo: https://example.com               # optional URL
status: completed                       # active | completed | archived | in-progress
```

Project `category` must be one of: `web`, `mobile`, `desktop`, `api`, `library`,
`other`, `statistics`, `survey`, `academia`, `network`, `ML/DL`, `AI`.

### Courses (`src/content/courses/`)

Same fields as blog. Course `category` must be one of: `statistics`,
`mathematics`, `electrics-electronics`, `computer-engineering`, `programming`,
`other`.

Notes:
- `title` and `description` are always required.
- `pubDate` is always required. Use a format like `Jan 25 2025` or `2025-01-25`.
- `draft: true` removes the entry from listings, its own page, and the RSS feed.
  Use it for work in progress.

---

## 3. Standard Markdown

All of these work as you expect:

- Paragraphs, `**bold**`, `*italic*`, `~~strikethrough~~`, `` `inline code` ``.
- Headings with `##` (section) and `###` / `####` (subsections). Do not use `#`
  for a heading in the body; the title is already the page `<h1>`.
- Links: `[text](https://url)` and reference links.
- Ordered and unordered lists, including nested lists.
- Blockquotes with `>`. To attribute a quote, put the name on its own line inside
  the quote (do not use an em dash).
- Horizontal rule with `---` on its own line.
- Fenced code blocks with a language tag for syntax highlighting:

  ````
  ```python
  print("hello")
  ```
  ````

The table of contents on each post is built automatically from your `##` and
`###` headings, so keep headings meaningful.

---

## 4. Extended Markdown

These go beyond plain Markdown and are specific to this site.

### Highlight

Wrap text in double equals to highlight it like a marker pen:

```
This is ==the important part== of the sentence.
```

### Tables (GitHub-flavored)

```
| Method | Assumption   | Best when            |
| :----- | :----------: | -------------------: |
| OLS    | Linear       | Effects are linear   |
| Ridge  | Collinearity | Many correlated cols |
```

Use `:---`, `:---:`, `---:` in the divider row for left, center, right alignment.

### Task lists

```
- [x] Done item
- [ ] Not done item
```

### Footnotes

```
A claim that needs a source.[^1]

[^1]: The source, collected at the bottom of the article.
```

### Figures with captions

A standalone image whose **alt text is non-empty** is rendered as a figure with
the alt text shown as a caption underneath. An image with empty alt text stays a
plain image with no caption.

```
![This alt text becomes the visible caption.](../../assets/my-post/photo.jpg)
```

Image paths are relative to the `.mdx` file. Put image files under `src/assets/`
(for example `src/assets/my-post/photo.jpg`). Raster images (jpg, png) are
converted to WebP automatically at build time; SVGs pass through unchanged.

---

## 5. Math (KaTeX)

Inline math uses single dollar signs; display math uses double dollar signs.

```
Inline: the mean is $\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$.

Display:

$$
\hat{\beta} = (X^\top X)^{-1} X^\top y
$$
```

Use standard LaTeX inside the delimiters. Matrices, integrals, sums, Greek
letters, and the usual operators all work. Write single backslashes (`\frac`,
not `\\frac`).

---

## 6. Components

These components are available in every `.mdx` file with no import statement.
Write them as JSX tags. Only images need to be imported (see PhotoGallery).

### Callout

A colored box that pulls a note out of the flow.

```jsx
<Callout type="tip" title="Optional heading">
  The body of the callout goes here. It can contain **Markdown**.
</Callout>
```

- `type`: one of `info`, `note`, `tip`, `success`, `warning`, `danger`. Each has
  its own color and icon.
- `title`: optional. If omitted, a sensible default title is used.

### PhotoGallery

A grid of images with a click-to-zoom lightbox. Images must be imported at the
top of the file.

```jsx
import img1 from '../../assets/my-post/one.jpg';
import img2 from '../../assets/my-post/two.jpg';

<PhotoGallery
  columns={3}
  images={[
    { src: img1, alt: "Describe image one", caption: "Optional caption" },
    { src: img2, alt: "Describe image two", caption: "Optional caption" },
  ]}
/>
```

- `columns`: `2`, `3`, or `4`.
- `layout`: optional, one of `grid` (default), `strip`, `masonry`.
- Each image needs `src` (an imported asset) and `alt`; `caption` is optional.

### VideoEmbed

Embeds a video with a privacy-friendly player. Only YouTube and Vimeo are
allowed by the site's security policy; other hosts will not load.

```jsx
<VideoEmbed url="https://www.youtube.com/watch?v=VIDEO_ID" title="Optional title" />
```

### ConceptCheck

A question whose answer stays hidden until the reader clicks. Good for tutorials.

```jsx
<ConceptCheck question="What is the time complexity of binary search?">
  **O(log n).** Each step halves the search space.
</ConceptCheck>
```

If the question itself contains math or formatting, use the slot form instead of
the `question` prop:

```jsx
<ConceptCheck>
  <span slot="question">In $ax^2 + bx + c = 0$, what is the discriminant?</span>
  It is $\Delta = b^2 - 4ac$.
</ConceptCheck>
```

### Citations and references

Use `Cite` inline where a source is referenced, and one `Reference` block at the
bottom listing all sources. The `id` in each `Cite` must match a reference `id`,
and they link to each other.

```jsx
This method is standard<Cite id="clrs" num={1} />.

<Reference references={[
  {
    id: "clrs",
    authors: "Cormen, T. H., et al.",
    title: "Introduction to Algorithms",
    source: "MIT Press",
    year: 2009,
    url: "https://example.com"        // optional
  }
]} />
```

- `Cite` props: `id` (matches a reference), `num` (the number shown in text).
- Each reference entry: `id` and `title` are required; `authors`, `source`,
  `year`, `url` are optional.

---

## 7. What is NOT supported

- Arbitrary React/Vue/Svelte components. Only the components in section 6 exist.
- Raw `<script>`, external stylesheets, custom fonts, or CDN resources. The
  content security policy blocks anything not on the allowlist (Firebase,
  Spotify, YouTube, Vimeo).
- Embeds from hosts other than YouTube and Vimeo.
- Inline HTML for layout. Stick to the Markdown and components above; the design
  system handles all styling.
- Em dashes, and uppercase letter-spaced eyebrow labels (see section 1).

---

## 8. Minimal template to start from

```mdx
---
title: Your title
description: One or two plain sentences.
pubDate: Jul 09 2026
tags:
  - tag-one
category: tutorial
draft: true
---

Opening paragraph in your own voice.

## First section

Body text with **emphasis**, ==a highlight==, and inline math $a^2 + b^2 = c^2$.

<Callout type="note">
  A note worth pulling aside.
</Callout>

## Second section

More writing, a list, and a source if you have one.[^1]

[^1]: The reference for the claim above.
```

A complete, rendered example of every feature lives in
`src/content/blog/enhanced-blog-features-test.mdx` and at
`/blog/enhanced-blog-features-test/` on the site. When in doubt, copy from there.
