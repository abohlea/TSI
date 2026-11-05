import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
  ['PlayCanvas client: typecheck + production build', ['--prefix', 'prototype', 'run', 'build']],
  ['Colyseus server: typecheck', ['--prefix', 'backend/realtime', 'run', 'typecheck']],
  ['Colyseus server: unit tests', ['--prefix', 'backend/realtime', 'test']],
  ['Colyseus server: compile', ['--prefix', 'backend/realtime', 'run', 'build']],
  ['Firebase: TypeScript checks', ['--prefix', 'backend/firebase', 'run', 'typecheck']],
  ['Firebase: Firestore emulator tests', ['--prefix', 'backend/firebase', 'test']]
];

for (const [label, args] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const result = spawnSync(npm, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) {
    process.stderr.write(`${label}: ${result.error.message}\n`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stderr.write(`${label}: failed (exit ${result.status ?? 'unknown'})\n`);
    process.exit(result.status ?? 1);
  }
}

process.stdout.write('\nAll active TSI validation steps passed.\n');
