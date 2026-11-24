import { decodeJson, decryptWithKey, encodeJson, encryptWithKey, randomToken } from './crypto';
import { Assignment, DrawBundle, Participant } from '../types';
import { generatePairs } from './generatePairs';
import { createDraw } from './api';

export function appBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export type SealedDraw = {
  bundle: DrawBundle;
  /** Giver name → key. Goes to the server, never into the link. */
  keys: Record<string, string>;
};

export type DrawError = 'needMoreParticipants' | 'duplicateNames' | 'invalidPairs';

/**
 * Runs the draw and encrypts each giver's assignment with its own key.
 * The pairings only exist inside this function: they're never returned in
 * the clear, rendered, or stored.
 */
export async function sealDraw(
  participants: Record<string, Participant>,
  info: string,
  drawId: string,
): Promise<SealedDraw | DrawError> {
  const list = Object.values(participants);
  if (list.length < 3) return 'needMoreParticipants';
  const names = list.map(p => p.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) return 'duplicateNames';

  const pairs = generatePairs(participants);
  if (!pairs) return 'invalidPairs';

  // Use the organiser's list order: the solver's internal order (most
  // constrained giver first) could hint at who has rules.
  const order = new Map(list.map((p, i) => [p.id, i]));
  const pairings = [...pairs.pairings].sort((a, b) => order.get(a.giver.id)! - order.get(b.giver.id)!);

  const envelopes: Record<string, string> = {};
  const keys: Record<string, string> = {};
  for (const { giver, receiver } of pairings) {
    const assignment: Assignment = {
      from: giver.name,
      to: receiver.name,
      wishes: participants[receiver.id].wishes?.trim() || undefined,
    };
    keys[giver.name] = randomToken();
    envelopes[giver.name] = await encryptWithKey(JSON.stringify(assignment), keys[giver.name]);
  }

  return { bundle: { v: 2, id: drawId, envelopes, info: info.trim() || undefined }, keys };
}

/** Short share link: the envelopes are fetched from the server by id. */
export function shortUrl(drawId: string) {
  return `${appBaseUrl()}#/d/${drawId}`;
}

export function bundleUrl(bundle: DrawBundle) {
  return `${appBaseUrl()}#/reveal?d=${encodeJson(bundle)}`;
}

export type DrawResult =
  | { ok: true; url: string; drawId: string; adminToken: string }
  | { ok: false; error: DrawError | 'server' };

export async function drawAndPublish(participants: Record<string, Participant>, info: string): Promise<DrawResult> {
  // Trim names so "Haley " and "Haley" are the same person.
  const trimmed = Object.fromEntries(Object.entries(participants)
    .filter(([, p]) => p.name.trim())
    .map(([id, p]) => [id, { ...p, name: p.name.trim() }]));

  const sealed = await sealDraw(trimmed, info, '');
  if (typeof sealed === 'string') return { ok: false, error: sealed };

  try {
    const { envelopes, info } = sealed.bundle;
    const { id, adminToken } = await createDraw(sealed.keys, { envelopes, info });
    return { ok: true, url: shortUrl(id), drawId: id, adminToken };
  } catch {
    return { ok: false, error: 'server' };
  }
}

export function parseBundle(data: string | null): DrawBundle | null {
  if (!data) return null;
  try {
    const bundle = decodeJson<DrawBundle>(data);
    return bundle.v === 2 && typeof bundle.id === 'string' && bundle.envelopes ? bundle : null;
  } catch {
    return null;
  }
}

export async function openEnvelope(bundle: DrawBundle, name: string, key: string): Promise<Assignment | null> {
  const envelope = bundle.envelopes[name];
  if (!envelope) return null;
  const plain = await decryptWithKey(envelope, key);
  return plain ? (JSON.parse(plain) as Assignment) : null;
}

// ---- Claim tokens: which names this device has opened, per draw --------------

const CLAIMS_KEY = 'malteseSantaClaims';
type Claims = Record<string, Record<string, string>>; // drawId → name → token

function loadClaims(): Claims {
  try {
    return JSON.parse(localStorage.getItem(CLAIMS_KEY) ?? '{}') as Claims;
  } catch {
    return {};
  }
}

export function claimedNamesOnThisDevice(drawId: string): string[] {
  return Object.keys(loadClaims()[drawId] ?? {});
}

/** Returns this device's token for a name, creating one if needed. */
export function claimTokenFor(drawId: string, name: string): string {
  const claims = loadClaims();
  claims[drawId] ??= {};
  claims[drawId][name] ??= randomToken(24);
  try {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  } catch {
    // Private mode etc. — the claim still works for this session.
  }
  return claims[drawId][name];
}

export function forgetClaim(drawId: string, name: string) {
  const claims = loadClaims();
  if (claims[drawId]) {
    delete claims[drawId][name];
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  }
}
