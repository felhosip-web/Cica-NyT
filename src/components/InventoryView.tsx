import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../js/db.js';
import { InventoryItem, InventoryDirection, InventoryCategory } from '../types';
import { InventoryFormModal } from './InventoryFormModal';
import { CustomSelect } from './CustomSelect';

export const InventoryView: React.FC = () => {
  const inventoryItems = (useLiveQuery(() => db.inventory.toArray(), []) || []) as InventoryItem[];

  const [directionFilter, setDirectionFilter] = useState<'all' | InventoryDirection>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InventoryCategory>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'expiring_soon'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'expiry_asc' | 'brand_asc'>('date_desc');

  const [showModal, setShowModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [modalDefaultDirection, setModalDefaultDirection] = useState<InventoryDirection>('bejovo');
  const [showProcurementModal, setShowProcurementModal] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute Current Balances for All Categories
  const balances = useMemo(() => {
    let wetDb = 0;
    let dryKg = 0;
    let dryCsomag = 0;
    let litterKg = 0;
    let litterZsak = 0;
    let litterLiter = 0;
    let medicineDoboz = 0;
    let medicineTabletta = 0;
    let medicineMl = 0;
    let parasitePipetta = 0;
    let parasiteDb = 0;
    let equipmentDb = 0;
    let hygieneLiter = 0;
    let hygieneDb = 0;
    let otherDb = 0;

    let totalInbound = 0;
    let totalOutbound = 0;

    inventoryItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const isAdd = item.direction === 'bejovo';

      if (isAdd) totalInbound += 1;
      else totalOutbound += 1;

      const factor = isAdd ? qty : -qty;

      switch (item.itemType) {
        case 'nedves_tap':
          wetDb += factor;
          break;
        case 'szaraz_tap':
          if (item.unit === 'csomag' || item.unit === 'zsak') {
            dryCsomag += factor;
          } else {
            dryKg += factor;
          }
          break;
        case 'alom':
          if (item.unit === 'zsak' || item.unit === 'csomag') {
            litterZsak += factor;
          } else if (item.unit === 'l') {
            litterLiter += factor;
          } else {
            litterKg += factor;
          }
          break;
        case 'gyogyszer':
          if (item.unit === 'tabletta') medicineTabletta += factor;
          else if (item.unit === 'ml') medicineMl += factor;
          else medicineDoboz += factor;
          break;
        case 'parazitamentesito':
          if (item.unit === 'pipetta') parasitePipetta += factor;
          else parasiteDb += factor;
          break;
        case 'felszereles':
          equipmentDb += factor;
          break;
        case 'higienia_fertotlenito':
          if (item.unit === 'l' || item.unit === 'ml') hygieneLiter += factor;
          else hygieneDb += factor;
          break;
        case 'egyeb':
        default:
          otherDb += factor;
          break;
      }
    });

    return {
      wetDb: Math.max(0, Math.round(wetDb * 10) / 10),
      dryKg: Math.max(0, Math.round(dryKg * 10) / 10),
      dryCsomag: Math.max(0, Math.round(dryCsomag * 10) / 10),
      litterKg: Math.max(0, Math.round(litterKg * 10) / 10),
      litterZsak: Math.max(0, Math.round(litterZsak * 10) / 10),
      litterLiter: Math.max(0, Math.round(litterLiter * 10) / 10),
      medicineDoboz: Math.max(0, Math.round(medicineDoboz * 10) / 10),
      medicineTabletta: Math.max(0, Math.round(medicineTabletta * 10) / 10),
      medicineMl: Math.max(0, Math.round(medicineMl * 10) / 10),
      parasitePipetta: Math.max(0, Math.round(parasitePipetta * 10) / 10),
      parasiteDb: Math.max(0, Math.round(parasiteDb * 10) / 10),
      equipmentDb: Math.max(0, Math.round(equipmentDb * 10) / 10),
      hygieneLiter: Math.max(0, Math.round(hygieneLiter * 10) / 10),
      hygieneDb: Math.max(0, Math.round(hygieneDb * 10) / 10),
      otherDb: Math.max(0, Math.round(otherDb * 10) / 10),
      totalInbound,
      totalOutbound,
    };
  }, [inventoryItems]);

  // Expiry analysis
  const expiryAnalysis = useMemo(() => {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);
    const in60Days = new Date();
    in60Days.setDate(today.getDate() + 60);

    const expired: InventoryItem[] = [];
    const expiringSoon: InventoryItem[] = []; // within 30 days
    const expiring60: InventoryItem[] = []; // within 60 days

    inventoryItems.forEach((item) => {
      if (!item.expiryDate) return;
      const exp = new Date(item.expiryDate);
      if (isNaN(exp.getTime())) return;

      if (exp < today) {
        expired.push(item);
      } else if (exp <= in30Days) {
        expiringSoon.push(item);
      } else if (exp <= in60Days) {
        expiring60.push(item);
      }
    });

    return {
      expired,
      expiringSoon,
      expiring60,
      totalAlerts: expired.length + expiringSoon.length,
    };
  }, [inventoryItems]);

  // Low stock checks
  const lowStockAlerts = useMemo(() => {
    const alerts: { category: string; icon: string; current: string; threshold: string; isCritical: boolean }[] = [];

    if (balances.wetDb < 20) {
      alerts.push({
        category: 'Nedves táp',
        icon: '🥫',
        current: `${balances.wetDb} db`,
        threshold: 'Min. 20 db',
        isCritical: balances.wetDb < 5,
      });
    }
    if (balances.dryKg < 10 && balances.dryCsomag < 2) {
      alerts.push({
        category: 'Száraz táp',
        icon: '🥣',
        current: `${balances.dryKg} kg`,
        threshold: 'Min. 10 kg',
        isCritical: balances.dryKg < 3,
      });
    }
    if (balances.litterKg < 15 && balances.litterZsak < 2) {
      alerts.push({
        category: 'Alom',
        icon: '📦',
        current: `${balances.litterKg} kg (${balances.litterZsak} zsák)`,
        threshold: 'Min. 15 kg',
        isCritical: balances.litterKg < 5,
      });
    }
    if (balances.parasitePipetta < 5 && balances.parasiteDb < 5) {
      alerts.push({
        category: 'Parazitamentesítő',
        icon: '🛡️',
        current: `${balances.parasitePipetta} pipetta`,
        threshold: 'Min. 5 pipetta',
        isCritical: balances.parasitePipetta === 0,
      });
    }
    if (balances.medicineDoboz < 3 && balances.medicineTabletta < 10) {
      alerts.push({
        category: 'Gyógyszerek',
        icon: '💊',
        current: `${balances.medicineDoboz} doboz`,
        threshold: 'Min. 3 doboz',
        isCritical: balances.medicineDoboz === 0,
      });
    }
    if (balances.hygieneLiter < 2 && balances.hygieneDb < 2) {
      alerts.push({
        category: 'Higiénia & Fertőtlenítő',
        icon: '🧼',
        current: `${balances.hygieneLiter} liter`,
        threshold: 'Min. 2 liter',
        isCritical: balances.hygieneLiter === 0,
      });
    }

    return alerts;
  }, [balances]);

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    return inventoryItems
      .filter((item) => {
        if (directionFilter !== 'all' && item.direction !== directionFilter) return false;
        if (categoryFilter !== 'all' && item.itemType !== categoryFilter) return false;

        // Expiry filter
        if (expiryFilter === 'expired') {
          if (!item.expiryDate) return false;
          return new Date(item.expiryDate) < new Date();
        }
        if (expiryFilter === 'expiring_soon') {
          if (!item.expiryDate) return false;
          const exp = new Date(item.expiryDate);
          const in30 = new Date();
          in30.setDate(in30.getDate() + 30);
          return exp >= new Date() && exp <= in30;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchBrand = (item.brandOrName || '').toLowerCase().includes(q);
          const matchSource = (item.sourceOrRecipient || '').toLowerCase().includes(q);
          const matchDest = (item.destination || '').toLowerCase().includes(q);
          const matchBatch = (item.batchNumber || '').toLowerCase().includes(q);
          const matchCondition = (item.targetAgeOrCondition || '').toLowerCase().includes(q);
          const matchNotes = (item.notes || '').toLowerCase().includes(q);
          return matchBrand || matchSource || matchDest || matchBatch || matchCondition || matchNotes;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'expiry_asc') {
          const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : 9999999999999;
          const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : 9999999999999;
          return expA - expB;
        }
        if (sortBy === 'brand_asc') {
          return (a.brandOrName || '').localeCompare(b.brandOrName || '');
        }
        // default date_desc
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [inventoryItems, directionFilter, categoryFilter, expiryFilter, searchQuery, sortBy]);

  const handleDelete = async (id?: number | string) => {
    if (!id) return;
    if (confirm('Biztosan törölni szeretné ezt a készlet tétel bejegyzést?')) {
      try {
        await db.inventory.delete(id);
      } catch (e) {
        console.error('Error deleting inventory item:', e);
      }
    }
  };

  const handleOpenAdd = (dir: InventoryDirection) => {
    setItemToEdit(null);
    setModalDefaultDirection(dir);
    setShowModal(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setItemToEdit(item);
    setShowModal(true);
  };

  const getCategoryBadge = (type: InventoryCategory) => {
    switch (type) {
      case 'nedves_tap':
        return { icon: '🥫', label: 'Nedves táp', color: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'szaraz_tap':
        return { icon: '🥣', label: 'Száraz táp', color: 'bg-orange-100 text-orange-900 border-orange-300' };
      case 'alom':
        return { icon: '📦', label: 'Alom', color: 'bg-teal-100 text-teal-900 border-teal-300' };
      case 'gyogyszer':
        return { icon: '💊', label: 'Gyógyszer', color: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'parazitamentesito':
        return { icon: '🛡️', label: 'Parazitamentesítő', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      case 'felszereles':
        return { icon: '🧺', label: 'Felszerelés', color: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'higienia_fertotlenito':
        return { icon: '🧼', label: 'Higiénia / Fertőtlenítő', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'egyeb':
      default:
        return { icon: '📝', label: 'Egyéb készlet', color: 'bg-slate-100 text-slate-900 border-slate-300' };
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    if (isNaN(exp.getTime())) return null;

    const today = new Date();
    const in30 = new Date();
    in30.setDate(today.getDate() + 30);

    if (exp < today) {
      return {
        label: `Lejárt! (${expiryDate})`,
        color: 'bg-rose-100 text-rose-900 border-rose-300 font-black animate-pulse',
        icon: '⚠️',
      };
    }
    if (exp <= in30) {
      return {
        label: `Lejár hamarosan: ${expiryDate}`,
        color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        icon: '⏳',
      };
    }
    return {
      label: `Érvényes: ${expiryDate}`,
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: '📅',
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Actions */}
      <div className="bg-gradient-to-r from-emerald-850 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-700/40 relative overflow-hidden"
        style={{ backgroundColor: '#064e3b' }}
      >
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6 text-9xl">
          📦
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs font-black uppercase tracking-wider">
                Központi Raktárkészlet & Patika
              </span>
              <span className="text-xs text-white/80 font-medium">
                {inventoryItems.length} rögzített mozgás / bejegyzés
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight" style={{ color: '#ffffff' }}>
              Raktárkészlet, Gyógyszer & Felszerelés Nyilvántartás
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-3xl">
              Teljes körű táp-, alom-, gyógyszer- és felszereléskészlet kezelés lejárati idő követéssel, készlethiány riasztásokkal és automatikus pénzügyi könyvelési szinkronizációval.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setShowProcurementModal(true)}
              className="px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs rounded-2xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🛒</span>
              <span>Beszerzési Javaslat</span>
              {lowStockAlerts.length > 0 && (
                <span className="bg-rose-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {lowStockAlerts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleOpenAdd('bejovo')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base">📥</span>
              <span>Bejövő Adomány / Vétel</span>
            </button>

            <button
              onClick={() => handleOpenAdd('kimeno')}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-blue-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base">📤</span>
              <span>Kimenő Kiadás</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expiry and Low Stock Alert Banners */}
      {expiryAnalysis.totalAlerts > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-start gap-3">
            <span className="text-3xl p-2 bg-amber-200/80 rounded-2xl shrink-0">⚠️</span>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <span>Szavatossági Figyelmeztetés!</span>
                {expiryAnalysis.expired.length > 0 && (
                  <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-extrabold">
                    {expiryAnalysis.expired.length} lejárt tétel!
                  </span>
                )}
                {expiryAnalysis.expiringSoon.length > 0 && (
                  <span className="bg-amber-500 text-amber-950 text-xs px-2 py-0.5 rounded-full font-extrabold">
                    {expiryAnalysis.expiringSoon.length} hamarosan lejár (&lt; 30 nap)
                  </span>
                )}
              </h3>
              <p className="text-xs font-semibold text-amber-900 mt-0.5">
                Kérjük ellenőrizze a patikát és az élelmiszerkészletet, hogy megelőzze a lejárt gyógyszerek vagy tápok felhasználását!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {expiryAnalysis.expired.length > 0 && (
              <button
                onClick={() => {
                  setExpiryFilter('expired');
                  setSortBy('expiry_asc');
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              >
                🔴 Lejártak listázása
              </button>
            )}
            <button
              onClick={() => {
                setExpiryFilter('expiring_soon');
                setSortBy('expiry_asc');
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
            >
              🟠 30 napon belüliek
            </button>
            {expiryFilter !== 'all' && (
              <button
                onClick={() => setExpiryFilter('all')}
                className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 border border-amber-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
              >
                Szűrő törlése
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Balance Cards - 8 Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>📊</span>
            <span>Aktuális Készletegyenlegek Kategóriánként</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-500">
            Élő raktári nyilvántartás
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Nedves táp */}
          <div
            onClick={() => setCategoryFilter(categoryFilter === 'nedves_tap' ? 'all' : 'nedves_tap')}
            className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md ${
              categoryFilter === 'nedves_tap' ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg font-black">
                  🥫
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Nedves Táp</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Konzerv, Alutasak</span>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                balances.wetDb < 20 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {balances.wetDb < 20 ? 'Kevés' : 'Megfelelő'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {balances.wetDb} <span className="text-xs font-bold text-slate-500">db</span>
              </span>
              <span className="text-[11px] font-bold text-amber-700">Tasakos/Konzerv</span>
            </div>
          </div>

          {/* Card 2: Száraz táp */}
          <div
            onClick={() => setCategoryFilter(categoryFilter === 'szaraz_tap' ? 'all' : 'szaraz_tap')}
            className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md ${
              categoryFilter === 'szaraz_tap' ? 'ring-2 ring-orange-500 border-orange-400 bg-orange-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center text-lg font-black">
                  🥣
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Száraz Táp</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Granulátum, Tápszer</span>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                balances.dryKg < 10 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {balances.dryKg < 10 ? 'Kevés' : 'Megfelelő'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {balances.dryKg} <span className="text-xs font-bold text-slate-500">kg</span>
                </span>
                {balances.dryCsomag > 0 && (
                  <span className="ml-1.5 text-[11px] font-bold text-orange-800 bg-orange-100 px-1.5 py-0.2 rounded">
                    +{balances.dryCsomag} cs.
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-orange-700">Tápmennyiség</span>
            </div>
          </div>

          {/* Card 3: Alom */}
          <div
            onClick={() => setCategoryFilter(categoryFilter === 'alom' ? 'all' : 'alom')}
            className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md ${
              categoryFilter === 'alom' ? 'ring-2 ring-teal-500 border-teal-400 bg-teal-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-lg font-black">
                  📦
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Alom Készlet</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Szilikát, Csomósodó</span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Higiénia
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between flex-wrap gap-1">
              <div>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {balances.litterKg} <span className="text-xs font-bold text-slate-500">kg</span>
                </span>
                {balances.litterZsak > 0 && (
                  <span className="ml-1 text-[11px] font-bold text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded">
                    +{balances.litterZsak} zsák
                  </span>
                )}
              </div>
              {balances.litterLiter > 0 && (
                <span className="text-[11px] font-bold text-teal-700">{balances.litterLiter} l</span>
              )}
            </div>
          </div>

          {/* Card 4: Gyógyszerek */}
          <div
            onClick={() => setCategoryFilter(categoryFilter === 'gyogyszer' ? 'all' : 'gyogyszer')}
            className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md ${
              categoryFilter === 'gyogyszer' ? 'ring-2 ring-purple-500 border-purple-400 bg-purple-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg font-black">
                  💊
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Gyógyszertár</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Antibiotikum, Szemcsepp</span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Patika
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {balances.medicineDoboz} <span className="text-xs font-bold text-slate-500">doboz</span>
              </span>
              {balances.medicineTabletta > 0 && (
                <span className="text-[11px] font-bold text-purple-700">+{balances.medicineTabletta} tbl.</span>
              )}
            </div>
          </div>

          {/* Card 5: Parazitamentesítők */}
          <div
            onClick={() => setCategoryFilter(categoryFilter === 'parazitamentesito' ? 'all' : 'parazitamentesito')}
            className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md ${
              categoryFilter === 'parazitamentesito' ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-lg font-black">
                  🛡️
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Parazitamentesítő</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Spot-on, Féreghajtó</span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Prevenció
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {balances.parasitePipetta} <span className="text-xs font-bold text-slate-500">pipetta</span>
              </span>
              {balances.parasiteDb > 0 && (
                <span className="text-[11px] font-bold text-indigo-700">+{balances.parasiteDb} db</span>
              )}
            </div>
          </div>

          {/* Card 6: Felszerelés */}
          <div
            onClick={() => setCategoryFilter(categoryFilter === 'felszereles' ? 'all' : 'felszereles')}
            className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md ${
              categoryFilter === 'felszereles' ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg font-black">
                  🧺
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Felszerelés</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Hordozó, Ketrec, Tálka</span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Eszközök
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {balances.equipmentDb} <span className="text-xs font-bold text-slate-500">db</span>
              </span>
              <span className="text-[11px] font-bold text-blue-700">Használható</span>
            </div>
          </div>

          {/* Card 7: Higiénia & Fertőtlenítő */}
          <div
            onClick={() => setCategoryFilter(categoryFilter === 'higienia_fertotlenito' ? 'all' : 'higienia_fertotlenito')}
            className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md ${
              categoryFilter === 'higienia_fertotlenito' ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-black">
                  🧼
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Higiénia & Fertőtlenítő</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Virucid, Kesztyű, Kendő</span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Védelem
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {balances.hygieneLiter} <span className="text-xs font-bold text-slate-500">l / {balances.hygieneDb} db</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-700">Tisztítószer</span>
            </div>
          </div>

          {/* Card 8: Egyéb */}
          <div
            onClick={() => setCategoryFilter(categoryFilter === 'egyeb' ? 'all' : 'egyeb')}
            className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md ${
              categoryFilter === 'egyeb' ? 'ring-2 ring-slate-500 border-slate-400 bg-slate-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center text-lg font-black">
                  📝
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Egyéb Készlet</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Irodaszer, Játék, Egyéb</span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                Vegyes
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {balances.otherDb} <span className="text-xs font-bold text-slate-500">db</span>
              </span>
              <span className="text-[11px] font-bold text-slate-600">Összesen</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters, Search & Sorting Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Keresés cikk megnevezés, márka, adományozó, címzett, célállomás, sarzsszám..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-2xl font-bold text-xs focus:ring-2 focus:ring-emerald-500 transition placeholder-slate-400"
              style={{ colorScheme: 'light' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Direction Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start md:self-auto shrink-0">
            <button
              onClick={() => setDirectionFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer ${
                directionFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mind ({inventoryItems.length})
            </button>
            <button
              onClick={() => setDirectionFilter('bejovo')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1 ${
                directionFilter === 'bejovo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📥 Bejövő</span>
              <span>({balances.totalInbound})</span>
            </button>
            <button
              onClick={() => setDirectionFilter('kimeno')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1 ${
                directionFilter === 'kimeno'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📤 Kimenő</span>
              <span>({balances.totalOutbound})</span>
            </button>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 shrink-0 min-w-[210px]">
            <span className="text-[11px] font-black text-slate-500 shrink-0">Rendezés:</span>
            <div className="flex-1">
              <CustomSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { value: 'date_desc', label: 'Dátum (Legfrissebb)', icon: '📅' },
                  { value: 'date_asc', label: 'Dátum (Legrégebbi)', icon: '📅' },
                  { value: 'expiry_asc', label: 'Lejárati idő (Sürgős elöl)', icon: '⏳' },
                  { value: 'brand_asc', label: 'Név / Márka (A-Z)', icon: '🔤' },
                ]}
                title="Készlet Rendezési Sorrend"
                colorScheme="slate"
                buttonClassName="p-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold text-xs"
              />
            </div>
          </div>
        </div>

        {/* 8 Category Selection Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar pb-1">
          <span className="text-xs font-black text-slate-500 shrink-0">Kategória:</span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Összes Kategória
          </button>
          <button
            onClick={() => setCategoryFilter('nedves_tap')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'nedves_tap'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>🥫 Nedves táp</span>
          </button>
          <button
            onClick={() => setCategoryFilter('szaraz_tap')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'szaraz_tap'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 text-orange-900 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <span>🥣 Száraz táp</span>
          </button>
          <button
            onClick={() => setCategoryFilter('alom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'alom'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <span>📦 Alom</span>
          </button>
          <button
            onClick={() => setCategoryFilter('gyogyszer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'gyogyszer'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <span>💊 Gyógyszer</span>
          </button>
          <button
            onClick={() => setCategoryFilter('parazitamentesito')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'parazitamentesito'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <span>🛡️ Parazitamentesítő</span>
          </button>
          <button
            onClick={() => setCategoryFilter('felszereles')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'felszereles'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <span>🧺 Felszerelés</span>
          </button>
          <button
            onClick={() => setCategoryFilter('higienia_fertotlenito')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'higienia_fertotlenito'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>🧼 Higiénia</span>
          </button>
          <button
            onClick={() => setCategoryFilter('egyeb')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'egyeb'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>📝 Egyéb</span>
          </button>
        </div>
      </div>

      {/* Item List / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h3 className="text-sm font-black text-slate-900">
              Készletmozgások & Raktári Tételek ({filteredItems.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {expiryFilter !== 'all' && (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                Szűrés: {expiryFilter === 'expired' ? 'Lejárt tételek' : '30 napon belül lejárók'}
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
                Kategória szűrt
              </span>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="text-4xl">📦</div>
            <p className="text-sm font-bold text-slate-600">
              Nincs a megadott szűrési feltételeknek megfelelő készletmozgás.
            </p>
            <p className="text-xs text-slate-400">
              Kattintson a "Bejövő Adomány / Vétel" vagy "Kimenő Kiadás" gombra új tétel felviteléhez!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const isBejovo = item.direction === 'bejovo';
              const catBadge = getCategoryBadge(item.itemType);
              const expiryBadge = getExpiryStatus(item.expiryDate);

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-50/90 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
                        isBejovo
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                    >
                      {isBejovo ? '📥' : '📤'}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Direction Badge */}
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isBejovo
                              ? 'bg-emerald-700 text-white'
                              : 'bg-blue-700 text-white'
                          }`}
                        >
                          {isBejovo
                            ? item.sourceType === 'sajat_kor'
                              ? '🛒 Saját Vásárlás'
                              : '🎁 Adomány'
                            : '📤 Kimenő Kiadás'}
                        </span>

                        {/* Category Badge */}
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${catBadge.color}`}>
                          {catBadge.icon} {catBadge.label}
                        </span>

                        {/* Brand / Article Name */}
                        {item.brandOrName && (
                          <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {item.brandOrName}
                          </span>
                        )}

                        {/* Target condition / age */}
                        {item.targetAgeOrCondition && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                            🎯 {item.targetAgeOrCondition}
                          </span>
                        )}

                        {/* Date */}
                        <span className="text-xs text-slate-500 font-medium">
                          📅 {item.date}
                        </span>
                      </div>

                      {/* Expiry and Batch Details */}
                      {(expiryBadge || item.batchNumber) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {expiryBadge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${expiryBadge.color}`}>
                              <span>{expiryBadge.icon}</span>
                              <span>{expiryBadge.label}</span>
                            </span>
                          )}
                          {item.batchNumber && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              Sarzs/Lot: {item.batchNumber}
                            </span>
                          )}
                          {item.minStockThreshold !== undefined && (
                            <span className="text-[10px] text-slate-500 font-bold">
                              Küszöb: min. {item.minStockThreshold} {item.unit}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Source/Recipient & Destination */}
                      <div className="text-xs font-bold text-slate-800">
                        {isBejovo ? (
                          <span>
                            Forrás / Kitől: <span className="text-emerald-950 font-black">{item.sourceOrRecipient}</span>
                          </span>
                        ) : (
                          <span>
                            Címzett / Kinek: <span className="text-blue-950 font-black">{item.sourceOrRecipient}</span>
                          </span>
                        )}
                        {item.destination && (
                          <span className="ml-2 text-slate-600 font-medium">
                            📍 Cél: {item.destination}
                          </span>
                        )}
                        {item.purchaseCost && item.purchaseCost > 0 && (
                          <span className="ml-2 text-emerald-800 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            💵 {item.purchaseCost.toLocaleString('hu-HU')} Ft
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-xs text-slate-600 font-medium italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span
                        className={`text-lg sm:text-xl font-black tracking-tight ${
                          isBejovo ? 'text-emerald-700' : 'text-blue-700'
                        }`}
                      >
                        {isBejovo ? '+' : '-'}{item.quantity} <span className="text-sm font-bold">{item.unit}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        title="Szerkesztés"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-rose-500 hover:text-rose-900 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Törlés"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Procurement / Restock Suggestion Modal */}
      {showProcurementModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-1.5 bg-white/20 rounded-xl">🛒</span>
                <div>
                  <h3 className="text-base font-black" style={{ color: '#ffffff' }}>
                    Beszerzési & Adománykérési Javaslat
                  </h3>
                  <p className="text-xs text-amber-100 font-semibold">
                    Készlethiányok és alacsony készletszintek
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProcurementModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 font-black text-sm flex items-center justify-center cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {lowStockAlerts.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <span className="text-4xl">🎉</span>
                  <h4 className="text-sm font-black text-emerald-800">Minden készletszint megfelelő!</h4>
                  <p className="text-xs text-slate-500">
                    Jelenleg egyetlen kategóriában sincs kritikus készlethiány.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-600">
                    Az alábbi cikkekből a készlet a minimális biztonsági küszöb alá csökkent:
                  </p>
                  <div className="space-y-2.5">
                    {lowStockAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          alert.isCritical
                            ? 'bg-rose-50 border-rose-200 text-rose-950'
                            : 'bg-amber-50 border-amber-200 text-amber-950'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{alert.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black">{alert.category}</h4>
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                                alert.isCritical ? 'bg-rose-600 text-white' : 'bg-amber-500 text-amber-950'
                              }`}>
                                {alert.isCritical ? 'KRITIKUS HIÁNY' : 'Alacsony'}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold opacity-80 mt-0.5">
                              Jelenlegi készlet: <span className="font-extrabold">{alert.current}</span> (Küszöb: {alert.threshold})
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setShowProcurementModal(false);
                            handleOpenAdd('bejovo');
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl text-xs font-extrabold transition shadow-xs shrink-0 cursor-pointer"
                        >
                          + Bevételezés
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowProcurementModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Rendben, Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Add/Edit Modal */}
      {showModal && (
        <InventoryFormModal
          itemToEdit={itemToEdit}
          defaultDirection={modalDefaultDirection}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
