import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  action,
  confirmSession,
  createSession,
  getSession,
  refresh,
  reset,
  resolveCode,
  snapshot,
} from '../src/lib/store';

beforeEach(reset);
test('temporary code resolves once and provisioning completes after explicit confirmation', () => {
  const s = createSession();
  assert.match(s.shortCode, /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
  assert.equal(Date.parse(s.expiresAt) - Date.parse(s.createdAt), 600000);
  assert.throws(() => confirmSession(s.id, { organizationId: 'free-trial', displayName: 'Kit' }));
  resolveCode(s.shortCode.toLowerCase().replace('-', ''));
  assert.throws(() => resolveCode(s.shortCode), /already been used/);
  confirmSession(s.id, { organizationId: 'free-trial', displayName: 'Demo kit' });
  for (const [ms, status] of [
    [0, 'confirmed'],
    [800, 'registering'],
    [3100, 'provisioning'],
    [4600, 'connecting'],
    [6500, 'connected'],
  ] as const) {
    assert.equal(refresh(s, s.startedAt! + ms).status, status);
  }
  assert.equal(snapshot().devices.length, 1);
  assert.equal(s.claim?.displayName, 'Demo kit');
  assert.ok(!JSON.stringify(s).includes('credentials_secret'));
});
test('syntax, missing, expired, cancelled and reused codes are distinguished', () => {
  assert.throws(() => resolveCode(''), /valid 6-character/);
  assert.throws(() => resolveCode('ZZZ-ZZZ'), /not found/);
  const expired = createSession();
  refresh(expired, Date.parse(expired.expiresAt));
  assert.throws(() => resolveCode(expired.shortCode), /expired/);
  const cancelled = createSession();
  action(cancelled.id, 'cancel');
  assert.throws(() => resolveCode(cancelled.shortCode), /cancelled/);
});
test('regeneration invalidates old code and reset removes all sessions', () => {
  const first = createSession();
  const second = createSession();
  assert.notEqual(first.shortCode, second.shortCode);
  assert.throws(() => resolveCode(first.shortCode), /cancelled/);
  reset();
  assert.equal(snapshot().current, null);
  assert.throws(() => getSession(second.id), /not found/);
});
test('offline failure is recoverable through retry without reusing the code', () => {
  const s = createSession();
  action(s.id, 'offline');
  resolveCode(s.shortCode);
  confirmSession(s.id, { organizationId: 'free-trial', displayName: 'Kit' });
  refresh(s, s.startedAt! + 3200);
  assert.equal(s.status, 'failed');
  assert.throws(() => resolveCode(s.shortCode), /already been used/);
  action(s.id, 'retry');
  refresh(s, s.startedAt! + 6500);
  assert.equal(s.status, 'connected');
});
test('claim expiry, input validation and cancellation prevent accidental completion', () => {
  const s = createSession();
  resolveCode(s.shortCode);
  assert.throws(() => confirmSession(s.id, { organizationId: 'another-org', displayName: 'Kit' }));
  assert.throws(() => confirmSession(s.id, { organizationId: 'free-trial', displayName: ' ' }));
  action(s.id, 'expire');
  assert.throws(
    () => confirmSession(s.id, { organizationId: 'free-trial', displayName: 'Kit' }),
    /expired/,
  );
  const next = createSession();
  resolveCode(next.shortCode);
  confirmSession(next.id, { organizationId: 'free-trial', displayName: 'Kit' });
  assert.throws(createSession, /in progress/);
  action(next.id, 'cancel');
  refresh(next, next.startedAt! + 10000);
  assert.equal(next.status, 'cancelled');
});
