import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

import { parseArgs } from '../src/cli.js';

const execFileAsync = promisify(execFile);
const bin = new URL('../bin/codex-usage.js', import.meta.url);
const fixtures = new URL('./fixtures/basic/', import.meta.url);

test('parseArgs parses MVP options', async () => {
  const options = await parseArgs([
    '--once',
    '--interval',
    '5',
    '--sessions-dir',
    '/tmp/sessions',
    '--json',
    '--ascii',
  ]);

  assert.equal(options.once, true);
  assert.equal(options.intervalSeconds, 5);
  assert.equal(options.sessionsDir, resolve('/tmp/sessions'));
  assert.equal(options.json, true);
  assert.equal(options.ascii, true);
});

test('CLI smoke test for --help', async () => {
  const { stdout } = await execFileAsync(process.execPath, [fileURLToPath(bin), '--help']);
  assert.match(stdout, /Usage: codex-usage/);
});

test('CLI smoke test for --once', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    fileURLToPath(bin),
    '--once',
    '--sessions-dir',
    fileURLToPath(fixtures),
  ]);

  assert.match(stdout, /Codex usage \(plus\)/);
  assert.match(stdout, /5 hours/);
});

test('CLI smoke test for --json', async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    fileURLToPath(bin),
    '--json',
    '--sessions-dir',
    fileURLToPath(fixtures),
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.rateLimits.planType, 'plus');
});
