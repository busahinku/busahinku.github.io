-- Only for a database created from the first version of schema.sql (before
-- manual words, examples, audio and the private app). A fresh database gets all of this from
-- schema.sql; apply this once, then schema.sql again for the new tables:
--   npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/upgrades/0002-private-words.sql --config workers/reading/wrangler.toml
--   npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/schema.sql --config workers/reading/wrangler.toml
ALTER TABLE cards ADD COLUMN source TEXT NOT NULL DEFAULT 'clipping';
ALTER TABLE cards ADD COLUMN note TEXT;
ALTER TABLE cards ADD COLUMN sentence TEXT;
ALTER TABLE cards ADD COLUMN sentence_tr TEXT;
ALTER TABLE cards ADD COLUMN updated_at INTEGER;
ALTER TABLE daily ADD COLUMN audio INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily ADD COLUMN evening INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily ADD COLUMN weekly INTEGER NOT NULL DEFAULT 0;
