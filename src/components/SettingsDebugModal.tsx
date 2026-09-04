import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAppStore, ViewOverrideMode } from '../store/useAppStore';
import { UserPermissionsManager } from './UserPermissionsManager';
import { AuditEventInspector } from './AuditEventInspector';
import { SupabaseRbacSection } from './SupabaseRbacSection';
import { NotificationSettingsPanel } from './NotificationSettingsPanel';
import { GoogleDriveBackupSection } from './GoogleDriveBackupSection';
import { AutoBackupSettingsSection } from './AutoBackupSettingsSection';
import { PatchUpgradeSection } from './PatchUpgradeSection';
import { BackupDiffValidationModal } from './BackupDiffValidationModal';
import { restoreBackupToLocalDB, BackupData } from '../services/googleDriveService';
import { fetchWithRenderWakeup } from '../utils/renderWakeup';
import { APP_VERSION } from '../version';
import { createAuditStamp } from '../utils/audit';
import { CustomSelect } from './CustomSelect';
import { LicenseSettingsTab } from './LicenseSettingsTab';

interface SettingsDebugModalProps {
  onClose: () => void;
  isRootMode: boolean;
  onOpenRootAuth: () => void;
  onDeactivateRoot: () => void;
  onOpenUiCustomization?: () => void;
}

const LicenseSettingsTab: React.FC = () => {
  const { status, key, tier, daysRemainingInGrace, saveKey, removeKey } = useLicenseStore();
  const [inputKey, setInputKey] = useState(key || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveKey(inputKey);
    setIsSaving(false);
    if (!success) {
      alert('Érvénytelen licenckulcs formátum. Kérjük ellenőrizd!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
        <h3 className="font-extrabold text-gray-900 text-lg mb-2 flex items-center gap-2">
          <span>🔑</span> Licenc Kezelés
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Add meg a megvásárolt licenckulcsodat az alkalmazás írási és mentési funkcióinak feloldásához. Érvényes licenc hiányában a rendszer csak olvasási módban (soft lock) érhető el.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-700">Jelenlegi Státusz:</span>
            {status === 'valid' && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">✅ Érvényes {tier && `(${tier})`}</span>}
            {status === 'grace' && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">⚠️ Grace {tier && `(${tier})`} - {daysRemainingInGrace} nap hátra</span>}
            {status === 'locked' && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-300">🚫 Zárolt (Csak Olvasás)</span>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Licenckulcs</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Ide másold a licenckulcsot..."
                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none transition font-mono"
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold text-sm shadow-xs disabled:opacity-50"
              >
                {isSaving ? '⏳' : 'Mentés'}
              </button>
            </div>
          </div>

          {key && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  if (confirm('Biztosan eltávolítod a licenckulcsot? Ezzel az alkalmazás zárolt állapotba kerülhet.')) {
                    removeKey();
                    setInputKey('');
                  }
                }}
                className="text-xs text-red-600 hover:text-red-800 font-bold underline"
              >
                Licenckulcs törlése az eszközről
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SettingsDebugModal: React.FC<SettingsDebugModalProps> = ({
  onClose,
  isRootMode,
  onOpenRootAuth,
  onDeactivateRoot,
  onOpenUiCustomization,
}) => {
  const {
    viewportWidth,
    viewOverride,
    setViewOverride,
    catListViewMode,
    setCatListViewMode,
    theme,
    setTheme,
    orgName,
    setOrgName,
    orgRole,
    setOrgRole,
    canInstall,
    isInstalled,
    isIos,
    updateAvailable,
    latestVersion,
    triggerInstall,
    triggerUpdate,
    debugLogs,
    addDebugLog,
    clearDebugLogs,
    getCurrentUser,
    footerMode,
    setFooterMode,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'general' | 'license' | 'notifications' | 'google_drive' | 'auto_backup' | 'patch' | 'pwa' | 'users' | 'supabase_rbac' | 'zustand' | 'schema' | 'inspector' | 'tuning' | 'audit'>(
    isRootMode ? 'users' : 'general'
  );

  const [repairLogs, setRepairLogs] = useState<string[]>([]);
  const [isGeneratingCats, setIsGeneratingCats] = useState(false);
  const [isGeneratingEvents, setIsGeneratingEvents] = useState(false);
  const [isGeneratingTnr, setIsGeneratingTnr] = useState(false);
  const [seedFeedbackMessage, setSeedFeedbackMessage] = useState<string | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '');

  // Storage estimate state
  const [storageEstimate, setStorageEstimate] = useState<{ used: string; quota: string; percent: number } | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Backup validation modal state for JSON import
  const [pendingImportBackup, setPendingImportBackup] = useState<{ backupData: BackupData; fileName: string } | null>(null);
  const [isImportRestoring, setIsImportRestoring] = useState(false);

  // Render Wake-up & Update Checker state
  const [updateCheckingState, setUpdateCheckingState] = useState<{
    checking: boolean;
    message: string;
    isWakingUp: boolean;
  } | null>(null);

  const handleCheckForUpdatesWithRenderWakeup = async () => {
    setUpdateCheckingState({
      checking: true,
      message: '🔍 Kapcsolódás az OnRender szerverhez...',
      isWakingUp: false,
    });
    addDebugLog('[UpdateCheck] Frissítések kézi ellenőrzése elindítva (Render ébresztéssel)...');

    try {
      const res = await fetchWithRenderWakeup(
        `/version.json?t=${Date.now()}`,
        {},
        {
          maxRetries: 4,
          timeoutMs: 40000,
          retryDelayMs: 5000,
          onProgress: (status) => {
            setUpdateCheckingState({
              checking: true,
              message: status.message,
              isWakingUp: status.isWakingUp,
            });
          },
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP Hiba: ${res.status}`);
      }

      const data = await res.json();
      const storedVersion = localStorage.getItem('appVersion') || APP_VERSION;

      if (data.version && data.version !== storedVersion) {
        addDebugLog(`[UpdateCheck] Új verzió elérhető: szerver=${data.version}, kliens=${storedVersion}`);
        setUpdateAvailable(true, data.version);
        setUpdateCheckingState({
          checking: false,
          message: `🚀 Új frissítés érhető el! Verzió: v${data.version}`,
          isWakingUp: false,
        });
      } else {
        addDebugLog(`[UpdateCheck] Az alkalmazás naprakész (v${storedVersion}).`);
        setUpdateCheckingState({
          checking: false,
          message: `✅ Az alkalmazás teljesen naprakész! (Verzió: v${storedVersion})`,
          isWakingUp: false,
        });
      }
    } catch (err: any) {
      addDebugLog('[UpdateCheck Hiba] ' + (err?.message || err));
      setUpdateCheckingState({
        checking: false,
        message: `❌ A szerver nem válaszolt: ${err?.message || 'Próbáld újra később'}`,
        isWakingUp: false,
      });
    }
  };

  // Table counts
  const [counts, setCounts] = useState<{ cats: number; events: number; tnr: number }>({ cats: 0, events: 0, tnr: 0 });

  // Inspector state
  const [inspectorTable, setInspectorTable] = useState<'cats' | 'events'>('cats');
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // SW & PWA & Push Status state
  const [swInfo, setSwInfo] = useState<{
    supported: boolean;
    controller: boolean;
    state: string;
    scope: string;
    caches: string[];
  }>({
    supported: false,
    controller: false,
    state: 'Lekérdezés...',
    scope: '-',
    caches: [],
  });

  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'nem_tamogatott'
  );

  const [isStandalonePwa, setIsStandalonePwa] = useState<boolean>(false);
  const [isOnlineStatus, setIsOnlineStatus] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const isAutoMobile = viewportWidth < 768;
  const activeDevice = viewOverride === 'auto' ? (isAutoMobile ? 'mobile' : 'desktop') : viewOverride;

  useEffect(() => {
    loadCounts();
    loadStorageEstimate();
    checkSwAndPwaStatus();

    const handleOnline = () => setIsOnlineStatus(true);
    const handleOffline = () => setIsOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isRootMode) {
      loadRawRecords(inspectorTable);
    }
  }, [inspectorTable, isRootMode]);

  const checkSwAndPwaStatus = async () => {
    const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    let controller = false;
    let state = 'Nincs aktiválva';
    let scope = '-';
    let cacheKeys: string[] = [];

    if (supported) {
      controller = !!navigator.serviceWorker.controller;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          scope = reg.scope;
          if (reg.active) state = 'Aktív (Active)';
          else if (reg.installing) state = 'Telepítés alatt (Installing)';
          else if (reg.waiting) state = 'Várakozik (Waiting)';
        } else {
          state = 'Nincs regisztrálva';
        }
      } catch (e) {
        state = 'Hiba a lekérdezéskor';
      }
    }

    if (typeof caches !== 'undefined') {
      try {
        cacheKeys = await caches.keys();
      } catch (e) {
        console.warn('Cache keys error:', e);
      }
    }

    setSwInfo({
      supported,
      controller,
      state,
      scope,
      caches: cacheKeys,
    });

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const isStandalone = typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    setIsStandalonePwa(isStandalone);
  };

  const handleRegisterServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      alert('❌ A böngésző nem támogatja a Service Worker technológiát!');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      await reg.update();
      addDebugLog('[SW] Service Worker sikeresen regisztrálva/frissítve');
      alert('✅ Service Worker sikeresen regisztrálva és frissítve!');
      await checkSwAndPwaStatus();
    } catch (err: any) {
      addDebugLog('[SW Hiba] ' + err.message);
      alert('❌ Service Worker regisztrációs hiba: ' + err.message);
    }
  };

  const handleUnregisterServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.unregister();
        addDebugLog('[SW] Service Worker regisztráció törölve');
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
        addDebugLog('[SW] Összes gyorsítótár (Cache) kiürítve');
      }
      alert('⚡ Service Worker és Gyorsítótár törölve!');
      await checkSwAndPwaStatus();
    } catch (err: any) {
      alert('❌ Hiba a törlés során: ' + err.message);
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('❌ Ez a böngésző nem támogatja a Notification API-t!');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      addDebugLog(`[Push] Értesítési engedély válasz: ${res}`);
      if (res === 'granted') {
        alert('🎉 Értesítési engedély sikeresen megadva!');
      } else {
        alert(`⚠️ Értesítési engedély státusz: ${res}`);
      }
    } catch (err: any) {
      alert('❌ Hiba az engedélykérés során: ' + err.message);
    }
  };

  const handleTestLocalNotification = () => {
    if (!('Notification' in window)) {
      alert('❌ Notification API nem támogatott ebben a böngészőben.');
      return;
    }
    if (Notification.permission !== 'granted') {
      alert('⚠️ Először kérj engedélyt az értesítésekhez a fenti gombra kattintva!');
      return;
    }
    try {
      const notif = new Notification('Cica-NyT Teszt Értesítés 🐱', {
        body: 'Oltási és egészségügyi esemény értesítő teszt sikeres!',
        icon: '/favicon.svg',
        tag: 'test-notification',
      });
      addDebugLog('[Push Teszt] Helyi böngésző értesítés kiküldve');
    } catch (err: any) {
      alert('❌ Hiba az értesítés küldésekor: ' + err.message);
    }
  };

  const handleTestSwPushNotification = async () => {
    if (!('serviceWorker' in navigator)) {
      alert('❌ Service Worker nem támogatott!');
      return;
    }
    if (Notification.permission !== 'granted') {
      alert('⚠️ Először kérj engedélyt az értesítésekhez!');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        alert('❌ Nincs regisztrált Service Worker! Kattints a "SW Regisztráció & Frissítés" gombra.');
        return;
      }
      await reg.showNotification('Cica-NyT Background SW Push Teszt 💉', {
        body: 'Következő kombinált oltás esedékes: 2025-03-10! Háttérbeli teszt értesítés.',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'sw-push-test',
      });
      addDebugLog('[SW Push Teszt] Service Worker háttérbeli értesítés kiküldve');
    } catch (err: any) {
      alert('❌ Hiba a SW értesítés küldésekor: ' + err.message);
    }
  };

  const handleTestVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 300]);
      addDebugLog('[PWA Teszt] Vibrációs minta lejátszva');
      alert('📳 Vibrációs teszt elindítva (minta: [200, 100, 200, 100, 300] ms)');
    } else {
      alert('⚠️ A készülék/böngésző nem támogatja a Vibration API-t.');
    }
  };

  const loadCounts = async () => {
    try {
      const cCount = await db.cats.count();
      const eCount = await db.events.count();
      const tCount = await db.tnr.count();
      setCounts({ cats: cCount, events: eCount, tnr: tCount });
    } catch (e) {
      console.warn('Count load error:', e);
    }
  };

  const loadStorageEstimate = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2);
        const percent = estimate.quota ? Math.round(((estimate.usage || 0) / estimate.quota) * 100) : 0;
        setStorageEstimate({ used: `${usedMB} MB`, quota: `${quotaMB} MB`, percent });
      } catch (e) {
        console.warn('Storage estimate failed', e);
      }
    }
  };

  const loadRawRecords = async (table: 'cats' | 'events') => {
    try {
      if (table === 'cats') {
        const data = await db.cats.toArray();
        setRawRecords(data);
      } else {
        const data = await db.events.toArray();
        setRawRecords(data);
      }
    } catch (err) {
      console.error('Failed loading raw records:', err);
    }
  };

  const handleRunRepair = async () => {
    const logs: string[] = [];
    logs.push('🔍 DB Audit & Auto-repair indítása...');

    try {
      const cats = await db.cats.toArray();
      logs.push(`📊 Összesen ${cats.length} cica ellenőrzése...`);

      let repairedCount = 0;
      for (const cat of cats) {
        let changed = false;
        const updates: any = {};

        if (cat.oltasok === undefined) { updates.oltasok = []; changed = true; }
        if (cat.kezelesek === undefined) { updates.kezelesek = []; changed = true; }
        if (cat.tesztek === undefined) { updates.tesztek = []; changed = true; }
        if (cat.chipNumber === undefined) { updates.chipNumber = null; changed = true; }
        if (cat.isSpayed === undefined) { updates.isSpayed = false; changed = true; }
        if (cat.hasKiskonyv === undefined) { updates.hasKiskonyv = false; changed = true; }
        if (!cat.status) { updates.status = 'befogott'; changed = true; }

        if (changed) {
          await db.cats.update(cat.id, updates);
          repairedCount++;
        }
      }

      logs.push(`✅ Audit kész! ${repairedCount} cica rekord bejegyzés korrigálva.`);
      addDebugLog(`[Audit] ${repairedCount} rekord javítva`);
      await loadCounts();
    } catch (err: any) {
      logs.push(`❌ Hiba a javítás során: ${err.message}`);
    }

    setRepairLogs(logs);
  };

  const handleGenerateTestData = async (count: number) => {
    setIsGeneratingCats(true);
    setSeedFeedbackMessage(`🐱 ${count} db teszt cica generálása folyamatban...`);
    addDebugLog(`[Seed] ${count} db teszt cica generálása elindítva...`);

    try {
      const names = ['Mici', 'Cirmi', 'Kormos', 'Bodri', 'Foltos', 'Mirci', 'Gombóc', 'Süti', 'Picúr', 'Maja', 'Pumukli', 'Kázmér', 'Zsömle', 'Lujza', 'Mofi'];
      const colors = ['Fekete', 'Cirmos', 'Fehér-cirmos', 'Vörös', 'Szürke', 'Háromszínű', 'Teknőcmintás'];
      const statuses = ['befogott', 'behozott', 'gazdis'];
      const currentUser = getCurrentUser ? getCurrentUser() : null;

      for (let i = 0; i < count; i++) {
        const id = 'test_' + Math.random().toString(36).substring(2, 9);
        const name = names[Math.floor(Math.random() * names.length)] + ' ' + (i + 1);
        const sorszam = Math.floor(1000 + Math.random() * 9000).toString();
        const catStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const isSpayed = Math.random() > 0.4;
        const chipNum = '3480981' + Math.floor(10000000 + Math.random() * 90000000);
        const audit = createAuditStamp(currentUser);

        const newCat: any = {
          id,
          sorszam,
          nev: name,
          ivar: Math.random() > 0.5 ? 'bak' : 'nosteny',
          szin: colors[Math.floor(Math.random() * colors.length)],
          szuletes: '2023-05-10',
          created: new Date().toISOString(),
          status: catStatus,
          intakeType: 'befogott',
          hasKiskonyv: true,
          chipNumber: chipNum,
          chipDate: '2024-01-15',
          isSpayed,
          spayedDate: isSpayed ? '2024-02-01' : null,
          oltasok: [
            { id: 'olt_1', nev: 'Kombinált oltás', datum: '2024-03-10' }
          ],
          kezelesek: [],
          tesztek: [{ id: 'teszt_1', nev: 'FeLV/FIV', datum: '2024-03-10', eredmeny: 'Negatív' }],
          ...audit,
        };

        await db.cats.put(newCat);

        // Create dummy event for the cat
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + Math.floor(1 + Math.random() * 30));
        await db.events.add({
          catId: id,
          type: 'oltas',
          title: `Kombinált oltás emlékeztető - ${name}`,
          date: futureDate.toISOString().split('T')[0],
          status: 'pending',
          cost: 12000,
          notes: 'Automatikusan generált teszt oltási esemény',
          createdAt: new Date().toISOString(),
          ...audit,
        });
      }

      const cCount = await db.cats.count();
      const eCount = await db.events.count();
      setCounts({ cats: cCount, events: eCount });

      if (isRootMode) loadRawRecords(inspectorTable);

      const msg = `✅ SIKER: ${count} db teszt cica és oltási bejegyzés sikeresen felvéve! (Összesen: ${cCount} cica az adatbázisban)`;
      addDebugLog(`[Seed] ${count} db teszt cica sikeresen generálva (Összesen: ${cCount})`);
      setSeedFeedbackMessage(msg);
    } catch (err: any) {
      console.error('Error generating test cats:', err);
      setSeedFeedbackMessage(`❌ Hiba a teszt állatok generálása során: ${err.message}`);
    } finally {
      setIsGeneratingCats(false);
    }
  };

  const handleGenerateTestEvents = async (count: number) => {
    setIsGeneratingEvents(true);
    setSeedFeedbackMessage(`📅 ${count} db teszt naptári esemény generálása folyamatban...`);
    addDebugLog(`[Seed] ${count} db teszt naptári esemény generálása elindítva...`);

    try {
      const allCats = await db.cats.toArray();
      const currentUser = getCurrentUser ? getCurrentUser() : null;

      const eventTemplates = [
        { type: 'oltas', title: 'Éves kombinált oltás emlékeztető', cost: 12000 },
        { type: 'oltas', title: 'Veszettség elleni védőoltás', cost: 9500 },
        { type: 'orvosi', title: 'Műtét utáni kontroll vizsgálat', cost: 8000 },
        { type: 'orvosi', title: 'Féreghajtás & Bolhátlanítás', cost: 4500 },
        { type: 'teszt', title: 'FeLV/FIV szűrővizsgálat', cost: 14000 },
        { type: 'mutet', title: 'Fogkő eltávolítás & Műtéti tisztítás', cost: 28000 },
        { type: 'egyeni', title: 'Gazdisodási előkészítés & Dokumentáció', cost: 0 },
        { type: 'orvosi', title: 'Laboreredmények kiértékelése', cost: 11000 },
      ];

      const now = new Date();

      for (let i = 0; i < count; i++) {
        const tmpl = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
        const randomCat = allCats.length > 0 ? allCats[Math.floor(Math.random() * allCats.length)] : null;
        const targetCatId = randomCat ? randomCat.id : 'general';
        const catNameLabel = randomCat ? randomCat.nev : 'Gondozóhelyi állat';

        // relative date: -15 days to +45 days
        const dayOffset = Math.floor(Math.random() * 60) - 15;
        const eventDateObj = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const eventDateStr = eventDateObj.toISOString().split('T')[0];

        let eventStatus: 'pending' | 'done' | 'expired' = 'pending';
        if (dayOffset < -1) {
          eventStatus = Math.random() > 0.4 ? 'expired' : 'done';
        } else if (dayOffset <= 1) {
          eventStatus = Math.random() > 0.5 ? 'done' : 'pending';
        } else {
          eventStatus = 'pending';
        }

        const audit = createAuditStamp(currentUser);

        await db.events.add({
          catId: targetCatId,
          type: tmpl.type as any,
          title: `${tmpl.title} (${catNameLabel})`,
          date: eventDateStr,
          status: eventStatus,
          cost: tmpl.cost,
          notes: `Generált teszt esemény. Státusz: ${eventStatus}, Állat: ${catNameLabel}`,
          createdAt: audit.created_at,
          ...audit,
        });
      }

      const cCount = await db.cats.count();
      const eCount = await db.events.count();
      setCounts({ cats: cCount, events: eCount });

      if (isRootMode) loadRawRecords(inspectorTable);

      const msg = `✅ SIKER: ${count} db teszt naptári esemény sikeresen létrehozva! (Összesen: ${eCount} esemény az adatbázisban)`;
      addDebugLog(`[Seed] ${count} db teszt esemény generálva (Összesen: ${eCount})`);
      setSeedFeedbackMessage(msg);
    } catch (err: any) {
      console.error('Error generating test events:', err);
      setSeedFeedbackMessage(`❌ Hiba a teszt események generálása során: ${err.message}`);
    } finally {
      setIsGeneratingEvents(false);
    }
  };

  const handleGenerateTestTnr = async (count: number) => {
    setIsGeneratingTnr(true);
    setSeedFeedbackMessage(`✂️ ${count} db teszt TNR akció generálása folyamatban...`);
    addDebugLog(`[Seed] ${count} db teszt TNR akció generálása elindítva...`);

    try {
      const locations = [
        'Kőbánya vasútállomás kolónia',
        'Rákosrendező kiserdő',
        'Budafoki úti telephely',
        'Újpesti lakótelep 4. tömb mögött',
        'Csepel gyártelep B épület',
        'Soroksári Duna-parti horgásztó',
        'Óbudai gázgyár területe',
        'Zuglói kertes házas övezet',
      ];
      const trappers = ['Kovács Péter - Önkéntes', 'Nagy Anna - TNR Koordinátor', 'Tóth Gábor - Csapdafelelős', 'Szabó Mária - Lakossági bejelentő'];
      const clinics = ['Budai Kisállat Klinika', 'Városligeti Állatorvosi Rendelő', 'Dél-Pesti Állatkórház', 'Central Vet Rendelő'];
      const surgeons = ['Dr. Szabó István', 'Dr. Kiss Eszter', 'Dr. Horváth Tamás', 'Dr. Varga Katalin'];
      const statuses: ('befogva' | 'mutet_alatt' | 'elengedve')[] = ['befogva', 'mutet_alatt', 'elengedve'];
      const catTags = ['Selymes Cirmos', 'Kormos Kandúr', 'Foltos Kolónia Cica', 'Fekete Füles', 'Fehér-Cirmos Nőstény', 'Vadóc'];

      const currentUser = getCurrentUser ? getCurrentUser() : null;
      const now = new Date();

      for (let i = 0; i < count; i++) {
        const id = 'tnr_' + Math.random().toString(36).substring(2, 9);
        const loc = locations[Math.floor(Math.random() * locations.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        const trappedDaysAgo = Math.floor(Math.random() * 20);
        const trappedDateObj = new Date(now.getTime() - trappedDaysAgo * 24 * 60 * 60 * 1000);
        const dateTrappedStr = trappedDateObj.toISOString().split('T')[0];

        let dateReleasedStr: string | undefined = undefined;
        if (status === 'elengedve') {
          const releasedDateObj = new Date(trappedDateObj.getTime() + (1 + Math.floor(Math.random() * 3)) * 24 * 60 * 60 * 1000);
          dateReleasedStr = releasedDateObj.toISOString().split('T')[0];
        }

        const audit = createAuditStamp(currentUser);

        const newTnr: any = {
          id,
          catNameOrTag: `${catTags[Math.floor(Math.random() * catTags.length)]} #${Math.floor(10 + Math.random() * 90)}`,
          locationTrapped: loc,
          dateTrapped: dateTrappedStr,
          trappedBy: trappers[Math.floor(Math.random() * trappers.length)],
          clinicLocation: clinics[Math.floor(Math.random() * clinics.length)],
          surgeonName: surgeons[Math.floor(Math.random() * surgeons.length)],
          locationReleased: loc,
          dateReleased: dateReleasedStr,
          status,
          earTip: Math.random() > 0.15,
          notes: `Generált teszt TNR akció (${status}). Kolónia helyszín: ${loc}`,
          createdAt: audit.created_at || new Date().toISOString(),
          ...audit,
        };

        await db.tnr.put(newTnr);
      }

      const cCount = await db.cats.count();
      const eCount = await db.events.count();
      const tCount = await db.tnr.count();
      setCounts({ cats: cCount, events: eCount, tnr: tCount });

      if (isRootMode) loadRawRecords(inspectorTable);

      const msg = `✅ SIKER: ${count} db teszt TNR akció rekord sikeresen létrehozva! (Összesen: ${tCount} TNR rekord az adatbázisban)`;
      addDebugLog(`[Seed] ${count} db teszt TNR akció generálva (Összesen: ${tCount})`);
      setSeedFeedbackMessage(msg);
    } catch (err: any) {
      console.error('Error generating test TNR records:', err);
      setSeedFeedbackMessage(`❌ Hiba a teszt TNR rekordok generálása során: ${err.message}`);
    } finally {
      setIsGeneratingTnr(false);
    }
  };

  const handleSaveSupabase = () => {
    localStorage.setItem('supabase_url', supabaseUrl.trim());
    localStorage.setItem('supabase_anon_key', supabaseKey.trim());
    addDebugLog('Supabase beállítások frissítve');
    alert('Beállítások elmentve!');
  };

  const handleExportJson = async () => {
    const cats = await db.cats.toArray();
    const events = await db.events.toArray();

    const data = { cats, events, exportDate: new Date().toISOString(), version: APP_VERSION };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cica_nyt_root_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addDebugLog('JSON mentés kiexportálva');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json) {
          setPendingImportBackup({
            backupData: json,
            fileName: file.name,
          });
        }
      } catch (err: any) {
        alert('❌ Hiba a mentési fájl beolvasásakor: ' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input value so user can re-select same file if needed
    e.target.value = '';
  };

  const handleConfirmImportRestore = async () => {
    if (!pendingImportBackup) return;
    setIsImportRestoring(true);
    try {
      await restoreBackupToLocalDB(pendingImportBackup.backupData, { syncToSupabase: false });
      addDebugLog('Adatbázis sikeresen ellenőrizve és helyreállítva JSON fájlból');
      alert('✅ Adatbázis sikeresen visszaállítva a mentési fájlból!');
      setPendingImportBackup(null);
      await loadCounts();
      if (isRootMode) loadRawRecords(inspectorTable);
    } catch (err: any) {
      alert('❌ Hiba a visszaállítás során: ' + err.message);
    } finally {
      setIsImportRestoring(false);
    }
  };

  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const handleClearAll = async () => {
    setShowClearAllConfirm(true);
  };

  const confirmClearAll = async () => {
    await db.cats.clear();
    await db.events.clear();
    addDebugLog('Adatbázis teljesen kiürítve');
    await loadCounts();
    if (isRootMode) loadRawRecords(inspectorTable);
    setShowClearAllConfirm(false);
    onClose();
  };

  const filteredRawRecords = rawRecords.filter((rec) =>
    JSON.stringify(rec).toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-xs border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              ⚙️ Beállítások & {isRootMode ? '⚡ ROOT Debug Konzol' : 'Nézet Mód'}
            </h3>
            {isRootMode ? (
              <span className="text-[10px] font-black text-purple-700 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                ⚡ ROOT AKTÍV
              </span>
            ) : (
              <span className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-full">
                🔒 Standard
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1">
            ✕
          </button>
        </div>

        {/* Root Banner Switch */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            isRootMode
              ? 'bg-gradient-to-r from-purple-900 to-slate-900 text-white border-purple-500 shadow-sm'
              : 'bg-slate-50 border-gray-200 text-gray-800'
          }`}
        >
          {isRootMode ? (
            <>
              <div className="space-y-0.5">
                <div className="font-extrabold text-xs flex items-center gap-1.5 text-purple-300">
                  ⚡ Root Mód Hozzáférés Rendszergazda Szinten
                </div>
                <p className="text-[10px] text-purple-200">
                  Zustand Állapot, SQL Séma, Adatbázis Inspector és Tesztelő Eszközök feloldva.
                </p>
              </div>
              <button
                onClick={onDeactivateRoot}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px] shrink-0 transition cursor-pointer"
              >
                🔒 Root Zárolása
              </button>
            </>
          ) : (
            <>
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-gray-800 flex items-center gap-1">
                  🔑 Root Szintű Hozzáférés (Zustand & SQL Séma)
                </div>
                <p className="text-[10px] text-gray-500">
                  Add meg a root jelszót a Zustand állapot, SQL séma és hibakereső eszközök megnyitásához.
                </p>
              </div>
              <button
                onClick={onOpenRootAuth}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-lg text-[11px] shrink-0 shadow-xs transition cursor-pointer"
              >
                🔑 Root Belépés
              </button>
            </>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 text-xs sm:text-sm shrink-0 min-w-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'general'
                ? 'border-pink-600 text-pink-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🎨 Nézet & Beállítások
          </button>
          <button
            onClick={() => setActiveTab('license')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'license'
                ? 'border-pink-600 text-pink-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🔑 Licenc
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'notifications'
                ? 'border-purple-600 text-purple-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🔔 Értesítések & Küszöbök
          </button>

          <button
            onClick={() => setActiveTab('google_drive')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'google_drive'
                ? 'border-blue-600 text-blue-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ☁️ Google Drive & Supabase Mentés
          </button>

          <button
            onClick={() => setActiveTab('auto_backup')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'auto_backup'
                ? 'border-indigo-600 text-indigo-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ⏱️ Auto-Mentés & SQL Export
          </button>

          <button
            onClick={() => setActiveTab('patch')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'patch'
                ? 'border-pink-600 text-pink-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🧩 Patch Upgrade & Verzió
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            👥 Felhasználók & Jogosultságok
          </button>

          <button
            onClick={() => setActiveTab('supabase_rbac')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'supabase_rbac'
                ? 'border-indigo-600 text-indigo-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🛡️ Supabase RBAC
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'pwa'
                ? 'border-indigo-600 text-indigo-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📱 PWA, SW & Push Debug
          </button>

          {isRootMode && (
            <>
              <button
                onClick={() => setActiveTab('zustand')}
                className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
                  activeTab === 'zustand'
                    ? 'border-purple-600 text-purple-600 font-black'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🐻 Zustand Állapot (State)
              </button>

              <button
                onClick={() => setActiveTab('schema')}
                className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
                  activeTab === 'schema'
                    ? 'border-purple-600 text-purple-600 font-black'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                💾 SQL & Dexie Séma
              </button>

              <button
                onClick={() => setActiveTab('inspector')}
                className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
                  activeTab === 'inspector'
                    ? 'border-purple-600 text-purple-600 font-black'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🔍 Nyers Adat Böngésző
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
                  activeTab === 'audit'
                    ? 'border-purple-600 text-purple-600 font-black'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🛡️ Audit Event Lekérdezés
              </button>

              <button
                onClick={() => setActiveTab('tuning')}
                className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
                  activeTab === 'tuning'
                    ? 'border-purple-600 text-purple-600 font-black'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🛠️ Finomhangolás & Tesztelés
              </button>
            </>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {/* TAB: Notification Lead Days Settings */}
          {activeTab === 'notifications' && <NotificationSettingsPanel />}

          {/* TAB: Google Drive & Supabase Backup & Restore */}
          {activeTab === 'google_drive' && <GoogleDriveBackupSection onRefreshLocalCounts={loadCounts} />}

          {/* TAB: Automated & Incremental Backups */}
          {activeTab === 'auto_backup' && <AutoBackupSettingsSection onRefreshLocalCounts={loadCounts} />}

          {/* TAB: Patch Upgrade & Version Tracking */}
          {activeTab === 'patch' && <PatchUpgradeSection />}

          {/* TAB: Multi-User & Permissions */}
          {activeTab === 'users' && (
            isRootMode ? (
              <UserPermissionsManager />
            ) : (
              <div className="p-5 bg-purple-950 text-purple-100 rounded-2xl border border-purple-800 space-y-4 text-center my-4">
                <div className="w-12 h-12 bg-purple-900/80 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-purple-700">
                  🔑
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Root Szintű Hozzáférés Szükséges</h4>
                  <p className="text-xs text-purple-200 mt-1 max-w-md mx-auto leading-relaxed">
                    A felhasználói fiókok, szerepkörök (ROOT, OWNER, STAFF, FOSTER, VOLUNTEER, GUEST) és egyedi jogosultságok kezelése kizárólag <span className="font-bold underline text-pink-300">ROOT szintű</span> belépéssel érhető el.
                  </p>
                </div>
                <button
                  onClick={onOpenRootAuth}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  🔑 Root Belépés Aktiválása
                </button>
              </div>
            )
          )}

          {/* TAB: Supabase RBAC Viewer */}
          {activeTab === 'supabase_rbac' && <SupabaseRbacSection />}

          {/* TAB: Audit Event Inspector */}
          {activeTab === 'audit' && isRootMode && <AuditEventInspector />}

          {/* TAB: PWA, Service Worker & Push Notifications */}
          {activeTab === 'pwa' && (
            <div className="space-y-3">
              {/* PWA & Network Overview Card */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-3 border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-extrabold text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    📱 PWA & Alkalmazás Rendszerállapot
                  </h4>
                  <button
                    onClick={checkSwAndPwaStatus}
                    className="px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 font-mono text-[10px] rounded-lg transition border border-indigo-700 cursor-pointer"
                  >
                    🔄 Frissítés
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Hálózati Állapot</span>
                    <span className={`font-extrabold flex items-center gap-1 ${isOnlineStatus ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isOnlineStatus ? '🌐 Online' : '🔌 Offline'}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Megjelenítési Mód</span>
                    <span className={`font-extrabold text-[10px] ${isStandalonePwa ? 'text-purple-300' : 'text-amber-300'}`}>
                      {isStandalonePwa ? '📱 PWA Standalone (Telepítve)' : '💻 Böngésző Nézet'}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Manifest.json</span>
                    <span className="text-blue-300 font-extrabold text-[10px]">
                      Betöltve (/manifest.json)
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Worker Lifecycle & Cache Card */}
              <div className="p-3.5 bg-indigo-950 text-indigo-100 rounded-xl space-y-3 border border-indigo-800">
                <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
                  <h4 className="font-extrabold text-indigo-200 text-[11px] flex items-center gap-1.5 uppercase tracking-wider">
                    ⚙️ Service Worker Életciklus & Gyorsítótár
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    swInfo.controller
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    {swInfo.controller ? '⚡ Vezérlő (Controller) Aktív' : '⚠️ Vezérlő Inaktív'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
                  <div className="p-2 bg-slate-950/80 rounded-lg border border-indigo-900 space-y-1">
                    <span className="text-indigo-300 font-bold block">Service Worker Támogatás:</span>
                    <span className={swInfo.supported ? 'text-emerald-400 font-extrabold' : 'text-rose-400 font-extrabold'}>
                      {swInfo.supported ? '✅ Igen (navigator.serviceWorker elérhető)' : '❌ Nem támogatott'}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-950/80 rounded-lg border border-indigo-900 space-y-1">
                    <span className="text-indigo-300 font-bold block">Regisztrációs Státusz:</span>
                    <span className="text-amber-300 font-extrabold">{swInfo.state}</span>
                  </div>

                  <div className="p-2 bg-slate-950/80 rounded-lg border border-indigo-900 space-y-1 sm:col-span-2">
                    <span className="text-indigo-300 font-bold block">Scope (Hatókör) URL:</span>
                    <span className="text-slate-300 font-mono text-[10px] break-all">{swInfo.scope}</span>
                  </div>

                  <div className="p-2 bg-slate-950/80 rounded-lg border border-indigo-900 space-y-1 sm:col-span-2">
                    <span className="text-indigo-300 font-bold block">Aktív Gyorsítótárak (Cache Keys):</span>
                    {swInfo.caches.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {swInfo.caches.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-indigo-900/60 text-indigo-200 rounded border border-indigo-700 text-[9px]">
                            📦 {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Nincs mentett gyorsítótár elem.</span>
                    )}
                  </div>
                </div>

                {/* OnRender Cold-Start Aware Update Checker */}
                <div className="p-3 bg-slate-950/90 rounded-xl border border-sky-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sky-300 font-extrabold text-[11px] flex items-center gap-1.5">
                      <span>🚀</span>
                      <span>OnRender Szerver Ébresztő & Frissítés Ellenőrző</span>
                    </span>
                    <span className="text-[9px] font-bold bg-sky-900/60 text-sky-200 px-2 py-0.5 rounded border border-sky-700">
                      Smart Cold-Start Retry
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-normal">
                    Az OnRender ingyenes kiszolgálója 15 perc inaktivitás után elalszik. Ez a funkció intelligensen ébreszti fel a szervert (30-60 mp türelmi idővel), és leellenőrzi, van-e újabb kiadott verzió.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={updateCheckingState?.checking}
                      onClick={handleCheckForUpdatesWithRenderWakeup}
                      className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-[11px] transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {updateCheckingState?.checking ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>Ébresztés & Ellenőrzés...</span>
                        </>
                      ) : (
                        <>
                          <span>🔍</span>
                          <span>Frissítések Ellenőrzése (Render Ébresztéssel)</span>
                        </>
                      )}
                    </button>

                    {updateCheckingState && (
                      <div className={`p-2 rounded-lg text-[10px] font-bold border flex-1 ${
                        updateCheckingState.checking
                          ? 'bg-amber-950/80 text-amber-200 border-amber-700/60 animate-pulse'
                          : updateCheckingState.message.includes('✅')
                          ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700/60'
                          : 'bg-rose-950/80 text-rose-200 border-rose-700/60'
                      }`}>
                        {updateCheckingState.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* SW Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleRegisterServiceWorker}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[11px] transition shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    🔄 SW Regisztráció & Frissítés
                  </button>
                  <button
                    onClick={handleUnregisterServiceWorker}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 font-bold rounded-xl text-[11px] transition border border-rose-900/50 cursor-pointer flex items-center gap-1"
                  >
                    🧹 SW Törlése & Cache Kiürítése
                  </button>
                </div>
              </div>

              {/* Push Notifications System & Test Suite */}
              <div className="p-3.5 bg-purple-950 text-purple-100 rounded-xl space-y-3 border border-purple-800">
                <div className="flex items-center justify-between border-b border-purple-800 pb-2">
                  <h4 className="font-extrabold text-purple-200 text-[11px] flex items-center gap-1.5 uppercase tracking-wider">
                    🔔 Push Értesítési Rendszer & Tesztelési Eszközök
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    notificationPermission === 'granted'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : notificationPermission === 'denied'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    {notificationPermission === 'granted'
                      ? '✅ Engedélyezve (granted)'
                      : notificationPermission === 'denied'
                      ? '🚫 Elutasítva (denied)'
                      : '❓ Nincs kérve (default)'}
                  </span>
                </div>

                <p className="text-[10px] text-purple-200 leading-relaxed">
                  Teszteld az oltási és egészségügyi események automatikus háttérbeli push értesítési csatornáit mind a helyi böngésző API-n, mind a Service Worker háttérszálon keresztül.
                </p>

                {/* Permission Request Alert */}
                {notificationPermission !== 'granted' && (
                  <div className="p-2.5 bg-amber-950/80 border border-amber-700/60 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-[10px] text-amber-200 font-medium">
                      ⚠️ Az értesítések küldéséhez engedély szükséges a böngésző részéről.
                    </span>
                    <button
                      onClick={handleRequestNotificationPermission}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-[10px] shrink-0 transition cursor-pointer"
                    >
                      🔔 Engedély Kérése
                    </button>
                  </div>
                )}

                {/* Test Action Buttons Grid */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-extrabold text-purple-300 block uppercase tracking-wider">
                    ⚡ Tesztküldési és Eszköz Akciók:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleTestLocalNotification}
                      className="p-2.5 bg-purple-900/90 hover:bg-purple-800 text-purple-100 border border-purple-700 rounded-xl text-[11px] font-bold text-left transition space-y-0.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-purple-200">
                        <span>🧪</span>
                        <span className="font-extrabold">Teszt Helyi Értesítés</span>
                      </div>
                      <p className="text-[9px] text-purple-300 font-normal">
                        Kiküld egy közvetlen teszt üzenetet a böngésző Notification API-n keresztül.
                      </p>
                    </button>

                    <button
                      onClick={handleTestSwPushNotification}
                      className="p-2.5 bg-indigo-900/90 hover:bg-indigo-800 text-indigo-100 border border-indigo-700 rounded-xl text-[11px] font-bold text-left transition space-y-0.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-indigo-200">
                        <span>📡</span>
                        <span className="font-extrabold">Teszt SW Háttér Push</span>
                      </div>
                      <p className="text-[9px] text-indigo-300 font-normal">
                        Háttérbeli Service Worker értesítés megjelenítése oltási emlékeztető tesztként.
                      </p>
                    </button>

                    <button
                      onClick={handleTestVibration}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-bold text-left transition space-y-0.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <span>📳</span>
                        <span className="font-extrabold">Vibrációs Minta Teszt</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-normal">
                        Ritmikus haptikus visszajelzés (vibration) indítása hordozható készülékeken.
                      </p>
                    </button>

                    <button
                      onClick={async () => {
                        await checkSwAndPwaStatus();
                        addDebugLog('[PWA Teszt] PWA rendszerállapot újraellenőrizve');
                        alert('✅ PWA, Service Worker és Push állapot frissítve!');
                      }}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-bold text-left transition space-y-0.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-300">
                        <span>🔍</span>
                        <span className="font-extrabold">Állapot Újraellenőrzése</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-normal">
                        Böngésző API-k, regisztrációk és engedélyek pillanatnyi frissítése.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: License Settings */}
          {activeTab === 'license' && <LicenseSettingsTab />}

          {/* TAB 1: General & Device View Settings */}
          {activeTab === 'general' && (
            <div className="space-y-3">
              {/* Patch Upgrade & Version Tracking Card */}
              <div className="p-3.5 bg-gradient-to-r from-pink-900 via-purple-900 to-indigo-950 text-white rounded-xl space-y-2.5 border border-pink-500/40 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-pink-200 flex items-center gap-1.5">
                    🧩 Patch Upgrade & Verziókövető Rendszer
                  </h4>
                  <span className="text-[10px] bg-pink-950 text-pink-300 border border-pink-700/60 font-bold px-2 py-0.5 rounded-full">
                    v{APP_VERSION} Patchek
                  </span>
                </div>
                <p className="text-[11px] text-pink-100 leading-relaxed font-medium">
                  Adatbázis-javító patchek futtatása (Patch A: Állat & Egészségügy, Patch B: Befogadó & Pénzügy, Kapcsolódó Elemek Patch: Relációs idővonal indexelés).
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('patch')}
                  className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2 text-xs border border-pink-400/40"
                >
                  <span>🚀</span>
                  <span>Patch Upgrade Menedzser Megnyitása</span>
                </button>
              </div>

              {/* Notification & Thresholds Quick Access Card */}
              <div className="p-3.5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-xl space-y-2.5 border border-purple-500/40 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-purple-200 flex items-center gap-1.5">
                    🔔 Értesítések, Push Preferenciák & Küszöbök
                  </h4>
                  <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700/60 font-bold px-2 py-0.5 rounded-full">
                    Oltások & Készlet
                  </span>
                </div>
                <p className="text-[11px] text-purple-100 leading-relaxed font-medium">
                  Állítsd be a védőoltások és orvosi kezelések előzetes figyelmeztetési napjait, a raktárkészlet biztonsági minimum küszöbértékeit, valamint a web push értesítési csatornákat.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2 text-xs border border-purple-400/40"
                >
                  <span>⚙️</span>
                  <span>Értesítések & Küszöbértékek Menedzselése</span>
                </button>
              </div>

              {/* OnRender Update Check Card */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-xl space-y-2.5 border border-sky-500/40 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-sky-300 flex items-center gap-1.5">
                    🚀 OnRender Frissítés & Szerver Ébresztés
                  </h4>
                  <span className="text-[10px] bg-sky-900/80 text-sky-200 border border-sky-700/60 font-bold px-2 py-0.5 rounded-full">
                    Szerver Ellenőrzés
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                  Az alkalmazás automatikusan figyeli az OnRender szerveren megjelent újabb verziókat. Ha a kiszolgáló alvó állapotban van, a gombra kattintva intelligensen felébreszti azt.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={updateCheckingState?.checking}
                    onClick={handleCheckForUpdatesWithRenderWakeup}
                    className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {updateCheckingState?.checking ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>Ébresztés & Ellenőrzés...</span>
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        <span>Frissítések Ellenőrzése Most</span>
                      </>
                    )}
                  </button>

                  {updateCheckingState && (
                    <div className={`p-2 rounded-lg text-[10px] font-bold border flex-1 ${
                      updateCheckingState.checking
                        ? 'bg-amber-950/80 text-amber-200 border-amber-700/60 animate-pulse'
                        : updateCheckingState.message.includes('✅')
                        ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700/60'
                        : 'bg-rose-950/80 text-rose-200 border-rose-700/60'
                    }`}>
                      {updateCheckingState.message}
                    </div>
                  )}
                </div>
              </div>

              {/* UI Elements Customization Card */}
              <div className="p-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    🎨 Felületi Elemek Testreszabása
                  </h4>
                  <span className="text-[10px] bg-white/20 font-bold px-2 py-0.5 rounded-full">
                    Személyre szabható
                  </span>
                </div>
                <p className="text-[11px] text-pink-100 leading-relaxed">
                  Módosítsd a "Kimutatások és költségek" lapon az egészségügyi ellátottság lista elemeit, vagy szabd személyre a kezelőfelület megjelenítését!
                </p>
                <button
                  onClick={() => {
                    if (onOpenUiCustomization) {
                      onClose();
                      onOpenUiCustomization();
                    }
                  }}
                  className="w-full py-2 bg-white hover:bg-pink-50 text-pink-700 font-black rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-2 text-xs"
                >
                  <span>🛠️</span>
                  <span>Felületi elemek módosítása</span>
                </button>
              </div>

              {/* Theme Selector Section */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-700">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    🎨 Alkalmazás Témája & Színséma
                  </h4>
                  <span className="text-[10px] bg-pink-900/60 text-pink-300 font-bold px-2 py-0.5 rounded-full border border-pink-700/50">
                    Aktív: {theme}
                  </span>
                </div>

                <p className="text-[10px] text-slate-300">
                  Válaszd ki az alkalmazás egyedi vizuális színvilágát. A módosítás azonnal érvénybe lép minden felületen.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setTheme('original');
                      addDebugLog('Theme set to original (Rózsaszín)');
                    }}
                    className={`p-2.5 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      theme === 'original'
                        ? 'bg-pink-600 text-white border-pink-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    🌸 Rózsaszín
                  </button>

                  <button
                    onClick={() => {
                      setTheme('olive');
                      addDebugLog('Theme set to olive (Olíva)');
                    }}
                    className={`p-2.5 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      theme === 'olive'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    🫒 Olíva
                  </button>

                  <button
                    onClick={() => {
                      setTheme('lavender');
                      addDebugLog('Theme set to lavender (Levendula)');
                    }}
                    className={`p-2.5 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      theme === 'lavender'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    🪻 Levendula
                  </button>

                  <button
                    onClick={() => {
                      setTheme('dark');
                      addDebugLog('Theme set to dark (Sötét)');
                    }}
                    className={`p-2.5 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-slate-950 text-white border-slate-500 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    🌙 Sötét Mód
                  </button>
                </div>
              </div>

              {/* Footer Style Selector Section */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-700">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    🦶 Lábléc (Footer) Megjelenési Stílus
                  </h4>
                  <span className="text-[10px] bg-pink-900/60 text-pink-300 font-bold px-2 py-0.5 rounded-full border border-pink-700/50">
                    {footerMode === 'compact'
                      ? '⚡ Kompakt Fix Sáv'
                      : footerMode === 'full'
                      ? '🏛️ Részletes Footer'
                      : '🌟 Mindkettő'}
                  </span>
                </div>

                <p className="text-[10px] text-slate-300">
                  Válaszd ki az alkalmazás alján megjelenő lábléc (footer) formátumát. A beállítás azonnal elmentésre kerül.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setFooterMode('compact');
                      addDebugLog('Footer mode set to compact (Fix alsó sáv)');
                    }}
                    className={`p-2.5 rounded-xl text-left font-extrabold text-xs transition border cursor-pointer space-y-1 ${
                      footerMode === 'compact'
                        ? 'bg-pink-600 text-white border-pink-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[11px]">⚡ Fix Alsó Sáv</span>
                      {footerMode === 'compact' && <span>✓</span>}
                    </div>
                    <p className={`text-[9px] font-normal leading-tight ${footerMode === 'compact' ? 'text-pink-100' : 'text-slate-400'}`}>
                      Kisméretű fix sáv (🐱, ✂️, 📅 darabszámok + HES Projects® by FP).
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setFooterMode('full');
                      addDebugLog('Footer mode set to full (Részletes footer)');
                    }}
                    className={`p-2.5 rounded-xl text-left font-extrabold text-xs transition border cursor-pointer space-y-1 ${
                      footerMode === 'full'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[11px]">🏛️ Részletes Footer</span>
                      {footerMode === 'full' && <span>✓</span>}
                    </div>
                    <p className={`text-[9px] font-normal leading-tight ${footerMode === 'full' ? 'text-purple-100' : 'text-slate-400'}`}>
                      Teljes, többoszlopos lábléc modul navigációval és eszközökkel.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setFooterMode('both');
                      addDebugLog('Footer mode set to both');
                    }}
                    className={`p-2.5 rounded-xl text-left font-extrabold text-xs transition border cursor-pointer space-y-1 ${
                      footerMode === 'both'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[11px]">🌟 Mindkettő</span>
                      {footerMode === 'both' && <span>✓</span>}
                    </div>
                    <p className={`text-[9px] font-normal leading-tight ${footerMode === 'both' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Részletes lábléc a tartalom alján + fix alsó sáv a képernyő alján.
                    </p>
                  </button>
                </div>
              </div>

              {/* Device View Mode Switcher */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-700">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    {activeDevice === 'mobile' ? '📱' : '💻'} Képernyő Nézet Beállítások
                  </h4>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                    Ablak szélesség: {viewportWidth}px
                  </span>
                </div>

                <p className="text-[10px] text-slate-300">
                  Válaszd ki az alkalmazás felületének megjelenítési módját. Automata módban a képernyőméret alapján dönt a rendszer.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setViewOverride('auto');
                      addDebugLog('View mode set to Auto');
                    }}
                    className={`p-2 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      viewOverride === 'auto'
                        ? 'bg-pink-600 text-white border-pink-500 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    ⚡ Automata
                    <span className="block text-[9px] font-normal opacity-80 mt-0.5">
                      ({isAutoMobile ? 'Mobil' : 'Desktop'})
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setViewOverride('mobile');
                      addDebugLog('View mode overridden to Mobile');
                    }}
                    className={`p-2 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      viewOverride === 'mobile'
                        ? 'bg-pink-600 text-white border-pink-500 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    📱 Mobil Nézet
                    <span className="block text-[9px] font-normal opacity-80 mt-0.5">
                      Keskeny elrendezés
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setViewOverride('desktop');
                      addDebugLog('View mode overridden to Desktop');
                    }}
                    className={`p-2 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      viewOverride === 'desktop'
                        ? 'bg-pink-600 text-white border-pink-500 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    💻 Desktop Nézet
                    <span className="block text-[9px] font-normal opacity-80 mt-0.5">
                      Széles elrendezés
                    </span>
                  </button>
                </div>
              </div>

              {/* Cat List View Mode (Cards vs Table) Card */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-700">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    🐱 Állatok Lista Nézet (Kártyák / Táblázat)
                  </h4>
                  <span className="text-[10px] bg-pink-900/60 text-pink-300 font-bold px-2 py-0.5 rounded-full border border-pink-700/50">
                    Aktív: {catListViewMode === 'grid' ? '📱 Kártyák' : '📊 Táblázat'}
                  </span>
                </div>

                <p className="text-[10px] text-slate-300">
                  Válaszd ki az Állatok (Cicák) lapon használt alapértelmezett megjelenítési formátumot.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setCatListViewMode('grid');
                      addDebugLog('Cat list view mode set to grid');
                    }}
                    className={`p-2.5 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      catListViewMode === 'grid'
                        ? 'bg-pink-600 text-white border-pink-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    📱 Kártyás Nézet
                    <span className="block text-[9px] font-normal opacity-80 mt-0.5">
                      Részletes kártyás kiskönyv
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setCatListViewMode('table');
                      addDebugLog('Cat list view mode set to table');
                    }}
                    className={`p-2.5 rounded-xl text-center font-extrabold text-xs transition border cursor-pointer ${
                      catListViewMode === 'table'
                        ? 'bg-pink-600 text-white border-pink-400 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    📊 Táblázatos Nézet
                    <span className="block text-[9px] font-normal opacity-80 mt-0.5">
                      Tömör soros áttekintés
                    </span>
                  </button>
                </div>
              </div>

              {/* PWA Alkalmazás Telepítés & Frissítés Status Card */}
              <div className="p-3.5 bg-gradient-to-br from-slate-900 to-purple-950 text-white rounded-xl space-y-3 shadow-sm border border-purple-800/40">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 text-purple-300">
                    <span>📲</span>
                    <span>PWA Telepítés & Frissítés</span>
                  </h4>
                  {isInstalled ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      ✅ Telepítve
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                      🌐 Böngészőben fut
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <p>
                    <strong>Frissítési állapot:</strong>{' '}
                    {updateAvailable ? (
                      <span className="text-pink-400 font-bold">⚠️ Új verzió érhető el!</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">Legújabb verzió (v{APP_VERSION})</span>
                    )}
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  {updateAvailable ? (
                    <button
                      onClick={triggerUpdate}
                      className="w-full py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      <span>🔄</span>
                      <span>Frissítés</span>
                    </button>
                  ) : (!isInstalled && (canInstall || isIos)) ? (
                    <button
                      onClick={triggerInstall}
                      className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>📲</span>
                      <span>Telepítés</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs cursor-default text-center"
                    >
                      ✓ Az alkalmazás naprakész
                    </button>
                  )}
                </div>
              </div>

              {/* Szervezeti Beállítások & Munkatárs Szerepkör */}
              <div className="p-3.5 bg-pink-50/50 border border-pink-200 rounded-xl space-y-3">
                <h4 className="font-extrabold text-pink-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  🏢 Szervezeti Beállítások & Szerepkör
                </h4>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Szervezet neve (a fejlécben megjelenő név):
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Macskamenhely & Gondozó Nyilvántartó"
                    className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-pink-500 text-gray-900"
                  />
                  <p className="text-[10px] text-gray-500 italic">
                    Ez a név jelenik meg a fejlécben a "Cica-NyT" felirat alatt.
                  </p>
                </div>

                <div className="space-y-1 pt-1 border-t border-pink-200/60">
                  <label className="block text-xs font-bold text-gray-700">
                    👥 Szervezeti Munkatárs Szerepkör:
                  </label>
                  <CustomSelect
                    value={orgRole}
                    onChange={(val) => setOrgRole(val)}
                    options={[
                      { value: 'shelter_admin', label: 'Menhely Vezető / Adminisztrátor', icon: '👑' },
                      { value: 'foundation_admin', label: 'Alapítvány / Adminisztrátor', icon: '🏛️' },
                      { value: 'foundation_member', label: 'Alapítvány / Tag', icon: '🤝' },
                      { value: 'vet', label: 'Állatorvos / Egészségügyi Felelős', icon: '🩺' },
                      { value: 'caretaker', label: 'Gondozó / Önkéntes', icon: '🏡' },
                    ]}
                    title="Munkatárs Szerepkör Kiválasztása"
                    colorScheme="pink"
                    buttonClassName="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Supabase Cloud */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  ☁️ Supabase Cloud Szinkronizáció
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Supabase URL:</label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyz.supabase.co"
                      className="w-full p-2 bg-white border border-gray-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Anon Key:</label>
                    <input
                      type="password"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="eyJhbGciOi..."
                      className="w-full p-2 bg-white border border-gray-300 rounded-xl font-mono"
                    />
                  </div>
                  <button
                    onClick={handleSaveSupabase}
                    className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    💾 Mentés
                  </button>
                </div>
              </div>

              {/* Google Drive & Supabase Backup Quick Access */}
              <div className="p-3.5 bg-blue-100/70 border-2 border-blue-300 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                <div>
                  <h4 className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                    ☁️ Google Drive & Supabase Szinkron
                  </h4>
                  <p className="text-[11px] text-blue-900 font-bold">Személyes Google Drive mentés, visszaállítás és Supabase felhő szinkronizáció.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('google_drive')}
                  className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-black rounded-xl transition shrink-0 cursor-pointer text-xs shadow-md border border-blue-950"
                >
                  Megnyitás ➔
                </button>
              </div>

              {/* Basic Export */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-emerald-900 text-[11px]">📥 Biztonsági Mentés (JSON)</h4>
                  <p className="text-[10px] text-gray-600">Minden cica esemény és törzsadat kimentése JSON fájlba.</p>
                </div>
                <button
                  onClick={handleExportJson}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shrink-0 cursor-pointer"
                >
                  Export
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Zustand State Inspector */}
          {activeTab === 'zustand' && isRootMode && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🐻</span>
                    <div>
                      <h4 className="font-black text-slate-100 text-xs">
                        Zustand Global State Store Inspector
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Reaktív, valós idejű központi állapotkezelő állapotlekérdezése
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => addDebugLog('Zustand manual state query refreshed')}
                    className="px-2.5 py-1 bg-purple-900 hover:bg-purple-800 text-purple-200 font-mono text-[10px] rounded-lg transition border border-purple-700 cursor-pointer"
                  >
                    🔄 Frissítés
                  </button>
                </div>

                {/* Key State Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">viewportWidth</span>
                    <span className="text-purple-300 font-extrabold">{viewportWidth}px</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">viewOverride</span>
                    <span className="text-pink-300 font-extrabold">{viewOverride}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">activeDevice</span>
                    <span className="text-amber-300 font-extrabold">{activeDevice}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">theme</span>
                    <span className="text-emerald-300 font-extrabold">{theme}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">orgRole</span>
                    <span className="text-blue-300 font-extrabold">{orgRole}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">isRootMode</span>
                    <span className="text-red-400 font-extrabold">{isRootMode ? 'true' : 'false'}</span>
                  </div>
                </div>

                {/* State Action Test Buttons */}
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 text-[10px] block">
                    ⚡ Zustand Műveletek & Esemény Tesztelés:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => addDebugLog('Zustand event dispatched: Manual ping')}
                      className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-md text-[10px] transition cursor-pointer"
                    >
                      + Debug Log Hozzáadása
                    </button>
                    <button
                      onClick={() => clearDebugLogs()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-[10px] transition cursor-pointer"
                    >
                      🧹 Debug Log Törlése
                    </button>
                    <button
                      onClick={() => {
                        const newTheme = theme === 'dark' ? 'original' : 'dark';
                        setTheme(newTheme);
                        addDebugLog(`Theme toggled to ${newTheme} via Zustand`);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-md text-[10px] transition cursor-pointer"
                    >
                      🎨 Téma Váltás ({theme})
                    </button>
                  </div>
                </div>

                {/* Zustand Event Audit Log */}
                <div className="space-y-1">
                  <span className="font-bold text-slate-400 text-[10px] block">
                    📜 Zustand Debug Event Log ({debugLogs.length}):
                  </span>
                  <div className="p-2 bg-black text-green-400 font-mono text-[10px] rounded-lg max-h-32 overflow-y-auto space-y-1 border border-slate-900">
                    {debugLogs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </div>

                {/* Raw Zustand State JSON Tree */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-bold">🌳 Raw Zustand JSON Store Snapshot:</span>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          JSON.stringify(
                            { viewportWidth, viewOverride, activeDevice, theme, orgRole, isRootMode, debugLogs },
                            null,
                            2
                          )
                        )
                      }
                      className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                    >
                      📋 Másolás
                    </button>
                  </div>
                  <pre className="p-2.5 bg-black text-purple-300 font-mono text-[10px] rounded-lg overflow-x-auto border border-slate-900 leading-tight">
                    {JSON.stringify(
                      { viewportWidth, viewOverride, activeDevice, theme, orgRole, isRootMode, debugLogs },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SQL & Dexie Schema */}
          {activeTab === 'schema' && isRootMode && (
            <div className="space-y-3">
              {/* Storage State Indicator */}
              <div className="p-3 bg-purple-950 text-purple-100 rounded-xl border border-purple-800 space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-purple-300">📊 IndexedDB Tárhely Használat:</span>
                  <span>{storageEstimate ? `${storageEstimate.used} / ${storageEstimate.quota} (${storageEstimate.percent}%)` : 'Betöltés...'}</span>
                </div>
                {storageEstimate && (
                  <div className="w-full bg-purple-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-400 h-full transition-all duration-300"
                      style={{ width: `${Math.min(storageEstimate.percent || 1, 100)}%` }}
                    />
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-purple-300 font-mono pt-1 border-t border-purple-900">
                  <span>Adatbázis neve: <strong>CicaNyT</strong></span>
                  <span>Séma verzió: <strong>v8 (Dexie)</strong></span>
                  <span>Tároló motor: <strong>Browser IndexedDB</strong></span>
                </div>
              </div>

              {/* Supabase / PostgreSQL Row Level Security (RLS) Copyable SQL */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-sky-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    <div>
                      <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                        Supabase / PostgreSQL Row Level Security (RLS) SQL Script
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Másolható SQL utasítás a szerepkörök (ROOT, OWNER, STAFF) és granuláris jogosultságok (animal.*, health.*, tnr.*, users.*) SQL adatbázisba történő integrálásához
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const sqlScript = `-- ====================================================================
-- CICA NYILVÁNTARTÓ - SUPABASE / POSTGRESQL RLS (ROW LEVEL SECURITY) SÉMA
-- ====================================================================

-- 1. TÁBLÁK LÉTREHOZÁSA (TABLES & CONSTRAINTS)
CREATE TABLE IF NOT EXISTS app_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT NOT NULL,
    pin_code TEXT,
    role_id TEXT REFERENCES app_roles(id) ON DELETE SET NULL,
    custom_permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_root BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cats (
    id TEXT PRIMARY KEY,
    sorszam TEXT,
    nev TEXT NOT NULL,
    ivar TEXT,
    szin TEXT,
    szuletes TEXT,
    status TEXT DEFAULT 'befogadott',
    chip_number TEXT,
    is_spayed BOOLEAN DEFAULT FALSE,
    foster_id TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    created_by_name TEXT,
    updated_by TEXT,
    updated_by_name TEXT
);

CREATE TABLE IF NOT EXISTS foster_parents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    max_capacity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'aktiv',
    notes TEXT,
    is_quarantine BOOLEAN DEFAULT FALSE,
    is_kitten_specialist BOOLEAN DEFAULT FALSE,
    is_medical_specialist BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS foster_supplies (
    id BIGSERIAL PRIMARY KEY,
    foster_id TEXT REFERENCES foster_parents(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    item TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'db',
    date TEXT NOT NULL,
    status TEXT DEFAULT 'igenyelve',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS foster_expenses (
    id BIGSERIAL PRIMARY KEY,
    foster_id TEXT REFERENCES foster_parents(id) ON DELETE CASCADE,
    cat_id TEXT REFERENCES cats(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    date TEXT NOT NULL,
    receipt_number TEXT,
    vendor TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
    id BIGSERIAL PRIMARY KEY,
    direction TEXT NOT NULL,
    item_type TEXT NOT NULL,
    source_type TEXT,
    brand_or_name TEXT,
    quantity NUMERIC DEFAULT 1,
    unit TEXT NOT NULL,
    date TEXT NOT NULL,
    source_or_recipient TEXT NOT NULL,
    destination TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finances (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    partner_name TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'teljesult',
    invoice_number TEXT,
    cat_id TEXT,
    foster_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    cat_id TEXT REFERENCES cats(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'esedekes',
    cost NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    created_by_name TEXT,
    updated_by TEXT,
    updated_by_name TEXT
);

CREATE TABLE IF NOT EXISTS tnr_records (
    id TEXT PRIMARY KEY,
    cat_name_or_tag TEXT NOT NULL,
    location_trapped TEXT,
    trapped_date TEXT,
    spayed_date TEXT,
    released_date TEXT,
    status TEXT DEFAULT 'befogva',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    created_by_name TEXT,
    updated_by TEXT,
    updated_by_name TEXT
);

-- 2. ROW LEVEL SECURITY (RLS) BEKAPCSOLÁSA
ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE foster_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE foster_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE foster_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tnr_records ENABLE ROW LEVEL SECURITY;

-- 3. JOGOSULTSÁG ELLENŐRZŐ SEGÉDFUNKCIÓ (PL/pgSQL RLS HELPER)
CREATE OR REPLACE FUNCTION check_user_permission(p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id TEXT;
    v_is_root BOOLEAN;
    v_custom_perms JSONB;
    v_role_perms JSONB;
BEGIN
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL THEN
        -- Anonim / Kódalapú fallback
        RETURN TRUE;
    END IF;

    SELECT is_root, custom_permissions, r.permissions
    INTO v_is_root, v_custom_perms, v_role_perms
    FROM app_users u
    LEFT JOIN app_roles r ON u.role_id = r.id
    WHERE u.id = v_user_id;

    IF v_is_root IS TRUE THEN
        RETURN TRUE;
    END IF;

    IF v_custom_perms ? p_permission THEN
        RETURN (v_custom_perms->>p_permission)::boolean;
    END IF;

    IF v_role_perms ? p_permission THEN
        RETURN (v_role_perms->>p_permission)::boolean;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS POLICIES (MÁSOLHATÓ SUPABASE SZABÁLYOK)

-- CATS (ÁLLATOK)
DROP POLICY IF EXISTS "cats_select_policy" ON cats;
CREATE POLICY "cats_select_policy" ON cats FOR SELECT USING (check_user_permission('animal.read'));

DROP POLICY IF EXISTS "cats_insert_policy" ON cats;
CREATE POLICY "cats_insert_policy" ON cats FOR INSERT WITH CHECK (check_user_permission('animal.create'));

DROP POLICY IF EXISTS "cats_update_policy" ON cats;
CREATE POLICY "cats_update_policy" ON cats FOR UPDATE USING (check_user_permission('animal.update'));

DROP POLICY IF EXISTS "cats_delete_policy" ON cats;
CREATE POLICY "cats_delete_policy" ON cats FOR DELETE USING (check_user_permission('animal.delete'));

-- FOSTER PARENTS & SUPPLIES & EXPENSES (BEFOGADÓ HÁLÓZAT)
DROP POLICY IF EXISTS "foster_parents_select_policy" ON foster_parents;
CREATE POLICY "foster_parents_select_policy" ON foster_parents FOR SELECT USING (check_user_permission('foster.read'));
DROP POLICY IF EXISTS "foster_parents_insert_policy" ON foster_parents;
CREATE POLICY "foster_parents_insert_policy" ON foster_parents FOR INSERT WITH CHECK (check_user_permission('foster.create'));
DROP POLICY IF EXISTS "foster_parents_update_policy" ON foster_parents;
CREATE POLICY "foster_parents_update_policy" ON foster_parents FOR UPDATE USING (check_user_permission('foster.update'));
DROP POLICY IF EXISTS "foster_parents_delete_policy" ON foster_parents;
CREATE POLICY "foster_parents_delete_policy" ON foster_parents FOR DELETE USING (check_user_permission('foster.delete'));

DROP POLICY IF EXISTS "foster_supplies_select_policy" ON foster_supplies;
CREATE POLICY "foster_supplies_select_policy" ON foster_supplies FOR SELECT USING (check_user_permission('foster.read'));
DROP POLICY IF EXISTS "foster_supplies_insert_policy" ON foster_supplies;
CREATE POLICY "foster_supplies_insert_policy" ON foster_supplies FOR INSERT WITH CHECK (check_user_permission('foster.create'));

DROP POLICY IF EXISTS "foster_expenses_select_policy" ON foster_expenses;
CREATE POLICY "foster_expenses_select_policy" ON foster_expenses FOR SELECT USING (check_user_permission('foster.read'));
DROP POLICY IF EXISTS "foster_expenses_insert_policy" ON foster_expenses;
CREATE POLICY "foster_expenses_insert_policy" ON foster_expenses FOR INSERT WITH CHECK (check_user_permission('foster.create'));

-- EVENTS (EGÉSZSÉGÜGYI ESEMÉNYEK)
DROP POLICY IF EXISTS "events_select_policy" ON events;
CREATE POLICY "events_select_policy" ON events FOR SELECT USING (check_user_permission('health.read'));

DROP POLICY IF EXISTS "events_insert_policy" ON events;
CREATE POLICY "events_insert_policy" ON events FOR INSERT WITH CHECK (check_user_permission('health.create'));

DROP POLICY IF EXISTS "events_update_policy" ON events;
CREATE POLICY "events_update_policy" ON events FOR UPDATE USING (check_user_permission('health.update'));

DROP POLICY IF EXISTS "events_delete_policy" ON events;
CREATE POLICY "events_delete_policy" ON events FOR DELETE USING (check_user_permission('health.delete'));

-- TNR (BEFOGÁS - IVARTALANÍTÁS)
DROP POLICY IF EXISTS "tnr_select_policy" ON tnr_records;
CREATE POLICY "tnr_select_policy" ON tnr_records FOR SELECT USING (check_user_permission('tnr.read'));

DROP POLICY IF EXISTS "tnr_insert_policy" ON tnr_records;
CREATE POLICY "tnr_insert_policy" ON tnr_records FOR INSERT WITH CHECK (check_user_permission('tnr.create'));

DROP POLICY IF EXISTS "tnr_update_policy" ON tnr_records;
CREATE POLICY "tnr_update_policy" ON tnr_records FOR UPDATE USING (check_user_permission('tnr.update'));

DROP POLICY IF EXISTS "tnr_delete_policy" ON tnr_records;
CREATE POLICY "tnr_delete_policy" ON tnr_records FOR DELETE USING (check_user_permission('tnr.delete'));

-- USERS (FELHASZNÁLÓK & SZEREPKÖRÖK)
DROP POLICY IF EXISTS "users_select_policy" ON app_users;
CREATE POLICY "users_select_policy" ON app_users FOR SELECT USING (check_user_permission('users.read'));

DROP POLICY IF EXISTS "users_insert_policy" ON app_users;
CREATE POLICY "users_insert_policy" ON app_users FOR INSERT WITH CHECK (check_user_permission('users.create'));

DROP POLICY IF EXISTS "users_update_policy" ON app_users;
CREATE POLICY "users_update_policy" ON app_users FOR UPDATE USING (check_user_permission('users.update'));

DROP POLICY IF EXISTS "users_delete_policy" ON app_users;
CREATE POLICY "users_delete_policy" ON app_users FOR DELETE USING (check_user_permission('users.delete'));

-- 5. ALAPÉRTELMEZETT SZEREPKÖRÖK ÉS SEED ADATOK
INSERT INTO app_roles (id, name, description, is_system, permissions) VALUES
('ROOT', 'Rendszergazda (ROOT)', 'Teljes hozzáférés minden modulhoz és beállításhoz', true, '{"animal.read":true,"animal.create":true,"animal.update":true,"animal.delete":true,"health.read":true,"health.create":true,"health.update":true,"health.delete":true,"tnr.read":true,"tnr.create":true,"tnr.update":true,"tnr.delete":true,"foster.read":true,"foster.create":true,"foster.update":true,"foster.delete":true,"finance.read":true,"finance.create":true,"finance.update":true,"finance.delete":true,"users.read":true,"users.create":true,"users.update":true,"users.delete":true}'::jsonb),
('OWNER', 'Alapítványi Vezető (OWNER)', 'Minden funkció kezelése a felületen', true, '{"animal.read":true,"animal.create":true,"animal.update":true,"animal.delete":true,"health.read":true,"health.create":true,"health.update":true,"health.delete":true,"tnr.read":true,"tnr.create":true,"tnr.update":true,"tnr.delete":true,"foster.read":true,"foster.create":true,"foster.update":true,"foster.delete":true,"finance.read":true,"finance.create":true,"finance.update":true,"finance.delete":true,"users.read":true,"users.create":true,"users.update":true}'::jsonb),
('STAFF', 'Munkatárs / Gondozó (STAFF)', 'Állat és egészségügyi adatok kezelése', true, '{"animal.read":true,"animal.create":true,"animal.update":true,"animal.delete":false,"health.read":true,"health.create":true,"health.update":true,"health.delete":false,"tnr.read":true,"tnr.create":true,"tnr.update":true,"tnr.delete":false,"foster.read":true,"foster.create":true,"foster.update":true,"foster.delete":false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_users (id, name, pin_code, role_id, is_root) VALUES
('usr_root', 'Root Adminisztrátor', '1342', 'ROOT', true)
ON CONFLICT (id) DO NOTHING;`;

                      navigator.clipboard.writeText(sqlScript);
                      setSqlCopied(true);
                      setTimeout(() => setSqlCopied(false), 3000);
                    }}
                    className={`px-3 py-1.5 font-extrabold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                      sqlCopied
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                  >
                    {sqlCopied ? '✅ SQL Másolva!' : '📋 SQL Másolása Vágólapra'}
                  </button>
                </div>

                <div className="p-2.5 bg-black/90 rounded-lg text-emerald-400 font-mono text-[10px] max-h-56 overflow-y-auto border border-slate-800">
                  <pre className="whitespace-pre-wrap break-all leading-tight">
{`-- SUPABASE / POSTGRESQL RLS (ROW LEVEL SECURITY)
-- Másold ki és illeszd be a Supabase SQL Editorba:

ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tnr_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_user_permission(p_permission TEXT)
RETURNS BOOLEAN AS $$
...
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES FOR ANIMAL, HEALTH, TNR, USERS
CREATE POLICY "cats_select_policy" ON cats FOR SELECT USING (check_user_permission('animal.read'));
CREATE POLICY "cats_insert_policy" ON cats FOR INSERT WITH CHECK (check_user_permission('animal.create'));
CREATE POLICY "cats_update_policy" ON cats FOR UPDATE USING (check_user_permission('animal.update'));
CREATE POLICY "cats_delete_policy" ON cats FOR DELETE USING (check_user_permission('animal.delete'));
...`}
                  </pre>
                </div>
              </div>

              {/* Table Schema Breakdown */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px]">
                  🗄️ Nyilvántartó Adattáblák & Indexelt Mezők
                </h4>

                <div className="grid grid-cols-1 gap-2 font-mono text-[11px]">
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 space-y-1">
                    <div className="flex items-center justify-between text-pink-400 font-bold">
                      <span>TABLE: cats</span>
                      <span className="bg-pink-950 text-pink-300 px-2 py-0.5 rounded-full text-[10px]">
                        {counts.cats} rekord
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed break-all">
                      PRIMARY & INDEXES: id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType, hasKiskonyv, chipNumber, chipDate, chipLocation, isSpayed
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 space-y-1">
                    <div className="flex items-center justify-between text-purple-400 font-bold">
                      <span>TABLE: events</span>
                      <span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full text-[10px]">
                        {counts.events} rekord
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed break-all">
                      PRIMARY & INDEXES: ++id, catId, type, date, status, createdAt
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800 text-slate-200 rounded-xl border border-slate-700 space-y-1">
                    <div className="flex items-center justify-between text-blue-400 font-bold">
                      <span>TABLES: oltások, tesztek, kezelesek, meta, settings</span>
                      <span className="text-slate-400 text-[10px]">Al-táblák</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Összekapcsolt kiskönyv és beállítás táblák.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Raw Inspector */}
          {activeTab === 'inspector' && isRootMode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700 text-xs">Tábla:</span>
                  <div className="w-48">
                    <CustomSelect
                      value={inspectorTable}
                      onChange={(val) => setInspectorTable(val as any)}
                      options={[
                        { value: 'cats', label: `cats (${counts.cats} db)`, icon: '🐱' },
                        { value: 'events', label: `events (${counts.events} db)`, icon: '📅' },
                      ]}
                      title="Tábla Kiválasztása"
                      colorScheme="slate"
                      buttonClassName="p-1.5 bg-gray-100 border border-gray-300 rounded-xl font-bold text-gray-900 text-xs"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Keresés nyers JSON-ben..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="p-1.5 bg-gray-50 border border-gray-300 rounded-xl w-48 font-mono text-[11px]"
                />
              </div>

              <div className="p-3 bg-slate-950 text-green-400 font-mono text-[10px] rounded-xl max-h-72 overflow-y-auto border border-slate-800 space-y-2">
                <div className="text-slate-400 border-b border-slate-800 pb-1 flex justify-between">
                  <span>// Raw JSON Output ({filteredRawRecords.length} találat)</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(filteredRawRecords, null, 2))}
                    className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                  >
                    📋 Másolás
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-all leading-tight">
                  {JSON.stringify(filteredRawRecords, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: Tuning & Test Seed */}
          {activeTab === 'tuning' && isRootMode && (
            <div className="space-y-3">
              {/* Audit & Repair */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <h4 className="font-extrabold text-amber-900 text-[11px] flex items-center gap-1.5">
                  🔧 Adatbázis Audit & Mező Helyreállítás
                </h4>
                <p className="text-[10px] text-gray-600">
                  Automatikusan pótolja az esetlegesen hiányzó mezőket (pl. chip, oltási lista, ivartalanítás státusz).
                </p>
                <button
                  onClick={handleRunRepair}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  🔍 Audit & Javítás Futtatása
                </button>

                {repairLogs.length > 0 && (
                  <div className="p-2.5 bg-slate-900 text-green-400 font-mono text-[10px] rounded-xl space-y-1 max-h-28 overflow-y-auto">
                    {repairLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seed Generator */}
              <div className="p-3.5 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border border-purple-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-extrabold text-purple-950 text-xs flex items-center gap-1.5">
                    <span>🧪 Minta Adat Generátor (Tesztadatok & Terhelésteszt)</span>
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                    <span className="bg-purple-100 text-purple-900 font-extrabold px-2 py-0.5 rounded-full border border-purple-300">
                      🐱 {counts.cats} Cica
                    </span>
                    <span className="bg-pink-100 text-pink-900 font-extrabold px-2 py-0.5 rounded-full border border-pink-300">
                      📅 {counts.events} Esemény
                    </span>
                    <span className="bg-rose-100 text-rose-900 font-extrabold px-2 py-0.5 rounded-full border border-rose-300">
                      ✂️ {counts.tnr} TNR
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  Generálj valósághű teszt macskákat, naptári kezelési eseményeket és TNR ivartalanítási akciókat a felület és a funkciók teszteléséhez.
                </p>

                {/* Feedback Toast Banner */}
                {seedFeedbackMessage && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-2xs border transition-all ${
                    seedFeedbackMessage.includes('❌') 
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : seedFeedbackMessage.includes('SIKER') 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                        : 'bg-purple-100 border-purple-300 text-purple-950 animate-pulse'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {(isGeneratingCats || isGeneratingEvents || isGeneratingTnr) && (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                      <span className="truncate">{seedFeedbackMessage}</span>
                    </div>
                    <button
                      onClick={() => setSeedFeedbackMessage(null)}
                      className="text-gray-500 hover:text-gray-800 font-black px-1.5 py-0.5 rounded shrink-0 cursor-pointer text-xs"
                      title="Visszajelzés bezárása"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Test Cats Generator */}
                  <div className="p-2.5 bg-white rounded-xl border border-purple-200 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-black text-purple-900 flex items-center gap-1">
                        <span>🐱 Teszt Állatok Felvitele</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Generálj új teszt macska profilokat chippel és oltási előzménnyel.
                      </p>
                    </div>
                    <div className="flex gap-1.5 pt-2">
                      <button
                        disabled={isGeneratingCats || isGeneratingEvents || isGeneratingTnr}
                        onClick={() => handleGenerateTestData(5)}
                        className="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        {isGeneratingCats ? (
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>+5 Cica</span>
                        )}
                      </button>
                      <button
                        disabled={isGeneratingCats || isGeneratingEvents || isGeneratingTnr}
                        onClick={() => handleGenerateTestData(25)}
                        className="flex-1 py-1.5 px-2 bg-purple-800 hover:bg-purple-900 disabled:opacity-50 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        {isGeneratingCats ? (
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>+25 Cica</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Test Events Generator */}
                  <div className="p-2.5 bg-white rounded-xl border border-pink-200 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-black text-pink-900 flex items-center gap-1">
                        <span>📅 Teszt Naptári Események</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Generálj oltás, orvosi kezelés, műtét és szűrés eseményeket.
                      </p>
                    </div>
                    <div className="flex gap-1.5 pt-2">
                      <button
                        disabled={isGeneratingCats || isGeneratingEvents || isGeneratingTnr}
                        onClick={() => handleGenerateTestEvents(5)}
                        className="flex-1 py-1.5 px-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        {isGeneratingEvents ? (
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>+5 Esemény</span>
                        )}
                      </button>
                      <button
                        disabled={isGeneratingCats || isGeneratingEvents || isGeneratingTnr}
                        onClick={() => handleGenerateTestEvents(15)}
                        className="flex-1 py-1.5 px-2 bg-pink-800 hover:bg-pink-900 disabled:opacity-50 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        {isGeneratingEvents ? (
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>+15 Esemény</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Test TNR Generator */}
                  <div className="p-2.5 bg-white rounded-xl border border-rose-200 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-black text-rose-900 flex items-center gap-1">
                        <span>✂️ Teszt TNR Akciók Felvitele</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Generálj teszt TNR (befogás, műtét, elengedés) akció rekordokat.
                      </p>
                    </div>
                    <div className="flex gap-1.5 pt-2">
                      <button
                        disabled={isGeneratingCats || isGeneratingEvents || isGeneratingTnr}
                        onClick={() => handleGenerateTestTnr(5)}
                        className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        {isGeneratingTnr ? (
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>+5 TNR</span>
                        )}
                      </button>
                      <button
                        disabled={isGeneratingCats || isGeneratingEvents || isGeneratingTnr}
                        onClick={() => handleGenerateTestTnr(15)}
                        className="flex-1 py-1.5 px-2 bg-rose-800 hover:bg-rose-900 disabled:opacity-50 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        {isGeneratingTnr ? (
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>+15 TNR</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Import Restore */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <h4 className="font-extrabold text-blue-900 text-[11px]">📤 Mentés Betöltése (JSON Restore)</h4>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="block w-full text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              {/* Emergency Clear */}
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-red-900 text-[11px]">🚨 Adatbázis Teljes Törlése</h4>
                  <p className="text-[10px] text-red-700">Törli az összes cicát és eseményt az IndexedDB-ből.</p>
                </div>
                <button
                  onClick={handleClearAll}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl transition shrink-0 shadow-xs cursor-pointer"
                >
                  Törlés
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>

      {/* Clear All Data Confirm Modal */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-center border border-red-200">
            <span className="text-4xl">🚨</span>
            <h4 className="font-black text-red-600 text-sm">Adatbázis Teljes Törlése</h4>
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              Biztosan törölni szeretnéd az <span className="font-bold underline text-red-600">ÖSSZES</span> cicát és eseményt? Ez a művelet nem vonható vissza!
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer border border-gray-300"
              >
                Mégse
              </button>
              <button
                onClick={confirmClearAll}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md"
              >
                Igen, törlés
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Backup Diff Validation Modal for JSON File Import */}
      {pendingImportBackup && (
        <BackupDiffValidationModal
          backupData={pendingImportBackup.backupData}
          backupTitle={`Helyi Fájl Import: ${pendingImportBackup.fileName}`}
          backupDate={pendingImportBackup.backupData.backupMetadata?.exportDate}
          syncToSupabase={false}
          onConfirm={handleConfirmImportRestore}
          onCancel={() => setPendingImportBackup(null)}
          isRestoring={isImportRestoring}
        />
      )}
    </div>
  );
};
