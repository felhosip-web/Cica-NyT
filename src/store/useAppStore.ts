import { create } from 'zustand';
import {
  UserPermissions,
  UserRole,
  UserAccount,
  DEFAULT_PERMISSIONS_FULL,
  DEFAULT_ROLES,
  DEFAULT_USERS,
} from '../types';

export type ViewOverrideMode = 'auto' | 'mobile' | 'desktop';
export type FooterStyleMode = 'compact' | 'full' | 'both';

export interface HealthCoverageItemConfig {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  type: 'chipped' | 'kiskonyv' | 'spayed' | 'vaccinated' | 'tested' | 'treated' | 'elhunyt' | 'custom';
  customFilterKey?: string;
  showPercentage?: boolean;
}

export type CatCardInfoPocketType =
  | 'chip'
  | 'vaccination'
  | 'spayed'
  | 'color'
  | 'kiskonyv'
  | 'tests'
  | 'intake'
  | 'age'
  | 'cost'
  | 'none';

export interface CatCardInfoPocketConfig {
  id: string;
  label: string;
  enabled: boolean;
  type: CatCardInfoPocketType;
}

export const DEFAULT_CARD_INFO_POCKETS: CatCardInfoPocketConfig[] = [
  { id: 'pocket_1', label: '1. Infó zseb', enabled: true, type: 'chip' },
  { id: 'pocket_2', label: '2. Infó zseb', enabled: true, type: 'vaccination' },
  { id: 'pocket_3', label: '3. Infó zseb', enabled: true, type: 'spayed' },
];

const getInitialCardInfoPockets = (): CatCardInfoPocketConfig[] => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('cica_card_info_pockets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed parsing card info pockets:', e);
      }
    }
  }
  return DEFAULT_CARD_INFO_POCKETS;
};

export interface QuickFilterCardConfig {
  id: string;
  label: string;
  icon: string;
  filterType: 'expired' | 'no-chip' | 'gondozasban' | 'gazdis' | 'ideiglenes' | 'not-spayed' | 'no-kiskonyv' | 'no-photos' | 'elhunyt' | 'custom';
  enabled: boolean;
  colorScheme: 'red' | 'amber' | 'sky' | 'emerald' | 'indigo' | 'rose' | 'blue' | 'purple' | 'slate';
  customStatus?: string;
}

export interface EventNotificationTypeConfig {
  enabled: boolean;
  leadDays: number;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface PushPreferencesSettings {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string; // e.g. "07:00"
  alertFrequency: 'immediate' | 'daily_digest' | 'both';
}

export interface VaccinationThresholdSettings {
  leadDays: number; // pl. 14 nap
  urgentDays: number; // pl. 3 nap (sürgős figyelmeztetés)
  expiredAlertsEnabled: boolean; // Lejárt oltások figyelmeztetése
  kittenProtocolLeadDays: number; // pl. 7 nap kölyökprotokoll
  rabiesLeadDays: number; // pl. 30 nap veszettség elleni oltás
  annualBoosterLeadDays: number; // pl. 14 nap éves emlékeztető
}

export interface InventoryCategoryThresholds {
  nedves_tap: number; // db / tasak
  szaraz_tap: number; // kg
  alom: number; // kg
  gyogyszer: number; // doboz
  parazitamentesito: number; // pipetta / db
  higienia_fertotlenito: number; // l
  felszereles: number; // db
  egyeb: number; // db
}

export interface InventoryThresholdSettings {
  enabled: boolean;
  pushAlerts: boolean;
  inAppAlerts: boolean;
  expiryWarningDays: number; // pl. 30 nap
  expiryCriticalDays: number; // pl. 7 nap
  minimumStockAlerts: boolean;
  categoryThresholds: InventoryCategoryThresholds;
}

export interface NotificationSettings {
  globalEnabled: boolean;
  checkTime: string;
  pushPreferences: PushPreferencesSettings;
  vaccinationThresholds: VaccinationThresholdSettings;
  inventoryThresholds: InventoryThresholdSettings;
  types: {
    oltas: EventNotificationTypeConfig;
    orvosi: EventNotificationTypeConfig;
    mutet: EventNotificationTypeConfig;
    teszt: EventNotificationTypeConfig;
    egyeni: EventNotificationTypeConfig;
  };
}

export const DEFAULT_PUSH_PREFERENCES: PushPreferencesSettings = {
  pushEnabled: true,
  inAppEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  alertFrequency: 'both',
};

export const DEFAULT_VACCINATION_THRESHOLDS: VaccinationThresholdSettings = {
  leadDays: 14,
  urgentDays: 3,
  expiredAlertsEnabled: true,
  kittenProtocolLeadDays: 7,
  rabiesLeadDays: 30,
  annualBoosterLeadDays: 14,
};

export const DEFAULT_INVENTORY_THRESHOLDS: InventoryThresholdSettings = {
  enabled: true,
  pushAlerts: true,
  inAppAlerts: true,
  expiryWarningDays: 30,
  expiryCriticalDays: 7,
  minimumStockAlerts: true,
  categoryThresholds: {
    nedves_tap: 20,
    szaraz_tap: 10,
    alom: 15,
    gyogyszer: 5,
    parazitamentesito: 10,
    higienia_fertotlenito: 5,
    felszereles: 3,
    egyeb: 5,
  },
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  globalEnabled: true,
  checkTime: '08:00',
  pushPreferences: DEFAULT_PUSH_PREFERENCES,
  vaccinationThresholds: DEFAULT_VACCINATION_THRESHOLDS,
  inventoryThresholds: DEFAULT_INVENTORY_THRESHOLDS,
  types: {
    oltas: { enabled: true, leadDays: 14, pushEnabled: true, inAppEnabled: true },
    orvosi: { enabled: true, leadDays: 3, pushEnabled: true, inAppEnabled: true },
    mutet: { enabled: true, leadDays: 7, pushEnabled: true, inAppEnabled: true },
    teszt: { enabled: true, leadDays: 3, pushEnabled: true, inAppEnabled: true },
    egyeni: { enabled: true, leadDays: 1, pushEnabled: true, inAppEnabled: true },
  },
};

const getInitialNotificationSettings = (): NotificationSettings => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('cica_notification_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...parsed,
          pushPreferences: {
            ...DEFAULT_NOTIFICATION_SETTINGS.pushPreferences,
            ...(parsed.pushPreferences || {}),
          },
          vaccinationThresholds: {
            ...DEFAULT_NOTIFICATION_SETTINGS.vaccinationThresholds,
            ...(parsed.vaccinationThresholds || {}),
          },
          inventoryThresholds: {
            ...DEFAULT_NOTIFICATION_SETTINGS.inventoryThresholds,
            ...(parsed.inventoryThresholds || {}),
            categoryThresholds: {
              ...DEFAULT_NOTIFICATION_SETTINGS.inventoryThresholds.categoryThresholds,
              ...(parsed.inventoryThresholds?.categoryThresholds || {}),
            },
          },
          types: {
            ...DEFAULT_NOTIFICATION_SETTINGS.types,
            ...(parsed.types || {}),
          },
        };
      } catch (e) {
        console.warn('Failed parsing notification settings:', e);
      }
    }
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
};

export const DEFAULT_QUICK_FILTER_CARDS: QuickFilterCardConfig[] = [
  { id: 'qf_expired', label: 'Lejárt Oltások', icon: '🔴', filterType: 'expired', enabled: true, colorScheme: 'red' },
  { id: 'qf_no_chip', label: 'Chipre Vár', icon: '🟡', filterType: 'no-chip', enabled: true, colorScheme: 'amber' },
  { id: 'qf_gondozasban', label: 'Gondozásban', icon: '🏡', filterType: 'gondozasban', enabled: true, colorScheme: 'sky' },
  { id: 'qf_gazdis', label: 'Gazdis', icon: '🟢', filterType: 'gazdis', enabled: true, colorScheme: 'emerald' },
  { id: 'qf_ideiglenes', label: 'Ideiglenes Nevelés', icon: '🔵', filterType: 'ideiglenes', enabled: false, colorScheme: 'indigo' },
  { id: 'qf_not_spayed', label: 'Ivartalanításra Vár', icon: '✂️', filterType: 'not-spayed', enabled: false, colorScheme: 'rose' },
  { id: 'qf_no_kiskonyv', label: 'Oltási Könyv Híján', icon: '📘', filterType: 'no-kiskonyv', enabled: false, colorScheme: 'blue' },
  { id: 'qf_no_photos', label: 'Fotó Híján', icon: '📷', filterType: 'no-photos', enabled: false, colorScheme: 'purple' },
];

/**
 * Returns Tailwind CSS classes for a quick filter card based on its color scheme
 * @param colorScheme - The color scheme name (red, amber, sky, emerald, etc.)
 * @returns Object containing CSS classes for active, inactive, border, and text states
 */
export function getCardStyles(colorScheme: string) {
  switch (colorScheme) {
    case 'red':
      return {
        active: 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400',
        inactive: 'bg-red-50 hover:bg-red-100 text-red-900 border-red-200',
        border: 'border-red-200',
        text: 'text-red-900',
      };
    case 'amber':
      return {
        active: 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400',
        inactive: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200',
        border: 'border-amber-200',
        text: 'text-amber-900',
      };
    case 'sky':
      return {
        active: 'bg-sky-600 text-white border-sky-700 shadow-md ring-2 ring-sky-400',
        inactive: 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200',
        border: 'border-sky-200',
        text: 'text-sky-900',
      };
    case 'emerald':
      return {
        active: 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400',
        inactive: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200',
        border: 'border-emerald-200',
        text: 'text-emerald-900',
      };
    case 'indigo':
      return {
        active: 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400',
        inactive: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200',
        border: 'border-indigo-200',
        text: 'text-indigo-900',
      };
    case 'rose':
      return {
        active: 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400',
        inactive: 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200',
        border: 'border-rose-200',
        text: 'text-rose-900',
      };
    case 'blue':
      return {
        active: 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400',
        inactive: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200',
        border: 'border-blue-200',
        text: 'text-blue-900',
      };
    case 'purple':
      return {
        active: 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400',
        inactive: 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200',
        border: 'border-purple-200',
        text: 'text-purple-900',
      };
    case 'slate':
    default:
      return {
        active: 'bg-slate-700 text-white border-slate-800 shadow-md ring-2 ring-slate-400',
        inactive: 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300',
        border: 'border-slate-300',
        text: 'text-slate-900',
      };
  }
}

const getInitialQuickFilterCards = (): QuickFilterCardConfig[] => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('cica_quick_filter_cards');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed parsing quick filter cards:', e);
      }
    }
  }
  return DEFAULT_QUICK_FILTER_CARDS;
};

export const DEFAULT_HEALTH_COVERAGE_ITEMS: HealthCoverageItemConfig[] = [
  { id: 'chipped', label: 'Mikrochippel ellátva', icon: '🏷️', enabled: true, type: 'chipped', showPercentage: true },
  { id: 'kiskonyv', label: 'Oltási kiskönyvvel rendelkezik', icon: '📖', enabled: true, type: 'kiskonyv' },
  { id: 'spayed', label: 'Ivartalanított (Műtött)', icon: '✂️', enabled: true, type: 'spayed' },
  { id: 'vaccinated', label: 'Védőoltással ellátva', icon: '💉', enabled: true, type: 'vaccinated' },
  { id: 'tested', label: 'FeLV/FIV szűrt (Tesztszűrt)', icon: '🧪', enabled: true, type: 'tested' },
  { id: 'treated', label: 'Orvosi kezelésben részesült', icon: '🩺', enabled: true, type: 'treated' },
  { id: 'elhunyt', label: 'Elhunyt cicák száma', icon: '🌈', enabled: true, type: 'elhunyt' },
];

const getInitialHealthCoverageItems = (): HealthCoverageItemConfig[] => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('cica_health_coverage_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed parsing health coverage items:', e);
      }
    }
  }
  return DEFAULT_HEALTH_COVERAGE_ITEMS;
};

const getInitialUsers = (): UserAccount[] => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('cica_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed parsing users:', e);
      }
    }
  }
  return DEFAULT_USERS;
};

const getInitialRoles = (): UserRole[] => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('cica_roles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed parsing roles:', e);
      }
    }
  }
  return DEFAULT_ROLES;
};

interface AppState {
  // Viewport & Device View
  viewportWidth: number;
  viewOverride: ViewOverrideMode;
  setViewportWidth: (width: number) => void;
  setViewOverride: (mode: ViewOverrideMode) => void;

  // App Theme & Role
  theme: string;
  setTheme: (theme: string) => void;
  orgName: string;
  setOrgName: (name: string) => void;
  orgRole: string;
  setOrgRole: (role: string) => void;

  // Root Mode & Debug
  isRootMode: boolean;
  setIsRootMode: (active: boolean) => void;
  debugLogs: string[];
  addDebugLog: (msg: string) => void;
  clearDebugLogs: () => void;

  // UI Customization: Health Coverage Items on Stats View
  healthCoverageItems: HealthCoverageItemConfig[];
  setHealthCoverageItems: (items: HealthCoverageItemConfig[]) => void;
  toggleHealthCoverageItem: (id: string) => void;
  resetHealthCoverageItems: () => void;

  // UI Customization: Quick Filter Cards on Cats/Animals View
  quickFilterCards: QuickFilterCardConfig[];
  quickFilterLayout: 'grid' | 'scroll';
  catListViewMode: 'grid' | 'table';
  setQuickFilterCards: (cards: QuickFilterCardConfig[]) => void;
  setQuickFilterLayout: (layout: 'grid' | 'scroll') => void;
  setCatListViewMode: (mode: 'grid' | 'table') => void;
  toggleQuickFilterCard: (id: string) => void;
  resetQuickFilterCards: () => void;

  // UI Customization: Animal Card 3 Info Pockets
  cardInfoPockets: CatCardInfoPocketConfig[];
  setCardInfoPockets: (pockets: CatCardInfoPocketConfig[]) => void;
  resetCardInfoPockets: () => void;

  // UI Customization: Footer Style Mode
  footerMode: FooterStyleMode;
  setFooterMode: (mode: FooterStyleMode) => void;

  // Notification & Event Lead Days Config
  notificationSettings: NotificationSettings;
  setNotificationSettings: (settings: NotificationSettings) => void;
  setGlobalNotificationsEnabled: (enabled: boolean) => void;
  setNotificationCheckTime: (time: string) => void;
  updatePushPreferences: (updates: Partial<PushPreferencesSettings>) => void;
  updateVaccinationThresholds: (updates: Partial<VaccinationThresholdSettings>) => void;
  updateInventoryThresholds: (updates: Partial<InventoryThresholdSettings>) => void;
  updateInventoryCategoryThreshold: (category: keyof InventoryCategoryThresholds, value: number) => void;
  updateNotificationTypeSetting: (
    type: 'oltas' | 'orvosi' | 'mutet' | 'teszt' | 'egyeni',
    updates: Partial<EventNotificationTypeConfig>
  ) => void;
  resetNotificationSettings: () => void;

  // Multi-User Mode & Permissions State
  multiUserModeEnabled: boolean;
  users: UserAccount[];
  roles: UserRole[];
  currentUserId: string;
  setMultiUserModeEnabled: (enabled: boolean) => void;
  setUsers: (users: UserAccount[]) => void;
  setRoles: (roles: UserRole[]) => void;
  setCurrentUserId: (id: string) => void;
  addUser: (user: UserAccount) => void;
  updateUser: (id: string, updatedUser: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  addRole: (role: UserRole) => void;
  updateRole: (id: string, updatedRole: Partial<UserRole>) => void;
  deleteRole: (id: string) => void;
  resetUsersAndRoles: () => void;
  getCurrentUser: () => UserAccount;
  getCurrentUserPermissions: () => UserPermissions;
  hasPermission: (permKey: keyof UserPermissions) => boolean;

  // PWA & Installation / Update Management
  deferredPrompt: any;
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  updateAvailable: boolean;
  latestVersion: string | null;
  showIosHelpModal: boolean;
  setDeferredPrompt: (evt: any) => void;
  setCanInstall: (can: boolean) => void;
  setIsInstalled: (installed: boolean) => void;
  setIsIos: (isIos: boolean) => void;
  setUpdateAvailable: (available: boolean, ver?: string) => void;
  setShowIosHelpModal: (show: boolean) => void;
  triggerInstall: () => Promise<void>;
  triggerUpdate: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
  viewOverride: (typeof localStorage !== 'undefined' && localStorage.getItem('cica_view_override') as ViewOverrideMode) || 'auto',
  theme: (typeof localStorage !== 'undefined' && localStorage.getItem('cica_theme')) || 'original',
  orgName: (typeof localStorage !== 'undefined' && localStorage.getItem('org_name')) || 'Macskamenhely & Gondozó Nyilvántartó',
  orgRole: (typeof localStorage !== 'undefined' && localStorage.getItem('org_role')) || 'shelter_admin',
  isRootMode: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cica_root_mode') === 'true' : false,
  debugLogs: ['[Zustand] Store initialized at ' + new Date().toLocaleTimeString()],

  healthCoverageItems: getInitialHealthCoverageItems(),
  quickFilterCards: getInitialQuickFilterCards(),
  quickFilterLayout: (typeof localStorage !== 'undefined' && (localStorage.getItem('cica_quick_filter_layout') as 'grid' | 'scroll')) || 'grid',
  catListViewMode: (typeof localStorage !== 'undefined' && (localStorage.getItem('cica_cat_list_view_mode') as 'grid' | 'table')) || 'grid',
  cardInfoPockets: getInitialCardInfoPockets(),
  footerMode: (typeof localStorage !== 'undefined' && (localStorage.getItem('cica_footer_mode') as FooterStyleMode)) || 'compact',
  setFooterMode: (mode) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_footer_mode', mode);
    }
    set({ footerMode: mode });
  },

  notificationSettings: getInitialNotificationSettings(),
  setNotificationSettings: (settings) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(settings));
    }
    set({ notificationSettings: settings });
  },
  setGlobalNotificationsEnabled: (enabled) => {
    const updated = { ...get().notificationSettings, globalEnabled: enabled };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(updated));
    }
    set({ notificationSettings: updated });
  },
  setNotificationCheckTime: (time) => {
    const updated = { ...get().notificationSettings, checkTime: time };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(updated));
    }
    set({ notificationSettings: updated });
  },
  updatePushPreferences: (updates) => {
    const current = get().notificationSettings;
    const updated: NotificationSettings = {
      ...current,
      pushPreferences: {
        ...current.pushPreferences,
        ...updates,
      },
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(updated));
    }
    set({ notificationSettings: updated });
  },
  updateVaccinationThresholds: (updates) => {
    const current = get().notificationSettings;
    const updated: NotificationSettings = {
      ...current,
      vaccinationThresholds: {
        ...current.vaccinationThresholds,
        ...updates,
      },
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(updated));
    }
    set({ notificationSettings: updated });
  },
  updateInventoryThresholds: (updates) => {
    const current = get().notificationSettings;
    const updated: NotificationSettings = {
      ...current,
      inventoryThresholds: {
        ...current.inventoryThresholds,
        ...updates,
      },
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(updated));
    }
    set({ notificationSettings: updated });
  },
  updateInventoryCategoryThreshold: (category, value) => {
    const current = get().notificationSettings;
    const updated: NotificationSettings = {
      ...current,
      inventoryThresholds: {
        ...current.inventoryThresholds,
        categoryThresholds: {
          ...current.inventoryThresholds.categoryThresholds,
          [category]: Math.max(0, value),
        },
      },
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(updated));
    }
    set({ notificationSettings: updated });
  },
  updateNotificationTypeSetting: (type, updates) => {
    const current = get().notificationSettings;
    const updated: NotificationSettings = {
      ...current,
      types: {
        ...current.types,
        [type]: {
          ...current.types[type],
          ...updates,
        },
      },
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(updated));
    }
    set({ notificationSettings: updated });
  },
  resetNotificationSettings: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_notification_settings', JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));
    }
    set({ notificationSettings: DEFAULT_NOTIFICATION_SETTINGS });
  },

  // Multi-User Mode Initial State
  multiUserModeEnabled: typeof localStorage !== 'undefined' ? localStorage.getItem('cica_multi_user_enabled') === 'true' : false,
  users: getInitialUsers(),
  roles: getInitialRoles(),
  currentUserId: typeof localStorage !== 'undefined' ? (localStorage.getItem('cica_current_user_id') || 'user_root') : 'user_root',

  // PWA Initial state
  deferredPrompt: null,
  canInstall: false,
  isInstalled: typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  ),
  isIos: typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
  updateAvailable: false,
  latestVersion: null,
  showIosHelpModal: false,

  setDeferredPrompt: (evt) => set({ deferredPrompt: evt, canInstall: !!evt }),
  setCanInstall: (can) => set({ canInstall: can }),
  setIsInstalled: (installed) => set({ isInstalled: installed, canInstall: !installed }),
  setIsIos: (isIos) => set({ isIos }),
  setUpdateAvailable: (available, ver) => set({ updateAvailable: available, latestVersion: ver || null }),
  setShowIosHelpModal: (show) => set({ showIosHelpModal: show }),

  triggerInstall: async () => {
    const promptEvt = get().deferredPrompt;
    if (promptEvt) {
      try {
        await promptEvt.prompt();
        const choice = await promptEvt.userChoice;
        get().addDebugLog(`[PWA] Install prompt outcome: ${choice.outcome}`);
        if (choice.outcome === 'accepted') {
          set({ canInstall: false, deferredPrompt: null, isInstalled: true });
        }
      } catch (err: any) {
        console.error('Install prompt failed:', err);
        get().addDebugLog(`[PWA] Install error: ${err?.message || err}`);
      }
    } else if (get().isIos) {
      set({ showIosHelpModal: true });
    } else {
      alert('A telepítéshez nyisd meg a böngésző menüjét (⋮ vagy ⚙️), majd válaszd az "Alkalmazás telepítése" vagy "Hozzáadás a kezdőképernyőhöz" opciót!');
    }
  },

  triggerUpdate: () => {
    get().addDebugLog('[PWA] Triggering application update...');
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
    const ver = get().latestVersion;
    if (ver && typeof localStorage !== 'undefined') {
      localStorage.setItem('appVersion', ver);
    }
    window.location.reload();
  },

  setViewportWidth: (width) => set({ viewportWidth: width }),

  setViewOverride: (mode) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_view_override', mode);
    }
    set({ viewOverride: mode });
  },

  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_theme', theme);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },

  setOrgName: (name) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('org_name', name);
    }
    set({ orgName: name });
  },

  setOrgRole: (role) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('org_role', role);
    }
    set({ orgRole: role });
  },

  setIsRootMode: (active) => {
    if (typeof sessionStorage !== 'undefined') {
      if (active) sessionStorage.setItem('cica_root_mode', 'true');
      else sessionStorage.removeItem('cica_root_mode');
    }
    set({ isRootMode: active });
  },

  addDebugLog: (msg) => set((state) => ({ debugLogs: [...state.debugLogs, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  clearDebugLogs: () => set({ debugLogs: [] }),

  setHealthCoverageItems: (items) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_health_coverage_items', JSON.stringify(items));
    }
    set({ healthCoverageItems: items });
  },

  toggleHealthCoverageItem: (id) => {
    const updated = get().healthCoverageItems.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_health_coverage_items', JSON.stringify(updated));
    }
    set({ healthCoverageItems: updated });
  },

  resetHealthCoverageItems: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_health_coverage_items', JSON.stringify(DEFAULT_HEALTH_COVERAGE_ITEMS));
    }
    set({ healthCoverageItems: DEFAULT_HEALTH_COVERAGE_ITEMS });
  },

  setQuickFilterCards: (cards) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_quick_filter_cards', JSON.stringify(cards));
    }
    set({ quickFilterCards: cards });
  },

  setQuickFilterLayout: (layout) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_quick_filter_layout', layout);
    }
    set({ quickFilterLayout: layout });
  },

  setCatListViewMode: (mode) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_cat_list_view_mode', mode);
    }
    set({ catListViewMode: mode });
  },

  toggleQuickFilterCard: (id) => {
    const updated = get().quickFilterCards.map((card) =>
      card.id === id ? { ...card, enabled: !card.enabled } : card
    );
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_quick_filter_cards', JSON.stringify(updated));
    }
    set({ quickFilterCards: updated });
  },

  resetQuickFilterCards: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_quick_filter_cards', JSON.stringify(DEFAULT_QUICK_FILTER_CARDS));
      localStorage.setItem('cica_quick_filter_layout', 'grid');
    }
    set({ quickFilterCards: DEFAULT_QUICK_FILTER_CARDS, quickFilterLayout: 'grid' });
  },

  setCardInfoPockets: (pockets) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_card_info_pockets', JSON.stringify(pockets));
    }
    set({ cardInfoPockets: pockets });
  },

  resetCardInfoPockets: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_card_info_pockets', JSON.stringify(DEFAULT_CARD_INFO_POCKETS));
    }
    set({ cardInfoPockets: DEFAULT_CARD_INFO_POCKETS });
  },

  // Multi-User Mode Actions Implementation
  setMultiUserModeEnabled: (enabled) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_multi_user_enabled', String(enabled));
    }
    set({ multiUserModeEnabled: enabled });
  },

  setUsers: (users) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_users', JSON.stringify(users));
    }
    set({ users });
  },

  setRoles: (roles) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_roles', JSON.stringify(roles));
    }
    set({ roles });
  },

  setCurrentUserId: (id) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_current_user_id', id);
    }
    set({ currentUserId: id });
  },

  addUser: (newUser) => {
    const updated = [...get().users, newUser];
    get().setUsers(updated);
  },

  updateUser: (id, updatedUser) => {
    const updated = get().users.map((u) => (u.id === id ? { ...u, ...updatedUser } : u));
    get().setUsers(updated);
  },

  deleteUser: (id) => {
    const updated = get().users.filter((u) => u.id !== id);
    get().setUsers(updated);
    if (get().currentUserId === id) {
      get().setCurrentUserId('user_root');
    }
  },

  addRole: (newRole) => {
    const updated = [...get().roles, newRole];
    get().setRoles(updated);
  },

  updateRole: (id, updatedRole) => {
    const updated = get().roles.map((r) => (r.id === id ? { ...r, ...updatedRole } : r));
    get().setRoles(updated);
  },

  deleteRole: (id) => {
    const updated = get().roles.filter((r) => r.id !== id || r.isSystemRole);
    get().setRoles(updated);
  },

  resetUsersAndRoles: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_users', JSON.stringify(DEFAULT_USERS));
      localStorage.setItem('cica_roles', JSON.stringify(DEFAULT_ROLES));
      localStorage.setItem('cica_current_user_id', 'user_root');
      localStorage.setItem('cica_multi_user_enabled', 'true');
    }
    set({
      users: DEFAULT_USERS,
      roles: DEFAULT_ROLES,
      currentUserId: 'user_root',
      multiUserModeEnabled: true,
    });
  },

  getCurrentUser: () => {
    const { users, currentUserId } = get();
    return users.find((u) => u.id === currentUserId) || users.find((u) => u.id === 'user_root') || users[0] || DEFAULT_USERS[0];
  },

  getCurrentUserPermissions: () => {
    const { multiUserModeEnabled, isRootMode, users, roles, currentUserId } = get();
    // If multi-user mode is disabled or Root Mode is active, unlock all permissions
    if (!multiUserModeEnabled || isRootMode) {
      return { ...DEFAULT_PERMISSIONS_FULL };
    }

    const user = users.find((u) => u.id === currentUserId) || users.find((u) => u.id === 'user_root') || users[0];
    if (!user) return { ...DEFAULT_PERMISSIONS_FULL };

    if (user.id === 'user_root' || user.roleId === 'root') {
      return { ...DEFAULT_PERMISSIONS_FULL };
    }

    const role = roles.find((r) => r.id === user.roleId) || DEFAULT_ROLES.find((r) => r.id === 'staff') || DEFAULT_ROLES[0];
    const basePermissions = { ...role.permissions };

    if (user.customPermissionsOverride) {
      return {
        ...basePermissions,
        ...user.customPermissionsOverride,
      };
    }

    return basePermissions;
  },

  hasPermission: (permKey) => {
    const permissions = get().getCurrentUserPermissions();
    return !!permissions[permKey];
  },
}));

