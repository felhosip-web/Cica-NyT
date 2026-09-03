import { create } from 'zustand';
import { getLicenseStatus, LicenseState, validateLicenseLocally, removeLicense, runBackgroundLicenseCheck } from '../services/licenseService';

interface LicenseStore extends LicenseState {
  refreshStatus: () => void;
  saveKey: (key: string) => Promise<boolean>;
  removeKey: () => void;
  backgroundCheck: () => Promise<void>;
}

export const useLicenseStore = create<LicenseStore>((set) => ({
  ...getLicenseStatus(),

  refreshStatus: () => {
    set({ ...getLicenseStatus() });
  },

  saveKey: async (key: string) => {
    const success = await validateLicenseLocally(key);
    if (success) {
      set({ ...getLicenseStatus() });
    }
    return success;
  },

  removeKey: () => {
    removeLicense();
    set({ ...getLicenseStatus() });
  },

  backgroundCheck: async () => {
    await runBackgroundLicenseCheck();
    set({ ...getLicenseStatus() });
  }
}));
