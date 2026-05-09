import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { createUsageSnapshot, findLatestSessionFile, readLatestRateLimitEvent } from '../src/sessions.js';

const fixtures = new URL('./fixtures/', import.meta.url);

test('findLatestSessionFile discovers jsonl files recursively', async () => {
  const file = await findLatestSessionFile(new URL('./basic/', fixtures));
  assert.equal(file.endsWith('session.jsonl'), true);
});

test('readLatestRateLimitEvent supports payload.rate_limits shape', async () => {
  const file = new URL('./basic/2026/05/09/session.jsonl', fixtures);
  const event = await readLatestRateLimitEvent(file);
  const snapshot = createUsageSnapshot(event, file.pathname);

  assert.equal(snapshot.rateLimits.planType, 'plus');
  assert.equal(snapshot.rateLimits.primary.usedPercent, 48);
  assert.equal(snapshot.usage.totalTokens, 110097);
});

test('readLatestRateLimitEvent supports top-level rate_limits shape', async () => {
  const file = new URL('./top-level/session.jsonl', fixtures);
  const event = await readLatestRateLimitEvent(file);
  const snapshot = createUsageSnapshot(event, file.pathname);

  assert.equal(snapshot.rateLimits.planType, 'pro');
  assert.equal(snapshot.rateLimits.primary.usedPercent, 12.5);
});

test('readLatestRateLimitEvent skips malformed JSON lines', async () => {
  const file = new URL('./malformed/session.jsonl', fixtures);
  const event = await readLatestRateLimitEvent(file);
  const snapshot = createUsageSnapshot(event, file.pathname);

  assert.equal(snapshot.rateLimits.planType, 'team');
  assert.equal(snapshot.rateLimits.primary.usedPercent, 2);
});

test('readLatestRateLimitEvent reports sessions without usage data', async () => {
  const file = new URL('./missing/session.jsonl', fixtures);
  await assert.rejects(readLatestRateLimitEvent(file), /No Codex rate limit data/);
});

test('findLatestSessionFile reports missing directories clearly', async () => {
  await assert.rejects(
    findLatestSessionFile(join(tmpdir(), 'no-codex-usage-sessions-here')),
    /directory not found/,
  );
});

test('findLatestSessionFile chooses the newest file by mtime', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'codex-usage-'));
  const oldFile = join(dir, 'old.jsonl');
  const newFile = join(dir, 'new.jsonl');

  await writeFile(oldFile, '{}\n');
  await new Promise((resolve) => setTimeout(resolve, 10));
  await writeFile(newFile, '{}\n');

  assert.equal(await findLatestSessionFile(dir), newFile);
});
