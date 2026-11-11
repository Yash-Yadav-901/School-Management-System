import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(root, '..');

// Runs once before the entire test suite.
// Resets and migrates the dedicated test database, then seeds synthetic data so tests run against clean, known data.
export function setup() {
  const prismaDir = path.join(serverDir, 'prisma');
  for (const f of ['test.db', 'test.db-journal', 'test.db-wal', 'test.db-shm']) {
    const p = path.join(prismaDir, f);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // ignore if locked
      }
    }
  }

  const testEnv = {
    ...process.env,
    DATABASE_URL: 'file:./test.db',
    BCRYPT_ROUNDS: '4',
    LOG_SILENT: 'true',
  };

  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    env: testEnv,
    stdio: 'pipe',
  });

  execSync('node prisma/seed.js', {
    cwd: serverDir,
    env: testEnv,
    stdio: 'pipe',
  });
}
