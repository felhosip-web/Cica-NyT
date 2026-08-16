import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../js/db.js';
import {
  FinancialTransaction,
  FinanceType,
  FinanceCategory,
  FinanceStatus,
  Cat,
  FosterParent,
} from '../types';
import {
  FinanceFormModal,
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from './FinanceFormModal';
import { CustomSelect } from './CustomSelect';

export const FinanceView: React.FC = () => {
  // Database Live Queries
  const transactions = (useLiveQuery(() => db.finances ? db.finances.toArray() : [], []) || []) as FinancialTransaction[];
  const cats = (useLiveQuery(() => db.cats.toArray(), []) || []) as Cat[];
  const fosterParents = (useLiveQuery(() => db.fosterParents.toArray(), []) || []) as FosterParent[];

  // Quick Map Lookups
  const catMap = useMemo(() => {
    const map = new Map<string, Cat>();
    cats.forEach((c) => map.set(String(c.id), c));
    return map;
  }, [cats]);

  const fosterMap = useMemo(() => {
    const map = new Map<string, FosterParent>();
    fosterParents.forEach((fp) => map.set(String(fp.id), fp));
    return map;
  }, [fosterParents]);

  // UI States
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'analytics' | 'monthly'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<FinancialTransaction | null>(null);
  const [modalInitialType, setModalInitialType] = useState<FinanceType>('bevetel');
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Date Range Helper Calculations
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return transactions.filter((t) => {
      // Type Filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Category Filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Status Filter
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      // Period Filter
      if (t.date) {
        const tDate = new Date(t.date);
        const tYear = tDate.getFullYear();
        const tMonth = tDate.getMonth();

        if (periodFilter === 'this_month') {
          if (tYear !== currentYear || tMonth !== currentMonth) return false;
        } else if (periodFilter === 'last_month') {
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          if (tYear !== lastMonthYear || tMonth !== lastMonth) return false;
        } else if (periodFilter === 'this_year') {
          if (tYear !== currentYear) return false;
        } else if (periodFilter === 'custom') {
          if (customStartDate && t.date < customStartDate) return false;
          if (customEndDate && t.date > customEndDate) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title?.toLowerCase().includes(q);
        const partnerMatch = t.partnerName?.toLowerCase().includes(q);
        const invoiceMatch = t.invoiceNumber?.toLowerCase().includes(q);
        const catName = t.catId ? catMap.get(t.catId)?.nev.toLowerCase() : '';
        const fosterName = t.fosterId ? fosterMap.get(t.fosterId)?.name.toLowerCase() : '';
        const catMatch = catName?.includes(q);
        const fosterMatch = fosterName?.includes(q);

        if (!titleMatch && !partnerMatch && !invoiceMatch && !catMatch && !fosterMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    statusFilter,
    periodFilter,
    customStartDate,
    customEndDate,
    searchQuery,
    catMap,
    fosterMap,
  ]);

  // Overall Financial Key Figures
  const financialKPIs = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    filteredTransactions.forEach((t) => {
      if (t.status === 'storno') return; // Exclude cancelled items

      if (t.type === 'bevetel') {
        totalIncome += t.amount || 0;
        if (t.status === 'fuggoben') pendingIncome += t.amount || 0;
      } else {
        totalExpense += t.amount || 0;
        if (t.status === 'fuggoben') pendingExpense += t.amount || 0;
      }
    });

    const netBalance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      pendingIncome,
      pendingExpense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Monthly breakdown data for charts
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, { income: number; expense: number; monthLabel: string }> = {};

    // Collect last 12 months in order
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short' });
      months.push(key);
      monthMap[key] = { income: 0, expense: 0, monthLabel };
    }

    transactions.forEach((t) => {
      if (t.status === 'storno' || !t.date) return;
      const key = t.date.slice(0, 7);
      if (monthMap[key]) {
        if (t.type === 'bevetel') {
          monthMap[key].income += t.amount || 0;
        } else {
          monthMap[key].expense += t.amount || 0;
        }
      }
    });

    return months.map((key) => monthMap[key]);
  }, [transactions]);

  // Category breakdown for expenses and income
  const categoryExpenses = useMemo(() => {
    const catAmounts: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      if (t.type === 'kiadas' && t.status !== 'storno') {
        catAmounts[t.category] = (catAmounts[t.category] || 0) + (t.amount || 0);
      }
    });
    return Object.entries(catAmounts)
      .map(([catKey, amount]) => ({
        categoryKey: catKey as FinanceCategory,
        label: CATEGORY_LABELS[catKey as FinanceCategory]?.name || catKey,
        icon: CATEGORY_LABELS[catKey as FinanceCategory]?.icon || '💰',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  const categoryIncomes = useMemo(() => {
    const catAmounts: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      if (t.type === 'bevetel' && t.status !== 'storno') {
        catAmounts[t.category] = (catAmounts[t.category] || 0) + (t.amount || 0);
      }
    });
    return Object.entries(catAmounts)
      .map(([catKey, amount]) => ({
        categoryKey: catKey as FinanceCategory,
        label: CATEGORY_LABELS[catKey as FinanceCategory]?.name || catKey,
        icon: CATEGORY_LABELS[catKey as FinanceCategory]?.icon || '💰',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  // Modal actions
  const handleOpenNewModal = (type: FinanceType) => {
    setTransactionToEdit(null);
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (t: FinancialTransaction) => {
    setTransactionToEdit(t);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (id?: number | string) => {
    if (!id) return;
    if (window.confirm('Biztosan törölni szeretnéd ezt a pénzügyi tételt?')) {
      try {
        await db.finances.delete(id);
      } catch (err) {
        console.error('Error deleting finance item:', err);
        alert('Hiba történt a törlés során!');
      }
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('Nincs exportálható pénzügyi tétel a jelenlegi szűrés szerint!');
      return;
    }

    const headers = [
      'Azonosító',
      'Típus',
      'Kategória',
      'Megnevezés',
      'Összeg (Ft)',
      'Dátum',
      'Fizetési Mód',
      'Partner / Adományozó',
      'Számlaszám',
      'Státusz',
      'Kapcsolódó Cica',
      'Kapcsolódó Befogadó',
      'Megjegyzések',
    ];

    const rows = filteredTransactions.map((t) => [
      t.id || '',
      t.type === 'bevetel' ? 'Bevétel' : 'Kiadás',
      CATEGORY_LABELS[t.category]?.name || t.category,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.amount || 0,
      t.date || '',
      PAYMENT_METHOD_LABELS[t.paymentMethod]?.name || t.paymentMethod,
      `"${(t.partnerName || '').replace(/"/g, '""')}"`,
      `"${(t.invoiceNumber || '').replace(/"/g, '""')}"`,
      t.status === 'teljesult' ? 'Teljesült' : t.status === 'fuggoben' ? 'Függőben' : 'Stornó',
      t.catId ? `"${(catMap.get(t.catId)?.nev || '').replace(/"/g, '""')}"` : '',
      t.fosterId ? `"${(fosterMap.get(t.fosterId)?.name || '').replace(/"/g, '""')}"` : '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cica_nyt_penzugyi_kimutatas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Title Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-3xl shadow-lg ring-2 ring-emerald-400/30">
            💳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">Pénzügyi Kezelés & MÉRLEG</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
                Új Modul v2.9.1
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Bevételek, kiadások, adományok, állatorvosi számlák és pénzügyi kimutatások egy helyen.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            onClick={() => handleOpenNewModal('bevetel')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>➕ Új Bevétel</span>
          </button>
          <button
            onClick={() => handleOpenNewModal('kiadas')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>➕ Új Kiadás</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs border border-slate-700/80 transition cursor-pointer flex items-center gap-1"
            title="Excel / CSV exportálása"
          >
            <span>📥 CSV Export</span>
          </button>
          <button
            onClick={() => setShowPrintReport(!showPrintReport)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs border border-slate-700/80 transition cursor-pointer flex items-center gap-1"
            title="Nyomtatható pénzügyi kimutatás megtekintése"
          >
            <span>🖨️ Nyomtatás</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income Card */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-emerald-900/60 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              📈 Összes Bevétel
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center justify-center text-sm font-black">
              +
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {financialKPIs.totalIncome.toLocaleString('hu-HU')} <span className="text-sm font-extrabold text-emerald-400">Ft</span>
            </div>
            {financialKPIs.pendingIncome > 0 && (
              <p className="text-[11px] font-semibold text-emerald-400/80 mt-1">
                ⏳ Ebből függőben: {financialKPIs.pendingIncome.toLocaleString('hu-HU')} Ft
              </p>
            )}
          </div>
        </div>

        {/* Total Expense Card */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-rose-900/60 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              📉 Összes Kiadás
            </span>
            <span className="w-8 h-8 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/80 flex items-center justify-center text-sm font-black">
              -
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {financialKPIs.totalExpense.toLocaleString('hu-HU')} <span className="text-sm font-extrabold text-rose-400">Ft</span>
            </div>
            {financialKPIs.pendingExpense > 0 && (
              <p className="text-[11px] font-semibold text-rose-400/80 mt-1">
                ⏳ Ebből függőben: {financialKPIs.pendingExpense.toLocaleString('hu-HU')} Ft
              </p>
            )}
          </div>
        </div>

        {/* Net Balance / MÉRLEG Card */}
        <div
          className={`p-5 rounded-3xl bg-slate-900 border shadow-lg relative overflow-hidden ${
            financialKPIs.netBalance >= 0 ? 'border-cyan-800/80' : 'border-amber-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              ⚖️ Pénzügyi Egyenleg / MÉRLEG
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                financialKPIs.netBalance >= 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {financialKPIs.netBalance >= 0 ? 'Pozitív' : 'Deficit'}
            </span>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight ${
                financialKPIs.netBalance >= 0 ? 'text-cyan-300' : 'text-amber-400'
              }`}
            >
              {financialKPIs.netBalance >= 0 ? '+' : ''}
              {financialKPIs.netBalance.toLocaleString('hu-HU')} <span className="text-sm font-extrabold">Ft</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              Bevételek és kiadások nettó különbözete
            </p>
          </div>
        </div>

        {/* Record Count Card */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              📋 Rögzített Tranzakciók
            </span>
            <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center justify-center text-sm font-bold">
              📊
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {financialKPIs.count} <span className="text-sm font-normal text-slate-400">tétel</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              Kiválasztott időszak szűrt adatai
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation & Filter Controls */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          {/* SubTab Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 shrink-0">
            <button
              onClick={() => setActiveSubTab('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'list'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📋 Tranzakció Lista</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-slate-300">
                {filteredTransactions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'analytics'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📊 Grafikonok & Kimutatás</span>
            </button>

            <button
              onClick={() => setActiveSubTab('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'monthly'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📅 Havi Trendek</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Keresés leírás, partner, számlaszám, cica alapján..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2 text-xs font-medium text-white focus:outline-hidden focus:border-emerald-500 pl-9"
            />
            <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Period Filter */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Időszak</label>
            <CustomSelect
              value={periodFilter}
              onChange={(val) => setPeriodFilter(val as any)}
              options={[
                { value: 'this_month', label: 'Ez a hónap', icon: '📅' },
                { value: 'last_month', label: 'Előző hónap', icon: '📅' },
                { value: 'this_year', label: `Idei év (${new Date().getFullYear()})`, icon: '📆' },
                { value: 'all', label: 'Összes időszak', icon: '♾️' },
                { value: 'custom', label: 'Egyéni időintervallum', icon: '🎯' },
              ]}
              title="Pénzügyi Időszak Kiválasztása"
              colorScheme="emerald"
              buttonClassName="bg-slate-950 border-slate-800 text-slate-200"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Típus</label>
            <CustomSelect
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as any)}
              options={[
                { value: 'all', label: 'Mind (Bevétel & Kiadás)', icon: '🔄' },
                { value: 'bevetel', label: 'Csak Bevételek', icon: '📈' },
                { value: 'kiadas', label: 'Csak Kiadások', icon: '📉' },
              ]}
              title="Tranzakció Típus Szűrése"
              colorScheme="emerald"
              buttonClassName="bg-slate-950 border-slate-800 text-slate-200"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Kategória</label>
            <CustomSelect
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={[
                { value: 'all', label: 'Összes kategória', icon: '📁' },
                ...Object.entries(CATEGORY_LABELS).map(([catKey, info]) => ({
                  value: catKey,
                  label: info.name,
                  icon: info.icon,
                })),
              ]}
              title="Kategória Szűrése"
              colorScheme="emerald"
              buttonClassName="bg-slate-950 border-slate-800 text-slate-200"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-400 font-bold mb-1">Státusz</label>
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'Összes státusz', icon: '⚡' },
                { value: 'teljesult', label: 'Teljesült', icon: '✅' },
                { value: 'fuggoben', label: 'Függőben lévő', icon: '⏳' },
                { value: 'storno', label: 'Stornózott', icon: '🚫' },
              ]}
              title="Státusz Szűrése"
              colorScheme="emerald"
              buttonClassName="bg-slate-950 border-slate-800 text-slate-200"
            />
          </div>
        </div>

        {/* Custom Date Range Controls if 'custom' is selected */}
        {periodFilter === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Kezdő dátum:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Záró dátum:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-medium"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-slate-400 hover:text-white font-bold underline"
              >
                Dátumok törlése
              </button>
            )}
          </div>
        )}
      </div>

      {/* Printable Report View Modal */}
      {showPrintReport && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-lg font-black flex items-center gap-2">
              <span>📑 Nyomtatható Pénzügyi Összesítő Kimutatás</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer"
              >
                🖨️ Nyomtatás / PDF Mentés
              </button>
              <button
                onClick={() => setShowPrintReport(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Bezárás
              </button>
            </div>
          </div>

          <div className="p-6 bg-white text-slate-900 rounded-2xl shadow-inner font-sans text-xs space-y-4 print:p-0">
            <div className="flex justify-between items-start border-b border-slate-300 pb-4">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  CatRescue Manager — Pénzügyi Kimutatás
                </h1>
                <p className="text-xs text-slate-600 font-bold mt-0.5">
                  Civil Állatmentő Egyesület / Nyilvántartás
                </p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p>
                  <strong>Készült:</strong> {new Date().toLocaleDateString('hu-HU')}
                </p>
                <p>
                  <strong>Időszak:</strong>{' '}
                  {periodFilter === 'this_month'
                    ? 'Ez a hónap'
                    : periodFilter === 'last_month'
                    ? 'Előző hónap'
                    : periodFilter === 'this_year'
                    ? 'Idei év'
                    : 'Teljes időszak'}
                </p>
              </div>
            </div>

            {/* Print Summary Metrics */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Összes Bevétel</div>
                <div className="text-base font-black text-emerald-900 mt-1">
                  {financialKPIs.totalIncome.toLocaleString('hu-HU')} Ft
                </div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <div className="text-[10px] font-bold text-rose-800 uppercase">Összes Kiadás</div>
                <div className="text-base font-black text-rose-900 mt-1">
                  {financialKPIs.totalExpense.toLocaleString('hu-HU')} Ft
                </div>
              </div>
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl">
                <div className="text-[10px] font-bold text-slate-700 uppercase">Nettó Egyenleg</div>
                <div className="text-base font-black text-slate-900 mt-1">
                  {financialKPIs.netBalance.toLocaleString('hu-HU')} Ft
                </div>
              </div>
            </div>

            {/* Print Table */}
            <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 border border-slate-300">Dátum</th>
                  <th className="p-2 border border-slate-300">Típus</th>
                  <th className="p-2 border border-slate-300">Kategória</th>
                  <th className="p-2 border border-slate-300">Megnevezés</th>
                  <th className="p-2 border border-slate-300">Partner / Adományozó</th>
                  <th className="p-2 border border-slate-300 text-right">Összeg</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-200 whitespace-nowrap">{t.date}</td>
                    <td className="p-2 border border-slate-200 font-bold">
                      {t.type === 'bevetel' ? 'Bevétel' : 'Kiadás'}
                    </td>
                    <td className="p-2 border border-slate-200">
                      {CATEGORY_LABELS[t.category]?.name || t.category}
                    </td>
                    <td className="p-2 border border-slate-200">{t.title}</td>
                    <td className="p-2 border border-slate-200">{t.partnerName || '-'}</td>
                    <td
                      className={`p-2 border border-slate-200 font-black text-right whitespace-nowrap ${
                        t.type === 'bevetel' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {t.type === 'bevetel' ? '+' : '-'}
                      {t.amount?.toLocaleString('hu-HU')} Ft
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: Transactions Table View */}
      {activeSubTab === 'list' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="text-4xl">💳</div>
              <h3 className="text-base font-bold text-slate-200">Nincs a szűrésnek megfelelő pénzügyi tétel</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Próbáld meg megváltoztatni a szűrőket, vagy rögzíts egy új bevételeket/kiadásokat tartalmazó tranzakciót!
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => handleOpenNewModal('bevetel')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  ➕ Új Bevétel
                </button>
                <button
                  onClick={() => handleOpenNewModal('kiadas')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  ➕ Új Kiadás
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Típus</th>
                    <th className="py-3 px-4">Dátum</th>
                    <th className="py-3 px-4">Kategória</th>
                    <th className="py-3 px-4">Megnevezés / Partner</th>
                    <th className="py-3 px-4">Mód / Bizonylat</th>
                    <th className="py-3 px-4">Kapcsolódó Entity</th>
                    <th className="py-3 px-4 text-right">Összeg (Ft)</th>
                    <th className="py-3 px-4 text-center">Státusz</th>
                    <th className="py-3 px-4 text-center">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium text-slate-200">
                  {filteredTransactions.map((t) => {
                    const cat = t.catId ? catMap.get(t.catId) : null;
                    const foster = t.fosterId ? fosterMap.get(t.fosterId) : null;
                    const isIncome = t.type === 'bevetel';

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/50 transition">
                        {/* Type Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                              isIncome
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : 'bg-rose-950/80 text-rose-300 border-rose-800'
                            }`}
                          >
                            <span>{isIncome ? '📈 Bevétel' : '📉 Kiadás'}</span>
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                          {t.date}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <span>{CATEGORY_LABELS[t.category]?.icon || '💰'}</span>
                            <span>{CATEGORY_LABELS[t.category]?.name || t.category}</span>
                          </span>
                        </td>

                        {/* Title & Partner */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-white text-xs truncate">{t.title}</div>
                          {t.partnerName && (
                            <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1 truncate mt-0.5">
                              <span>🤝 {t.partnerName}</span>
                            </div>
                          )}
                        </td>

                        {/* Payment Method & Invoice */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                          <div className="flex items-center gap-1">
                            <span>{PAYMENT_METHOD_LABELS[t.paymentMethod]?.icon || '💵'}</span>
                            <span>{PAYMENT_METHOD_LABELS[t.paymentMethod]?.name || t.paymentMethod}</span>
                          </div>
                          {t.invoiceNumber && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              📄 {t.invoiceNumber}
                            </div>
                          )}
                        </td>

                        {/* Connected Cat / Foster Parent */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {cat ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-950/80 text-pink-300 border border-pink-800 text-[10px] font-bold">
                              🐱 {cat.nev}
                            </span>
                          ) : foster ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[10px] font-bold">
                              🏡 {foster.name}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-black text-sm">
                          <span className={isIncome ? 'text-emerald-400' : 'text-rose-400'}>
                            {isIncome ? '+' : '-'}
                            {t.amount?.toLocaleString('hu-HU')} Ft
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {t.status === 'teljesult' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              ✅ Teljesült
                            </span>
                          ) : t.status === 'fuggoben' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-800">
                              ⏳ Függőben
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700">
                              🚫 Stornó
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditTransaction(t)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                              title="Módosítás"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition cursor-pointer"
                              title="Törlés"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Analytics & Category Breakdown */}
      {activeSubTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expenses Category Breakdown */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <span>📉 Kiadások Kategória Szerint</span>
              </span>
              <span className="text-xs text-rose-400 font-bold">
                {financialKPIs.totalExpense.toLocaleString('hu-HU')} Ft
              </span>
            </h3>

            {categoryExpenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                Nincs rögzített kiadás a megadott időszakban.
              </div>
            ) : (
              <div className="space-y-3">
                {categoryExpenses.map((cat) => {
                  const percentage =
                    financialKPIs.totalExpense > 0
                      ? Math.round((cat.amount / financialKPIs.totalExpense) * 100)
                      : 0;

                  return (
                    <div key={cat.categoryKey} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        <span className="text-slate-300">
                          {cat.amount.toLocaleString('hu-HU')} Ft ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-rose-600 to-pink-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Incomes Category Breakdown */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <span>📈 Bevételek Forrás Szerint</span>
              </span>
              <span className="text-xs text-emerald-400 font-bold">
                {financialKPIs.totalIncome.toLocaleString('hu-HU')} Ft
              </span>
            </h3>

            {categoryIncomes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                Nincs rögzített bevétel a megadott időszakban.
              </div>
            ) : (
              <div className="space-y-3">
                {categoryIncomes.map((cat) => {
                  const percentage =
                    financialKPIs.totalIncome > 0
                      ? Math.round((cat.amount / financialKPIs.totalIncome) * 100)
                      : 0;

                  return (
                    <div key={cat.categoryKey} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        <span className="text-slate-300">
                          {cat.amount.toLocaleString('hu-HU')} Ft ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Monthly Trend Chart */}
      {activeSubTab === 'monthly' && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                📊 Havi Pénzáramlási Trendek (Utolsó 12 Hónap)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Összehasonlító bevételek és kiadások havi felbontásban
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Bevétel
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Kiadás
              </span>
            </div>
          </div>

          {/* Bar Chart Bars */}
          <div className="grid grid-cols-12 gap-2 items-end h-64 pt-8 pb-4 border-b border-slate-800">
            {monthlyData.map((m, idx) => {
              const maxVal = Math.max(
                ...monthlyData.map((d) => Math.max(d.income, d.expense)),
                100000
              );
              const incomeHeight = Math.round((m.income / maxVal) * 100);
              const expenseHeight = Math.round((m.expense / maxVal) * 100);

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-700 text-white text-[10px] font-bold p-2 rounded-xl shadow-xl z-20 pointer-events-none whitespace-nowrap">
                    <div>{m.monthLabel}</div>
                    <div className="text-emerald-400">+ {m.income.toLocaleString('hu-HU')} Ft</div>
                    <div className="text-rose-400">- {m.expense.toLocaleString('hu-HU')} Ft</div>
                  </div>

                  <div className="flex items-end gap-1 w-full justify-center h-full">
                    {/* Income Bar */}
                    <div
                      className="bg-gradient-to-t from-emerald-600 to-teal-400 w-2.5 sm:w-3.5 rounded-t-md transition-all duration-500 hover:brightness-125"
                      style={{ height: `${Math.max(4, incomeHeight)}%` }}
                    />
                    {/* Expense Bar */}
                    <div
                      className="bg-gradient-to-t from-rose-600 to-pink-400 w-2.5 sm:w-3.5 rounded-t-md transition-all duration-500 hover:brightness-125"
                      style={{ height: `${Math.max(4, expenseHeight)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold truncate mt-2 w-full text-center">
                    {m.monthLabel.split(' ')[1] || m.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      <FinanceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transactionToEdit={transactionToEdit}
        initialType={modalInitialType}
      />
    </div>
  );
};
