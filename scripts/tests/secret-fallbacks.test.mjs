import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('no predictable fallback signing secret remains in auth code', () => {
  const files = ['src/lib/auth.ts', 'src/lib/internalAuth.ts', 'src/lib/mobileAuth.ts'];
  for (const f of files) {
    const source = readFileSync(join(root, f), 'utf8');
    assert.ok(
      !source.includes('aide-secret-development-key-32-chars-long'),
      `${f} still contains the hardcoded development secret`,
    );
  }
});

test('auth secret fails closed in production at request time', () => {
  const source = readFileSync(join(root, 'src/lib/auth.ts'), 'utf8');
  assert.match(source, /process\.env\.NODE_ENV === "production"/);
  assert.match(source, /throw new Error\("NEXTAUTH_SECRET is required in production"\)/);
  // Guard is invoked from both auth entry points, not at module load.
  assert.match(source, /async authorize\(credentials\) \{[\s\S]*?assertProductionSecret\(\)/);
  assert.match(source, /async jwt\(\{ token, user, account \}\) \{[\s\S]*?assertProductionSecret\(\)/);
  assert.ok(!/secret: resolveAuthSecret\(\)[^\n]*throw/.test(source));
});

test('dev fallback is random, not a constant literal', () => {
  const source = readFileSync(join(root, 'src/lib/auth.ts'), 'utf8');
  assert.match(source, /randomBytes\(32\)\.toString\("hex"\)/);
});
