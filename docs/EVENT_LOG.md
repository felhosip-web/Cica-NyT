# 📜 Cica-NyT – Strukturált Eseménynapló & Audit Rendszer (docs/EVENT_LOG.md)

## 📌 Áttekintés

A **Cica-NyT v2.31.0** rendszerbe integrált strukturált Eseménynapló (Audit Event Log) célja a nyilvántartó alkalmazásban történő kritikus műveletek, biztonsági események, adatváltozások, exportálások, felhő szinkronizációk és rendszerhibák tartós, reaktív és visszakövethető naplózása.

A naplózott események **kizárólag ROOT (Főadminisztrátor)** szerepkörrel rendelkező felhasználók számára érhetők el a Beállítások felületén ("Eseménynapló" fül).

---

## 🗄️ Adatmodell (Dexie & PostgreSQL)

A naplóbejegyzések helyi IndexedDB adatbázisban a `audit_events` táblában (Séma verzió: v18), Supabase felhő környezetben pedig a `public.audit_events` táblában tárolódnak.

### Rekord Struktúra

```typescript
export type AuditEventLevel = 'info' | 'warn' | 'error';

export type AuditEventCategory =
  | 'auth'      // Belépés, kilépés, profilváltás, munkamenetek
  | 'rbac'      // Jogosultság megtagadás, szerepkör / felhasználó módosítás
  | 'license'   // Licenc elfogadás, soft-lock írásvédelem aktiválódás
  | 'cat'       // Cica felvétel, módosítás, törlés, örökbefogadás
  | 'finance'   // Pénzügyi tétel rögzítés, stornózás, törlés
  | 'inventory' // Raktárkészlet műveletek
  | 'donation'  // Adománygyűjtő akciók
  | 'export'    // PDF, ODS, ODT, CSV exportálási akciók
  | 'sync'      // Supabase / Drive szinkronizációs események
  | 'system'    // Alkalmazás indítás, Service Worker frissítés, unhandled hibák
  | 'ui';       // Kezelőfelületi kiemelt beállítások

export interface AuditEvent {
  id: string;            // UUID / egyedi azonosító
  ts: string;            // ISO 8601 időbélyeg (pl. 2026-10-08T14:30:00.000Z)
  level: AuditEventLevel;// 'info' | 'warn' | 'error'
  category: AuditEventCategory;
  action: string;        // Pontos akcióazonosító (pl. cat.create, finance.storno, export.ods, sync.fail)
  userId?: string;       // Műveletet végző felhasználó ID-ja
  userName?: string;     // Műveletet végző felhasználó neve
  role?: string;         // Felhasználói szerepkör
  entityType?: string;   // Érintett tábla / modul (pl. cats, finances)
  entityId?: string;     // Érintett rekord ID-ja
  summary: string;       // Rövid, emberileg olvasható magyar összefoglaló
  details?: object;      // Strukturált JSON részletek (szigorúan redaktálva)
  ok: boolean;           // Sikerült-e a művelet (true / false)
  errorMessage?: string; // Hibaüzenet sikertelenség esetén
  appVersion?: string;   // Alkalmazás verziója (pl. 2.31.0)
}
```

---

## 🔒 Biztonság, Hozzáférés-kezelés & Adatvédelem

### 1. Root-Only Hozzáférés
- Az Eseménynapló menüpont és felület **kizárólag `roleId === 'root'`** felhasználóknak jelenik meg.
- Nem-root felhasználók elől a menüpont teljesen rejtett. Ha egy nem-root felhasználó közvetlenül vagy kódalapon próbálná megnyitni a nézetet, a rendszer blokkolja a hozzáférést, és automatikusan rögzít egy `rbac.denied` figyelmeztető eseményt.

### 2. Érzékeny Adatok Automatikus Redaktálása (Redaction Rules)
A `logEvent()` API automatikusan szűri és maszkolja a beküldött `details` objektumokat:
- **Jelszavak, PIN kódok, tokenek, titkos kulcsok**: Replaced with `'[REDACTED]'`.
- **Nagy méretű képek / Bináris adatok / Base64 fotó adatok**: Replaced with `'[TRUNCATED_BINARY_DATA]'`.

---

## ⏱️ Adatmegőrzési és Karbantartási Szabályzat (Retention Policy)

Az adatbázis korlátlan növekedésének és az offline tárhely túlterhelésének megelőzésére a rendszer automatikus és kézi karbantartást biztosít:
- **Maximális darabszám**: Legfeljebb **5000 legfrissebb esemény** tárolása.
- **Maximális megőrzési idő**: Legfeljebb **90 napos** események megőrzése.
- **Automatikus Pruning**: Minden új `logEvent()` híváskor a rendszer aszinkron észrevétlenül eltávolítja a 90 napnál régebbi vagy 5000 feletti rekordokat.
- **Kézi Kiürítés**: Root felhasználó a felületről egy kattintással indíthat karbantartást vagy teljes kiürítést (a kiürítés maga is bejegyzésre kerül az audit naplóba).

---

## 🚀 Használati Útmutató Fejlesztőknek & Munkatársaknak

### Központi API hívás (`src/utils/eventLog.ts`)

```typescript
import { logEvent, logError, withErrorHandling } from '../utils/eventLog';

// Standard esemény rögzítése
await logEvent({
  category: 'cat',
  action: 'cat.create',
  entityType: 'cats',
  entityId: newCat.id,
  summary: `Új cica regisztrálva: ${newCat.nev}`,
  details: { status: newCat.status, chipNumber: newCat.chipNumber },
});

// Hiba rögzítése
await logError('sync.fail', err, {
  category: 'sync',
  summary: 'Munkamenet szinkronizálása meghiúsult',
});

// Aszinkron művelet automatikus hibakezeléssel és magyar visszajelzéssel
await withErrorHandling(
  'finance.storno',
  async () => {
    await db.finances.update(id, { status: 'storno' });
  },
  'Hiba történt a pénzügyi tétel stornózása során'
);
```
