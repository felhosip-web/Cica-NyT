import React, { useState } from 'react';
import { useToastStore, ToastItem } from '../store/useToastStore';
import { useAppStore } from '../store/useAppStore';

const ToastCard: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const dismissToast = useToastStore((s) => s.dismissToast);
  const isRootMode = useAppStore((s) => s.isRootMode);
  const [showDetails, setShowDetails] = useState(false);

  const isDevOrRoot = isRootMode || import.meta.env.DEV;

  const bgBorder =
    toast.type === 'error'
      ? 'bg-rose-950/95 border-rose-700 text-rose-100 shadow-rose-950/50'
      : toast.type === 'warning'
      ? 'bg-amber-950/95 border-amber-700 text-amber-100 shadow-amber-950/50'
      : toast.type === 'success'
      ? 'bg-emerald-950/95 border-emerald-700 text-emerald-100 shadow-emerald-950/50'
      : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-900/50';

  const icon =
    toast.type === 'error'
      ? '🚨'
      : toast.type === 'warning'
      ? '⚠️'
      : toast.type === 'success'
      ? '✅'
      : 'ℹ️';

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 ${bgBorder}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <span className="text-lg shrink-0 select-none">{icon}</span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-snug break-words">{toast.messageHu}</p>

          {toast.action && (
            <p className="text-[10px] opacity-75 font-mono mt-0.5 truncate">
              Akció: {toast.action}
            </p>
          )}

          {toast.details && isDevOrRoot && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] underline font-mono opacity-80 hover:opacity-100 cursor-pointer"
              >
                {showDetails ? 'Részletek elrejtése ▲' : 'Részletek ▼'}
              </button>

              {showDetails && (
                <div className="mt-1 p-2 rounded-lg bg-black/50 text-[10px] font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto border border-white/10">
                  {toast.details}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 transition hover:bg-white/10 text-xs cursor-pointer"
          aria-label="Bezárás"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
