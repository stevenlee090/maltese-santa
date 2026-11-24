// Envelope crypto for the draw.
//
// Each giver's assignment is encrypted (AES-256-GCM) with its own random key.
// The encrypted envelopes travel in the group link; the keys live on the
// claim-once server. Neither half alone reveals who drew whom.

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

export function encodeJson(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

export function decodeJson<T>(text: string): T {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(text))) as T;
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

const IV_LENGTH = 12;

async function importKey(key: string, usage: KeyUsage) {
  return crypto.subtle.importKey('raw', fromBase64Url(key), { name: 'AES-GCM' }, false, [usage]);
}

export async function encryptWithKey(plaintext: string, key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, await importKey(key, 'encrypt'), new TextEncoder().encode(plaintext)));
  const out = new Uint8Array(IV_LENGTH + ciphertext.length);
  out.set(iv);
  out.set(ciphertext, IV_LENGTH);
  return toBase64Url(out);
}

/** Returns the plaintext, or null if the key doesn't match the envelope. */
export async function decryptWithKey(envelope: string, key: string): Promise<string | null> {
  try {
    const bytes = fromBase64Url(envelope);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, IV_LENGTH) }, await importKey(key, 'decrypt'), bytes.slice(IV_LENGTH));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
