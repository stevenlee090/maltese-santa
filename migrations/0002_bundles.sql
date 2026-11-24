-- Encrypted envelopes + event info, so the group link can be just the draw id.
-- Envelopes are useless without the per-name keys in `slots`, which are only
-- released one at a time through the claim endpoint.
CREATE TABLE bundles (
  draw_id TEXT PRIMARY KEY REFERENCES draws(id),
  data TEXT NOT NULL
);
