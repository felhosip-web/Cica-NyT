import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export const RootBanner: React.FC = () => {
  const { isRootMode, rootSessionUntil, setIsRootMode } = useAppStore();
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isRootMode || !rootSessionUntil) {
      setMinutesLeft(null);
      return;
    }

    const updateTimer = () => {
      const remainingMs = rootSessionUntil - Date.now();
      if (remainingMs <= 0) {
        setMinutesLeft(0);
      } else {
        setMinutesLeft(Math.ceil(remainingMs / 60000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isRootMode, rootSessionUntil]);

  if (!isRootMode || minutesLeft === null) return null;

  return (
    <div className="mb-4 p-4 rounded-xl shadow-sm flex items-start gap-3 text-sm font-medium bg-purple-50 text-purple-900 border border-purple-200">
      <span className="text-xl shrink-0 mt-0.5">
        ⚡
      </span>
      <div className="flex-1 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-base mb-1">
            Root mód aktív
          </h4>
          <p>
            Ideiglenes emelt szintű jogosultság. Hátralévő idő: {minutesLeft} perc.
          </p>
        </div>
        <button
          onClick={() => setIsRootMode(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-purple-100 hover:bg-purple-200 text-purple-800"
        >
          Kikapcsolás
        </button>
      </div>
    </div>
  );
};
