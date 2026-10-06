import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { db } from '../lib/db';
import { SyncService } from '../services/sync-service';

interface TableSyncCount {
  tableName: string;
  label: string;
  pendingCount: number;
  totalCount: number;
}

export const SyncStatusSection: React.FC = () => {
  const [syncCounts, setSyncCounts] = useState<TableSyncCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const loadSyncCounts = async () => {
    setLoading(true);
    try {
      const tablesInfo = [
        { name: 'cats', label: '🐱 Macskák' },
        { name: 'finances', label: '💳 Pénzügyek' },
        { name: 'inventory', label: '📦 Készlet' },
        { name: 'fosterParents', label: '🏡 Befogadók' },
        { name: 'fosterSupplies', label: '🥣 Befogadói Ellátmány' },
        { name: 'fosterExpenses', label: '💰 Befogadói Kiadások' },
        { name: 'donationCampaigns', label: '🎁 Adományakciók' },
      ];

      const counts: TableSyncCount[] = [];

      for (const t of tablesInfo) {
        try {
          const table = db.table(t.name);
          if (!table) continue;

          const total = await table.count();
          let pending = 0;

          // Query pending syncStatus if index exists
          try {
            pending = await table.where('syncStatus').equals('pending').count();
          } catch (e) {
            // Fallback filter
            const all = await table.toArray();
            pending = all.filter((item: any) => item.syncStatus === 'pending').length;
          }

          counts.push({
            tableName: t.name,
            label: t.label,
            pendingCount: pending,
            totalCount: total
          });
        } catch (err) {
          console.warn(`Could not count table ${t.name}:`, err);
        }
      }

      setSyncCounts(counts);
    } catch (err) {
      console.error('Error calculating sync counts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncCounts();
  }, []);

  const totalPending = syncCounts.reduce((acc, c) => acc + c.pendingCount, 0);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await SyncService.syncPendingChanges();
      setLastSyncTime(new Date().toLocaleTimeString());
      await loadSyncCounts();
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            🔄 Szinkronizációs Állapot (Sync Status)
          </h3>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Szinkronizálás...' : 'Újrapróbálás / Szinkron'}</span>
        </button>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          {totalPending > 0 ? (
            <Clock className="w-6 h-6 text-amber-500 animate-pulse shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          )}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Függőben lévő változások
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100">
              {totalPending} <span className="text-xs font-normal text-slate-400">rekord</span>
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0" />
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Felhő Szinkronizáció
            </span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              {totalPending === 0 ? 'Minden adat naprakész ✨' : 'Várakozás szinkronra...'}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown per Table */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Adattáblák szerinti állapot:
        </h4>
        {loading ? (
          <div className="text-center py-4 text-xs text-slate-400">Számolás...</div>
        ) : (
          <div className="space-y-1.5">
            {syncCounts.map((sc) => (
              <div
                key={sc.tableName}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold"
              >
                <span className="text-slate-800 dark:text-slate-200">{sc.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono">Összes: {sc.totalCount}</span>
                  {sc.pendingCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-extrabold text-[10px]">
                      ⏳ {sc.pendingCount} függőben
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold text-[10px]">
                      ✓ Synced
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lastSyncTime && (
        <p className="text-[10px] text-slate-400 text-right">
          Utolsó kézi szinkronizáció: {lastSyncTime}
        </p>
      )}
    </div>
  );
};
