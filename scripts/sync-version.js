// Run after changing package.json version
import fs from 'fs';
import path from 'path';

const pkgPath = path.join(process.cwd(), 'package.json');
const versionFilePath = path.join(process.cwd(), 'public', 'version.json');
const swFilePath = path.join(process.cwd(), 'public', 'service-worker.js');
const versionTsPath = path.join(process.cwd(), 'src', 'version.ts');

try {
  // 1. Read version from package.json (Single Source of Truth)
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version || '2.2.1';
  const today = new Date().toISOString().split('T')[0];

  // 2. Update public/version.json while preserving existing extra fields (e.g. commit, buildTime)
  let existingVersionJson = {};
  if (fs.existsSync(versionFilePath)) {
    try {
      existingVersionJson = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
    } catch (e) {
      console.warn('[sync-version] Could not parse existing version.json, creating new.');
    }
  }

  const versionJsonContent = {
    ...existingVersionJson,
    version: version,
    buildDate: today,
  };

  fs.writeFileSync(versionFilePath, JSON.stringify(versionJsonContent, null, 2) + '\n', 'utf8');
  console.log(`[sync-version] Updated public/version.json to version ${version}`);

  // 3. Update public/service-worker.js CACHE_NAME robustly
  if (fs.existsSync(swFilePath)) {
    let swContent = fs.readFileSync(swFilePath, 'utf8');
    const swRegex = /(const\s+CACHE_NAME\s*=\s*)(['"])[^'"]+\2(;?)/;
    if (swRegex.test(swContent)) {
      swContent = swContent.replace(swRegex, `$1$2cica-nyt-v${version}$2$3`);
      fs.writeFileSync(swFilePath, swContent, 'utf8');
      console.log(`[sync-version] Updated CACHE_NAME in public/service-worker.js to cica-nyt-v${version}`);
    } else {
      console.warn('[sync-version] CACHE_NAME pattern not found in service-worker.js');
    }
  }

  // 4. Update src/version.ts
  if (fs.existsSync(versionTsPath)) {
    const versionTsContent = `import pkg from '../package.json';\n\nexport const APP_VERSION = pkg.version || '${version}';\n`;
    fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');
    console.log(`[sync-version] Updated src/version.ts to ${version}`);
  }

} catch (err) {
  console.error('[sync-version] Failed to sync version files:', err);
  process.exit(1);
}
