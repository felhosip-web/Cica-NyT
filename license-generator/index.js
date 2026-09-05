import crypto from 'node:crypto';

// Configuration
const VALID_TIERS = ['TRIAL', 'BASIC', 'FULL', 'ROOT'];
const SECRET_SALT = process.env.LICENSE_SECRET || process.env.VITE_LICENSE_SECRET || 'C1c4-Nyt-S3cr3t-2024';

/**
 * Synchronous FNV-1a hash algorithm for fast, non-blocking signature generation.
 * This MUST match the implementation in src/lib/licenseCrypto.ts exactly.
 */
function hashStringFNV1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

/**
 * Generates a random alphanumeric payload of given length.
 */
function generateRandomPayload(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  // Use crypto.getRandomValues equivalent for better randomness if needed,
  // but Math.random is sufficient for payload if we just need random chars,
  // actually crypto is better.
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Generates a full license key string
 */
function generateLicenseKey(tier, payload) {
  const baseString = `CICA-${tier}-${payload}-${SECRET_SALT}`;
  const signature = hashStringFNV1a(baseString);
  return `CICA-${tier}-${payload}-${signature}`;
}

// CLI Logic
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
Cica-NyT License Key Generator
==============================

Usage:
  node index.js <TIER> [COUNT]

Arguments:
  TIER    - The license tier. Must be one of: ${VALID_TIERS.join(', ')}
  COUNT   - Number of keys to generate (default: 1)

Examples:
  node index.js FULL
  node index.js BASIC 5

Environment Variables:
  LICENSE_SECRET or VITE_LICENSE_SECRET - Override the default secret salt.
`);
  process.exit(0);
}

const tier = args[0].toUpperCase();
const count = parseInt(args[1], 10) || 1;

if (!VALID_TIERS.includes(tier)) {
  console.error(`Error: Invalid tier '${tier}'. Must be one of: ${VALID_TIERS.join(', ')}`);
  process.exit(1);
}

if (isNaN(count) || count < 1) {
  console.error('Error: COUNT must be a positive integer.');
  process.exit(1);
}

console.log(`Generating ${count} ${tier} key(s)...\n`);

for (let i = 0; i < count; i++) {
  const payload = generateRandomPayload(8);
  const key = generateLicenseKey(tier, payload);
  console.log(key);
}

console.log('\nDone.');
