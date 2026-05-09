# Codex Usage NPM Package Plan

## Goal

Ship `codex-usage` as a small cross-platform npm CLI that reads local Codex session logs and shows human-readable live rate-limit usage.

Primary install path:

```sh
npm install -g codex-usage
codex-usage
```

Secondary use:

```sh
npx codex-usage
```

## Constraints

- Treat Codex session logs as an internal, unstable data source.
- Avoid runtime dependencies unless they clearly improve portability.
- Support macOS and Linux in the MVP.
- Design Windows support into path handling from the start, then verify on Windows CI.
- Keep output useful in plain terminals without requiring Nerd Fonts or terminal-specific features.

## Phase 1: Repository Scaffold

1. Create a new GitHub repository: `codex-usage`.
2. Add package files:
   - `package.json`
   - `README.md`
   - `LICENSE`
   - `bin/codex-usage.js`
   - `.gitignore`
3. Configure `package.json`:
   - `type: "module"`
   - `bin.codex-usage: "./bin/codex-usage.js"`
   - `engines.node: ">=18"`
4. Add npm scripts:
   - `npm test`
   - `npm run lint`
   - `npm run format:check`

## Phase 2: CLI MVP

1. Parse options:
   - `--once`: print once and exit.
   - `--interval <seconds>`: set live refresh interval.
   - `--sessions-dir <path>`: override Codex sessions directory.
   - `--json`: print parsed usage as JSON.
   - `--help`
   - `--version`
2. Resolve default sessions directory:
   - Unix: `$HOME/.codex/sessions`
   - Windows: `%USERPROFILE%\.codex\sessions`
3. Find latest `.jsonl` session file recursively.
4. Read the latest event containing `rate_limits`.
5. Support both known shapes:
   - `row.rate_limits`
   - `row.payload.rate_limits`
6. Render output:
   - plan type
   - 5-hour usage bar
   - 7-day usage bar
   - reset times in local timezone
   - total tokens
   - last turn tokens
   - context window
   - last updated time
7. Live mode:
   - clear screen
   - re-read latest session every interval
   - exit cleanly on `Ctrl-C`

## Phase 3: Robustness

1. Handle missing sessions directory with a clear error.
2. Handle no `.jsonl` files.
3. Handle sessions without `rate_limits`.
4. Handle malformed JSON lines by skipping them.
5. Avoid loading huge files fully when possible:
   - Read from the end of the latest file, or
   - Stream line-by-line and keep only the latest matching event.
6. Add graceful fallback when terminal does not support Unicode bars:
   - default Unicode
   - optional `--ascii`

## Phase 4: Tests

1. Add fixture logs:
   - current `payload.rate_limits` shape
   - alternate top-level `rate_limits` shape
   - malformed lines
   - missing usage data
2. Unit-test:
   - latest session discovery
   - rate-limit event extraction
   - JSON parsing fallback behavior
   - reset time formatting
   - percentage bar rendering
3. CLI smoke tests:
   - `codex-usage --once --sessions-dir fixtures/basic`
   - `codex-usage --json --sessions-dir fixtures/basic`
   - `codex-usage --help`

## Phase 5: Cross-Platform CI

1. Add GitHub Actions matrix:
   - `ubuntu-latest`
   - `macos-latest`
   - `windows-latest`
2. Test Node versions:
   - Node 18
   - Node 20
   - Node 22
3. Run:
   - install
   - lint
   - tests
   - CLI smoke tests

## Phase 6: Documentation

1. README sections:
   - What it does
   - Installation
   - Usage
   - Live mode
   - One-shot mode
   - JSON mode
   - Options
   - Platform notes
   - Known limitations
2. Add warning:
   - Codex does not currently expose a public stable usage API.
   - This tool reads local session logs and may need updates if the log format changes.
3. Include example output.
4. Include uninstall instructions:

```sh
npm uninstall -g codex-usage
```

## Phase 7: NPM Publish

1. Choose package name:
   - Prefer `codex-usage` if available.
   - Fallback: scoped package, for example `@<user>/codex-usage`.
2. Add npm metadata:
   - `description`
   - `keywords`
   - `repository`
   - `bugs`
   - `homepage`
   - `license`
   - `files`
3. Verify package contents:

```sh
npm pack --dry-run
```

4. Publish first version:

```sh
npm publish
```

5. Create GitHub release `v0.1.0`.

## Phase 8: Homebrew Tap

Do this after the npm package is stable.

1. Create `homebrew-tap` repository.
2. Add formula that installs the npm package or wraps the release artifact.
3. Preferred install command:

```sh
brew tap <user>/tap
brew install codex-usage
```

4. Keep `homebrew/core` as a later option. It is unlikely to accept a new small self-submitted utility until the project has stable releases, users, and enough visibility.

## Phase 9: Windows Distribution

1. Confirm the npm CLI works in:
   - PowerShell
   - Windows Terminal
   - Git Bash, if practical
2. Document:
   - `npm install -g codex-usage`
   - expected Codex log path
3. Later options:
   - Scoop manifest
   - Winget package

## Phase 10: Future Improvements

1. Add compact mode:

```text
Codex 5h 42% | 7d 10% | reset 20:44
```

2. Add `--watch` alias for live mode if default behavior changes later.
3. Add `--no-clear` for terminals where screen clearing is annoying.
4. Add threshold colors:
   - green below 70%
   - yellow 70-89%
   - red 90%+
5. Add support for selecting a specific session file.
6. Consider rewriting in Go or Rust if users want a dependency-free binary.

## Recommended MVP Scope

Implement only:

- `--once`
- live default mode
- `--interval`
- `--sessions-dir`
- `--json`
- macOS/Linux support
- zero runtime dependencies
- tests with fixtures
- GitHub Actions on macOS/Linux/Windows

Defer:

- Homebrew tap
- colors
- Scoop/Winget
- Go/Rust rewrite
