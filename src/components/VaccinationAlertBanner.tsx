import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

interface VaccinationAlertBannerProps {
  onOpenEvents: () => void;
}

export const VaccinationAlertBanner: React.FC<VaccinationAlertBannerProps> = ({ onOpenEvents }) => {
  const [showModal, setShowModal] = useState(false);

  const expiredEvents = useLiveQuery(
    () => db.events.where('status').equals('expired').toArray(),
    []
  );

  const pendingEvents = useLiveQuery(
    () => db.events.where('status').equals('pending').toArray(),
    []
  );

  const totalUrgent = (expiredEvents?.length || 0) + (pendingEvents?.length || 0);

  if (!totalUrgent) return null;

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="max-w-7xl mx-auto my-3 px-4 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 cursor-pointer hover:opacity-95 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl p-2 bg-white/20 backdrop-blur-xs rounded-xl shrink-0">💉</span>
          <div className="min-w-0">
            <span className="font-extrabold text-sm block leading-tight truncate">
              {expiredEvents && expiredEvents.length > 0
                ? `⚠️ ${expiredEvents.length} lejárt oltás / kezelés figyelmeztetés!`
                : `💉 ${pendingEvents?.length || 0} esedékes oltás / kezelés vár intézkedésre!`}
            </span>
            <span className="text-xs text-white/90 truncate block">
              Kattints a napi oltási összefoglaló és teendőlista megnyitásához
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          className="px-3.5 py-2 bg-white text-pink-600 font-extrabold text-xs rounded-xl shadow-xs hover:bg-pink-50 shrink-0 transition"
        >
          Összefoglaló ({totalUrgent})
        </button>
      </div>

      {/* Modal dialog for vaccination alerts */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                💉 Oltási és Kezelési Összefoglaló
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {expiredEvents && expiredEvents.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">
                    🔴 Lejárt Események ({expiredEvents.length})
                  </h4>
                  <div className="space-y-1.5">
                    {expiredEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-red-900">{ev.title}</p>
                          <p className="text-red-700 text-[11px]">{ev.date}</p>
                        </div>
                        <span className="bg-red-200 text-red-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          Lejárt
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingEvents && pendingEvents.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                    🟡 Esedékes Események ({pendingEvents.length})
                  </h4>
                  <div className="space-y-1.5">
                    {pendingEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-amber-900">{ev.title}</p>
                          <p className="text-amber-700 text-[11px]">{ev.date}</p>
                        </div>
                        <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          Esedékes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  onOpenEvents();
                }}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Ugrás a Naptárhoz & Eseményekhez 📅
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
