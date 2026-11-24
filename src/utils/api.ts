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

export function createDraw(keys: Record<string, string>) {
  return request<{ id: string; adminToken: string }>('draws', { method: 'POST', body: JSON.stringify({ keys }) });
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
