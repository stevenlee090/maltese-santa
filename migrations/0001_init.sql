-- One row per draw. The admin token (hashed) lets the organiser un-claim a
-- name if someone opened it on the wrong device.
CREATE TABLE draws (
  id TEXT PRIMARY KEY,
  admin_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- One row per giver. `key` decrypts that giver's envelope, which lives only
-- in the group link: neither half alone reveals a pairing.
CREATE TABLE slots (
  draw_id TEXT NOT NULL REFERENCES draws(id),
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  claim_hash TEXT,
  claimed_at INTEGER,
  PRIMARY KEY (draw_id, name)
);
