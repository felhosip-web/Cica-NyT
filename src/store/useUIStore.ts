import { create } from 'zustand';
import { Cat } from '../components/CatCard';

export type TabType = 'animals' | 'events' | 'calendar' | 'tnr' | 'foster' | 'inventory' | 'stats' | 'finance';

interface UIState {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Root Auth
  showRootAuth: boolean;
  setShowRootAuth: (show: boolean) => void;

  // Entity Modal States
  selectedCatId: string | null;
  setSelectedCatId: (id: string | null) => void;

  catToEdit: Cat | null | 'new';
  setCatToEdit: (cat: Cat | null | 'new') => void;

  eventToEditId: number | null | 'new';
  setEventToEditId: (id: number | null | 'new') => void;

  eventInitialCatId: string;
  setEventInitialCatId: (id: string) => void;

  // UI / App Modal States
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  showUiCustomization: boolean;
  setShowUiCustomization: (show: boolean) => void;

  showHelp: boolean;
  setShowHelp: (show: boolean) => void;

  showPdfReportsModal: boolean;
  setShowPdfReportsModal: (show: boolean) => void;

  // Convenience actions
  openEventModal: (eventId: number | 'new', initialCatId?: string) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'animals',
  setActiveTab: (tab) => set({ activeTab: tab }),

  showRootAuth: false,
  setShowRootAuth: (show) => set({ showRootAuth: show }),

  selectedCatId: null,
  setSelectedCatId: (id) => set({ selectedCatId: id }),

  catToEdit: null,
  setCatToEdit: (cat) => set({ catToEdit: cat }),

  eventToEditId: null,
  setEventToEditId: (id) => set({ eventToEditId: id }),

  eventInitialCatId: 'general',
  setEventInitialCatId: (id) => set({ eventInitialCatId: id }),

  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),

  showUiCustomization: false,
  setShowUiCustomization: (show) => set({ showUiCustomization: show }),

  showHelp: false,
  setShowHelp: (show) => set({ showHelp: show }),

  showPdfReportsModal: false,
  setShowPdfReportsModal: (show) => set({ showPdfReportsModal: show }),

  openEventModal: (eventId, initialCatId = 'general') => set({
    eventToEditId: eventId,
    eventInitialCatId: initialCatId
  }),

  closeAllModals: () => set({
    selectedCatId: null,
    catToEdit: null,
    eventToEditId: null,
    showSettings: false,
    showUiCustomization: false,
    showHelp: false,
    showPdfReportsModal: false,
    showRootAuth: false
  })
}));
