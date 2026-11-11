import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(root, '..');

// Runs once before the entire test suite.
// Resets and migrates the dedicated test database so every run starts clean.
export function setup() {
  execSync('npx prisma migrate reset --force --skip-seed', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
}
