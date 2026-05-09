import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const files = [
  'bin/codex-usage.js',
  'src/cli.js',
  'src/render.js',
  'src/sessions.js',
  'test/cli.test.js',
  'test/render.test.js',
  'test/sessions.test.js',
  'README.md',
  'LICENSE',
  '.gitignore',
  '.github/workflows/ci.yml',
];

let failed = false;

for (const file of files) {
  const content = await readFile(join(process.cwd(), file), 'utf8');

  if (!content.endsWith('\n')) {
    console.error(`${file}: missing trailing newline`);
    failed = true;
  }

  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (/[ \t]$/.test(line)) {
      console.error(`${file}:${index + 1}: trailing whitespace`);
      failed = true;
    }
  });
}

if (failed) {
  process.exitCode = 1;
}
