import fs from 'fs';
import path from 'path';

const pkgPath = path.join(process.cwd(), 'package.json');
const versionFilePath = path.join(process.cwd(), 'public', 'version.json');
const swFilePath = path.join(process.cwd(), 'public', 'service-worker.js');
const versionTsPath = path.join(process.cwd(), 'src', 'version.ts');

try {
  // 1. Read version from package.json
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version || '2.9.1';
  const today = new Date().toISOString().split('T')[0];

  // 2. Update public/version.json
  const versionJsonContent = {
    version: version,
    build: today,
  };
  fs.writeFileSync(versionFilePath, JSON.stringify(versionJsonContent, null, 2) + '\n', 'utf8');
  console.log(`[sync-version] Updated public/version.json to version ${version}`);

  // 3. Update public/service-worker.js
  if (fs.existsSync(swFilePath)) {
    let swContent = fs.readFileSync(swFilePath, 'utf8');
    swContent = swContent.replace(
      /const CACHE_NAME = ['"]cica-nyt-v[\d.]+['"];/,
      `const CACHE_NAME = 'cica-nyt-v${version}';`
    );
    fs.writeFileSync(swFilePath, swContent, 'utf8');
    console.log(`[sync-version] Updated CACHE_NAME in public/service-worker.js to cica-nyt-v${version}`);
  }

  // 4. Update src/version.ts
  if (fs.existsSync(versionTsPath)) {
    const versionTsContent = `import pkg from '../package.json';\n\nexport const APP_VERSION = pkg.version || '${version}';\n`;
    fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');
    console.log(`[sync-version] Updated src/version.ts to ${version}`);
  }

} catch (err) {
  console.error('[sync-version] Failed to sync version files:', err);
}
