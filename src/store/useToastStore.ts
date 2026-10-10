import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'warn' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  action?: string;
  details?: string;
  duration?: number;
  createdAt: number;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = {
      ...toast,
      id,
      createdAt: Date.now(),
      duration: toast.duration ?? (toast.type === 'error' || toast.type === 'warn' ? 6000 : 4000),
    };

    set((state) => {
      // Limit to max 5 simultaneous toasts to avoid clutter
      const updated = [newToast, ...state.toasts].slice(0, 5);
      return { toasts: updated };
    });

    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

/**
 * Convenient standalone helper functions for displaying toasts anywhere in the codebase
 */
export function showError(
  message: string,
  options?: { action?: string; details?: string; duration?: number }
): string {
  return useToastStore.getState().addToast({
    type: 'error',
    message,
    action: options?.action,
    details: options?.details,
    duration: options?.duration,
  });
}

export function showSuccess(
  message: string,
  options?: { action?: string; details?: string; duration?: number }
): string {
  return useToastStore.getState().addToast({
    type: 'success',
    message,
    action: options?.action,
    details: options?.details,
    duration: options?.duration,
  });
}

export function showWarning(
  message: string,
  options?: { action?: string; details?: string; duration?: number }
): string {
  return useToastStore.getState().addToast({
    type: 'warn',
    message,
    action: options?.action,
    details: options?.details,
    duration: options?.duration,
  });
}

export function showInfo(
  message: string,
  options?: { action?: string; details?: string; duration?: number }
): string {
  return useToastStore.getState().addToast({
    type: 'info',
    message,
    action: options?.action,
    details: options?.details,
    duration: options?.duration,
  });
}
