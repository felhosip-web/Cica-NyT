import React, { useMemo } from 'react';
import { Cat } from '../CatCard';
import { BaseTabProps } from './types';
import { SystemEvent, FinancialTransaction, FosterSupply } from '../../types';
import { CustomSelect } from '../CustomSelect';

interface CatDetailConnectedTabProps extends BaseTabProps {
  catEvents: SystemEvent[];
  catFinances: FinancialTransaction[];
  catFosterSupplies: FosterSupply[];
  catFosterExpenses: FosterExpense[];
  allInventoryItems: InventoryItem[];

  connectedFilter: 'all' | 'event' | 'finance' | 'supply';
  setConnectedFilter: (val: 'all' | 'event' | 'finance' | 'supply') => void;
  connectedSearch: string;
  setConnectedSearch: (val: string) => void;
  connectedSort: 'date_desc' | 'date_asc';
  setConnectedSort: (val: 'date_desc' | 'date_asc') => void;
  isPatchingRelations: boolean;
  handleRunConnectedPatch: () => void;
  patchFeedback: string | null;
  setShowAddSupplyModal: (val: boolean) => void;

  eventsCount: number;
  financesCount: number;
  totalCatCost: number;
  totalFinanceIncome: number;
  suppliesCount: number;
  onOpenAddEventForCat: (val: string) => void;
}

export const CatDetailConnectedTab: React.FC<CatDetailConnectedTabProps> = ({
  cat,
  catEvents,
  catFinances,
  catFosterSupplies,
  catFosterExpenses,
  allInventoryItems,
  connectedFilter,
  setConnectedFilter,
  connectedSearch,
  setConnectedSearch,
  connectedSort,
  setConnectedSort,
  isPatchingRelations,
  handleRunConnectedPatch,
  patchFeedback,
  setShowAddSupplyModal,

  eventsCount,
  financesCount,
  totalCatCost,
  totalFinanceIncome,
  suppliesCount,
  onOpenAddEventForCat,
}) => {
  const connectedTimelineItems = useMemo(() => {
    const list: {
      id: string;
      sourceType: 'event' | 'finance' | 'foster_expense' | 'supply' | 'inventory';
      date: string;
      title: string;
      subtitle?: string;
      badge: { label: string; color: string; icon: string };
      statusBadge?: { label: string; color: string };
      amountOrQty?: { text: string; isPositive?: boolean; isExpense?: boolean; isNeutral?: boolean };
      details?: { label: string; value: string }[];
      notes?: string;
      rawItem: any;
    }[] = [];

    // Add Events
    catEvents.forEach((ev: any) => {
      const isDone = ev.status === 'done';
      const isExpired = ev.status === 'expired';
      let subType = 'Általános esemény';
      if (ev.type === 'vet') subType = '🩺 Állatorvosi vizsgálat';
      else if (ev.type === 'treatment') subType = '💉 Kezelés';
      else if (ev.type === 'chip') subType = '🏷️ Chip beültetés';
      else if (ev.type === 'spay') subType = '✂️ Ivartalanítás';
      else if (ev.type === 'foster') subType = '🏠 Ideiglenes befogadás';
      else if (ev.type === 'vaccine') subType = '💉 Védőoltás';

      const details: { label: string; value: string }[] = [];
      if (ev.location) details.push({ label: 'Helyszín', value: ev.location });
      if (ev.performedBy) details.push({ label: 'Felelős / Orvos', value: ev.performedBy });

      list.push({
        id: `ev_${ev.id}`,
        sourceType: 'event',
        date: ev.date || (ev.createdAt ? ev.createdAt.split('T')[0] : ''),
        title: ev.title || 'Névtelen esemény',
        subtitle: subType,
        badge: { label: 'Esemény', color: 'bg-pink-100 text-pink-900 border-pink-200', icon: '📅' },
        statusBadge: {
          label: isDone ? 'Teljesítve' : isExpired ? 'Lejárt' : 'Esedékes',
          color: isDone ? 'bg-emerald-100 text-emerald-800' : isExpired ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800',
        },
        amountOrQty: ev.cost ? { text: `${Number(ev.cost).toLocaleString('hu-HU')} Ft`, isExpense: true } : undefined,
        details,
        notes: ev.description || ev.notes,
        rawItem: ev,
      });
    });

    // Add Finances
    catFinances.forEach((fin) => {
      const isBevetel = fin.type === 'bevetel';
      const isTeljesult = fin.status === 'teljesult';
      const details: { label: string; value: string }[] = [];
      if (fin.partnerName) details.push({ label: 'Partner', value: fin.partnerName });
      if (fin.paymentMethod) details.push({ label: 'Fizetés', value: fin.paymentMethod });
      if (fin.invoiceNumber) details.push({ label: 'Bizonylat', value: '#' + fin.invoiceNumber });

      list.push({
        id: `fin_${fin.id}`,
        sourceType: 'finance',
        date: fin.date,
        title: fin.title,
        subtitle: `Főkönyv: ${fin.category || 'Pénzügyi tétel'}`,
        badge: { label: 'Pénzügy', color: 'bg-emerald-100 text-emerald-900 border-emerald-200', icon: '💰' },
        statusBadge: {
          label: isTeljesult ? 'Teljesült' : fin.status === 'storno' ? 'Sztornó' : 'Függőben',
          color: isTeljesult ? 'bg-emerald-100 text-emerald-800' : fin.status === 'storno' ? 'bg-gray-100 text-gray-800' : 'bg-amber-100 text-amber-800',
        },
        amountOrQty: {
          text: `${isBevetel ? '+' : '-'}${Number(fin.amount).toLocaleString('hu-HU')} Ft`,
          isPositive: isBevetel,
          isExpense: !isBevetel,
        },
        details,
        notes: fin.notes,
        rawItem: fin,
      });
    });

    // Add Foster Expenses
    catFosterExpenses.forEach((fe) => {
      const details: { label: string; value: string }[] = [];
      if (fe.invoiceNo) details.push({ label: 'Számlaszám', value: fe.invoiceNo });

      list.push({
        id: `fexp_${fe.id}`,
        sourceType: 'foster_expense',
        date: fe.date,
        title: fe.description || 'Befogadói kiadás',
        subtitle: `Befogadói költség: ${fe.category}`,
        badge: { label: 'Befogadói Kiadás', color: 'bg-orange-100 text-orange-900 border-orange-200', icon: '💸' },
        amountOrQty: {
          text: `-${Number(fe.amount).toLocaleString('hu-HU')} Ft`,
          isExpense: true,
        },
        details,
        rawItem: fe,
      });
    });

    // Add Supplies
    relatedFosterSupplies.forEach((sup) => {
      let typeName = 'Ellátmány';
      if (sup.type === 'tap') typeName = '🍲 Táp';
      else if (sup.type === 'alom') typeName = '📦 Alom';
      else if (sup.type === 'gyogyszer') typeName = '💊 Gyógyszer';
      else if (sup.type === 'felszereles') typeName = '🧺 Felszerelés';

      list.push({
        id: `sup_${sup.id}`,
        sourceType: 'supply',
        date: sup.date,
        title: sup.item,
        subtitle: `${typeName} igény / kiadás`,
        badge: { label: 'Készletigény', color: 'bg-teal-100 text-teal-900 border-teal-200', icon: '📦' },
        statusBadge: {
          label: sup.status === 'teljesitve' ? 'Teljesítve' : sup.status === 'kiadva' ? 'Kiadva' : 'Igényelve',
          color: sup.status === 'teljesitve' ? 'bg-emerald-100 text-emerald-800' : sup.status === 'kiadva' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
        },
        amountOrQty: {
          text: `${sup.quantity} ${sup.unit}`,
          isNeutral: true,
        },
        notes: sup.notes,
        rawItem: sup,
      });
    });

    // Add Direct Inventory
    relatedInventoryItems.forEach((inv) => {
      if (inv.fosterSupplyId && list.some((x) => x.id === `sup_${inv.fosterSupplyId}`)) return;

      const isKimeno = inv.direction === 'kimeno';
      const details: { label: string; value: string }[] = [];
      if (inv.destination) details.push({ label: 'Célállomás', value: inv.destination });
      if (inv.sourceOrRecipient) details.push({ label: isKimeno ? 'Címzett' : 'Forrás', value: inv.sourceOrRecipient });
      if (inv.batchNumber) details.push({ label: 'Sarzs', value: inv.batchNumber });
      if (inv.expiryDate) details.push({ label: 'Szavatosság', value: inv.expiryDate });

      list.push({
        id: `inv_${inv.id}`,
        sourceType: 'inventory',
        date: inv.date,
        title: inv.brandOrName || 'Központi Raktárkészlet tétel',
        subtitle: `Raktárkészlet (${isKimeno ? '📤 Kiadás' : '📥 Bevételezés'}): ${inv.itemType}`,
        badge: { label: 'Raktár', color: 'bg-indigo-100 text-indigo-900 border-indigo-200', icon: '🏷️' },
        amountOrQty: {
          text: `${isKimeno ? '-' : '+'}${inv.quantity} ${inv.unit}`,
          isExpense: isKimeno,
          isPositive: !isKimeno,
        },
        details,
        notes: inv.notes,
        rawItem: inv,
      });
    });

    return list;
  }, [catEvents, catFinances, catFosterExpenses, relatedFosterSupplies, relatedInventoryItems])

  const filteredTimeline = useMemo(() => {
    return connectedTimelineItems
      .filter((i) => {
        if (connectedFilter !== 'all' && i.sourceType !== connectedFilter) return false;
        if (connectedSearch) {
          const s = connectedSearch.toLowerCase();
          return i.title.toLowerCase().includes(s) || (i.details && i.details.join(' ').toLowerCase().includes(s));
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return connectedSort === 'date_asc' ? timeA - timeB : timeB - timeA;
      });
  }, [connectedTimelineItems, connectedFilter, connectedSearch, connectedSort]);

  return (
    <>
<div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-pink-700">📅 Események</span>
                    <span className="text-xs font-black text-pink-900 font-mono">{eventsCount} db</span>
                  </div>
                  <p className="text-[11px] text-pink-950 font-medium leading-tight">
                    Orvosi vizsgálatok, kezelések, oltások és gondozási feljegyzések
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">💰 Pénzügyi Tételek</span>
                    <span className="text-xs font-black text-emerald-900 font-mono">{financesCount} db</span>
                  </div>
                  <p className="text-[11px] text-emerald-950 font-medium leading-tight">
                    Kiadások: <span className="font-bold text-rose-700 font-mono">{totalCatCost.toLocaleString('hu-HU')} Ft</span> • Bevételek: <span className="font-bold text-emerald-700 font-mono">{totalFinanceIncome.toLocaleString('hu-HU')} Ft</span>
                  </p>
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-teal-700">📦 Készlet & Ellátmány</span>
                    <span className="text-xs font-black text-teal-900 font-mono">{suppliesCount} db</span>
                  </div>
                  <p className="text-[11px] text-teal-950 font-medium leading-tight">
                    Tápok, alom, gyógyszerek, felszerelések és raktári kiadások
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Gyors Műveletek a cicához:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenAddEventForCat(cat.id)}
                    className="px-2.5 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-900 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>📅</span>
                    <span>+ Új Esemény</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddFinanceModal(true)}
                    className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>💰</span>
                    <span>+ Pénzügyi Tétel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplyModal(true)}
                    className="px-2.5 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>📦</span>
                    <span>+ Készletigény / Ellátmány</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPatchingRelations}
                    onClick={handleRunConnectedPatch}
                    className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    title="Kapcsolódó elemek relációs indexelésének és adatstruktúrájának frissítése"
                  >
                    {isPatchingRelations ? (
                      <>
                        <span className="animate-spin text-xs">⏳</span>
                        <span>Indexelés...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Relációk Patch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {patchFeedback && (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 flex items-center justify-between">
                  <span>{patchFeedback}</span>
                  <button onClick={() => setPatchFeedback(null)} className="text-purple-600 text-xs px-1">✕</button>
                </div>
              )}

              {/* Search & Filter Bar */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={connectedSearch}
                      onChange={(e) => setConnectedSearch(e.target.value)}
                      placeholder="Keresés kapcsolódó elemek között (cím, partner, megjegyzés)..."
                      className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-pink-500"
                    />
                    <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
                    {connectedSearch && (
                      <button
                        type="button"
                        onClick={() => setConnectedSearch('')}
                        className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 min-w-[160px]">
                    <CustomSelect
                      value={connectedSort}
                      onChange={(val) => setConnectedSort(val as any)}
                      options={[
                        { value: 'date_desc', label: 'Legújabb elöl', icon: '📅' },
                        { value: 'date_asc', label: 'Legrégebbi elöl', icon: '📅' },
                      ]}
                      title="Időrendi Rendezés"
                      colorScheme="slate"
                      buttonClassName="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setConnectedFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      connectedFilter === 'all'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span>Összes Elem</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white">
                      {connectedTimelineItems.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectedFilter('event')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      connectedFilter === 'event'
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200'
                    }`}
                  >
                    <span>📅 Események</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white">
                      {eventsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectedFilter('finance')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      connectedFilter === 'finance'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <span>💰 Pénzügy</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white">
                      {financesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectedFilter('supply')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      connectedFilter === 'supply'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                    }`}
                  >
                    <span>📦 Készlet & Ellátmány</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white">
                      {suppliesCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Items Feed List */}
              <div className="space-y-2">
                {filteredTimeline.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-2xl space-y-3">
                    <div className="text-3xl">🐾</div>
                    <div className="space-y-1">
                      <p className="font-extrabold text-sm text-gray-800">Nincs megjeleníthető kapcsolódó elem</p>
                      <p className="text-xs text-gray-500">
                        {connectedSearch
                          ? 'A megadott keresési feltételeknek nem felelt meg egyetlen elem sem.'
                          : 'Ehhez a cicához még nincsenek rögzítve események, pénzügyi tételek vagy készletigények.'}
                      </p>
                    </div>
                    <div className="flex justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenAddEventForCat(cat.id)}
                        className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs transition"
                      >
                        📅 Esemény Rögzítése
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSupplyModal(true)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition"
                      >
                        📦 Készletigény Rögzítése
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredTimeline.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white border border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-xs transition space-y-1.5"
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${item.badge.color}`}>
                                {item.badge.icon} {item.badge.label}
                              </span>

                              {item.statusBadge && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.statusBadge.color}`}>
                                  {item.statusBadge.label}
                                </span>
                              )}

                              <span className="text-[11px] font-mono text-gray-400">
                                📅 {item.date || 'Dátum nélkül'}
                              </span>
                            </div>

                            <h5 className="font-extrabold text-sm text-gray-900 truncate">
                              {item.title}
                            </h5>

                            {item.subtitle && (
                              <p className="text-[11px] text-gray-500 font-medium">
                                {item.subtitle}
                              </p>
                            )}
                          </div>

                          {/* Right Amount / Qty */}
                          {item.amountOrQty && (
                            <div className="text-right shrink-0">
                              <span
                                className={`font-mono font-black text-xs px-2 py-1 rounded-lg ${
                                  item.amountOrQty.isPositive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : item.amountOrQty.isExpense
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {item.amountOrQty.text}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Details chips */}
                        {item.details && item.details.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600 bg-gray-50/80 p-1.5 rounded-lg border border-gray-100">
                            {item.details.map((d, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="text-gray-400 font-medium">{d.label}:</span>
                                <span className="font-bold text-gray-800">{d.value}</span>
                                {idx < item.details!.length - 1 && <span className="text-gray-300">•</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <p className="text-[11px] text-gray-600 bg-amber-50/50 border border-amber-100 p-1.5 rounded-lg italic">
                            💬 {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>    </>
  );
};
