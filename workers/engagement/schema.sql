-- Apply: npx wrangler@4.146.0 d1 execute busahin-engagement --remote --file workers/engagement/schema.sql
-- A page is "courses/stat497", "projects/metuans", "blog/<slug>": one row for
-- both languages.
CREATE TABLE IF NOT EXISTS pages (
  key TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0
);

-- One like per browser (a random id kept in localStorage), so a count cannot
-- be pushed up by clicking twice.
CREATE TABLE IF NOT EXISTS likes (
  key TEXT NOT NULL,
  visitor TEXT NOT NULL,
  PRIMARY KEY (key, visitor)
);

-- Comments wait (approved = 0) until `npm run comments` approves them.
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (datetime('now')),
  approved INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comments_by_page ON comments (key, approved);
