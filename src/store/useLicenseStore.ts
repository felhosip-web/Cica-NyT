import { create } from 'zustand';
import {
  getLicenseStatus,
  LicenseState,
  validateLicenseLocally,
  removeLicense,
  runBackgroundLicenseCheck,
  isLicenseAccepted,
  getLicenseAcceptedAt,
  acceptLicenseTerms
} from '../services/licenseService';

interface LicenseStore extends LicenseState {
  termsAccepted: boolean;
  termsAcceptedAt: string | null;
  refreshStatus: () => void;
  saveKey: (key: string) => Promise<boolean>;
  removeKey: () => void;
  backgroundCheck: () => Promise<void>;
  acceptTerms: () => void;
}

export const useLicenseStore = create<LicenseStore>((set) => {
  // Listen for global custom events to reactively refresh Zustand store state across components
  if (typeof window !== 'undefined') {
    window.addEventListener('cica-license-status-change', () => {
      set({
        ...getLicenseStatus(),
        termsAccepted: isLicenseAccepted(),
        termsAcceptedAt: getLicenseAcceptedAt()
      });
    });
  }

  return {
    ...getLicenseStatus(),
    termsAccepted: isLicenseAccepted(),
    termsAcceptedAt: getLicenseAcceptedAt(),

    refreshStatus: () => {
      set({
        ...getLicenseStatus(),
        termsAccepted: isLicenseAccepted(),
        termsAcceptedAt: getLicenseAcceptedAt()
      });
    },

  saveKey: async (key: string) => {
    const success = await validateLicenseLocally(key);
    if (success) {
      set({
        ...getLicenseStatus(),
        termsAccepted: isLicenseAccepted(),
        termsAcceptedAt: getLicenseAcceptedAt()
      });
    }
    return success;
  },

  removeKey: () => {
    removeLicense();
    set({
      ...getLicenseStatus(),
      termsAccepted: isLicenseAccepted(),
      termsAcceptedAt: getLicenseAcceptedAt()
    });
  },

  backgroundCheck: async () => {
    await runBackgroundLicenseCheck();
    set({
      ...getLicenseStatus(),
      termsAccepted: isLicenseAccepted(),
      termsAcceptedAt: getLicenseAcceptedAt()
    });
  },

  acceptTerms: () => {
    acceptLicenseTerms();
    set({
      termsAccepted: true,
      termsAcceptedAt: getLicenseAcceptedAt()
    });
  }
  };
});
