import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDateTime, renderBar, renderText } from '../src/render.js';

test('renderBar renders unicode bars by default', () => {
  assert.equal(renderBar(50, { width: 10 }), '█████░░░░░');
});

test('renderBar renders ASCII bars when requested', () => {
  assert.equal(renderBar(50, { width: 10, ascii: true }), '#####-----');
});

test('formatDateTime returns unknown for invalid dates', () => {
  assert.equal(formatDateTime(null), 'unknown');
  assert.equal(formatDateTime('not a date'), 'unknown');
});

test('renderText includes usage sections', () => {
  const output = renderText({
    sessionFile: '/tmp/session.jsonl',
    updatedAt: '2026-05-09T15:19:56.077Z',
    rateLimits: {
      planType: 'plus',
      primary: { usedPercent: 48, resetsAt: 1778345068 },
      secondary: { usedPercent: 11, resetsAt: 1778913211 },
    },
    usage: {
      totalTokens: 110097,
      lastTurnTokens: 29085,
      contextWindow: 258400,
    },
  });

  assert.match(output, /Codex usage \(plus\)/);
  assert.match(output, /5 hours/);
  assert.match(output, /reset:/);
  assert.match(output, /tokens/);
  assert.match(output, /updated/);
  assert.match(output, /source   \/tmp\/session\.jsonl/);
});
