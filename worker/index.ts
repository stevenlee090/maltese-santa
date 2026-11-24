/// <reference types="@cloudflare/workers-types" />

// Claim-once key server.
//
// The organiser's browser runs the draw, encrypts each giver's assignment with
// its own random key, puts the encrypted envelopes in the group link and sends
// only the keys here. Each key is released to the first device that claims
// that name; any other device then gets "already opened", so peeking as
// someone else is noticed by the real person.

interface Env {
  DB: D1Database;
}

const MAX_PARTICIPANTS = 50;
const MAX_NAME_LENGTH = 40;
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;
const MAX_ENVELOPE_LENGTH = 2000;
const MAX_INFO_LENGTH = 1000;
const MAX_WISHES_LENGTH = 500;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function randomToken(bytes = 24) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function createDraw(request: Request, env: Env) {
  const body = await readJson<{
    keys?: Record<string, string>;
    bundle?: { envelopes?: Record<string, string>; info?: string };
    /** Receiver name → SHA-256 of the wishlist read token hidden in their Santa's envelope. */
    readHashes?: Record<string, string>;
  }>(request);
  const entries = Object.entries(body?.keys ?? {});
  if (entries.length < 3 || entries.length > MAX_PARTICIPANTS) return json({ error: 'badRequest' }, 400);
  for (const [name, key] of entries) {
    if (!name.trim() || name.length > MAX_NAME_LENGTH || typeof key !== 'string' || !KEY_PATTERN.test(key)) {
      return json({ error: 'badRequest' }, 400);
    }
  }

  // Envelopes (encrypted) + event info, so the share link can be just the id.
  const envelopes = body?.bundle?.envelopes ?? {};
  const info = typeof body?.bundle?.info === 'string' ? body.bundle.info.slice(0, MAX_INFO_LENGTH) : undefined;
  const sameNames = Object.keys(envelopes).sort().join('\n') === entries.map(([n]) => n).sort().join('\n');
  if (!sameNames || Object.values(envelopes).some(e => typeof e !== 'string' || e.length > MAX_ENVELOPE_LENGTH)) {
    return json({ error: 'badRequest' }, 400);
  }

  const readHashes = body?.readHashes ?? {};
  if (entries.some(([name]) => typeof readHashes[name] !== 'string' || !HASH_PATTERN.test(readHashes[name]))) {
    return json({ error: 'badRequest' }, 400);
  }

  const id = randomToken(12);
  const adminToken = randomToken();
  const now = Date.now();

  await env.DB.batch([
    env.DB.prepare('INSERT INTO draws (id, admin_hash, created_at) VALUES (?, ?, ?)').bind(id, await sha256(adminToken), now),
    ...entries.map(([name, key]) =>
      env.DB.prepare('INSERT INTO slots (draw_id, name, key, wishes_read_hash) VALUES (?, ?, ?, ?)').bind(id, name, key, readHashes[name])),
    env.DB.prepare('INSERT INTO bundles (draw_id, data) VALUES (?, ?)').bind(id, JSON.stringify({ envelopes, info })),
  ]);

  return json({ id, adminToken }, 201);
}

async function getBundle(env: Env, drawId: string) {
  const row = await env.DB.prepare('SELECT data FROM bundles WHERE draw_id = ?').bind(drawId).first<{ data: string }>();
  if (!row) return json({ error: 'notFound' }, 404);
  return json(JSON.parse(row.data));
}

async function claim(request: Request, env: Env, drawId: string) {
  const body = await readJson<{ name?: string; token?: string }>(request);
  const name = body?.name;
  const token = body?.token;
  if (typeof name !== 'string' || typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    return json({ error: 'badRequest' }, 400);
  }
  const tokenHash = await sha256(token);

  // Atomic: only succeeds if nobody has claimed this name yet.
  const update = await env.DB
    .prepare('UPDATE slots SET claim_hash = ?, claimed_at = ? WHERE draw_id = ? AND name = ? AND claim_hash IS NULL')
    .bind(tokenHash, Date.now(), drawId, name)
    .run();

  const slot = await env.DB
    .prepare('SELECT key, claim_hash FROM slots WHERE draw_id = ? AND name = ?')
    .bind(drawId, name)
    .first<{ key: string; claim_hash: string | null }>();

  if (!slot) return json({ error: 'notFound' }, 404);
  if (update.meta.changes === 1 || slot.claim_hash === tokenHash) return json({ key: slot.key });
  return json({ error: 'alreadyClaimed' }, 409);
}

/** The owner (by claim token) updates their own wishlist. */
async function writeWishes(request: Request, env: Env, drawId: string) {
  const body = await readJson<{ name?: string; token?: string; wishes?: string }>(request);
  if (typeof body?.name !== 'string' || typeof body?.token !== 'string' || typeof body?.wishes !== 'string') {
    return json({ error: 'badRequest' }, 400);
  }
  const wishes = body.wishes.trim().slice(0, MAX_WISHES_LENGTH);
  const update = await env.DB
    .prepare('UPDATE slots SET wishes = ?, wishes_updated_at = ? WHERE draw_id = ? AND name = ? AND claim_hash = ?')
    .bind(wishes || null, Date.now(), drawId, body.name, await sha256(body.token))
    .run();
  if (update.meta.changes !== 1) return json({ error: 'forbidden' }, 403);
  return json({ ok: true });
}

/** Read a wishlist: the owner (claim token) or their Santa (read token from the envelope). */
async function readWishes(request: Request, env: Env, drawId: string) {
  const body = await readJson<{ name?: string; token?: string; readToken?: string }>(request);
  if (typeof body?.name !== 'string') return json({ error: 'badRequest' }, 400);

  const slot = await env.DB
    .prepare('SELECT wishes, wishes_updated_at, wishes_read_hash, claim_hash FROM slots WHERE draw_id = ? AND name = ?')
    .bind(drawId, body.name)
    .first<{ wishes: string | null; wishes_updated_at: number | null; wishes_read_hash: string | null; claim_hash: string | null }>();
  if (!slot) return json({ error: 'notFound' }, 404);

  const isOwner = typeof body.token === 'string' && slot.claim_hash !== null && slot.claim_hash === await sha256(body.token);
  const isSanta = typeof body.readToken === 'string' && slot.wishes_read_hash === await sha256(body.readToken);
  const legacyDraw = slot.wishes_read_hash === null;
  if (!isOwner && !isSanta && !legacyDraw) return json({ error: 'forbidden' }, 403);

  return json({ wishes: slot.wishes ?? '', updatedAt: slot.wishes_updated_at });
}

async function status(env: Env, drawId: string) {
  const { results } = await env.DB
    .prepare('SELECT name, claimed_at FROM slots WHERE draw_id = ? ORDER BY rowid')
    .bind(drawId)
    .all<{ name: string; claimed_at: number | null }>();
  if (results.length === 0) return json({ error: 'notFound' }, 404);
  return json({ slots: results.map(r => ({ name: r.name, claimed: r.claimed_at !== null })) });
}

async function reset(request: Request, env: Env, drawId: string) {
  const body = await readJson<{ name?: string; adminToken?: string }>(request);
  if (typeof body?.name !== 'string' || typeof body?.adminToken !== 'string') return json({ error: 'badRequest' }, 400);

  const draw = await env.DB.prepare('SELECT admin_hash FROM draws WHERE id = ?').bind(drawId).first<{ admin_hash: string }>();
  if (!draw) return json({ error: 'notFound' }, 404);
  if (draw.admin_hash !== await sha256(body.adminToken)) return json({ error: 'forbidden' }, 403);

  await env.DB
    // Also clear the wishlist: it may have been written by whoever wrongly opened this name.
    .prepare('UPDATE slots SET claim_hash = NULL, claimed_at = NULL, wishes = NULL, wishes_updated_at = NULL WHERE draw_id = ? AND name = ?')
    .bind(drawId, body.name)
    .run();
  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // ['api', 'draws', id?, action?]

    if (parts[0] !== 'api' || parts[1] !== 'draws') return json({ error: 'notFound' }, 404);

    const [, , drawId, action] = parts;
    if (!drawId && request.method === 'POST') return createDraw(request, env);
    if (drawId && !action && request.method === 'GET') return status(env, drawId);
    if (drawId && action === 'bundle' && request.method === 'GET') return getBundle(env, drawId);
    if (drawId && action === 'claim' && request.method === 'POST') return claim(request, env, drawId);
    if (drawId && action === 'reset' && request.method === 'POST') return reset(request, env, drawId);
    if (drawId && action === 'wishes' && request.method === 'PUT') return writeWishes(request, env, drawId);
    if (drawId && action === 'wishes' && request.method === 'POST') return readWishes(request, env, drawId);

    return json({ error: 'notFound' }, 404);
  },
} satisfies ExportedHandler<Env>;
