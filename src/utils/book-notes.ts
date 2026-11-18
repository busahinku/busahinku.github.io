import { getCollection, type CollectionEntry } from "astro:content";
import type { Lang } from "../i18n/translations";
import { titleKey } from "../lib/title-key.mjs";

export type BookNote = CollectionEntry<"books">;

export const noteSlug = (note: BookNote) => note.data.translationKey ?? note.id;

/** Published notes for a language, newest finished first: English everywhere, a Turkish note in its place under /tr/. */
export async function bookNotes(lang: Lang): Promise<BookNote[]> {
  const all = await getCollection("books", ({ data }) => !data.draft);
  const bySlug = new Map<string, BookNote>();
  for (const note of all) if (note.data.lang === "en") bySlug.set(noteSlug(note), note);
  if (lang === "tr") for (const note of all) if (note.data.lang === "tr") bySlug.set(noteSlug(note), note);
  return [...bySlug.values()].sort((a, b) => b.data.finished.getTime() - a.data.finished.getTime());
}

/** What the reading page needs to link a book row to its note: the keys it answers to, and where it lives. */
export function noteLinks(notes: BookNote[], lang: Lang) {
  const base = lang === "tr" ? "/tr/reading" : "/reading";
  return notes.map((note) => ({
    keys: [...new Set([note.data.readerTitle, note.data.title].filter(Boolean).map((t) => titleKey(t)))],
    href: `${base}/${noteSlug(note)}/`,
    title: note.data.title,
    author: note.data.author,
    finished: note.data.finished.toISOString().slice(0, 10),
    cover: note.data.cover ?? null,
  }));
}
