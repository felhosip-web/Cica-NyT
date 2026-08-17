import React from 'react';
import { Cat } from '../CatCard';
import { SystemEvent } from '../../types';
import { BaseTabProps } from './types';

interface CatDetailEventsTabProps extends BaseTabProps {
  catEvents: SystemEvent[];
  onOpenAddEventForCat: (catId: string) => void;
  eventCost: number;
}

export const CatDetailEventsTab: React.FC<CatDetailEventsTabProps> = ({
  cat,
  catEvents,
  onOpenAddEventForCat,
  eventCost,
}) => {
  return (
    <>
<div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-gray-800">📅 Események & Emlékeztetők</h4>
                <button
                  onClick={() => onOpenAddEventForCat(cat.id)}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  ➕ Új Esemény
                </button>
              </div>

              {catEvents.length === 0 ? (
                <p className="text-gray-400 italic text-xs py-4 text-center">Nincs rögzített esemény a cicához.</p>
              ) : (
                <div className="space-y-2">
                  {catEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{ev.title}</p>
                        <p className="text-[11px] text-gray-500">{ev.date}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800">
                        {ev.status === 'done' ? '✅ Teljesítve' : ev.status === 'expired' ? '⚠️ Lejárt' : '⏳ Esedékes'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>    </>
  );
};
