# Cica-NyT Hibakezelési Architektúra (Error Handling Architecture)

A Cica-NyT alkalmazás több rétegű, egységesített hibakezelési és diagnosztikai rendszert alkalmaz az offline-first architektúra stabilitásának biztosítására.

---

## 🏗️ 1. Hibakezelési Rétegek (Layers)

| Réteg | Komponens / Utility | Szerep & Használat |
| :--- | :--- | :--- |
| **1. UI Visszajelzés (Toast & Banner)** | `useToastStore`, `ToastContainer`, `OfflineBanner` | Nem tolakodó, animált magyar nyelvű felületi értesítések (`showError`, `showSuccess`, `showWarning`, `showInfo`). Kiváltja a nyers `alert()` felugró ablakokat. |
| **2. React Error Boundary** | `ErrorBoundary.tsx` | Elkapja a React komponensfagymásokat a nézetekben és modálokban. Barátságos magyar fallback UI-t jelenít meg ("Váratlan hiba történt"), megelőzve az egész PWA alkalmazás összeomlását (fehér képernyő). |
| **3. Aszinkron Művelet Wrapper** | `withErrorHandling()` | Automatikusan naplózza a hibát az Audit Event Log-ba (`logError`), és felhasználói hibaértesítést jelenít meg Toast-on keresztül. Mindig `null`-t ad vissza hiba esetén (nem dob kivételt). |
| **4. Strukturált Audit Eseménynapló** | `logEvent()`, `logError()`, `db.audit_events` | Perzisztens IndexedDB és Supabase audit napló. Rögzíti az esemény kategóriáját, akciót, felhasználót, verziót és redaktált JSON részleteket. |

---

## 🛠️ 2. Használati Útmutató (When to use what)

### A) Felhasználó-irányított akciók mentése / törlése:
Használd a `withErrorHandling` függvényt vagy manuális `try / catch` blokkot `showSuccess` és `showError` hívásokkal:

```ts
import { logEvent, logError } from '../utils/eventLog';
import { showSuccess, showError } from '../store/useToastStore';

try {
  await db.cats.put(catData);
  logEvent({
    category: 'cat',
    action: 'cat.create',
    summary: `Új cica profil rögzítve: ${catData.nev}`,
  });
  showSuccess('Cica profil sikeresen elmentve.');
} catch (err: any) {
  logError('cat.create', err, { category: 'cat' });
  showError('Hiba történt a cica mentésekor.', { details: err.message });
}
```

### B) Aszinkron függvények elfedése:
```ts
import { withErrorHandling } from '../utils/eventLog';

const result = await withErrorHandling(
  'inventory.convert',
  async () => {
    // Érdemi aszinkron művelet
  },
  'Hiba történt a készlet konvertálása során'
);
```

### C) Komponensek és Nézetek védelme:
Minden fontosabb nézet és modál elrendezés `ErrorBoundary` komponenssel van körbevéve:

```tsx
<ErrorBoundary sectionName="Pénzügyek nézet">
  <FinanceView />
</ErrorBoundary>
```

---

## 🔌 3. Offline & Hálózati Kapcsolat Kezelése

- **Offline Banner (`OfflineBanner.tsx`)**: Automatikusan érzékeli a `navigator.onLine` státuszt és a `window` `online`/`offline` eseményeit. Offline módban lágy figyelmeztető sáv jelenik meg: *"Nincs hálózati kapcsolat — helyi adat továbbra is használható!"*.
- **Offline Dexie CRUD**: A helyi adatbázis műveletek offline módban korlátozás nélkül működnek tovább (`syncStatus: 'pending'`).
- **Szinkronizációs Hibaüzenetek**: A felhő szinkronizációs hibák `sync.fail` eseményként kerülnek az audit naplóba, miközben toast értesíti a felhasználót.

---

## 🛡️ 4. Root Eseménynapló & Hibaszűrés

- Kizárólag **ROOT** szerepkörű felhasználók érik el az Eseménynaplót (`EventLogSection`).
- A főadminisztrátor a **"Csak hibák"** gyors gombbal azonnal kiszűrheti az `error` szintű eseményeket.
- A **"Utolsó Hibák (Quick View)"** csík a legutóbbi 5 hibát emeli ki az eseménynapló tetején.
