import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Bumps package.json version and triggers sync-version.js.
 * Usage:
 *   node scripts/bump-version.js [patch | minor | major | <explicit_version>]
 */
const pkgPath = path.join(process.cwd(), 'package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version || '2.2.1';
  const arg = (process.argv[2] || 'patch').toLowerCase();

  let newVersion = '';

  if (/^\d+\.\d+\.\d+/.test(arg)) {
    newVersion = arg;
  } else {
    const parts = currentVersion.split('.').map((n) => parseInt(n, 10) || 0);
    while (parts.length < 3) parts.push(0);

    if (arg === 'major') {
      parts[0] += 1;
      parts[1] = 0;
      parts[2] = 0;
    } else if (arg === 'minor') {
      parts[1] += 1;
      parts[2] = 0;
    } else {
      // default: patch
      parts[2] += 1;
    }

    newVersion = parts.slice(0, 3).join('.');
  }

  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`[bump-version] Bumped package.json version from ${currentVersion} to ${newVersion}`);

  // Trigger sync-version.js
  execSync('node scripts/sync-version.js', { stdio: 'inherit' });
} catch (err) {
  console.error('[bump-version] Failed to bump version:', err);
  process.exit(1);
}
