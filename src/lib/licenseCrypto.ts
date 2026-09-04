/**
 * License Key Validation Module
 *
 * Format: CICA-<TIER>-<PAYLOAD>-<SIGNATURE>
 * Example: CICA-FULL-A7K9M2XQ-8F3C1E2A
 */

export type LicenseTier = 'TRIAL' | 'BASIC' | 'FULL' | 'ROOT';

const VALID_TIERS = ['TRIAL', 'BASIC', 'FULL', 'ROOT'];
const SECRET_SALT = import.meta.env?.VITE_LICENSE_SECRET || 'C1c4-Nyt-S3cr3t-2024';

/**
 * Synchronous FNV-1a hash algorithm for fast, non-blocking signature generation.
 * This is used because the Dexie.js hooks require synchronous validation.
 */
function hashStringFNV1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

/**
 * Validates a license key based on format and signature.
 * Note: Since this is a client-side only check, the secret salt is exposed in the bundle.
 */
export function validateLicenseKey(key: string): { valid: boolean; tier?: LicenseTier; reason?: string } {
  if (!key) {
    return { valid: false, reason: 'Nincs megadva kulcs' };
  }

  const parts = key.split('-');

  if (parts.length !== 4) {
    return { valid: false, reason: 'Érvénytelen kulcs formátum' };
  }

  const [prefix, tierStr, payload, signature] = parts;

  if (prefix !== 'CICA') {
    return { valid: false, reason: 'Érvénytelen kulcs prefix' };
  }

  if (!VALID_TIERS.includes(tierStr)) {
    return { valid: false, reason: 'Érvénytelen licenc tier' };
  }

  // Calculate signature
  const baseString = `CICA-${tierStr}-${payload}-${SECRET_SALT}`;
  const expectedSignature = hashStringFNV1a(baseString);

  if (signature !== expectedSignature) {
    return { valid: false, reason: 'Érvénytelen kulcs aláírás (signature)' };
  }

  return { valid: true, tier: tierStr as LicenseTier };
}

/**
 * Helper to generate a test key.
 * Should not be exposed to the UI, just for internal/testing use.
 */
export function __generateTestKey(tier: LicenseTier, payload: string): string {
  const baseString = `CICA-${tier}-${payload}-${SECRET_SALT}`;
  const signature = hashStringFNV1a(baseString);
  return `CICA-${tier}-${payload}-${signature}`;
}
