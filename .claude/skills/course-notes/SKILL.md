---
name: course-notes
description: Turn a handwritten course notes PDF into the course page on busahin.com and its typeset LaTeX PDF, or update both when a newer export arrives. Use when the user shares a notes PDF for a course, says they added new notes, or wants a new course page.
argument-hint: <slug> <path to the exported PDF>
model: sonnet
---

# Course notes

One file per course drives everything:

- `src/content/courses/<slug>.mdx` is the web page (`/courses/<slug>/` and `/tr/courses/<slug>/`).
- `npm run notes -- build <slug>` turns that same file into the typeset `notes.pdf`.
- Both PDFs go to R2 (`https://files.busahin.com/courses/<slug>/`), never into the repo, and are linked at the top of the course page automatically (`CourseFiles.astro` reads `src/data/files.json`).

The slug is the lowercase course code: `stat497`.

## Steps

1. Get the slug and the export path from the arguments. If either is missing, ask. If `src/content/courses/<slug>.mdx` does not exist, create it with the frontmatter below.
2. Run `npm run notes -- pages <slug> "<export.pdf>"`. It uploads a compressed copy of the export and prints which pages are new or changed, with an image path for each. If it prints "nothing new to transcribe", skip to step 4.
3. Read **only the listed images**, never the PDF itself, at most 6 per batch. Write each batch into the MDX before reading the next one.
   - New pages go at the end, usually as a new `## Week N` section.
   - A changed page: find the passage it covers and edit only that.
   - "removed" pages: ask the user before deleting anything from the MDX.
4. Run `npm run notes -- build <slug>`. If it prints a LaTeX error, fix the line it points to (nearly always a math typo) and run it again. A successful build is what records the pages as done, so never skip it.
5. Set `updatedDate:` to today, then run `npx astro build`. Commit the MDX, `<slug>.pages`, `src/data/files.json` and any figures; there are no PDFs to commit.
6. Report in a few lines: which pages were transcribed, anything unreadable (quote it as you read it), and any mistake you corrected in the notes.

## Transcribing

Keep the outline of the handwritten page: same order, same sections, same examples, same wording where it is already clear. Turn fragments into whole sentences and nothing more. Do not reorganize, merge weeks, or add material that was not in the lecture. Two additions are allowed: up to two `ConceptCheck` questions at the end of each week, answerable from that week's notes, under `### Check yourself`.

If the notes contradict themselves (a figure label that disagrees with the table it plots), fix it and say so in the report.

Headings:

- `## Week N: Topic`. The PDF numbers its chapters from N, so N must be the real week.
- `###` for sections (these make the table of contents), `####` for subsections.

The PDF converter understands exactly this markup. Anything else is dropped from the PDF with a warning.

- Paragraphs, `**bold**`, `*italic*`, `==highlight==`, `$inline$` and `$$display$$` math. Multi-line display math goes in `\begin{aligned}`, never bare `\\`.
- Lists, GFM tables, footnotes, images.
- `<Callout type="..." title="...">` with these types:
  - `definition` for "Definition:" (title = the term being defined)
  - `example` for worked examples
  - `tip` for "!" and "Key aspect" points, and for boxed one-line summaries
  - `warning` for cautions and common mistakes
  - `note` for side notes and sticky notes
- `<ConceptCheck question="...">answer</ConceptCheck>`.
- Callout titles and questions are plain text. No `$` math in them.

The PDF builds more from this markup, so use it as intended:

- `tip` callouts are repeated in the week's "Key points" box before its exercises. Use `tip` only for things worth remembering.
- `ConceptCheck` questions become numbered exercises; their answers go to "Answers to the exercises" at the back.
- **Bold** marks a term being introduced and puts it in the index. Do not bold for emphasis; use *italic* for that.
- `definition` callouts are listed on the "Definitions" page after the contents.

From handwriting to markup: highlighter becomes `==...==`, wavy or straight underlines on a term become `*italic*` where the term is introduced, Turkish glosses stay in brackets and italics (`(*olası yörünge*)`), "(.ppt)" style source notes are dropped.

Site copy rules apply here too: no em dashes, and no uppercase letter-spaced labels.

## Figures

- **A plot whose values can be read:** redraw it. Copy `src/assets/courses/stat497/sample-paths.tex` to `src/assets/courses/<slug>/<name>.tex` and change the data. Keep it about 10.5cm wide with `\small` labels, use the named colours (`accent`, `caution`, `quiet`, `hair`), and tell series apart by marker and dash as well as colour, because the e-ink theme drops colour. Reference it in the MDX as `![Caption sentence.](../../assets/courses/<slug>/<name>.svg)`; the build writes the SVG.
- **A sketch that cannot be redrawn faithfully:** crop it from the page instead:
  `pdftoppm -r 200 -png -singlefile -f <page> -l <page> -x <left> -y <top> -W <width> -H <height> "<export.pdf>" src/assets/courses/<slug>/<name>`
  (pixels at 200 dpi; an A4 page is 1654 by 2339), then reference `<name>.png`.

## New course frontmatter

```yaml
---
title: "STAT497: Applications of Time Series"
description: One or two sentences in first person.
pubDate: 2026-10-10
category: statistics
tags:
  - time-series
---
```

- Keep `title` as `CODE: Name`. The PDF title page splits it at the colon.
- `pubDate` sets the term printed on the PDF: September to January is fall, February to June is spring.
- `category` is one of `statistics`, `mathematics`, `electrics-electronics`, `computer-engineering`, `programming`, `other`.

## Cost

Reading page images is the only expensive step, and the tools keep it small:

- `src/content/courses/<slug>.pages` holds a fingerprint per page, so a page is read once, ever, unless it changes.
- Page images are rendered at 120 dpi and trimmed to the writing, so a half-empty page costs about half.
- The LaTeX is generated from the MDX by `scripts/course-notes.mjs`, so it never has to be written by hand.
- This skill runs on Sonnet. Remove the `model:` line above to use the session's model instead.
