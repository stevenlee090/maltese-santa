import { SlotStatus } from '../types';

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`./api/${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(body.error ?? 'network', response.status);
  return body as T;
}

export function createDraw(
  keys: Record<string, string>,
  bundle: { envelopes: Record<string, string>; info?: string },
  readHashes: Record<string, string>,
) {
  return request<{ id: string; adminToken: string }>('draws', { method: 'POST', body: JSON.stringify({ keys, bundle, readHashes }) });
}

/** Owner saves their own wishlist (authenticated by their claim token). */
export function saveWishes(drawId: string, name: string, token: string, wishes: string) {
  return request<{ ok: true }>(`draws/${encodeURIComponent(drawId)}/wishes`, {
    method: 'PUT',
    body: JSON.stringify({ name, token, wishes }),
  });
}

/** Read a wishlist as its owner (`token`) or as their Santa (`readToken`). */
export function readWishes(drawId: string, name: string, auth: { token?: string; readToken?: string }) {
  return request<{ wishes: string; updatedAt: number | null }>(`draws/${encodeURIComponent(drawId)}/wishes`, {
    method: 'POST',
    body: JSON.stringify({ name, ...auth }),
  });
}

export function getBundle(drawId: string) {
  return request<{ envelopes: Record<string, string>; info?: string }>(`draws/${encodeURIComponent(drawId)}/bundle`);
}

export function claimSlot(drawId: string, name: string, token: string) {
  return request<{ key: string }>(`draws/${encodeURIComponent(drawId)}/claim`, {
    method: 'POST',
    body: JSON.stringify({ name, token }),
  });
}

export function getStatus(drawId: string) {
  return request<{ slots: SlotStatus[] }>(`draws/${encodeURIComponent(drawId)}`);
}

export function resetSlot(drawId: string, name: string, adminToken: string) {
  return request<{ ok: true }>(`draws/${encodeURIComponent(drawId)}/reset`, {
    method: 'POST',
    body: JSON.stringify({ name, adminToken }),
  });
}
