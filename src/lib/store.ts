import { randomInt, randomUUID } from 'node:crypto';
import type { PairingSession } from './types';

type Store = { sessions: Map<string, PairingSession>; currentId?: string };
const root = globalThis as typeof globalThis & { cleaDemo?: Store };
const store: Store = (root.cleaDemo ??= { sessions: new Map<string, PairingSession>() });
export class DemoError extends Error {
  constructor(
    message: string,
    public code = 409,
  ) {
    super(message);
  }
}
const pending = ['pairing_session_created', 'waiting_for_user', 'claimed'];
export function refresh(s: PairingSession, now = Date.now()) {
  if (pending.includes(s.status) && now >= Date.parse(s.expiresAt)) s.status = 'expired';
  if (
    s.startedAt !== undefined &&
    ['confirmed', 'registering', 'provisioning', 'connecting'].includes(s.status)
  ) {
    const elapsed = now - s.startedAt;
    s.step = Math.min(7, Math.floor(elapsed / 750));
    if (s.simulateOffline && elapsed >= 3000) {
      s.status = 'failed';
      s.step = 4;
    } else if (elapsed >= 6500) {
      s.status = 'connected';
      s.step = 7;
    } else if (elapsed >= 4500) {
      s.status = 'connecting';
      s.step = 6;
    } else if (elapsed >= 3000) s.status = 'provisioning';
    else if (elapsed >= 750) s.status = 'registering';
  }
  if (s.status === 'pairing_session_created') s.status = 'waiting_for_user';
  return s;
}
export function getSession(id: string) {
  const s = store.sessions.get(id);
  if (!s) throw new DemoError('Pairing session not found. Create a new code on the device.', 404);
  return refresh(s);
}
export function snapshot() {
  return {
    current: store.currentId ? getSession(store.currentId) : null,
    devices: [...store.sessions.values()]
      .map((s) => refresh(s))
      .filter((s) => s.status === 'connected'),
  };
}
export function createSession() {
  if (store.currentId) {
    const previous = getSession(store.currentId);
    if (['confirmed', 'registering', 'provisioning', 'connecting'].includes(previous.status))
      throw new DemoError('Pairing is in progress. Cancel it before creating another code.');
    if (pending.includes(previous.status)) previous.status = 'cancelled';
  }
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    const raw = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
    code = raw.slice(0, 3) + '-' + raw.slice(3);
  } while ([...store.sessions.values()].some((s) => s.shortCode === code));
  const createdAt = Date.now();
  const s: PairingSession = {
    id: randomUUID(),
    shortCode: code,
    status: 'pairing_session_created',
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + 600000).toISOString(),
    step: 0,
    simulateOffline: false,
    device: {
      hardwareId: 'seco-e88-demo',
      productName: 'SOM-SMARC-MX95',
      productCode: 'E88',
      serialNumber: 'E88-DEMO-000142',
      partNumber: 'E88-DEMO',
      architecture: 'arm64',
      cleaOsVersion: '2.0',
      networkType: 'ethernet',
    },
  };
  store.sessions.set(s.id, s);
  store.currentId = s.id;
  return refresh(s);
}
export function resolveCode(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Z2-9]{3}-?[A-Z2-9]{3}$/i.test(value.trim()))
    throw new DemoError('Enter a valid 6-character pairing code.', 400);
  const raw = value.trim().replace('-', '').toUpperCase();
  const s = [...store.sessions.values()].find((s) => s.shortCode.replace('-', '') === raw);
  if (!s) throw new DemoError('Pairing code not found. Check the code shown on your device.', 404);
  refresh(s);
  if (s.status === 'expired')
    throw new DemoError(
      'This pairing code has expired. Generate a new code on the device and try again.',
      410,
    );
  if (s.status === 'cancelled')
    throw new DemoError(
      'This pairing session was cancelled. Generate a new code on the device.',
      410,
    );
  if (s.status !== 'waiting_for_user')
    throw new DemoError('This pairing code has already been used.');
  s.status = 'claimed';
  return s;
}
export function confirmSession(id: string, body: Record<string, unknown>) {
  const s = getSession(id);
  if (s.status !== 'claimed')
    throw new DemoError(
      s.status === 'expired'
        ? 'This pairing code has expired.'
        : 'This session cannot be confirmed.',
    );
  if (
    body.organizationId !== 'free-trial' ||
    typeof body.displayName !== 'string' ||
    !body.displayName.trim() ||
    body.displayName.length > 80
  )
    throw new DemoError('Provide a device name (1–80 characters) and the demo organization.', 400);
  s.claim = {
    organizationId: 'free-trial',
    organizationName: 'Clea Free Trial',
    displayName: body.displayName.trim(),
  };
  s.startedAt = Date.now();
  s.status = 'confirmed';
  s.step = 0;
  return s;
}
export function action(id: string, action: string) {
  const s = getSession(id);
  if (action === 'cancel') {
    if (s.status === 'connected')
      throw new DemoError('Connected devices cannot be cancelled. Use Reset demo.');
    s.status = 'cancelled';
  } else if (action === 'retry') {
    if (s.status !== 'failed') throw new DemoError('Only failed provisioning can be retried.');
    s.simulateOffline = false;
    s.startedAt = Date.now();
    s.step = 0;
    s.status = 'confirmed';
  } else if (action === 'expire') {
    if (!pending.includes(s.status)) throw new DemoError('Only a pending code can expire.');
    s.expiresAt = new Date(Date.now() - 1).toISOString();
    s.status = 'expired';
  } else if (action === 'offline') {
    if (!pending.includes(s.status)) throw new DemoError('Choose this scenario before pairing.');
    s.simulateOffline = !s.simulateOffline;
  } else throw new DemoError('Unknown demo action.', 404);
  return s;
}
export function reset() {
  store.sessions.clear();
  delete store.currentId;
}
