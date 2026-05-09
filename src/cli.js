import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearInterval, setInterval } from 'node:timers';

import { createUsageSnapshot, findLatestSessionFile, readLatestRateLimitEvent } from './sessions.js';
import { renderJson, renderText } from './render.js';

const DEFAULT_INTERVAL_SECONDS = 30;

export async function main(argv, io = process) {
  const options = await parseArgs(argv);

  if (options.help) {
    io.stdout.write(helpText());
    return;
  }

  if (options.version) {
    io.stdout.write(`${await readPackageVersion()}\n`);
    return;
  }

  if (options.json || options.once) {
    await printOnce(options, io);
    return;
  }

  await runLive(options, io);
}

export async function parseArgs(argv, env = process.env) {
  const options = {
    once: false,
    intervalSeconds: parseInterval(env.CODEX_USAGE_INTERVAL, DEFAULT_INTERVAL_SECONDS),
    sessionsDir: env.CODEX_SESSIONS_DIR ?? defaultSessionsDir(),
    json: false,
    ascii: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--once') {
      options.once = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--ascii') {
      options.ascii = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--interval') {
      index += 1;
      options.intervalSeconds = parseInterval(requiredValue(argv[index], '--interval'), DEFAULT_INTERVAL_SECONDS);
    } else if (arg.startsWith('--interval=')) {
      options.intervalSeconds = parseInterval(arg.slice('--interval='.length), DEFAULT_INTERVAL_SECONDS);
    } else if (arg === '--sessions-dir') {
      index += 1;
      options.sessionsDir = requiredValue(argv[index], '--sessions-dir');
    } else if (arg.startsWith('--sessions-dir=')) {
      options.sessionsDir = arg.slice('--sessions-dir='.length);
    } else {
      throw new Error(`Unknown option: ${arg}\nRun codex-usage --help for usage.`);
    }
  }

  options.sessionsDir = resolve(options.sessionsDir);
  return options;
}

export function defaultSessionsDir(home = process.env.USERPROFILE ?? process.env.HOME) {
  if (!home) {
    return resolve('.codex', 'sessions');
  }

  return resolve(home, '.codex', 'sessions');
}

async function printOnce(options, io) {
  const snapshot = await readUsageSnapshot(options.sessionsDir);
  const output = options.json ? renderJson(snapshot) : renderText(snapshot, { ascii: options.ascii });
  io.stdout.write(`${output}\n`);
}

async function runLive(options, io) {
  let timer;

  const tick = async () => {
    io.stdout.write('\x1B[2J\x1B[H');

    try {
      const snapshot = await readUsageSnapshot(options.sessionsDir);
      io.stdout.write(`${renderText(snapshot, { ascii: options.ascii })}\n\nCtrl-C to stop\n`);
    } catch (error) {
      io.stdout.write(`${error instanceof Error ? error.message : String(error)}\n\nCtrl-C to stop\n`);
    }
  };

  await tick();
  timer = setInterval(tick, options.intervalSeconds * 1000);

  await new Promise((resolve) => {
    io.once('SIGINT', () => {
      clearInterval(timer);
      io.stdout.write('\n');
      resolve();
    });
  });
}

async function readUsageSnapshot(sessionsDir) {
  const sessionFile = await findLatestSessionFile(sessionsDir);
  const event = await readLatestRateLimitEvent(sessionFile);
  return createUsageSnapshot(event, sessionFile);
}

function parseInterval(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid interval: ${value}`);
  }

  return parsed;
}

function requiredValue(value, option) {
  if (!value) {
    throw new Error(`${option} requires a value`);
  }

  return value;
}

async function readPackageVersion() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(await readFile(resolve(currentDir, '..', 'package.json'), 'utf8'));
  return packageJson.version;
}

function helpText() {
  return `Usage: codex-usage [options]

Show Codex rate-limit usage from local session logs.

Options:
  --once                    Print once and exit
  --interval <seconds>      Refresh interval for live mode (default: ${DEFAULT_INTERVAL_SECONDS})
  --sessions-dir <path>     Override Codex sessions directory
  --json                    Print parsed usage as JSON and exit
  --ascii                   Use ASCII bars instead of Unicode bars
  --version, -v             Print version
  --help, -h                Print help

Environment:
  CODEX_SESSIONS_DIR        Default sessions directory override
  CODEX_USAGE_INTERVAL      Default live refresh interval
`;
}
