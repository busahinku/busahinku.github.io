-- Apply: npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/schema.sql
-- CrossPoint Sync is the system of record. Everything here is either a copy of
-- what it returned or derived from that copy, so it can all be rebuilt.

-- The latest answer of each Sync endpoint the cron reads, verbatim, with a hash
-- so an unchanged answer costs no writes. `body` is null when it was too big to keep.
CREATE TABLE IF NOT EXISTS raw (
  endpoint TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  body TEXT,
  server_version TEXT,
  fetched_at INTEGER NOT NULL
);

-- One row per book the account knows, joined from /progress and /stats/activity.
-- `title` is the book's own metadata title (null without it) and `filename`
-- is kept apart: the public page never shows a file name. `hidden` and
-- `public_title` are set from the private side and never touched by a pull.
CREATE TABLE IF NOT EXISTS books (
  document TEXT PRIMARY KEY,
  title TEXT,
  filename TEXT,
  public_title TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  author TEXT,
  percentage REAL,
  status TEXT,
  page_count INTEGER,
  started_at INTEGER,
  last_at INTEGER,
  finished_at INTEGER,
  days_to_finish INTEGER
);

-- Reading activity per Istanbul calendar day, as the Sync server derives it from
-- the progress log: a day with a logged position change is a reading day.
CREATE TABLE IF NOT EXISTS days (
  day TEXT PRIMARY KEY,
  pages INTEGER NOT NULL,
  syncs INTEGER NOT NULL
);

-- The same, per book, with the furthest position before and after the day.
CREATE TABLE IF NOT EXISTS book_days (
  day TEXT NOT NULL,
  document TEXT NOT NULL,
  pages INTEGER NOT NULL,
  syncs INTEGER NOT NULL,
  from_pct REAL,
  to_pct REAL,
  PRIMARY KEY (day, document)
);

-- Clippings. Three words or fewer is a vocabulary item (`kind` 'word', `term` is
-- its normalised form); anything longer is a sentence, translated once and kept.
-- Text is private: no public endpoint returns it.
CREATE TABLE IF NOT EXISTS clippings (
  id TEXT PRIMARY KEY,
  document TEXT NOT NULL,
  text TEXT NOT NULL,
  chapter TEXT,
  created_at INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('word', 'sentence')),
  term TEXT,
  translation TEXT,
  translated_at INTEGER,
  translate_tries INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS clippings_by_kind ON clippings (kind, deleted);
-- A card's live clipping and a word's sentences are found through these, so
-- private routes read a few rows per card instead of every clipping.
CREATE INDEX IF NOT EXISTS clippings_word_term ON clippings (term) WHERE kind = 'word' AND deleted = 0;
CREATE INDEX IF NOT EXISTS clippings_sentences ON clippings (document) WHERE kind = 'sentence' AND deleted = 0;

-- Leitner boxes 1 to 5 for each vocabulary term (intervals in index.js).
-- `shown` is the last day the term was the word of the day. The review times
-- are kept from the start because they cannot be rebuilt later.
-- `source` is 'clipping' (made by the pull from a clipping) or 'manual' (added
-- by hand on the private page, with an optional note and sentence).
-- Planned additions are all additive (ALTER TABLE ADD COLUMN or a new table,
-- never a rebuild): `sentence_id` on cards, a frequency `rank`, a
-- `card_lists (term, list)` table for word lists, a `sentence_terms (clip_id,
-- term)` table for words found in a sentence, and a `prestudy (document, term,
-- chapter, rank)` table imported from files.
CREATE TABLE IF NOT EXISTS cards (
  term TEXT PRIMARY KEY,
  box INTEGER NOT NULL DEFAULT 1,
  due TEXT NOT NULL,
  reviews INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  shown TEXT,
  added_at INTEGER NOT NULL,
  first_reviewed_at INTEGER,
  matured_at INTEGER,
  source TEXT NOT NULL DEFAULT 'clipping',
  note TEXT,
  sentence TEXT,
  sentence_tr TEXT,
  updated_at INTEGER
);

-- Per Istanbul day: the word of the day, how many sentences were translated
-- (the daily cap), and whether the morning notification went out.
CREATE TABLE IF NOT EXISTS daily (
  day TEXT PRIMARY KEY,
  term TEXT,
  translations INTEGER NOT NULL DEFAULT 0,
  notified INTEGER NOT NULL DEFAULT 0,
  audio INTEGER NOT NULL DEFAULT 0
);

-- English to Turkish from WikDict (CC BY-SA 4.0), loaded by
-- scripts/reading-dict.mjs. Inflected forms point at their headword's data.
CREATE TABLE IF NOT EXISTS dict (
  word TEXT PRIMARY KEY,
  ipa TEXT,
  pos TEXT,
  def TEXT,
  tr TEXT NOT NULL
) WITHOUT ROWID;

-- Small precomputed answers. 'summary' is the public page's JSON, rebuilt by
-- every pull, so a public request reads one row.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Example sentences with their Turkish, from Tatoeba (CC BY 2.0 FR), loaded by
-- scripts/reading-examples.mjs. `id` is the English sentence's Tatoeba id, for
-- the link the private page shows.
CREATE TABLE IF NOT EXISTS examples (
  word TEXT NOT NULL,
  id INTEGER NOT NULL,
  en TEXT NOT NULL,
  tr TEXT NOT NULL,
  PRIMARY KEY (word, id)
) WITHOUT ROWID;

-- Pronunciation of a term: a human recording from Wikimedia Commons, copied
-- into R2 under a random key and served by the files Worker. A term with no
-- recording keeps a row with key NULL, so Commons is asked again only after
-- 30 days. The page falls back to the browser's own speech for those.
CREATE TABLE IF NOT EXISTS audio (
  term TEXT PRIMARY KEY,
  r2_key TEXT,
  file TEXT,
  author TEXT,
  license TEXT,
  license_url TEXT,
  checked_at INTEGER NOT NULL
);
