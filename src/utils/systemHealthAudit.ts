import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';
import { getLicenseStatus } from '../services/licenseService';
import { APP_VERSION } from '../version';

export interface AuditCheckResult {
  id: string;
  category: 'env' | 'db' | 'store' | 'sw' | 'license' | 'cloud' | 'storage';
  categoryLabel: string;
  title: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  details?: any;
}

export interface SystemAuditReport {
  timestamp: string;
  appVersion: string;
  summary: {
    total: number;
    ok: number;
    warn: number;
    error: number;
  };
  results: AuditCheckResult[];
}

export async function runSystemHealthAudit(): Promise<SystemAuditReport> {
  const results: AuditCheckResult[] = [];

  // 1) App / Environment Checks
  try {
    results.push({
      id: 'env_app_version',
      category: 'env',
      categoryLabel: 'Környezet & Rendszer',
      title: 'Alkalmazás verzió (APP_VERSION)',
      status: 'ok',
      message: `Telepített verzió: v${APP_VERSION}`,
      details: { version: APP_VERSION },
    });
  } catch (err: any) {
    results.push({
      id: 'env_app_version',
      category: 'env',
      categoryLabel: 'Környezet & Rendszer',
      title: 'Alkalmazás verzió (APP_VERSION)',
      status: 'error',
      message: `Verziószám nem olvasható: ${err?.message || err}`,
    });
  }

  // Network Online Status
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  results.push({
    id: 'env_online_status',
    category: 'env',
    categoryLabel: 'Környezet & Rendszer',
    title: 'Hálózati kapcsolat állapota',
    status: isOnline ? 'ok' : 'warn',
    message: isOnline ? '🌐 Online (Hálózati kapcsolat aktív)' : '🔌 Offline (Munkamenet offline módban)',
    details: { online: isOnline },
  });

  // LocalStorage check
  try {
    const testKey = '__audit_ls_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    results.push({
      id: 'env_localstorage',
      category: 'env',
      categoryLabel: 'Környezet & Rendszer',
      title: 'Helyi Tárhely (localStorage)',
      status: 'ok',
      message: 'Helyi böngésző tárhely (localStorage) megfelelően működik.',
    });
  } catch (err: any) {
    results.push({
      id: 'env_localstorage',
      category: 'env',
      categoryLabel: 'Környezet & Rendszer',
      title: 'Helyi Tárhely (localStorage)',
      status: 'error',
      message: `localStorage nem elérhető vagy tiltva van: ${err?.message || err}`,
    });
  }

  // IndexedDB check
  const hasIDB = typeof window !== 'undefined' && ('indexedDB' in window || (db && db.isOpen()));
  results.push({
    id: 'env_indexeddb',
    category: 'env',
    categoryLabel: 'Környezet & Rendszer',
    title: 'IndexedDB Böngésző Adatbázis',
    status: hasIDB ? 'ok' : 'error',
    message: hasIDB ? 'IndexedDB API elérhető a böngészőben.' : 'IndexedDB API nem található!',
  });

  // 2) Dexie / Database Checks
  try {
    if (!db.isOpen()) {
      await db.open();
    }
    const schemaVer = db.verno;
    results.push({
      id: 'db_connection',
      category: 'db',
      categoryLabel: 'Adatbázis (Dexie)',
      title: 'Adatbázis kapcsolat & séma',
      status: 'ok',
      message: `Dexie adatbázis sikeresen megnyitva. Aktív séma verzió: v${schemaVer}`,
      details: { dbName: db.name, schemaVersion: schemaVer },
    });

    // Table List & Row Counts
    const targetTables = [
      'cats',
      'events',
      'tnr',
      'fosterParents',
      'fosterSupplies',
      'fosterExpenses',
      'inventory',
      'finances',
      'donationCampaigns',
      'donationCampaignItems',
      'cat_weights',
      'autoBackups',
    ];

    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const tableName of targetTables) {
      try {
        if ((db as any)[tableName]) {
          const count = await (db as any)[tableName].count();
          tableCounts[tableName] = count;
          totalRecords += count;
        } else if (db.table(tableName)) {
          const count = await db.table(tableName).count();
          tableCounts[tableName] = count;
          totalRecords += count;
        }
      } catch {
        // gracefully skip missing table
      }
    }

    results.push({
      id: 'db_tables_summary',
      category: 'db',
      categoryLabel: 'Adatbázis (Dexie)',
      title: 'Adattáblák & Rekordszámok',
      status: 'ok',
      message: `Összesen ${totalRecords} rekord ${Object.keys(tableCounts).length} táblában.`,
      details: tableCounts,
    });

    // Data Integrity Sample Checks
    const cats = await db.cats.toArray();
    const invalidCats = cats.filter((c) => !c.id || !c.nev || c.nev.trim() === '');

    if (invalidCats.length > 0) {
      results.push({
        id: 'db_integrity_cats',
        category: 'db',
        categoryLabel: 'Adatbázis (Dexie)',
        title: 'Állatok (cats) rekord integritás',
        status: 'warn',
        message: `⚠️ ${invalidCats.length} cica rekord hiányos névvel vagy azonosítóval rendelkező adatokkal!`,
        details: invalidCats.map((c) => ({ id: c.id, sorszam: c.sorszam, nev: c.nev })),
      });
    } else {
      results.push({
        id: 'db_integrity_cats',
        category: 'db',
        categoryLabel: 'Adatbázis (Dexie)',
        title: 'Állatok (cats) rekord integritás',
        status: 'ok',
        message: `Minden cica rekord (${cats.length} db) érvényes azonosítóval és névvel rendelkezik.`,
      });
    }

    // Finances Integrity Check
    try {
      const finances = await db.table('finances').toArray();
      const invalidFinances = finances.filter((f: any) => f.amount === undefined || f.amount === null || isNaN(Number(f.amount)));
      if (invalidFinances.length > 0) {
        results.push({
          id: 'db_integrity_finances',
          category: 'db',
          categoryLabel: 'Adatbázis (Dexie)',
          title: 'Pénzügyi tételek integritása',
          status: 'warn',
          message: `⚠️ ${invalidFinances.length} pénzügyi tétel érvénytelen összeget tartalmaz!`,
          details: invalidFinances.map((f: any) => ({ id: f.id, category: f.category, amount: f.amount })),
        });
      } else {
        results.push({
          id: 'db_integrity_finances',
          category: 'db',
          categoryLabel: 'Adatbázis (Dexie)',
          title: 'Pénzügyi tételek integritása',
          status: 'ok',
          message: `Minden pénzügyi tétel (${finances.length} db) érvényes összeggel bír.`,
        });
      }
    } catch {
      // Table might not exist yet
    }

    // Orphan Event check
    try {
      const events = await db.events.toArray();
      const catIdSet = new Set(cats.map((c) => c.id));
      const orphanEvents = events.filter((e) => e.catId && e.catId !== 'general' && e.catId !== 'system' && !catIdSet.has(e.catId));

      if (orphanEvents.length > 0) {
        results.push({
          id: 'db_integrity_orphans',
          category: 'db',
          categoryLabel: 'Adatbázis (Dexie)',
          title: 'Árva naptári események (catId referencia)',
          status: 'warn',
          message: `⚠️ ${orphanEvents.length} esemény olyan cica azonosítóra (catId) hivatkozik, ami már nem létezik!`,
          details: orphanEvents.slice(0, 10).map((e) => ({ id: e.id, title: e.title, catId: e.catId })),
        });
      } else {
        results.push({
          id: 'db_integrity_orphans',
          category: 'db',
          categoryLabel: 'Adatbázis (Dexie)',
          title: 'Árva naptári események (catId referencia)',
          status: 'ok',
          message: `Nincsenek törölt cicához kapcsolódó árva események (Összesen: ${events.length} esemény).`,
        });
      }
    } catch {
      // ignore if events table fails
    }

    // Pending Sync Status
    const syncPendingCounts: Record<string, number> = {};
    const syncCheckTables = ['cats', 'inventory', 'donationCampaigns'];
    for (const tName of syncCheckTables) {
      try {
        const tbl = db.table(tName);
        if (tbl) {
          const pending = await tbl.where('syncStatus').equals('pending').count();
          if (pending > 0) syncPendingCounts[tName] = pending;
        }
      } catch {
        // fallback search if index missing
      }
    }

    const pendingTotal = Object.values(syncPendingCounts).reduce((a, b) => a + b, 0);
    results.push({
      id: 'db_sync_pending',
      category: 'db',
      categoryLabel: 'Adatbázis (Dexie)',
      title: 'Függőben lévő felhő szinkronizációk (pending syncStatus)',
      status: pendingTotal > 0 ? 'warn' : 'ok',
      message: pendingTotal > 0
        ? `⚠️ ${pendingTotal} rekord várakozik Supabase szinkronizációra.`
        : 'Minden szinkronizálható rekord naprakész.',
      details: syncPendingCounts,
    });

  } catch (err: any) {
    results.push({
      id: 'db_connection',
      category: 'db',
      categoryLabel: 'Adatbázis (Dexie)',
      title: 'Adatbázis hiba',
      status: 'error',
      message: `Nem sikerült kapcsolódni a Dexie adatbázishoz: ${err?.message || err}`,
    });
  }

  // 3) Zustand / App Store Checks
  try {
    const storeState = useAppStore.getState();
    const criticalFieldsPresent =
      typeof storeState.theme === 'string' &&
      typeof storeState.orgName === 'string' &&
      typeof storeState.orgRole === 'string';

    results.push({
      id: 'store_zustand',
      category: 'store',
      categoryLabel: 'Alkalmazás Állapot (Zustand)',
      title: 'Zustand állapottár (App Store)',
      status: criticalFieldsPresent ? 'ok' : 'warn',
      message: criticalFieldsPresent
        ? `Zustand tároló elérhető. Szervezet: "${storeState.orgName}", Szerepkör: ${storeState.orgRole}, Téma: ${storeState.theme}`
        : 'Zustand állapottár olvasható, de egyes kritikus mezők hiányoznak.',
      details: {
        theme: storeState.theme,
        orgName: storeState.orgName,
        orgRole: storeState.orgRole,
        isRootMode: storeState.isRootMode,
        activeTab: storeState.activeTab,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'store_zustand',
      category: 'store',
      categoryLabel: 'Alkalmazás Állapot (Zustand)',
      title: 'Zustand állapottár (App Store)',
      status: 'error',
      message: `Hiba a Zustand tároló beolvasásakor: ${err?.message || err}`,
    });
  }

  // 4) Service Worker / PWA Checks
  try {
    const swSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    let controllerActive = false;
    let regScope = '-';
    let cacheKeys: string[] = [];

    if (swSupported) {
      controllerActive = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        regScope = reg.scope;
      }
    }

    if (typeof caches !== 'undefined') {
      try {
        cacheKeys = await caches.keys();
      } catch {
        // ignore
      }
    }

    // Try fetching version.json
    let versionMatch: boolean | null = null;
    let remoteVersion = '-';
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`);
      if (res.ok) {
        const vData = await res.json();
        remoteVersion = vData.version || '-';
        versionMatch = remoteVersion === APP_VERSION;
      }
    } catch {
      // offline or unreachable
    }

    results.push({
      id: 'sw_pwa_status',
      category: 'sw',
      categoryLabel: 'Service Worker & PWA',
      title: 'Service Worker & Gyorsítótár (Cache API)',
      status: swSupported && controllerActive ? 'ok' : 'warn',
      message: !swSupported
        ? 'A böngésző nem támogatja a Service Worker technológiát.'
        : controllerActive
        ? `Service Worker aktív és vezérli az oldalt. Gyorsítótárak: ${cacheKeys.length} db.`
        : 'Service Worker regisztrálva van, de még nem aktív a böngésző lap felett.',
      details: {
        supported: swSupported,
        controllerActive,
        scope: regScope,
        caches: cacheKeys,
        remoteVersion,
        versionMatch,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'sw_pwa_status',
      category: 'sw',
      categoryLabel: 'Service Worker & PWA',
      title: 'Service Worker & Gyorsítótár (Cache API)',
      status: 'warn',
      message: `Service Worker státusz ellenőrzési hiba: ${err?.message || err}`,
    });
  }

  // 5) License Status Check
  try {
    const licStatus = getLicenseStatus();
    const isLocked = licStatus.status === 'locked';
    const isGrace = licStatus.status === 'grace';

    results.push({
      id: 'license_status',
      category: 'license',
      categoryLabel: 'Licenc & Előfizetés',
      title: 'Licenc érvényességi ellenőrzés',
      status: isLocked ? 'error' : isGrace ? 'warn' : 'ok',
      message: isLocked
        ? '🚫 Licenc zárolva (soft-lock aktív, új adatok mentése tiltott).'
        : isGrace
        ? '⚠️ Licenc türelmi időszakban van.'
        : `✅ Érvényes licenc. Csomag: ${licStatus.tier || 'Standard'}`,
      details: {
        status: licStatus.status,
        tier: licStatus.tier,
        daysRemaining: licStatus.daysRemaining,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'license_status',
      category: 'license',
      categoryLabel: 'Licenc & Előfizetés',
      title: 'Licenc érvényességi ellenőrzés',
      status: 'error',
      message: `Hiba a licenc státusz ellenőrzésekor: ${err?.message || err}`,
    });
  }

  // 6) Sync / Cloud Configuration Checks
  const supUrl = localStorage.getItem('supabase_url');
  const supKey = localStorage.getItem('supabase_anon_key');
  const gdriveTokens = localStorage.getItem('gdrive_access_token') || localStorage.getItem('google_drive_tokens');

  results.push({
    id: 'cloud_config_supabase',
    category: 'cloud',
    categoryLabel: 'Felhő & Szinkron Integráció',
    title: 'Supabase Cloud kapcsolat beállítások',
    status: supUrl && supKey ? 'ok' : 'warn',
    message: supUrl && supKey
      ? 'Supabase URL és Anon Key konfigurálva van a helyi tárhelyen.'
      : 'Supabase felhő beállítások nincsenek megadva (offline / helyi mód).',
    details: {
      hasUrl: !!supUrl,
      hasKey: !!supKey,
    },
  });

  results.push({
    id: 'cloud_config_gdrive',
    category: 'cloud',
    categoryLabel: 'Felhő & Szinkron Integráció',
    title: 'Google Drive mentési felület',
    status: gdriveTokens ? 'ok' : 'warn',
    message: gdriveTokens
      ? 'Google Drive fiók csatlakoztatva van (működő token elmentve).'
      : 'Google Drive nincs csatlakoztatva.',
  });

  // 7) Storage Estimate Check
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2);
      const percent = estimate.quota ? Math.round(((estimate.usage || 0) / estimate.quota) * 100) : 0;

      results.push({
        id: 'storage_estimate',
        category: 'storage',
        categoryLabel: 'Böngésző Tárhely (Storage)',
        title: 'Tárhely használat és kvóta (Storage Estimate)',
        status: percent > 85 ? 'warn' : 'ok',
        message: `Használt: ${usedMB} MB / Keret: ${quotaMB} MB (${percent}%)`,
        details: { usedMB, quotaMB, percent },
      });
    } catch {
      // skip
    }
  }

  // Aggregate Summary
  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    warn: results.filter((r) => r.status === 'warn').length,
    error: results.filter((r) => r.status === 'error').length,
  };

  return {
    timestamp: new Date().toISOString(),
    appVersion: APP_VERSION,
    summary,
    results,
  };
}
