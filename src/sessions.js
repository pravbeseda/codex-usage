import { createReadStream } from 'node:fs';
import { opendir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export async function findLatestSessionFile(sessionsDir) {
  sessionsDir = toPath(sessionsDir);
  let dirStat;

  try {
    dirStat = await stat(sessionsDir);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Codex sessions directory not found: ${sessionsDir}`);
    }

    throw error;
  }

  if (!dirStat.isDirectory()) {
    throw new Error(`Codex sessions path is not a directory: ${sessionsDir}`);
  }

  let latest = null;

  for await (const file of walkJsonlFiles(sessionsDir)) {
    const fileStat = await stat(file);

    if (!latest || fileStat.mtimeMs > latest.mtimeMs) {
      latest = { path: file, mtimeMs: fileStat.mtimeMs };
    }
  }

  if (!latest) {
    throw new Error(`No Codex session logs found in ${sessionsDir}`);
  }

  return latest.path;
}

export async function readLatestRateLimitEvent(sessionFile) {
  sessionFile = toPath(sessionFile);
  const input = createReadStream(sessionFile, { encoding: 'utf8' });
  const lines = createInterface({
    input,
    crlfDelay: Infinity,
  });

  let latest = null;

  for await (const line of lines) {
    if (!line.includes('"rate_limits"')) {
      continue;
    }

    const event = parseJsonLine(line);
    const limits = getRateLimits(event);

    if (limits) {
      latest = event;
    }
  }

  if (!latest) {
    throw new Error(`No Codex rate limit data found in latest session: ${sessionFile}`);
  }

  return latest;
}

export function createUsageSnapshot(event, sessionFile) {
  const limits = getRateLimits(event);

  if (!limits) {
    throw new Error('No rate_limits field found in latest Codex event');
  }

  const info = event.payload?.info;

  return {
    sessionFile,
    updatedAt: event.timestamp ?? null,
    rateLimits: {
      planType: limits.plan_type ?? null,
      primary: normalizeWindow(limits.primary),
      secondary: normalizeWindow(limits.secondary),
    },
    usage: info
      ? {
          totalTokens: numberOrNull(info.total_token_usage?.total_tokens),
          lastTurnTokens: numberOrNull(info.last_token_usage?.total_tokens),
          contextWindow: numberOrNull(info.model_context_window),
        }
      : null,
    raw: {
      rateLimits: limits,
      info: info ?? null,
    },
  };
}

export function getRateLimits(event) {
  return event?.rate_limits ?? event?.payload?.rate_limits ?? null;
}

async function* walkJsonlFiles(root) {
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    const directory = await opendir(current);

    for await (const entry of directory) {
      const path = join(current, entry.name);

      if (entry.isDirectory()) {
        pending.push(path);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        yield path;
      }
    }
  }
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function normalizeWindow(value) {
  if (!value) {
    return null;
  }

  return {
    usedPercent: numberOrNull(value.used_percent),
    windowMinutes: numberOrNull(value.window_minutes),
    resetsAt: numberOrNull(value.resets_at),
  };
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toPath(value) {
  return value instanceof URL ? fileURLToPath(value) : value;
}
