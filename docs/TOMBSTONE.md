# Cica-NyT Tombstone (Lágy Törlés / Soft-Delete) Rendszer

## 1. Áttekintés (Rationale)

A Cica-NyT egy **offline-first** architektúrájú alkalmazás, amely a helyi **Dexie IndexedDB** adatbázist használja elsődleges adattárként, és a beállításoktól függően élőben szinkronizál a **Supabase** felhővel (`SyncService`).

A korábbi fizikai törlési modell (`db.table.delete()`) többeszközös (multi-device) szinkronizáció esetén azzal a kockázattal járt, hogy az egyik eszközön törölt rekord egy másik eszközön még aktív maradt, majd a következő lekérésnél (`pullRemote`) "zombi rekordként" feltámadt.

A v2.34.0-s verziótól kezdve a Cica-NyT egy **pragmatikus tombstone (soft-delete)** rendszert alkalmaz:
1. Felhasználói törlés esetén a rekord nem törlődik fizikailag, hanem kap egy `deletedAt` és `deletedBy` jelölőt.
2. A törlési szándék bekerül a szinkronizációs sorba (`syncStatus = 'pending'`), így feltöltődik a Supabase felhőbe.
3. Az UI lekérdezések, statisztikák és riportok alapértelmezetten kiszűrik a `deletedAt != null` rekordokat.
4. Fizikai törlés kizárólag a **Root karbantartási felületen (Purge)** végezhető el.

---

## 2. Adatmodell & Mezők

Minden kritikus entitás tábla (`cats`, `finances`, `inventory`, `fosterParents`, `fosterSupplies`, `fosterExpenses`, `donationCampaigns`, `donationCampaignItems`, `events`, `tnr`) kiegészült az alábbi mezőkkel:

| Mező | Típus | Leírás |
|---|---|---|
| `deletedAt` | `string \| null` | ISO 8601 időbélyeg (pl. `2025-05-10T12:00:00.000Z`). Ha `null` vagy hiányzik, az elem **aktív**. |
| `deletedBy` | `string \| null` | A törlést végző felhasználó neve vagy azonosítója. |

### Dexie Indexelési Séma (v19)
A `src/lib/db.ts` adatbázis v19-es verziójában a `deletedAt` mező indexelve van a gyors szűrés érdekében.

### Supabase DDL
A `generateFullSupabaseSchemaSql()` függvényben a táblák tartalmazzák a `deleted_at TIMESTAMPTZ DEFAULT NULL` és `deleted_by TEXT DEFAULT NULL` oszlopokat, valamint a kapcsolódó indexeket (`idx_*_deleted_at`).

---

## 3. Központi Soft-Delete API & Kaszkádosítás (Cascade Map)

A törlési műveleteket a `src/utils/softDelete.ts` fájlban található `softDelete(tableName, id, user)` függvény kezeli.

### Kaszkádosítási Szabályok:
| Törölt Szülő Entitás | Kaszkádosan Lágyan Törölt Gyerek Entitások |
|---|---|
| `cats` (Cica) | Kapcsolódó egészségügyi események (`events`) és súlymérések (`cat_weights`) |
| `donationCampaigns` (Adománygyűjtő Akció) | Kapcsolódó adomány tételek (`donationCampaignItems`) |
| `fosterParents` (Befogadó) | Befogadó profil megjelölése (a kapcsolódó ellátmányok/kiadások megőrzik a hivatkozást, de szűrve vannak) |

---

## 4. Szinkronizációs Konfliktuskezelés (Sync Rules)

### Feltöltés (Push / `syncPending`):
- A `syncPending()` függvény elküldi a függőben lévő (`syncStatus = 'pending'`) tombstones soraival ellátott rekordokat a Supabase felhőbe.
- A mappers (`supabase-mapper.ts`) konvertálja a `deletedAt` -> `deleted_at` és `deletedBy` -> `deleted_by` mezőket.
- Sikeres feltöltés után a helyi `syncStatus` 'synced' értéket kap, de a tombstone megmarad.

### Lekérés (Pull / `pullRemote`):
Konfliktusfeloldási szabály: **Last non-null deletedAt wins / Legújabb nem-null törlési időbélyeg győz**.

1. **A helyi törlés védelme**: Ha a helyi rekord törölve van (`deletedAt != null`) és még feltöltésre vár (`syncStatus === 'pending'`), míg a felhőbeli másolat még aktív (`deleted_at == null`), a helyi törlési szándék **győz**, és nem írja felül a régi felhős elem.
2. **Felhős törlés átvétele**: Ha a felhőbeli rekord törölt (`deleted_at != null`), míg a helyi elem aktív, a távoli tombstone átveszi a hatalmat, és a helyi rekord is törölt státuszba kerül.
3. **Kettős törlés**: Ha mindkét oldalon be van állítva a törlési időbélyeg, a **későbbi törlési időbélyeg** győz.
4. **Feltámasztás tilalma**: A rendszer pull során soha nem állít vissza törölt rekordot aktívvá, kivéve ha az kifejezetten Root általi fizikai karbantartás.

---

## 5. Pénzügyi Sztornó vs. Tombstone Soft-Delete

Fontos különbséget tenni a könyvelési és a rendszertechnikai törlés között:

- **Sztornó (`status === 'storno'`)**: Pénzügyi/számviteli stornózási művelet. A bizonylat/tranzakció aktív ledger rekord marad az auditálhatóság és a számviteli törvényi megfelelőség miatt. A stornó tételek megjelennek a főkönyvben "sztornó" státusszal.
- **Soft-Delete (`deletedAt != null`)**: Rendszertechnikai tombstone tévesen rögzített vagy törölt tételek eltávolítására. A tombstoned tételek semmilyen pénzügyi kimutatásban, exportban vagy mérlegben nem szerepelnek.

---

## 6. Root Purge (Fizikai Törlés) & Megőrzési Szabályzat

A lágyan törölt elemek fizikai eltávolítását a `purgeTombstones(options)` függvény végzi el.

- **Jogosultság**: Kizárólag **Root (Főadmin)** szerepkörben érhető el a Beállítások -> `🗑️ Törölt Elemek (Purge)` füle alatt.
- **Megőrzési időkorlát (Retention)**: Alapértelmezetten 90 napnál régebbi tombstones fizikai törlése (választható 30, 14 vagy 0 nap).
- **Működés**:
  1. Kipurgálja a kijelölt/régi elemeket a Supabase felhő tábláiból (ha van felhőkapcsolat).
  2. Fizikailag törli a rekordokat a helyi Dexie IndexedDB-ből (`db.table.delete()`).
  3. Bejegyzést hoz létre az Audit Eseménynaplóba (`system.purge` akcióval).

---

## 7. Supabase Adatbázis Migráció Meglévő Projekteknél

Meglévő Supabase adatbázisok esetén a táblák már léteznek (`CREATE TABLE IF NOT EXISTS` nem hoz létre új oszlopokat a már meglévő táblákhoz). Ahhoz, hogy a felhő szinkronizáció hiánytalanul fogadni tudja a `deleted_at` és `deleted_by` tombstone értékeket:

1. Nyisd meg a Cica-NyT Beállítások -> `💾 SQL & Dexie Séma` fülét.
2. Kattints a **"📋 Teljes Supabase SQL Másolása"** gombra.
3. Nyisd meg a Supabase Dashboard-ot -> **SQL Editor**.
4. Illeszd be a kimásolt SQL scriptet és kattints a **Run** gombra.
5. A generált script tartalmazza az idempotens `ALTER TABLE ... ADD COLUMN IF NOT EXISTS deleted_at / deleted_by` utasításokat és az indexeket, így adatvesztés nélkül frissíti a meglévő táblákat.
