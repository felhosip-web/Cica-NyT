import React from 'react';
import { Cat } from '../CatCard';
import { BaseTabProps } from './types';
import { FinanceType, FinanceCategory, PaymentMethod } from '../../types';

interface CatDetailCostTabProps extends BaseTabProps {
  totalCatCost: number;
  catFinances: FinancialTransaction[];
  totalFinanceExpense: number;
  totalFinanceIncome: number;
  netCatBalance: number;
  vaxCost: number;
  medCost: number;
  testCost: number;
  eventCost: number;
  fosterCost: number;
  setShowAddFinanceModal: (val: boolean) => void;

  setFinType: (val: any) => void;
  setFinCategory: (val: any) => void;
  setFinAmount: (val: any) => void;
  setFinTitle: (val: any) => void;
}

export const CatDetailCostTab: React.FC<CatDetailCostTabProps> = ({
  cat,
  totalCatCost,
  catFinances,
  totalFinanceExpense,
  totalFinanceIncome,
  netCatBalance,
  vaxCost,
  medCost,
  testCost,
  eventCost,
  fosterCost,
  setShowAddFinanceModal,

  setFinType,
  setFinCategory,
  setFinAmount,
  setFinTitle,
}) => {
  return (
    <>
<div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-800">💰 Integrált Költség- és Pénzügyi Karton</h4>
                  <p className="text-[11px] text-gray-500">Kezelések, ellátási költségek és célzott támogatások mérlege</p>
                </div>
                <button
                  onClick={() => {
                    setFinType('kiadas');
                    setFinCategory('orvosi');
                    setFinAmount('');
                    setFinTitle('');
                    setShowAddFinanceModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <span>➕ Új Pénzügyi Tétel</span>
                </button>
              </div>

              {/* Financial Balance Summary Card */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-red-700 block">💸 Összes Kiadás</span>
                  <span className="text-sm sm:text-base font-black font-mono text-red-900">
                    {totalCatCost.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-emerald-700 block">💖 Célzott Bevételek</span>
                  <span className="text-sm sm:text-base font-black font-mono text-emerald-900">
                    {totalFinanceIncome.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                <div className={`p-3 rounded-2xl border ${
                  netCatBalance >= 0
                    ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-[10px] uppercase font-black block">⚖️ Nettó Mérleg</span>
                  <span className="text-sm sm:text-base font-black font-mono">
                    {netCatBalance >= 0 ? `+${netCatBalance.toLocaleString('hu-HU')}` : netCatBalance.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
              </div>

              {/* Breakdown of internal medical and foster logs */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5 text-xs">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  Egészségügyi és Ellátási Költségek Részletezése
                </span>
                <div className="flex justify-between text-gray-700">
                  <span>💉 Védőoltások:</span>
                  <span className="font-bold font-mono">{vaxCost.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>🩺 Kezelések és műtétek:</span>
                  <span className="font-bold font-mono">{medCost.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>🔬 Szűrések & Tesztek:</span>
                  <span className="font-bold font-mono">{testCost.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>📅 Események & Vizsgálatok:</span>
                  <span className="font-bold font-mono">{eventCost.toLocaleString('hu-HU')} Ft</span>
                </div>
                {fosterCost > 0 && (
                  <div className="flex justify-between text-gray-700 border-t border-gray-200 pt-1">
                    <span>📦 Befogadói közvetlen költségek:</span>
                    <span className="font-bold font-mono text-indigo-700">{fosterCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                )}
              </div>

              {/* Linked Financial Transactions List */}
              <div className="space-y-2">
                <h5 className="font-bold text-gray-800 text-xs flex items-center justify-between">
                  <span>📜 Csatolt Pénzügyi Tranzakciók ({catFinances.length})</span>
                  <span className="text-[10px] text-gray-500 font-normal">Főkönyvi tételek</span>
                </h5>

                {catFinances.length === 0 ? (
                  <p className="text-gray-400 italic text-xs py-3 text-center bg-gray-50 rounded-xl border border-gray-100">
                    Nincs még a főkönyvbe kapcsolt közvetlen pénzügyi tétel.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {catFinances.map((t) => (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          t.type === 'bevetel'
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-rose-50/70 border-rose-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900">{t.title}</span>
                            {t.invoiceNumber && (
                              <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border border-gray-200">
                                #{t.invoiceNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span>📅 {t.date}</span>
                            {t.partnerName && <span>• {t.partnerName}</span>}
                            <span>• {t.paymentMethod}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-mono font-black text-xs ${
                            t.type === 'bevetel' ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {t.type === 'bevetel' ? '+' : '-'}{t.amount.toLocaleString('hu-HU')} Ft
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>    </>
  );
};
