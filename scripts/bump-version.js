import fs from 'fs';
import path from 'path';

const versionFilePath = path.join(process.cwd(), 'public', 'version.json');
const swFilePath = path.join(process.cwd(), 'public', 'service-worker.js');
const indexFilePath = path.join(process.cwd(), 'index.html');

// 1. Read and bump version.json
const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
const currentVersion = versionData.version;
const versionParts = currentVersion.split('.');
versionParts[2] = parseInt(versionParts[2], 10) + 1;
const newVersion = versionParts.join('.');
const newBuildDate = new Date().toISOString().split('T')[0];

versionData.version = newVersion;
versionData.build = newBuildDate;
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2) + '\n');
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
