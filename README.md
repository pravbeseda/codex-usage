# codex-usage

Small npm CLI that reads local Codex session logs and shows human-readable rate-limit usage.

Codex does not currently expose a public stable usage API. This tool reads local session logs, which are an internal and unstable data source. It may need updates if the log format changes.

## Installation

```sh
npm install -g @pravbeseda/codex-usage
```

You can also run it without installing:

```sh
npx @pravbeseda/codex-usage
```

## Usage

```sh
codex-usage
```

Default mode refreshes live every 30 seconds and exits cleanly on `Ctrl-C`.

Example output:

```text
Codex usage (plus)

5 hours    48%  █████████████░░░░░░░░░░░░░░░  reset: 5/9/26, 7:44:28 PM
7 days     11%  ███░░░░░░░░░░░░░░░░░░░░░░░░░  reset: 5/16/26, 1:13:31 PM

tokens   110,097 total
last     29,085 tokens
context  258,400 tokens

updated  5/9/26, 7:19:56 PM
source   /Users/you/.codex/sessions/2026/05/09/session.jsonl
```

## One-Shot Mode

```sh
codex-usage --once
```

## JSON Mode

```sh
codex-usage --json
```

`--json` prints the parsed usage snapshot once and exits.

## Options

```text
--once                    Print once and exit
--interval <seconds>      Refresh interval for live mode
--sessions-dir <path>     Override Codex sessions directory
--json                    Print parsed usage as JSON and exit
--ascii                   Use ASCII bars instead of Unicode bars
--version, -v             Print version
--help, -h                Print help
```

Environment variables:

```text
CODEX_SESSIONS_DIR        Default sessions directory override
CODEX_USAGE_INTERVAL      Default live refresh interval
```

## Platform Notes

The default sessions directory is:

```text
~/.codex/sessions
```

This path works on macOS and Linux. On Windows, the same directory is resolved under `%USERPROFILE%`.

## Known Limitations

- The tool depends on Codex local session log internals.
- It reads the newest `.jsonl` session file recursively under the sessions directory.
- Malformed JSON lines are skipped.
- If the newest session does not contain `rate_limits`, the command exits with a clear error.

## Uninstall

```sh
npm uninstall -g @pravbeseda/codex-usage
```
