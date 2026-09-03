const LICENSE_KEY_STORAGE_KEY = 'cica_license_key';
const LICENSE_LAST_CHECK_STORAGE_KEY = 'cica_license_last_check';
const GRACE_PERIOD_DAYS = 7;
const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export type LicenseStatus = 'valid' | 'grace' | 'locked';

export interface LicenseState {
  status: LicenseStatus;
  key: string | null;
  lastCheck: number | null;
  daysRemainingInGrace: number | null;
}

export const getLicenseStatus = (): LicenseState => {
  if (typeof localStorage === 'undefined') {
    return { status: 'locked', key: null, lastCheck: null, daysRemainingInGrace: null };
  }

  const key = localStorage.getItem(LICENSE_KEY_STORAGE_KEY);
  const lastCheckStr = localStorage.getItem(LICENSE_LAST_CHECK_STORAGE_KEY);

  if (!key) {
    return { status: 'locked', key: null, lastCheck: null, daysRemainingInGrace: null };
  }

  const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;
  const now = Date.now();
  const timeSinceLastCheck = now - lastCheck;

  // Simple local format validation (must be at least 8 chars)
  if (key.length < 8) {
    return { status: 'locked', key, lastCheck, daysRemainingInGrace: null };
  }

  if (timeSinceLastCheck > GRACE_PERIOD_MS) {
     return { status: 'locked', key, lastCheck, daysRemainingInGrace: 0 };
  }

  // Grace period: the last 7 days since last valid check.
  // Actually, usually a license check happens periodically. If it fails, we enter grace.
  // Since we don't have remote checks yet, let's say if the check is older than 5 days, we show a grace warning.
  // Or if we want a 7 day grace period where days 0-7 are 'grace'.
  // Requirement: "7 napos grace period-ot használ". Let's assume the user has a "grace" state
  // if last valid check was more than 3 days ago. (So 4 days remaining).
  // I will make it: > 3 days = grace, otherwise valid.
  const GRACE_START_MS = 3 * 24 * 60 * 60 * 1000;

  if (timeSinceLastCheck > GRACE_START_MS) {
    const msRemaining = GRACE_PERIOD_MS - timeSinceLastCheck;
    const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    return { status: 'grace', key, lastCheck, daysRemainingInGrace: daysRemaining };
  }

  return { status: 'valid', key, lastCheck, daysRemainingInGrace: null };
};

export const checkLicenseRemote = async (key: string): Promise<boolean> => {
  // TODO: Implement remote Supabase/backend validation here
  console.log('Checking license remotely for key:', key);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(key.length >= 8); // Stub
    }, 500);
  });
};

export const validateLicenseLocally = async (key: string): Promise<boolean> => {
  if (!key || key.length < 8) {
    return false;
  }

  // Optional: check format, etc.

  localStorage.setItem(LICENSE_KEY_STORAGE_KEY, key);
  localStorage.setItem(LICENSE_LAST_CHECK_STORAGE_KEY, Date.now().toString());

  return true;
};

export const removeLicense = () => {
  localStorage.removeItem(LICENSE_KEY_STORAGE_KEY);
  localStorage.removeItem(LICENSE_LAST_CHECK_STORAGE_KEY);
};

export const runBackgroundLicenseCheck = async () => {
  const state = getLicenseStatus();
  if (state.key) {
    // In a real app, this would call checkLicenseRemote
    // For now we just validate locally and refresh the lastCheck timestamp
    await validateLicenseLocally(state.key);
  }
};
