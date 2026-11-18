-- For a database made before covers and book notes. A fresh database gets all
-- of this from schema.sql; apply this once, then schema.sql again for the notes table:
--   npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/upgrades/0003-covers-notes.sql --config workers/reading/wrangler.toml
--   npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/schema.sql --config workers/reading/wrangler.toml
ALTER TABLE books ADD COLUMN cover_url TEXT;
ALTER TABLE books ADD COLUMN release_year INTEGER;
ALTER TABLE books ADD COLUMN genres TEXT;
ALTER TABLE books ADD COLUMN series TEXT;
ALTER TABLE books ADD COLUMN series_position REAL;
ALTER TABLE books ADD COLUMN rating REAL;
ALTER TABLE books ADD COLUMN hardcover_slug TEXT;
ALTER TABLE books ADD COLUMN cover_key TEXT;
ALTER TABLE books ADD COLUMN cover_v TEXT;
ALTER TABLE books ADD COLUMN cover_checked_at INTEGER;
ALTER TABLE daily ADD COLUMN covers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily ADD COLUMN publishes INTEGER NOT NULL DEFAULT 0;
