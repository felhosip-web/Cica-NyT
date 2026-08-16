import React, { useState, useEffect } from 'react';
import { useAppStore, EventNotificationTypeConfig } from '../store/useAppStore';
import { db } from '../js/db.js';
import { sendEventPushNotification, requestNotificationPermission } from '../utils/pushNotification';
import { useLiveQuery } from 'dexie-react-hooks';
import { InventoryItem } from '../types';
import { CustomSelect } from './CustomSelect';

type NotificationSubMenu = 'push_preferences' | 'vaccination_thresholds' | 'inventory_thresholds' | 'diagnostics';

export const NotificationSettingsPanel: React.FC = () => {
  const {
    notificationSettings,
    setNotificationSettings,
    setGlobalNotificationsEnabled,
    setNotificationCheckTime,
    updatePushPreferences,
    updateVaccinationThresholds,
    updateInventoryThresholds,
    updateInventoryCategoryThreshold,
    updateNotificationTypeSetting,
    resetNotificationSettings,
    addDebugLog,
  } = useAppStore();

  const [activeSubMenu, setActiveSubMenu] = useState<NotificationSubMenu>('push_preferences');
  const [permissionState, setPermissionState] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [testPushSent, setTestPushSent] = useState(false);

  // Live query for inventory to compute real-time balances and comparisons
  const inventoryItems = (useLiveQuery(() => db.inventory.toArray(), []) || []) as InventoryItem[];
  const events = useLiveQuery(() => db.events.toArray(), []) || [];
  const cats = useLiveQuery(() => db.cats.toArray(), []) || [];

  // Diagnostics Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    scanned: boolean;
    vaccinationDue: { title: string; catName: string; date: string; daysLeft: number; isExpired: boolean; type: string }[];
    lowStockItems: { category: string; label: string; current: number; threshold: number; unit: string }[];
    expiringInventory: { itemName: string; category: string; expiryDate: string; daysLeft: number; isExpired: boolean; quantity: number }[];
  } | null>(null);

  // Synchronize browser notification permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const handleRequestPushPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const granted = await requestNotificationPermission();
      const newPerm = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
      setPermissionState(newPerm);
      if (granted) {
        updatePushPreferences({ pushEnabled: true });
        addDebugLog('[NotificationSettings] Push értesítési engedély megadva');
        sendEventPushNotification(
          '🎉 Push Értesítések Sikeresen Engedélyezve!',
          'A Cica-NyT mostantól közvetlenül küldi az emlékeztetőket a védőoltásokról és készlethiányokról.'
        );
      } else {
        addDebugLog('[NotificationSettings] Push értesítési engedély elutasítva vagy blokkolva');
      }
    } catch (err: any) {
      console.error('Permission request failed:', err);
      addDebugLog('[NotificationSettings Error] ' + err.message);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleSendTestPush = () => {
    setTestPushSent(true);
    const soundEnabled = notificationSettings.pushPreferences.soundEnabled;
    const body = `Teszt riasztás sikeres! (Hang: ${soundEnabled ? 'Be' : 'Ki'}, Időzítés: ${notificationSettings.checkTime || '08:00'})`;
    sendEventPushNotification('🔔 Teszt Értesítés: Cica-NyT Rendszer', body);
    addDebugLog('[NotificationSettings] Teszt push értesítés kiküldve');
    setTimeout(() => setTestPushSent(false), 4000);
  };

  // Compute live category balances for comparison with thresholds
  const currentCategoryBalances = React.useMemo(() => {
    const balances: Record<string, number> = {
      nedves_tap: 0,
      szaraz_tap: 0,
      alom: 0,
      gyogyszer: 0,
      parazitamentesito: 0,
      higienia_fertotlenito: 0,
      felszereles: 0,
      egyeb: 0,
    };

    inventoryItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const factor = item.direction === 'bejovo' ? qty : -qty;

      switch (item.itemType) {
        case 'nedves_tap':
          balances.nedves_tap += factor;
          break;
        case 'szaraz_tap':
          balances.szaraz_tap += factor;
          break;
        case 'alom':
          balances.alom += factor;
          break;
        case 'gyogyszer':
          balances.gyogyszer += factor;
          break;
        case 'parazitamentesito':
          balances.parazitamentesito += factor;
          break;
        case 'higienia_fertotlenito':
          balances.higienia_fertotlenito += factor;
          break;
        case 'felszereles':
          balances.felszereles += factor;
          break;
        case 'egyeb':
        default:
          balances.egyeb += factor;
          break;
      }
    });

    // Round and non-negative
    Object.keys(balances).forEach((k) => {
      balances[k] = Math.max(0, Math.round(balances[k] * 10) / 10);
    });

    return balances;
  }, [inventoryItems]);

  // Category definitions for thresholds
  const inventoryCategoryMeta: {
    key: 'nedves_tap' | 'szaraz_tap' | 'alom' | 'gyogyszer' | 'parazitamentesito' | 'higienia_fertotlenito' | 'felszereles' | 'egyeb';
    label: string;
    icon: string;
    unit: string;
    description: string;
  }[] = [
    { key: 'nedves_tap', label: 'Nedves Táp / Alutasak', icon: '🥫', unit: 'db', description: 'Tasakos, konzerv és alutasakos eledel készlet' },
    { key: 'szaraz_tap', label: 'Száraz Táp', icon: '🥣', unit: 'kg', description: 'Szemes száraz macskatáp raktárkészlet' },
    { key: 'alom', label: 'Macskaalom', icon: '📦', unit: 'kg/zsák', description: 'Csomósodó, szilikátos és növényi alom' },
    { key: 'gyogyszer', label: 'Gyógyszerek & Készítmények', icon: '💊', unit: 'doboz', description: 'Antibiotikumok, vitaminok, gyógyhatású szerek' },
    { key: 'parazitamentesito', label: 'Parazitamentesítő (Spot-on)', icon: '💧', unit: 'pipetta', description: 'Bolha, kullancs és féreghajtó cseppek' },
    { key: 'higienia_fertotlenito', label: 'Higiénia & Fertőtlenítő', icon: '🧴', unit: 'liter', description: 'Felületfertőtlenítők, kézmosók, fertőtlenítő szerek' },
    { key: 'felszereles', label: 'Felszerelés & Eszközök', icon: '🧸', unit: 'db', description: 'Hordozók, etetőtálak, kaparófák, takarók' },
    { key: 'egyeb', label: 'Egyéb Anyagok & Kellékek', icon: '🏷️', unit: 'db', description: 'Általános fogyóeszközök és egyéb adományok' },
  ];

  // Event types configuration meta
  const eventTypes: {
    key: 'oltas' | 'orvosi' | 'mutet' | 'teszt' | 'egyeni';
    label: string;
    icon: string;
    defaultDays: number;
    badgeColor: string;
  }[] = [
    { key: 'oltas', label: 'Oltási Emlékeztető (Kombinált, Veszettség, Leukózis)', icon: '💉', defaultDays: 14, badgeColor: 'bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800' },
    { key: 'orvosi', label: 'Orvosi Kezelés, Kontroll & Gyógyszerelés', icon: '🩺', defaultDays: 3, badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800' },
    { key: 'mutet', label: 'Műtét & Ivartalanítás (TNR és Menhely)', icon: '✂️', defaultDays: 7, badgeColor: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
    { key: 'teszt', label: 'Labor & Szűrővizsgálat (FeLV/FIV gyorstesztek)', icon: '🔬', defaultDays: 3, badgeColor: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800' },
    { key: 'egyeni', label: 'Egyedi Határidő & Gondozási Feladat', icon: '📝', defaultDays: 1, badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  ];

  // Comprehensive Live Diagnostics Scanner
  const handleRunFullDiagnostics = async () => {
    setIsScanning(true);
    addDebugLog('[NotificationScan] Teljes körű oltási és raktárkészlet diagnosztika indítása...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const catMap = new Map(cats.map((c) => [c.id, c.nev]));

      // 1. Vaccination & Events Scan
      const vacDueList: { title: string; catName: string; date: string; daysLeft: number; isExpired: boolean; type: string }[] = [];
      const vThresholds = notificationSettings.vaccinationThresholds;

      for (const ev of events) {
        if (ev.status === 'completed' || ev.status === 'cancelled') continue;

        const evType = (ev.type || 'egyeni') as 'oltas' | 'orvosi' | 'mutet' | 'teszt' | 'egyeni';
        const typeConfig: EventNotificationTypeConfig = notificationSettings.types[evType] || {
          enabled: true,
          leadDays: 7,
          pushEnabled: true,
          inAppEnabled: true,
        };

        if (!typeConfig.enabled) continue;

        const evDate = new Date(ev.date);
        evDate.setHours(0, 0, 0, 0);

        const diffTime = evDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isExpired = daysLeft < 0;

        // Check if within leadDays or already expired (if expired alerts enabled)
        if (
          (daysLeft >= 0 && daysLeft <= typeConfig.leadDays) ||
          (isExpired && vThresholds.expiredAlertsEnabled)
        ) {
          vacDueList.push({
            title: ev.title,
            catName: catMap.get(ev.catId) || 'Gondozási cica',
            date: ev.date,
            daysLeft,
            isExpired,
            type: evType,
          });
        }
      }

      // 2. Low Stock Inventory Scan
      const lowStockList: { category: string; label: string; current: number; threshold: number; unit: string }[] = [];
      const iThresholds = notificationSettings.inventoryThresholds;

      if (iThresholds.enabled && iThresholds.minimumStockAlerts) {
        inventoryCategoryMeta.forEach((meta) => {
          const currentVal = currentCategoryBalances[meta.key] || 0;
          const thresholdVal = iThresholds.categoryThresholds[meta.key] ?? 5;

          if (currentVal <= thresholdVal) {
            lowStockList.push({
              category: meta.key,
              label: meta.label,
              current: currentVal,
              threshold: thresholdVal,
              unit: meta.unit,
            });
          }
        });
      }

      // 3. Expiring Inventory Items Scan
      const expiringList: { itemName: string; category: string; expiryDate: string; daysLeft: number; isExpired: boolean; quantity: number }[] = [];
      const warningDays = iThresholds.expiryWarningDays || 30;

      inventoryItems.forEach((item) => {
        if (item.expiryDate && item.direction === 'bejovo') {
          const expDate = new Date(item.expiryDate);
          expDate.setHours(0, 0, 0, 0);
          const diffTime = expDate.getTime() - today.getTime();
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isExpired = daysLeft < 0;

          if ((daysLeft >= 0 && daysLeft <= warningDays) || (isExpired && iThresholds.expiredItemsAlert)) {
            expiringList.push({
              itemName: item.sourceOrRecipient || item.itemType,
              category: item.itemType,
              expiryDate: item.expiryDate,
              daysLeft,
              isExpired,
              quantity: item.quantity,
            });
          }
        }
      });

      setScanResult({
        scanned: true,
        vaccinationDue: vacDueList,
        lowStockItems: lowStockList,
        expiringInventory: expiringList,
      });

      const totalAlerts = vacDueList.length + lowStockList.length + expiringList.length;
      addDebugLog(`[NotificationScan] Befejezve: ${totalAlerts} észlelt riasztási elem (Oltás: ${vacDueList.length}, Készlethiány: ${lowStockList.length}, Lejárat: ${expiringList.length}).`);

      if (totalAlerts > 0 && notificationSettings.globalEnabled && notificationSettings.pushPreferences.pushEnabled) {
        sendEventPushNotification(
          `⚠️ Cica-NyT Rendszer Értesítés (${totalAlerts} teendő)`,
          `Oltási események: ${vacDueList.length} db | Készlethiány: ${lowStockList.length} kategória | Lejáró készlet: ${expiringList.length} db`
        );
      }
    } catch (err: any) {
      console.error('Diagnostics error:', err);
      addDebugLog('[NotificationScan Error] ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl border border-purple-500/40 shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            <div>
              <h4 className="font-black text-sm uppercase tracking-wider text-purple-200">
                Értesítések, Push Preferenciák & Riasztási Küszöbök
              </h4>
              <p className="text-[11px] text-purple-100 font-normal">
                Védőoltások előzetes határideje, raktárkészlet minimum szintek és böngészős Push csatornák testreszabása.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setGlobalNotificationsEnabled(!notificationSettings.globalEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border shadow-xs ${
                notificationSettings.globalEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                  : 'bg-rose-900 hover:bg-rose-800 text-rose-200 border-rose-600'
              }`}
            >
              {notificationSettings.globalEnabled ? '🟢 Rendszer Aktív' : '🔴 Letiltva'}
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MENU NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubMenu('push_preferences')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeSubMenu === 'push_preferences'
              ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm ring-1 ring-purple-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-800'
          }`}
        >
          <span>📱</span>
          <span>Push Preferenciák</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMenu('vaccination_thresholds')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeSubMenu === 'vaccination_thresholds'
              ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm ring-1 ring-purple-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-800'
          }`}
        >
          <span>💉</span>
          <span>Oltási Küszöbök</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMenu('inventory_thresholds')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeSubMenu === 'inventory_thresholds'
              ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm ring-1 ring-purple-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-800'
          }`}
        >
          <span>📦</span>
          <span>Raktárkészlet Küszöbök</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubMenu('diagnostics')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeSubMenu === 'diagnostics'
              ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm ring-1 ring-purple-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-800'
          }`}
        >
          <span>🧪</span>
          <span>Élő Diagnosztika & Teszt</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MENU 1: PUSH NOTIFICATION PREFERENCES */}
      {/* ========================================================================= */}
      {activeSubMenu === 'push_preferences' && (
        <div className="space-y-3">
          {/* Browser Push Status Card */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5">
                  <span>🌐</span>
                  <span>Böngésző Web Push Engedély Állapota:</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  {permissionState === 'granted'
                    ? 'A böngésző engedélyezte a push riasztások küldését és fogadását.'
                    : permissionState === 'denied'
                    ? 'A böngésző letiltotta a push értesítéseket. A böngésző címsorában kell feloldani!'
                    : 'A push értesítési engedély még nincs megadva az aktuális böngészőben.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border ${
                  permissionState === 'granted'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : permissionState === 'denied'
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}>
                  {permissionState === 'granted' ? '✅ Engedélyezve' : permissionState === 'denied' ? '⛔ Letiltva' : '❓ Nincs Kérve'}
                </span>

                {permissionState !== 'granted' && (
                  <button
                    type="button"
                    disabled={isRequestingPermission}
                    onClick={handleRequestPushPermission}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    {isRequestingPermission ? 'Kérés...' : '📲 Engedély Kérése'}
                  </button>
                )}
              </div>
            </div>

            {/* Main Push Channels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-purple-300 flex items-center gap-1">
                    <span>📲</span>
                    <span>Böngésző Web Push Értesítések</span>
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Közvetlen értesítések mobil zárolt képernyőre és asztali értesítési központba.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.pushPreferences.pushEnabled}
                  onChange={(e) => updatePushPreferences({ pushEnabled: e.target.checked })}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-purple-300 flex items-center gap-1">
                    <span>🔔</span>
                    <span>Alkalmazáson Belüli (In-App) Riasztások</span>
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Figyelmeztető szalagok és felugró jelzések az alkalmazás megnyitásakor.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.pushPreferences.inAppEnabled}
                  onChange={(e) => updatePushPreferences({ inAppEnabled: e.target.checked })}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Audio & Haptic Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
              <label className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🔊</span>
                  <span>Hangjelzés Lejátszása Értesítéskor</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.pushPreferences.soundEnabled}
                  onChange={(e) => updatePushPreferences({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>📳</span>
                  <span>Rezgés & Haptikus Visszajelzés</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.pushPreferences.vibrationEnabled}
                  onChange={(e) => updatePushPreferences({ vibrationEnabled: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Timing & Frequency Card */}
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3">
            <h5 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>⏰</span>
              <span>Értesítési Időzítés & Gyakoriság</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Napi Rendszeres Ellenőrzési Időpont:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={notificationSettings.checkTime || '08:00'}
                    onChange={(e) => setNotificationCheckTime(e.target.value)}
                    className="p-2 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-purple-200 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ekkor fut le a napi automatikus készlet- és oltásfigyelő
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Riasztási Mód & Gyakoriság:
                </label>
                <CustomSelect
                  value={notificationSettings.pushPreferences.alertFrequency || 'both'}
                  onChange={(val) => updatePushPreferences({ alertFrequency: val as any })}
                  options={[
                    { value: 'both', label: 'Azonnali Riasztások + Napi Összefoglaló', icon: '🌟' },
                    { value: 'immediate', label: 'Csak Azonnali Esemény Riasztások', icon: '⚡' },
                    { value: 'daily_digest', label: 'Csak Napi Összefoglaló Jelzés', icon: '📅' },
                  ]}
                  title="Riasztási Mód & Gyakoriság"
                  colorScheme="purple"
                  buttonClassName="w-full p-2 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs"
                />
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="p-3 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>🌙</span>
                    <span>Csendes Időszak (Ne zavarjanak üzemmód)</span>
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Ebben az idősávban a rendszer elnémítja a hangos push értesítéseket.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.pushPreferences.quietHoursEnabled}
                  onChange={(e) => updatePushPreferences({ quietHoursEnabled: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {notificationSettings.pushPreferences.quietHoursEnabled && (
                <div className="flex items-center gap-3 pt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span>Kezdete:</span>
                    <input
                      type="time"
                      value={notificationSettings.pushPreferences.quietHoursStart || '22:00'}
                      onChange={(e) => updatePushPreferences({ quietHoursStart: e.target.value })}
                      className="p-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Vége:</span>
                    <input
                      type="time"
                      value={notificationSettings.pushPreferences.quietHoursEnd || '07:00'}
                      onChange={(e) => updatePushPreferences({ quietHoursEnd: e.target.value })}
                      className="p-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Action */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSendTestPush}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{testPushSent ? '✅' : '🔔'}</span>
                <span>{testPushSent ? 'Push Elküldve!' : 'Teszt Push Értesítés Kiküldése'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MENU 2: VACCINATION & MEDICAL ALERT THRESHOLDS */}
      {/* ========================================================================= */}
      {activeSubMenu === 'vaccination_thresholds' && (
        <div className="space-y-3">
          {/* Main Vaccination Thresholds Card */}
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3">
            <h5 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>💉</span>
              <span>Oltási és Kezelési Küszöbértékek & Protokollok</span>
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Állítsd be az oltások, orvosi kontrollok és speciális protokollok előzetes figyelmeztetési határidejét napokban.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Master Lead Days */}
              <div className="p-3 bg-pink-50/70 dark:bg-pink-950/40 rounded-xl border border-pink-200 dark:border-pink-900/60 space-y-1.5">
                <label className="font-extrabold text-xs text-pink-950 dark:text-pink-200 block">
                  Alapértelmezett Előzetes Idő:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={notificationSettings.vaccinationThresholds.leadDays}
                    onChange={(e) => updateVaccinationThresholds({ leadDays: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 text-center font-mono font-black text-xs bg-white dark:bg-slate-950 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-700 rounded-lg py-1"
                  />
                  <span className="text-xs font-bold text-pink-900 dark:text-pink-300">nap</span>
                </div>
                <p className="text-[10px] text-pink-800 dark:text-pink-300">
                  Ennyi nappal az esemény előtt jelenik meg az első jelzés.
                </p>
              </div>

              {/* Urgent Days */}
              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                <label className="font-extrabold text-xs text-rose-950 dark:text-rose-200 block">
                  Kritikus / Sürgős Határidő:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={notificationSettings.vaccinationThresholds.urgentDays}
                    onChange={(e) => updateVaccinationThresholds({ urgentDays: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-16 text-center font-mono font-black text-xs bg-white dark:bg-slate-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 rounded-lg py-1"
                  />
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-300">nap</span>
                </div>
                <p className="text-[10px] text-rose-800 dark:text-rose-300">
                  Piros kiemeléssel jelzett sürgős orvosi határidő.
                </p>
              </div>

              {/* Expired Alerts Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 flex flex-col justify-between">
                <div>
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block">
                    Lejárt Események Értesítése
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Folyamatos jelzés a múltbeli elmaradt oltásokról.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    checked={notificationSettings.vaccinationThresholds.expiredAlertsEnabled}
                    onChange={(e) => updateVaccinationThresholds({ expiredAlertsEnabled: e.target.checked })}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                  <span>⚠️ Lejártak Jelzése</span>
                </label>
              </div>
            </div>

            {/* Special Protocols */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                🐾 Kiemelt Oltási & Egészségügyi Protokollok Időzítése:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block">🐱 Kölyök Cica Protokoll</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">8, 12 hetes kombinált</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={notificationSettings.vaccinationThresholds.kittenProtocolLeadDays}
                      onChange={(e) => updateVaccinationThresholds({ kittenProtocolLeadDays: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-12 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-0.5"
                    />
                    <span className="text-[10px] text-slate-500">nap</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block">💉 Veszettség Oltás</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Kötelező és utazási oltás</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={notificationSettings.vaccinationThresholds.rabiesLeadDays}
                      onChange={(e) => updateVaccinationThresholds({ rabiesLeadDays: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-12 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-0.5"
                    />
                    <span className="text-[10px] text-slate-500">nap</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block">📅 Éves Ismétlő Oltások</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Felnőtt éves emlékeztető</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={notificationSettings.vaccinationThresholds.annualBoosterLeadDays}
                      onChange={(e) => updateVaccinationThresholds({ annualBoosterLeadDays: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-12 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-0.5"
                    />
                    <span className="text-[10px] text-slate-500">nap</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Granular Per-Event-Type Grid */}
          <div className="space-y-2.5">
            <h5 className="font-black text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
              <span>📅</span>
              <span>Eseménytípusonkénti Részletes Értesítési Beállítások</span>
            </h5>

            <div className="grid grid-cols-1 gap-2.5">
              {eventTypes.map((item) => {
                const config = notificationSettings.types[item.key] || {
                  enabled: true,
                  leadDays: item.defaultDays,
                  pushEnabled: true,
                  inAppEnabled: true,
                };

                const presetDays = [30, 14, 7, 3, 1, 0];

                return (
                  <div
                    key={item.key}
                    className={`p-3 rounded-xl border transition ${
                      config.enabled
                        ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <span className="font-extrabold text-xs text-gray-900 dark:text-white block">
                            {item.label}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold border mt-0.5 ${item.badgeColor}`}>
                            Alapértelmezett: {item.defaultDays} nap
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateNotificationTypeSetting(item.key, { enabled: !config.enabled })}
                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer shrink-0 border ${
                          config.enabled
                            ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {config.enabled ? '🔔 Aktív' : '🔕 Kikapcsolva'}
                      </button>
                    </div>

                    {config.enabled && (
                      <div className="pt-2.5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            ⏱️ Előzetes figyelmeztetés ideje:
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="180"
                              value={config.leadDays}
                              onChange={(e) => updateNotificationTypeSetting(item.key, { leadDays: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-16 text-center font-mono font-black text-xs bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-purple-300 border border-slate-300 dark:border-slate-700 rounded-lg py-1"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">nap</span>
                          </div>
                        </div>

                        {/* Presets */}
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400">Gyors gombok:</span>
                          {presetDays.map((days) => (
                            <button
                              key={days}
                              type="button"
                              onClick={() => updateNotificationTypeSetting(item.key, { leadDays: days })}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition cursor-pointer border ${
                                config.leadDays === days
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {days === 0 ? '0 nap (Ma)' : `${days} nap`}
                            </button>
                          ))}
                        </div>

                        {/* Channel Toggles */}
                        <div className="flex flex-wrap items-center gap-4 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={config.pushEnabled}
                              onChange={(e) => updateNotificationTypeSetting(item.key, { pushEnabled: e.target.checked })}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>📲 Push Értesítés</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={config.inAppEnabled}
                              onChange={(e) => updateNotificationTypeSetting(item.key, { inAppEnabled: e.target.checked })}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>🔔 In-App Szalag</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MENU 3: INVENTORY & STOCK ALERT THRESHOLDS */}
      {/* ========================================================================= */}
      {activeSubMenu === 'inventory_thresholds' && (
        <div className="space-y-3">
          {/* Main Inventory Controls */}
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="space-y-0.5">
                <h5 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>📦</span>
                  <span>Raktárkészlet Biztonsági Küszöbök & Lejárat Figyelő</span>
                </h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  Ha az adott cikk raktári készlete a beállított küszöbérték alá esik, a rendszer automatikus figyelmeztetést küld.
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateInventoryThresholds({ enabled: !notificationSettings.inventoryThresholds.enabled })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border shrink-0 ${
                  notificationSettings.inventoryThresholds.enabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                {notificationSettings.inventoryThresholds.enabled ? '✅ Készletfigyelő Bekapcsolva' : '⛔ Kikapcsolva'}
              </button>
            </div>

            {/* Channels & Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <label className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-300">📉 Minimum Készlethiány Riasztás</span>
                <input
                  type="checkbox"
                  checked={notificationSettings.inventoryThresholds.minimumStockAlerts}
                  onChange={(e) => updateInventoryThresholds({ minimumStockAlerts: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-300">📲 Push Értesítés Küldése</span>
                <input
                  type="checkbox"
                  checked={notificationSettings.inventoryThresholds.pushEnabled}
                  onChange={(e) => updateInventoryThresholds({ pushEnabled: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-300">🔔 In-App Készlet Szalag</span>
                <input
                  type="checkbox"
                  checked={notificationSettings.inventoryThresholds.inAppEnabled}
                  onChange={(e) => updateInventoryThresholds({ inAppEnabled: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </label>
            </div>

            {/* Expiry Date Settings */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2">
              <span className="font-extrabold text-xs text-amber-950 dark:text-amber-200 uppercase tracking-wider block">
                ⏳ Szavatossági & Lejárati Idő Riasztási Küszöbök:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-amber-900 dark:text-amber-300 block">
                    Előzetes Lejárati Figyelmeztetés:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={notificationSettings.inventoryThresholds.expiryWarningDays}
                      onChange={(e) => updateInventoryThresholds({ expiryWarningDays: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-16 p-1 bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-800 rounded-lg text-center font-mono font-bold text-xs"
                    />
                    <span className="font-bold text-amber-900 dark:text-amber-300">nap</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-amber-900 dark:text-amber-300 block">
                    Kritikus Lejárati Határidő:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={notificationSettings.inventoryThresholds.expiryCriticalDays}
                      onChange={(e) => updateInventoryThresholds({ expiryCriticalDays: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-16 p-1 bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-800 rounded-lg text-center font-mono font-bold text-xs"
                    />
                    <span className="font-bold text-amber-900 dark:text-amber-300">nap</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-white/80 dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900">
                  <span className="font-bold text-amber-950 dark:text-amber-200">Lejárt Tételek Kiemelése:</span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.inventoryThresholds.expiredItemsAlert}
                    onChange={(e) => updateInventoryThresholds({ expiredItemsAlert: e.target.checked })}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Category-by-Category Safety Stock Thresholds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <span>📊</span>
                <span>Kategóriánkénti Biztonsági Minimum Készletek</span>
              </h5>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                Jelenlegi készlet vs. Beállított küszöb
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {inventoryCategoryMeta.map((cat) => {
                const thresholdVal = notificationSettings.inventoryThresholds.categoryThresholds[cat.key] ?? 5;
                const currentVal = currentCategoryBalances[cat.key] || 0;
                const isLow = currentVal <= thresholdVal;

                return (
                  <div
                    key={cat.key}
                    className={`p-3 rounded-xl border transition ${
                      isLow
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                          {cat.icon}
                        </span>
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                            {cat.description}
                          </span>
                        </div>
                      </div>

                      {/* Live Stock Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black shrink-0 border ${
                        isLow
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      }`}>
                        {currentVal} {cat.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        Minimum Riasztási Küszöb:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          value={thresholdVal}
                          onChange={(e) => updateInventoryCategoryThreshold(cat.key, Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 text-center font-mono font-black text-xs bg-slate-100 dark:bg-slate-950 text-purple-700 dark:text-purple-300 border border-slate-300 dark:border-slate-700 rounded-lg py-1"
                        />
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {cat.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MENU 4: DIAGNOSTICS & LIVE TESTER */}
      {/* ========================================================================= */}
      {activeSubMenu === 'diagnostics' && (
        <div className="space-y-3">
          <div className="p-4 bg-indigo-950 text-indigo-100 rounded-xl space-y-3 border border-indigo-800">
            <div className="flex items-center justify-between border-b border-indigo-800/80 pb-2">
              <h5 className="font-extrabold text-xs text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🧪</span>
                <span>Valós Idejű Oltási & Készlethiány Átvizsgálás</span>
              </h5>
              <button
                type="button"
                onClick={resetNotificationSettings}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-rose-300 font-bold text-[10px] rounded-lg transition border border-rose-900/40 cursor-pointer"
              >
                🔄 Gyári Értékek Visszaállítása
              </button>
            </div>

            <p className="text-[11px] text-indigo-200 leading-relaxed font-normal">
              Futtass le egy teljes rendszertesztet az adatbázisban tárolt cicaoltásokra és a raktárkészletre a fenti küszöbértékek alapján.
            </p>

            <button
              type="button"
              disabled={isScanning}
              onClick={handleRunFullDiagnostics}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Diagnosztikai vizsgálat folyamatban...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Teljes Rendszerdiagnosztika Futtatása Most</span>
                </>
              )}
            </button>

            {scanResult && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-700/60 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-purple-300">Diagnosztikai Eredmények:</span>
                  <div className="flex gap-1.5">
                    <span className="px-2 py-0.5 bg-pink-950 text-pink-300 border border-pink-700 rounded text-[10px] font-extrabold">
                      💉 {scanResult.vaccinationDue.length} oltás
                    </span>
                    <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-700 rounded text-[10px] font-extrabold">
                      📉 {scanResult.lowStockItems.length} készlethiány
                    </span>
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-700 rounded text-[10px] font-extrabold">
                      ⏳ {scanResult.expiringInventory.length} lejáró
                    </span>
                  </div>
                </div>

                {/* Section 1: Vaccination Results */}
                {scanResult.vaccinationDue.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-pink-300 text-[11px] block">
                      💉 Esedékes & Lejárt Védőoltások ({scanResult.vaccinationDue.length}):
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {scanResult.vaccinationDue.map((item, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-extrabold text-slate-100 block">{item.title}</span>
                            <span className="text-[9px] text-slate-400">
                              Állat: <strong className="text-purple-300">{item.catName}</strong> | Dátum: {item.date}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black shrink-0 border ${
                            item.isExpired
                              ? 'bg-rose-900 text-rose-200 border-rose-700'
                              : item.daysLeft === 0
                              ? 'bg-amber-900 text-amber-200 border-amber-700'
                              : 'bg-purple-900 text-purple-200 border-purple-700'
                          }`}>
                            {item.isExpired ? '⚠️ LEJÁRT!' : item.daysLeft === 0 ? 'MA!' : `${item.daysLeft} nap múlva`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Low Stock Results */}
                {scanResult.lowStockItems.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="font-bold text-rose-300 text-[11px] block">
                      📉 Biztonsági Minimum Alá Esett Raktárkészletek ({scanResult.lowStockItems.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {scanResult.lowStockItems.map((item, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 rounded-lg border border-rose-900/60 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200">{item.label}</span>
                          <span className="text-[10px] font-mono font-black text-rose-300">
                            {item.current} / {item.threshold} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Expiring Items */}
                {scanResult.expiringInventory.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="font-bold text-amber-300 text-[11px] block">
                      ⏳ Hamarosan Lejáró & Lejárt Készletek ({scanResult.expiringInventory.length}):
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {scanResult.expiringInventory.map((item, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-100">{item.itemName}</span>
                            <span className="text-[9px] text-slate-400 block">
                              Lejárat: {item.expiryDate} (Mennyiség: {item.quantity} db)
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                            item.isExpired ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                          }`}>
                            {item.isExpired ? 'Lejárt' : `${item.daysLeft} nap`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scanResult.vaccinationDue.length === 0 &&
                  scanResult.lowStockItems.length === 0 &&
                  scanResult.expiringInventory.length === 0 && (
                    <p className="text-[11px] text-emerald-400 font-bold py-1">
                      ✅ Minden rendben! Nincs esedékes oltás, a raktárkészlet a megadott küszöbértékek felett van, és nincs lejáró tétel.
                    </p>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
