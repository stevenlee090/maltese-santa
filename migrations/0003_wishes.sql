-- Self-written wishlists. Written with the owner's claim token; readable only
-- with the read token that sits inside their Santa's encrypted envelope
-- (stored here as a hash). Slots with no read hash (draws made before this
-- feature) fall back to "anyone with the group link can read".
ALTER TABLE slots ADD COLUMN wishes TEXT;
ALTER TABLE slots ADD COLUMN wishes_updated_at INTEGER;
ALTER TABLE slots ADD COLUMN wishes_read_hash TEXT;
