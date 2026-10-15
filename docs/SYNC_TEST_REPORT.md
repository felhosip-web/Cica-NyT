# Cica-NyT Szinkronizációs Rendszer - Audit és Folyamatteszt Jelentés

**Verzió:** 2.33.1
**Dátum:** 2026. október 10.
**Szerző:** Jules (Software Engineer)
**Cél:** A Cica-NyT hibrid (helyi-első IndexedDB + Supabase cloud + Google Drive backup) szinkronizációs architektúrájának átfogó kód- és logikai auditja, folyamattesztelése, hiányosságok feltárása és a felderített P0 hibák javítása.

---

## 1. Architektúra Térkép (Architecture Map)

A Cica-NyT egy **helyi-első (local-first)** architektúrát alkalmaz, ahol az elsődleges adatforrás a böngészőben futó Dexie (IndexedDB) adatbázis. A felhős élő szinkronizációt a Supabase biztosítja, míg a Google Drive mentés offline/archívum jellegű snapshot mentést nyújt.

```
+-----------------------------------------------------------------------+
|                            Rendszer UI                                 |
|     (SyncStatusSection, Forms, Modals, SettingsDebugModal)            |
+-----------------------------------------------------------------------+
        |                                       |
        v                                       v
+-------------------------------+      +--------------------------------+
|      IndexedDB (Dexie)        |      |      Google Drive Service      |
|  (Elsődleges helyi adattár)   |      |   (JSON fájl snapshot mentés)  |
| syncStatus: 'pending'|'synced'|      +--------------------------------+
+-------------------------------+
        |
        v
+-------------------------------+
|      SyncService / Manager    |
|   (push / pull / queueSync)   |
+-------------------------------+
        |
        v
+-------------------------------+
|       Supabase Cloud DB       |
|  (cats, foster_parents, etc.) |
+-------------------------------+
```

### 1.1 Belépési pontok és metódusok (`src/services/sync-service.ts`, `sync-manager.ts`)

| Belépési pont / Metódus | Hívó komponensek / Események | Leírás |
| :--- | :--- | :--- |
| `queueSync(cat)` | Macska mentése / szerkesztése | Beállítja a `syncStatus: 'pending'` mezőt és frissíti a `deviceId`-t, majd online állapotban elindítja a `syncPending()`-et. |
| `queueFosterSync(item, table)` | Befogadó szülő / ellátmány mentése | Beállítja a `syncStatus: 'pending'`-et és frissíti a táblát, majd online állapotban szinkronizál. |
| `queueInventorySync(item)` | `InventoryFormModal`, `DonationCampaignDetailModal` | Beállítja a `syncStatus: 'pending'` mezőt és feltöltésre jelöli ki a készlet tételt. |
| `queueFinanceSync(item)` | Pénzügyi rekord mentése | Beállítja a `syncStatus: 'pending'`-et és feltöltésre jelöli a pénzügyi tételt. |
| `syncPending()` | `queue*`, `online` event, `cloudSyncManager.push()`, `SyncStatusSection` kézi szinkron | Végigmegy a függőben lévő (`syncStatus: 'pending'`) rekordokon és Supabase `upsert` művelettel feltölti őket. |
| `pullRemote()` | `cloudSyncManager.pull()` | Letölti a Supabase táblák legfrissebb adatait és befrissíti a helyi IndexedDB rekordokat. |
| `testConnection(url, key)` | Beállítások kapcsolat teszt | Ellenőrzi a Supabase elérést a megadott URL és anonim kulcs segítségével. |

---

### 1.2 Adattáblák és Szinkronizációs Lefedettség

| Dexie Tábla | Dexie `syncStatus` Index? | Queue Metódus | Push (Feltöltés) | Pull (Letöltés) | UI Összesítő számláló |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `cats` | **Igen** (v1) | `queueSync` | ✅ | ✅ | ✅ |
| `fosterParents` | **Nem** (v11) | `queueFosterSync` | ✅ | ✅ | ✅ (fallback filter) |
| `fosterSupplies` | **Nem** (v11) | `queueFosterSync` | ✅ | ❌ | ✅ (fallback filter) |
| `fosterExpenses` | **Nem** (v11) | `queueFosterSync` | ✅ | ❌ | ✅ (fallback filter) |
| `inventory` | **Igen** (v12) | `queueInventorySync` | ✅ | ✅ | ✅ |
| `finances` | **Nem** (v14/v16) | `queueFinanceSync` | ✅ | ❌ | ✅ (fallback filter) |
| `donationCampaigns` | **Igen** (v17) | ❌ | ❌ | ❌ | ✅ |
| `donationCampaignItems` | **Nem** (v17) | ❌ | ❌ | ❌ | ❌ |
| `events` | **Nem** (v7) | ❌ | ❌ | ❌ | ❌ |
| `cat_weights` | **Nem** (v15) | ❌ | ❌ | ❌ | ❌ |
| `tnr` | **Nem** (v9) | ❌ | ❌ | ❌ | ❌ |
| `audit_events` | **Nem** (v18) | ❌ | ❌ | ❌ | ❌ |

---

### 1.3 Mapper Réteg (`src/lib/mappers/supabase-mapper.ts`)

A mafferezés biztosítja a helyi IndexedDB camelCase mezőnevei és a Supabase snake_case adatbázis oszlopai közötti átalakítást:
- **Macskák**: `toSupabaseCat()` / `fromSupabaseCat()` (kezetesíti a `foster_id`, `is_spayed`, `device_group` mezőket).
- **Befogadó Szülők**: `toSupabaseFosterParent()` / `fromSupabaseFosterParent()`.
- **Készlet**: `toSupabaseInventory()` / `fromSupabaseInventory()`.
- **Hiányos mafferek**: `toSupabaseFosterSupply()`, `toSupabaseFosterExpense()`, `toSupabaseFinance()` léteznek, de **nincs párjuk** (`fromSupabase*`), így ezekre a táblákra a `pullRemote()` nem lett megírva.

---

### 1.4 Autentikáció, Licenc-Védelem és Biztonság

- **Licenc-védelem**: A `syncService.runLicenseGuardedRequest()` ellenőrzi a licenc állapotát. Ha a licenc `locked` státuszú és a felhasználó nem aktív `root` módban van, az in-flight kérések `AbortController.abort()` segítségével azonnal megszakításra kerülnek, és a szinkronizáció leáll.
- **Supabase RLS**: A Supabase kapcsolat az anonim publikus kulcsot (`VITE_SUPABASE_ANON_KEY`) használja, a sorközi jogosultságokat a Supabase PostgreSQL RLS szabályai és a `check_user_permission()` SQL függvény szabályozzák.
- **Audit Logolás**: A szinkronizációs folyamat indítása, sikere és hibája az `audit_events` táblába naplózódik (`sync.start`, `sync.success`, `sync.fail` eseménykódokkal).

---

### 1.5 Google Drive Backup vs Supabase Live Sync

A Google Drive integráció (`src/services/googleDriveService.ts`) **nem sor-szintű élő szinkronizáció**, hanem teljes adatbázis JSON mentés és visszaállítás:
1. `createFullDatabaseBackup()`: Egyetlen JSON objektumba gyűjti az összes Dexie tábla tartalmát.
2. `restoreBackupToLocalDB()`: A helyi IndexedDB táblákat törli (`clear()`) és felülírja a mentés tartalmával. Opcionálisan (`syncToSupabase: true`) a visszaállított adatokat feltölti Supabase-be.
3. **Elkülönülés**: A Drive mentés offline archiválási és katasztrófa-helyreállítási célokat szolgál, nem keveredik a Supabase valós idejű `syncStatus` sor-szintű szinkronizációjával.

---

## 2. Folyamatteszt Mátrix (Process Test Matrix)

A tesztek elvégzése statikai kód-analízissel és logikai call-graph feltárással történt (**CODE-VERIFIED**).

| Teszt ID | Tesztelt Folyamat | Elvárt Működés | Tényleges Kód Viselkedés | Eredmény |
| :---: | :--- | :--- | :--- | :---: |
| **T1** | Helyi létrehozás ➔ pending? | Új rekord létrehozásakor `syncStatus: 'pending'` lesz a státusz. | A `queueSync`, `queueInventorySync`, `queueFinanceSync` expliciten beállítja a `pending` státuszt. Egyes modulokban (pl. `FosterView.tsx`) hiányzik a queue hívás. | **PARTIAL** |
| **T2** | Kézi sync push ➔ sikeresen synced? hiba esetén pending? | Sikeres Supabase `upsert` után `syncStatus: 'synced'`, hiba esetén `pending` marad. | `syncPending()` csak hibamentes Supabase válasz esetén frissít `synced`-re. Hiba esetén érintetlenül hagyja a `pending` értéket. | **PASS** |
| **T3** | Helyi szerkesztés ➔ újra pending ➔ push? | Meglévő rekord módosításakor újra `pending` lesz és feltöltődik. | Ha a szerkesztő form a `queue*Sync` metódust használja, helyesen újra `pending` lesz. | **PASS** |
| **T4** | `pullRemote` összefésülés | A távoli letöltés nem írhatja felül a helyi még fel nem töltött (`pending`) változtatásokat. | A `pullRemote()` csak az `updated` időbélyeget hasonlítja össze (`remote > local`), **nem ellenőrzi a helyi `syncStatus === 'pending'` állapotot**, így felülírhatja a felhőbe még fel nem töltött helyi módosítást! | **GAP** |
| **T5** | Helyi törlés ➔ távoli viselkedés | Rekord törlése helyben törli vagy törlésre jelöli a távoli adatot is. | **Nincs törlés-szinkronizáció (tombstone).** A helyben törölt rekord a Supabase adatbázisban megmarad, és a következő `pullRemote()` visszatölti a helyi adatbázisba! | **GAP** |
| **T6** | Részleges hiba kezelése | Ha egy tábla vagy rekord szinkronizációja meghiúsul, a többi folytatódik. | A `syncPending()` for-ciklusaiban és különálló try/catch blokkjaiban a hiba nem szakítja meg a többi tábla feldolgozását. | **PASS** |
| **T7** | Offline működés | Offline módban a queue ment, a szinkron kecsesen várakozik, az UI sárga dot-ot mutat. | `!navigator.onLine` esetén a `syncPending` nem fut le, az UI sárga fénnyel mutatja a függőben lévő rekordok számát. | **PASS** |
| **T8** | Kapcsolat teszt (`testConnection`) | Helyes visszajelzést ad érvényes/érvénytelen adatokra. | A `testConnection(url, key)` tiszta hibaüzeneteket ad hiányzó vagy hibás Supabase adatok esetén. | **PASS** |
| **T9** | SyncStatusSection számlálók | Az UI pontosan mutatja a táblánkénti `pending` rekordok számát. | A felület a Dexie indexet használja, hiányzó index esetén fallback szűrést alkalmaz. A kézi szinkron gomb a P0 javítás után megfelelően fut. | **PASS** |
| **T10** | Több böngészőlap egyidejű használata | Nincs adatkorrupció több lapon futó szinkron esetén. | A Dexie tranzakció-kezelése véd a helyi DB korrupció ellen. A Supabase `upsert` idempotens, így a párhuzamos feltöltések nem okoznak hibát. | **PASS** |
| **T11** | Konfliktuskezelés (párhuzamos módosítás) | Egyértelmű szabály határozza meg a felülírást. | Időbélyeg alapú Last-Write-Wins (LWW) elvet követ, de a helyi függőben lévő módosítás felülíródhat (lásd T4). | **DOCS** |
| **T12** | Google Drive mentés és visszaállítás | A mentés tartalmazza a fő táblákat, a restore tisztázza a hatáskört. | A mentés hiánytalanul kimenti a táblákat. A visszaállítás elkülönül a felhős szinkrontól, opcióként kínálva a Supabase szinkront. | **PASS** |

---

## 3. Biztonság és Adatkezelés (Security & Data)

1. **Érzékeny Adatok és Kulcsok**:
   - A rendszer nem naplóz API kulcsokat, jelszavakat vagy tokensztringeket sem a böngésző konzolra, sem az `audit_events` táblába.
2. **Képek és Nagy Fájlok**:
   - A macska profilképek és csatolmányok adatbázisban történő tárolása Base64 formátumban jelentősen megnövelheti a szinkronizációs JSON méretét. Javasolt a jövőben a Supabase Storage vödrök (Buckets) használata a képek tárolására.
3. **Sor-szintű Jogosultságok (RLS)**:
   - A Supabase RLS és a `check_user_permission()` SQL függvény biztosítja, hogy anonim kliensek csak a szervezetükhöz tartozó adatokat érhessék el.

---

## 4. Megállapítások és Problémalista (P0 / P1 / P2)

### P0 (Kritikus - Meghibásodást okozó hibák)
- **[JAVÍTVA] `SyncStatusSection.tsx` Runtime TypeError**: A manuális szinkronizációs gombra kattintva a felület a nem létező `SyncService.syncPendingChanges()` static metódust hívta meg `syncService.syncPending()` helyett.
  *Státusz: **Javítva v2.33.1-ben**.*

### P1 (Magas prioritású funkcionális és adatintegritási hiányosságok)
1. **Hiányzó Dexie Indexek**: A `finances`, `fosterParents`, `fosterSupplies`, `fosterExpenses` táblák Dexie sémájában hiányzik a `syncStatus` index. Bár az UI fallback szűréssel kezeli ezt, a `table.where('syncStatus').equals('pending')` IndexedDB lekérdezések hibát dobhatnak catch blokk nélkül.
2. **Törlések Szinkronizációjának Hiánya**: Helyi rekord törlésekor a Supabase táblában megmarad a sor. A következő `pullRemote()` során a törölt adat visszatöltődik a helyi adatbázisba.
3. **Inkonzisztens Queue Hívások**: Számos form/modul (pl. `FosterView.tsx`, `EventFormModal.tsx`) közvetlenül a `db.table.put()` metódust hívja a `syncService.queue*()` helyett, vagy kihagyja a `syncStatus: 'pending'` mező beállítását.

### P2 (Közepes prioritású fejlesztési lehetőségek)
1. **`pullRemote` Felülírási Kockázat**: Ha egy rekord helyben módosult (`syncStatus: 'pending'`), de a Supabase-ben lévő rekord `updated` dátuma frissebb, a `pullRemote()` felülírja a helyi nem-szinkronizált változtatást.
2. **Hiányzó Tábla Szinkronizációk**: Az `events`, `donationCampaigns`, `cat_weights`, `tnr` táblák rekordjai jelenleg csak a helyi Dexie adatbázisban tárolódnak, nem kerülnek feltöltésre a Supabase felhőbe.
3. **Hiányzó Pull Metódusok**: A `fosterSupplies`, `fosterExpenses` és `finances` táblákhoz a `syncService` csak push feltöltést végez, letöltő `pullRemote` ág nem létezik hozzájuk.

---

## 5. Javasolt Akcióterv és Következő Lépések

1. **Séma Frissítés (Dexie v19)**:
   - Adja hozzá a `syncStatus` indexet a `finances`, `fosterParents`, `fosterSupplies`, `fosterExpenses` táblákhoz a `src/lib/db.ts`-ben.
2. **Soft Delete / Tombstone Rendszer Kiépítése**:
   - Törléskor a rekord kapjon `isDeleted: true` és `syncStatus: 'pending'` jelölést a fizikai törlés helyett, így a Supabase törlési szinkronizáció biztonságosan elvégezhető.
3. **Egyosztatú Sync Wrapperek Alkalmazása**:
   - Cserélje le a közvetlen `db.table.put()` hívásokat a felületen a `syncService.queue*()` metódusokra.
4. **`pullRemote` Védelem a Függő Módosításokra**:
   - A `pullRemote()` ellenőrizze, hogy ha a helyi rekord státusza `syncStatus === 'pending'`, ne írja felül a távoli rekord adataival.

---
*A jelentés a Cica-NyT v2.33.1 kiadás részeként készült.*
