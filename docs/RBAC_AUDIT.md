# RBAC, Szerepkör és SQL RLS Audit Jelentés - Cica-NyT

**Dátum:** 2025. május
**Verzió:** 2.26.0
**Alkalmazás:** Cica-NyT (Macskamenhely & Gondozó Nyilvántartó)

---

## 1. Összefoglaló (Summary)

A Cica-NyT több-felhasználós jogosultsági modelljének (RBAC), a vizuális UI összetevőknek, a futásidejű ellenőrzéseknek (runtime enforcement) és a Supabase PostgreSQL SQL/RLS generátornak (`generateFullSupabaseSchemaSql()`) átfogó auditja megtörtént.

### Általános Státusz
- **Szerepkör modell és típusok (TS Types):** ⚠️ FIGYELMEZTETÉS / 🔴 HIBA (Eltérés volt a kód szerinti role ID-k és az SQL seed adatok között)
- **Vizuális UI (Matrix & Drag-and-Drop Canvas):** 🔴 HIBA (Pénzügyek modul táblaneve hibásan `expenses`-ként szerepelt `finances` helyett, illetve új felhasználó létrehozásakor `caregiver` érvénytelen alapértelmezés volt beállítva)
- **Futásidejű érvényesítés (Runtime Enforcement):** ⚠️ FIGYELMEZTETÉS (A kliens UI alapvetően szűri a művelet gombokat, de bizonyos írási útvonalak közvetlenül IndexedDB-be írnak kliensoldali előzetes `hasPermission` ellenőrzés nélkül; a Supabase RLS és a licenc soft-lock védi az adatintegritást)
- **SQL / RLS Generátor (`supabaseFullSchema.ts`):** 🔴 HIBA (A role ID-k nagybetűsek voltak ('ROOT', 'OWNER', 'STAFF'), hiányzott 3 gyári szerepkör seed-je ('foster', 'volunteer', 'guest'), valamint 8 másodlagos tábla RLS házirend nélkül szerepelt, ami Supabase-ben letiltotta volna az ezekhez való hozzáférést)

---

## 2. Szerepkörök és Szintek (Role Model & Hierarchy)

### Rendszer Szerepkörök
A rendszer 6 fő szerepkört definiál a `src/types.ts` állományban (`DEFAULT_ROLES`):
1. **👑 ROOT (`root`):** Főadminisztrátor. Korlátlan hozzáférés minden modulhoz, adatbázishoz és beállításhoz.
2. **🏆 OWNER (`owner`):** Menhely vezető. Teljes üzleti CRUD hozzáférés minden modulra (`animal`, `health`, `tnr`, `finance`, `users`).
3. **🩺 STAFF (`staff`):** Munkatárs / Gondozó. Állatok CRUD, Egészségügy CRUD, TNR CRUD, Pénzügy olvasás (READ), Felhasználókezelés NÉLKÜL.
4. **🏡 FOSTER (`foster`):** Ideiglenes befogadó. Állatok R/U, Egészségügy R/C/U, TNR R.
5. **🤝 VOLUNTEER (`volunteer`):** Önkéntes. Állatok R/U, Egészségügy R, TNR R/C.
6. **👁️ GUEST (`guest` font):** Vendég. Kizárólag olvasási jog (R).

### Megállapítások:
- **ID vs. Code konzisztencia:** A kliens oldalon a role azonosítója csupa kisbetűs string (`id: 'root'`, `'owner'`, `'staff'`, `'foster'`, `'volunteer'`, `'guest'`), míg a `code` tulajdonság nagybetűs (`'ROOT'`, `'OWNER'`, stb.). A kliens kód megfelelően kezeli a felülbírálásokat és a gyári szerepköri visszaállításokat.
- **`getCurrentUserPermissions()` működése:** Megfelelő sorrendben értékeli ki a jogosultságokat:
  1. Ha `multiUserModeEnabled === false` VAGY `isRootMode === true` -> Korlátlan jogosultság (`DEFAULT_PERMISSIONS_FULL`).
  2. Ha a felhasználó `user_root` vagy `roleId === 'root'` -> Korlátlan jogosultság.
  3. Alapértelmezett szerepköri matrac kiolvasása (`roles.find(...)`).
  4. Egyedi felhasználói felülbírálások (`customPermissionsOverride`) összefésülése a szerepköri alapértékekkel.

---

## 3. Vizuális UI (Visual RBAC UI & Canvas)

### Modulok és Mátrix
A vizuális felület (`UserPermissionsManager`, `SupabaseRbacSection`, `VisualRbacCanvasModal`) az alábbi modulkulcsokat jeleníti meg:
- `animal` (Állatnyilvántartás) -> `cats` tábla
- `health` (Egészségügyi lapok) -> `events` tábla
- `tnr` (TNR műveletek) -> `tnr_records` tábla
- `finance` (Pénzügyek) -> `finances` tábla
- `users` (Felhasználók & Rendszer) -> `app_users` tábla

### Feltárt hibák a Vizuális UI-ban:
1. **Táblanév inkonzisztencia (P0):** A `SupabaseRbacSection.tsx` és a `VisualRbacCanvasModal.tsx` komponensekben a `finance` modulhoz tartozó táblanév hibásan `expenses` néven szerepelt a valós PostgreSQL/Dexie `finances` tábla helyett.
2. **Új felhasználó szerepkör alapértelmezése (P1):** A `UserPermissionsManager.tsx` komponensben az új felhasználó létrehozásakor a kezdeti szerepkör `caregiver` stringre volt állítva, amely nem létezik a `DEFAULT_ROLES` tömbben.

---

## 4. Futásidejű Érvényesítés (Runtime Enforcement Gaps)

### Megállapítások:
1. **Gombok és gátak:** A kártyákon, listákon és nézeteken (pl. `CatCard`, `TnrCard`, `TnrView`, `EventsListView`) a szerkesztési, rögzítési és törlési gombok megfelelően a `getCurrentUserPermissions()` által visszaadott jelzőkhöz (`canManageTnr`, `canManageMedical`, `canEditCat`, stb.) vannak kötve.
2. **Kliensoldali IndexedDB írások:** Mivel a Cica-NyT offline-first architektúrájú PWA, a helyi IndexedDB (`db.cats`, `db.events`, stb.) tranzakciók a böngészőben futnak. A licence 'soft-lock' (Dexie hook-ok) letiltja az írást érvénytelen licenc esetén, míg a több-felhasználós módban az UI védelme akadályozza meg a jogosulatlan gombok megjelenését. A Supabase felhő szinkronizáció során a PostgreSQL RLS házirendek (`check_user_permission()`) garantálják az adatbázis szintű biztonságot.

---

## 5. SQL Séma és RLS Generátor Megállapítások (`supabaseFullSchema.ts`)

A `generateFullSupabaseSchemaSql()` segédfüggvény állítja elő a Supabase Dashboard SQL Editor-jába illeszthető komplett DDL és RLS scriptet.

### Kritikus (P0) talált hibák az SQL generátorban:
1. **Szerepkör Seed ID Mismatches:**
   - Az SQL script `INSERT INTO public.app_roles (id, ...)` szakasza nagybetűs azonosítókat tárolt el (`'ROOT'`, `'OWNER'`, `'STAFF'`).
   - Ezzel szemben a kliens alkalmazásban `app_users.role_id` értékei kisbetűsek (`'root'`, `'owner'`, `'staff'`).
   - A `check_user_permission()` PL/pgSQL függvény a `LEFT JOIN public.app_roles r ON u.role_id = r.id` lekérdezéssel ellenőrzi a jogokat. A kis- és nagybetűs eltérés miatt a JOIN sikertelen volt, így minden nem-root felhasználó jogosultság-ellenőrzése megtagadást (FALSE) adott vissza.
2. **Hiányzó Gyári Szerepkörök:**
   - Az SQL seed csak 3 szerepkört szúrt be (`ROOT`, `OWNER`, `STAFF`). A `foster`, `volunteer` és `guest` szerepkörök hiányoztak az `app_roles` táblából.
3. **Hiányzó RLS Házirendek (Missing RLS Policies):**
   - A script mind a 16 táblára bekapcsolta a Row Level Security-t (`ENABLE ROW LEVEL SECURITY`), de csak 8 táblához hozott létre `CREATE POLICY` szabályokat.
   - A PostgreSQL RLS alapértelmezetten mindent tilt (DEFAULT DENY), ha az RLS be van kapcsolva, de nincs hozzá illeszkedő policy. Így a `foster_supplies`, `foster_expenses`, `cat_weights`, `donation_campaign_items`, `event_templates`, `auto_backups`, `settings` és `app_roles` táblák teljesen elérhetetlenné váltak a Supabase API-n keresztül.

---

## 6. Elvégzett Javítások (Applied Critical Fixes in v2.26.0)

A feltárt P0/P1 hibák hiánytalanul javításra kerültek a kódbázisban:

1. **`src/utils/supabaseFullSchema.ts` Frissítése (P0 Fix):**
   - A szerepkör seed azonosítók frissítve csupa kisbetűs értékekre (`'root'`, `'owner'`, `'staff'`, `'foster'`, `'volunteer'`, `'guest'`).
   - Mind a 6 gyári szerepkör beszúrásra kerül az `app_roles` táblába a `DEFAULT_ROLES` pontos engedély mátrixával.
   - Hiánytalan RLS házirendek hozzáadva az összes másodlagos táblához (`foster_supplies`, `foster_expenses`, `cat_weights`, `donation_campaign_items`, `event_templates`, `auto_backups`, `settings`, `app_roles`).

2. **Táblanév Igazítás RBAC UI Komponensekben (P0 Fix):**
   - `SupabaseRbacSection.tsx` és `VisualRbacCanvasModal.tsx` állományokban az `expenses` táblanév javítva `finances` névre.

3. **Új Felhasználó Alapértelmezett Szerepkör Javítása (P1 Fix):**
   - `UserPermissionsManager.tsx`-ben az új felhasználó alapértelmezett szerepköre `'staff'`-ra módosítva.

4. **Verziófrissítés:**
   - Az alkalmazás verziója 2.26.0-ra frissítve, szinkronizálva az összes kapcsolódó állományban (`package.json`, `index.html`, `public/changelog.json`, `public/version.json`, `public/service-worker.js`, `src/version.ts`).

---

## 7. Összegző Prioritási Mátrix (Priority Action Items)

| Prioritás | Terület | Probléma Leírása | Státusz |
| :--- | :--- | :--- | :--- |
| **P0** | SQL RLS | Role ID mismatch ('ROOT' vs 'root') a seed beszúrásban | ✅ JAVÍTVA (v2.26.0) |
| **P0** | SQL RLS | Hiányzó 3 gyári szerepkör (foster, volunteer, guest) a seed SQL-ben | ✅ JAVÍTVA (v2.26.0) |
| **P0** | SQL RLS | Hiányzó RLS policy-k 8 táblánál (alapértelmezett kizárás miatt) | ✅ JAVÍTVA (v2.26.0) |
| **P0** | Vizuális UI | Pénzügy modul táblanév eltérés (`expenses` vs `finances`) | ✅ JAVÍTVA (v2.26.0) |
| **P1** | User Manager | Új felhasználó felvételénél `caregiver` téves role ID fallback | ✅ JAVÍTVA (v2.26.0) |
| **P2** | Doksi & Verzió| RBAC audit jelentés és v2.26.0 verzió kiadása | ✅ JAVÍTVA (v2.26.0) |
