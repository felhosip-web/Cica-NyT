import React from 'react';
import { TnrRecord } from '../types';
import { useAppStore } from '../store/useAppStore';

interface TnrCardProps {
  tnr: TnrRecord;
  onEdit: (tnr: TnrRecord) => void;
  onDelete: (id: string) => void;
}

export const TnrCard: React.FC<TnrCardProps> = ({ tnr, onEdit, onDelete }) => {
  const { getCurrentUserPermissions } = useAppStore();
  const perms = getCurrentUserPermissions();

  const getStatusBadge = () => {
    switch (tnr.status) {
      case 'befogva':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
            🪤 Befogva
          </span>
        );
      case 'mutet_alatt':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
            ✂️ Műtét alatt / Lábadozik
          </span>
        );
      case 'elengedve':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            💚 Elengedve
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between">
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2">
          <div>
            <h3 className="font-black text-gray-900 text-sm flex items-center gap-1.5">
              <span>🐱 {tnr.catNameOrTag || 'TNR Cica'}</span>
              {tnr.earTip && (
                <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.2 rounded border border-pink-200 font-bold" title="Fülcsipkézett">
                  ✂️ Fülcsipkés
                </span>
              )}
            </h3>
            <span className="text-[10px] text-gray-400 font-semibold">
              Rögzítve: {tnr.createdAt ? new Date(tnr.createdAt).toLocaleDateString('hu-HU') : 'Ismeretlen'}
            </span>
          </div>
          <div className="shrink-0">{getStatusBadge()}</div>
        </div>

        {/* Details List */}
        <div className="space-y-1.5 text-xs text-gray-700">
          <div className="flex items-start gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-150">
            <span className="text-base">📍</span>
            <div>
              <span className="font-extrabold text-gray-900">Befogás:</span>{' '}
              <span className="font-medium text-gray-800">{tnr.locationTrapped}</span>
              <div className="text-[10px] text-gray-500 font-medium">
                📅 {tnr.dateTrapped} &bull; 🧑‍🤝‍🧑 Befogta: <strong className="text-gray-700">{tnr.trappedBy}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-150">
            <span className="text-base">🏥</span>
            <div>
              <span className="font-extrabold text-gray-900">Műtét helye:</span>{' '}
              <span className="font-medium text-gray-800">{tnr.clinicLocation}</span>
              {tnr.surgeonName && (
                <div className="text-[10px] text-gray-500 font-medium">
                  👨‍⚕️ Állatorvos: <strong className="text-gray-700">{tnr.surgeonName}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-150">
            <span className="text-base">🌳</span>
            <div>
              <span className="font-extrabold text-gray-900">Elengedés helye:</span>{' '}
              <span className="font-medium text-gray-800">{tnr.locationReleased}</span>
              {tnr.dateReleased && (
                <div className="text-[10px] text-gray-500 font-medium">
                  📅 Elengedve: <strong className="text-gray-700">{tnr.dateReleased}</strong>
                </div>
              )}
            </div>
          </div>

          {tnr.notes && (
            <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium italic">
              💬 {tnr.notes}
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
        <span className="text-[10px] text-gray-400 font-medium">ID: #{tnr.id.slice(-6)}</span>

        {perms.canManageTnr ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(tnr)}
              className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold rounded-lg transition cursor-pointer text-[11px]"
            >
              ✏️ Szerkesztés
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Biztosan törli ezt a TNR bejegyzést (${tnr.catNameOrTag || tnr.locationTrapped})?`)) {
                  onDelete(tnr.id);
                }
              }}
              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition cursor-pointer text-[11px]"
            >
              🗑️
            </button>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            👁️ Csak Megtekintés
          </span>
        )}
      </div>
    </div>
  );
};
