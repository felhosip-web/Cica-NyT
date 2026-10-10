import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  messageHu: string;
  action?: string;
  details?: string;
  duration?: number; // ms
  ts: number;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (item: Omit<ToastItem, 'id' | 'ts'>) => string;
  showError: (messageHu: string, options?: { action?: string; duration?: number; details?: string }) => string;
  showSuccess: (messageHu: string, duration?: number) => string;
  showWarning: (messageHu: string, duration?: number) => string;
  showInfo: (messageHu: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (item) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const duration = item.duration ?? (item.type === 'error' ? 6000 : 4000);
    const newToast: ToastItem = {
      ...item,
      id,
      duration,
      ts: Date.now(),
    };

    set((state) => ({
      // Keep up to 5 toasts active at once
      toasts: [...state.toasts.slice(-4), newToast],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  showError: (messageHu, options) => {
    return get().showToast({
      type: 'error',
      messageHu,
      action: options?.action,
      details: options?.details,
      duration: options?.duration ?? 6000,
    });
  },

  showSuccess: (messageHu, duration) => {
    return get().showToast({
      type: 'success',
      messageHu,
      duration: duration ?? 3500,
    });
  },

  showWarning: (messageHu, duration) => {
    return get().showToast({
      type: 'warning',
      messageHu,
      duration: duration ?? 4500,
    });
  },

  showInfo: (messageHu, duration) => {
    return get().showToast({
      type: 'info',
      messageHu,
      duration: duration ?? 3500,
    });
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },
}));
