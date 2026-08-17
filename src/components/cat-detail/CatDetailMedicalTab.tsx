import React from 'react';
import { Cat } from '../CatCard';
import { BaseTabProps } from './types';

interface CatDetailMedicalTabProps extends BaseTabProps {
  setShowAddLogModal: (val: any) => void;
  vaxCost: number;
  medCost: number;
  testCost: number;
}

export const CatDetailMedicalTab: React.FC<CatDetailMedicalTabProps> = ({
  cat,
  setShowAddLogModal,
  vaxCost,
  medCost,
  testCost,
}) => {
  return (
    <>
<div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-gray-800">💉 Egészségügyi Napló</h4>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowAddLogModal('oltas')}
                    className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-lg text-[11px]"
                  >
                    + Oltás
                  </button>
                  <button
                    onClick={() => setShowAddLogModal('kezeles')}
                    className="px-2.5 py-1 bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold rounded-lg text-[11px]"
                  >
                    + Kezelés
                  </button>
                  <button
                    onClick={() => setShowAddLogModal('teszt')}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px]"
                  >
                    + Teszt
                  </button>
                </div>
              </div>

              {/* Vaccinations */}
              <div>
                <h5 className="font-bold text-purple-900 text-xs mb-1.5 flex items-center gap-1">
                  💉 Kapott Védőoltások ({cat.oltasok?.length || 0})
                </h5>
                {!cat.oltasok || cat.oltasok.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">Nincs még rögzített védőoltás.</p>
                ) : (
                  <div className="space-y-1">
                    {cat.oltasok.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-purple-950">{item.nev}</span>
                          <span className="text-[10px] text-purple-700 ml-2">({item.datum})</span>
                        </div>
                        {item.koltseg ? (
                          <span className="font-mono font-bold text-purple-800">{item.koltseg} Ft</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Treatments */}
              <div>
                <h5 className="font-bold text-teal-900 text-xs mb-1.5 flex items-center gap-1">
                  🩺 Orvosi Kezelések ({cat.kezelesek?.length || 0})
                </h5>
                {!cat.kezelesek || cat.kezelesek.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">Nincs még rögzített kezelés.</p>
                ) : (
                  <div className="space-y-1">
                    {cat.kezelesek.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="p-2 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-teal-950">{item.nev}</span>
                          <span className="text-[10px] text-teal-700 ml-2">({item.datum})</span>
                        </div>
                        {item.koltseg ? (
                          <span className="font-mono font-bold text-teal-800">{item.koltseg} Ft</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>    </>
  );
};
