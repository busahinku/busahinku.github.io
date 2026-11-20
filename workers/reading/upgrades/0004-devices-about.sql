-- For a database made before devices and descriptions. A fresh database gets all of this from
-- schema.sql; apply this once, then schema.sql again for the new tables:
--   npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/upgrades/0004-devices-about.sql --config workers/reading/wrangler.toml
--   npx wrangler@4.146.0 d1 execute busahin-reading --remote --file workers/reading/schema.sql --config workers/reading/wrangler.toml
ALTER TABLE books ADD COLUMN device TEXT;
ALTER TABLE books ADD COLUMN device_id TEXT;
