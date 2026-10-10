import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useToastStore, ToastMessage } from '../store/useToastStore';
import { useAppStore } from '../store/useAppStore';

const TOAST_THEMES: Record<
  ToastMessage['type'],
  {
    bg: string;
    border: string;
    icon: string;
    iconBg: string;
    title: string;
    textColor: string;
  }
> = {
  error: {
    bg: 'bg-rose-950/90 backdrop-blur-md',
    border: 'border-rose-500/50 shadow-rose-950/50',
    icon: '🚨',
    iconBg: 'bg-rose-900/80 text-rose-200 border-rose-700',
    title: 'Hiba történt',
    textColor: 'text-rose-100',
  },
  warn: {
    bg: 'bg-amber-950/90 backdrop-blur-md',
    border: 'border-amber-500/50 shadow-amber-950/50',
    icon: '⚠️',
    iconBg: 'bg-amber-900/80 text-amber-200 border-amber-700',
    title: 'Figyelmeztetés',
    textColor: 'text-amber-100',
  },
  success: {
    bg: 'bg-emerald-950/90 backdrop-blur-md',
    border: 'border-emerald-500/50 shadow-emerald-950/50',
    icon: '✅',
    iconBg: 'bg-emerald-900/80 text-emerald-200 border-emerald-700',
    title: 'Sikeres művelet',
    textColor: 'text-emerald-100',
  },
  info: {
    bg: 'bg-slate-900/90 backdrop-blur-md',
    border: 'border-slate-700 shadow-slate-950/50',
    icon: 'ℹ️',
    iconBg: 'bg-slate-800 text-slate-200 border-slate-700',
    title: 'Információ',
    textColor: 'text-slate-100',
  },
};

const ToastItem: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const { removeToast } = useToastStore();
  const { isRootMode } = useAppStore();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const theme = TOAST_THEMES[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`w-full max-w-md p-3.5 rounded-2xl border shadow-xl ${theme.bg} ${theme.border} text-xs font-sans text-white pointer-events-auto overflow-hidden`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 font-bold border ${theme.iconBg}`}
        >
          {theme.icon}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h5 className={`font-extrabold text-xs flex items-center gap-1.5 ${theme.textColor}`}>
              <span>{theme.title}</span>
              {toast.action && (
                <span className="text-[9px] bg-black/40 text-gray-300 font-mono px-1.5 py-0.5 rounded border border-white/10">
                  {toast.action}
                </span>
              )}
            </h5>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer text-xs"
              title="Bezárás"
            >
              ✕
            </button>
          </div>

          <p className="text-slate-200 leading-snug font-medium break-words">
            {toast.message}
          </p>

          {(toast.details || isRootMode) && (
            <div className="pt-1">
              {toast.details && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-[10px] text-purple-300 hover:text-purple-200 underline font-mono cursor-pointer"
                >
                  {showDetails ? '▲ Részletek elrejtése' : '▼ Részletek megtekintése'}
                </button>
              )}

              {showDetails && toast.details && (
                <pre className="mt-1.5 p-2 bg-black/60 rounded-lg text-[10px] font-mono text-emerald-300 whitespace-pre-wrap break-all border border-white/10 max-h-32 overflow-y-auto">
                  {toast.details}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col items-end gap-2.5 pointer-events-none max-w-md ml-auto"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
