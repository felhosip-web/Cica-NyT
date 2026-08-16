import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/db';
import { sendEventPushNotification, requestNotificationPermission } from '../utils/pushNotification';

interface EventStartupToastProps {
  onOpenEvents: () => void;
}

export const EventStartupToast: React.FC<EventStartupToastProps> = ({ onOpenEvents }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [permissionState, setPermissionState] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const hasPushedRef = useRef(false);

  // Live Query for Events & Cats
  const pendingEvents = useLiveQuery(() => db.events.where('status').equals('pending').toArray(), []) || [];
  const expiredEvents = useLiveQuery(() => db.events.where('status').equals('expired').toArray(), []) || [];
  const cats = useLiveQuery(() => db.cats.toArray(), []) || [];

  const catMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    cats.forEach((c) => {
      map[c.id] = c.nev || 'Névtelen cica';
    });
    return map;
  }, [cats]);

  const totalUrgent = pendingEvents.length + expiredEvents.length;
  const urgentEventsList = [...expiredEvents, ...pendingEvents];

  // Trigger Push Notification on App Launch if there are urgent events
  useEffect(() => {
    if (totalUrgent > 0 && !hasPushedRef.current) {
      hasPushedRef.current = true;

      const expiredCount = expiredEvents.length;
      const pendingCount = pendingEvents.length;

      let title = '🔔 Közelgő Esemény Emlékeztető';
      let body = `${totalUrgent} esedékes teendő vár a Cica-NyT nyilvántartásban!`;

      if (expiredCount > 0) {
        title = '⚠️ Lejárt Oltás / Kezelés Figyelmeztetés!';
        body = `${expiredCount} lejárt és ${pendingCount} esedékes esemény várakozik.`;
      } else if (pendingEvents.length > 0) {
        const topEv = pendingEvents[0];
        const catName = catMap[topEv.catId] || 'Cica';
        body = `Esedékes: ${catName} - ${topEv.title} (${topEv.date})`;
      }

      sendEventPushNotification(title, body);
    }
  }, [totalUrgent, expiredEvents.length, pendingEvents.length, catMap]);

  if (!isVisible || totalUrgent === 0) return null;

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermissionState('granted');
      sendEventPushNotification(
        '🎉 Push Értesítések Beállítva!',
        'Mostantól az app automatikusan jelzi a közelgő oltásokat és kezeléseket.'
      );
    } else {
      setPermissionState('denied');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-pink-500/40 backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 bg-pink-500/20 text-pink-400 rounded-xl shrink-0 animate-pulse">
              🔔
            </span>
            <div>
              <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                Közelgő & Esedékes Események
                <span className="text-[10px] bg-pink-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                  {totalUrgent} db
                </span>
              </h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {expiredEvents.length > 0
                  ? `⚠️ ${expiredEvents.length} lejárt és ${pendingEvents.length} esedékes oltás/kezelés!`
                  : `💉 ${pendingEvents.length} esedékes esemény esedékes a naptárban.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-white p-1 font-bold text-sm transition cursor-pointer"
            title="Bezárás"
          >
            ✕
          </button>
        </div>

        {/* Quick event preview list */}
        <div className="mt-3 space-y-1.5 border-t border-slate-800 pt-2 text-xs">
          {urgentEventsList.slice(0, 2).map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between p-2 bg-slate-800/80 rounded-xl border border-slate-700/60"
            >
              <div className="truncate pr-2">
                <span className="font-extrabold text-pink-300">
                  {catMap[ev.catId] ? `${catMap[ev.catId]} - ` : ''}
                </span>
                <span className="text-slate-200 font-medium">{ev.title}</span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800 shrink-0">
                {ev.date}
              </span>
            </div>
          ))}
          {urgentEventsList.length > 2 && (
            <p className="text-[10px] text-slate-400 text-center font-medium">
              + további {urgentEventsList.length - 2} esemény a teendők között
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          {permissionState === 'default' ? (
            <button
              onClick={handleEnablePush}
              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>🔔</span>
              <span>Push Engedélyezése</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
              <span>{permissionState === 'granted' ? '✅ Push Aktív' : '🔕 Push Nincs'}</span>
            </span>
          )}

          <div className="flex gap-1.5">
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Elrejtés
            </button>
            <button
              onClick={() => {
                setIsVisible(false);
                onOpenEvents();
              }}
              className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>Megtekintés</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
