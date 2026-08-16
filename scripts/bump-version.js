import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const pkgPath = path.join(process.cwd(), 'package.json');

// Read package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '2.9.1';
const versionParts = currentVersion.split('.').map((n) => parseInt(n, 10) || 0);

// Bump patch version (or minor if patch is high)
versionParts[2] += 1;
const newVersion = versionParts.join('.');

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`[bump-version] Bumped package.json version to ${newVersion}`);

// Run sync-version.js
execSync('node scripts/sync-version.js', { stdio: 'inherit' });
lePath, JSON.stringify(versionData, null, 2) + '\n');
console.log(`Bumped version to ${newVersion} in version.json`);

// 2. Update service-worker.js
let swContent = fs.readFileSync(swFilePath, 'utf8');
swContent = swContent.replace(/const CACHE_NAME = 'cica-nyt-v[\d.]+';/, `const CACHE_NAME = 'cica-nyt-v${newVersion}';`);
fs.writeFileSync(swFilePath, swContent);
console.log(`Updated CACHE_NAME in service-worker.js to cica-nyt-v${newVersion}`);

// 3. Update index.html
let indexContent = fs.readFileSync(indexFilePath, 'utf8');
indexContent = indexContent.replace(/src="\/src\/js\/app\.js\?v=[\d.]+"/g, `src="/src/js/app.js?v=${newVersion}"`);
fs.writeFileSync(indexFilePath, indexContent);
console.log(`Updated index.html app.js script query string to ?v=${newVersion}`);
