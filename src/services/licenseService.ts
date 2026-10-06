const LICENSE_KEY_STORAGE_KEY = 'cica_license_key';
const LICENSE_LAST_CHECK_STORAGE_KEY = 'cica_license_last_check';
const LICENSE_TERMS_ACCEPTED_STORAGE_KEY = 'cica_license_terms_accepted_at';

const GRACE_PERIOD_DAYS = 7;
const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
export const LICENSE_STATUS_CHANGE_EVENT = 'cica-license-status-change';

const notifyLicenseStatusChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LICENSE_STATUS_CHANGE_EVENT));
  }
};

import { validateLicenseKey, LicenseTier } from '../lib/licenseCrypto';

export type LicenseStatus = 'valid' | 'grace' | 'locked';

export interface LicenseState {
  status: LicenseStatus;
  key: string | null;
  tier: LicenseTier | null;
  lastCheck: number | null;
  daysRemainingInGrace: number | null;
}

export const isLicenseAccepted = (): boolean => {
  if (typeof localStorage === 'undefined') return false;
  return !!localStorage.getItem(LICENSE_TERMS_ACCEPTED_STORAGE_KEY);
};

export const getLicenseAcceptedAt = (): string | null => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(LICENSE_TERMS_ACCEPTED_STORAGE_KEY);
};

export const acceptLicenseTerms = (): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LICENSE_TERMS_ACCEPTED_STORAGE_KEY, new Date().toISOString());
    notifyLicenseStatusChange();
  }
};

export const getLicenseStatus = (): LicenseState => {
  if (typeof localStorage === 'undefined') {
    return { status: 'locked', key: null, tier: null, lastCheck: null, daysRemainingInGrace: null };
  }

  const key = localStorage.getItem(LICENSE_KEY_STORAGE_KEY);
  const lastCheckStr = localStorage.getItem(LICENSE_LAST_CHECK_STORAGE_KEY);

  if (!key) {
    return { status: 'locked', key: null, tier: null, lastCheck: null, daysRemainingInGrace: null };
  }

  const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;
  const now = Date.now();
  const timeSinceLastCheck = now - lastCheck;

  // Validate format and signature algorithmically
  const validation = validateLicenseKey(key);
  if (!validation.valid) {
    return { status: 'locked', key, tier: null, lastCheck, daysRemainingInGrace: null };
  }

  if (timeSinceLastCheck > GRACE_PERIOD_MS) {
     return { status: 'locked', key, tier: validation.tier || null, lastCheck, daysRemainingInGrace: 0 };
  }

  const GRACE_START_MS = 3 * 24 * 60 * 60 * 1000;

  if (timeSinceLastCheck > GRACE_START_MS) {
    const msRemaining = GRACE_PERIOD_MS - timeSinceLastCheck;
    const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    return { status: 'grace', key, tier: validation.tier || null, lastCheck, daysRemainingInGrace: daysRemaining };
  }

  return { status: 'valid', key, tier: validation.tier || null, lastCheck, daysRemainingInGrace: null };
};

export const checkLicenseRemote = async (key: string): Promise<boolean> => {
  console.log('Checking license remotely for key:', key);
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = validateLicenseKey(key);
      resolve(result.valid);
    }, 500);
  });
};

export const validateLicenseLocally = async (key: string): Promise<boolean> => {
  if (!key) {
    return false;
  }

  const validation = validateLicenseKey(key);
  if (!validation.valid) {
    return false;
  }

  localStorage.setItem(LICENSE_KEY_STORAGE_KEY, key);
  localStorage.setItem(LICENSE_LAST_CHECK_STORAGE_KEY, Date.now().toString());
  notifyLicenseStatusChange();

  return true;
};

export const removeLicense = () => {
  localStorage.removeItem(LICENSE_KEY_STORAGE_KEY);
  localStorage.removeItem(LICENSE_LAST_CHECK_STORAGE_KEY);
  notifyLicenseStatusChange();
};

export const runBackgroundLicenseCheck = async () => {
  const state = getLicenseStatus();
  if (state.key) {
    const isValid = await checkLicenseRemote(state.key);
    if (isValid) {
      localStorage.setItem(LICENSE_LAST_CHECK_STORAGE_KEY, Date.now().toString());
      notifyLicenseStatusChange();
    }
  }
};
