# Cica-NyT Licenckezelési Rendszer Audit Jelentés

**Dátum:** 2026. március
**Verzió:** 2.27.0
**Szerző:** Jules / Software Engineering Agent
**Tulajdonos:** HES Projects® by FePe (All Rights Reserved)

---

## 1. Összefoglaló (Summary)

**Státusz:** OK (Kisebb reaktivitási és dokumentációs igazításokkal éles használatra alkalmas)

A Cica-NyT alkalmazás proprietáris licenckezelő stakje (`HES Projects® by FePe`) teljes körű felülvizsgálaton esett át. Az audit megállapította, hogy a kliensoldali soft-lock védelem, a First-launch licencelfogadás, a Dexie.js adatbázis horgok (hooks), valamint a Root módos felülbírálás (bypass) logikailag és technikailag stabilan működik.

### Főbb megállapítások:
- **First-launch elfogadás:** A `LicenseAcceptanceModal` megkerülhetetlenül blokkolja a felhasználói felületet az első indításkor, amíg a felhasználó be nem jelöli a feltételek elfogadását.
- **Soft-lock írásvédelem:** A `src/lib/db.ts`-ben definiált Dexie.js szinkron horgok (`creating`, `updating`, `deleting`) megbízhatóan megakadályozzák az adatmódosítást és mentést, ha a licenc státusza `locked` és a Root mód nem aktív.
- **Kettős licenc ellenőrzés a szinkronizációnál:** A `SyncService` felhőszinkronizációja (`syncPending`, `pullRemote`) mind futás előtt, mind az in-flight lekérdezések során ellenőrzi a licenc zároltságát, és visszavonja (`AbortController.abort()`) az aktív hálózati kéréseket, ha a licenc lejárt.
- **Jogi szövegek:** A `LICENSE` fájl, a `src/data/licenseText.ts` és a beállítások menüben megjelenő szövegek egységesen a 2025-2026-os szerzői jogi évszámokat és a HES Projects® by FePe tulajdonosi megjelölést tartalmazzák. Nincsenek nyitott / ellentmondó Apache 2.0 referenciák az alkalmazás forráskódjában.

---

## 2. Elfogadás (First-Launch Acceptance)

- **Mechanizmus:** Az `App.tsx`-ben a `LicenseAcceptanceModal` komponens renderelődik `isOpen={!termsAccepted}` feltétellel.
- **Perzisztencia:** Az elfogadás időpontja az ISO formátumú stringként tárolódik a `localStorage` `cica_license_terms_accepted_at` kulcsa alatt.
- **Bezárás/Megkerülés:** A modal nem tartalmaz bezáró (X) gombot vagy háttérre kattintós elhagyási lehetőséget; kizárólag az "Elfogadom ✨" gombra kattintva zárható be, ami az `isChecked` állapot függvénye.
- **Újratöltés:** Oldalfrissítés után a `useLicenseStore` beolvassa a `localStorage`-ból a bejegyzést, így az elfogadott státusz megmarad.

---

## 3. Licenckulcs & Státuszgép (License Key & State Machine)

### Státusz enum:
1. **`valid`**: Érvényes licenckulcs rögzítve, az utolsó ellenőrzés óta eltelt idő < 3 nap.
2. **`grace`**: Türelmi időszak (3-7 nap között az utolsó offline/online ellenőrzéstől). Az alkalmazás teljes értékűen működik, de figyelmeztető banner látható a hátralévő napok számával (`daysRemainingInGrace`).
3. **`locked`**: Nincs megadva kulcs, érvénytelen a kulcs aláírása, vagy eltelt a 7 napos türelmi időszak. Ebben az állapotban az írási műveletek blokkolva vannak (soft-lock).

### Kulcs formátum & Algoritmus:
- Formátum: `CICA-<TIER>-<PAYLOAD>-<SIGNATURE>`
- Tiers: `TRIAL`, `BASIC`, `FULL`, `ROOT`, `SERVICE`
- Aláírás: FNV-1a szinkron hash algoritmus (`CICA-<TIER>-<PAYLOAD>-<SECRET_SALT>`), mely biztosítja, hogy a Dexie.js szinkron horgai blokkolás nélkül, milliszekundumok alatt lefuthassanak.

---

## 4. Soft-Lock Enforcement (Írásvédelem)

- **Adatbázis horgok (Dexie Hooks):**
  A `src/lib/db.ts`-ben mind a 17 Dexie táblára be vannak kötve a `creating`, `updating` és `deleting` események.
  ```typescript
  if (getLicenseStatus().status === 'locked' && !isRootActive) {
      window.dispatchEvent(new CustomEvent('licenseLockedToast'));
      throw new Error('Nincs érvényes licenc. Módosítás megtagadva.');
  }
  ```
- **Olvasás (Read-Only):** A lekérdezések (`toArray()`, `get()`, `where()`) továbbra is akadálytalanul lefutnak, így a felhasználó hozzáfér a meglévő adataihoz és exportálhatja azokat.
- **Szinkronizációs hálózat:** A `SyncService` automatikusan megszakítja az aktív hálózati kéréseket a `cica-license-status-change` esemény hatására.

---

## 5. Root Bypass (Rendszergazdai Felülbírálás)

- **Működés:** A Root mód (`useAppStore.getState().isRootMode`) aktiválásakor a Dexie horgok átengedik az írási műveleteket zárolt licenc esetén is.
- **Munkamenet korlát:** A Root munkamenet időkorlátos (`rootSessionUntil` a `sessionStorage`-ban). Az `App.tsx` percenként ellenőrzi az időkorlátot, és automatikusan kilépteti a Root módot a lejárati idő elérésekor.
- **Próbálkozások elleni védelem:** A Root belépés PIN kódos / remote SERVICE kódos hitelesítéshez kötött, bot detekcióval védett.

---

## 6. Jogi Szöveg Konzisztencia

| Helyszín | Megnevezés / Szerzői jog | Irányadó nyelv | Status |
| :--- | :--- | :--- | :--- |
| `LICENSE` (repo root) | © 2025-2026 HES Projects® by FePe | Angol (prevails) | ✅ OK |
| `src/data/licenseText.ts` | © 2025-2026 HES Projects® by FePe | Angol (prevails) | ✅ OK |
| `src/components/LicenseSettingsTab.tsx` | © 2025-2026 HES Projects® by FePe | - | ✅ OK |
| `README.md` | © 2025-2026 HES Projects® by FePe | - | ✅ OK |

---

## 7. Kockázatok és Korlátok Éles Használatra (Residual Risks)

1. **Kliensoldali működés (localStorage törlés):**
   - Mivel a licencellenőrzés és elfogadás a böngésző helyi tárolójára (`localStorage`) támaszkodik, a böngésző adatinak teljes törlése visszaállítja az elfogadási modalt és a licenc státuszt `locked` állapotra. Ez nem okoz adatvesztést, de a kulcsot újra meg kell adni.
2. **Kód-expozíció (Kliensoldali algoritmus):**
   - A licenckulcs-ellenőrző FNV-1a algoritmus és a salt a kliensoldali bundle része. Emiatt a kód technikai értelemben visszafejthető. Ez a szoftverarchitektúra ismert és elfogadott tulajdonsága (soft DRM / tisztességes használat biztosítása).

---

## 8. Prioritási Mátrix (P0/P1/P2) & Elvégzett Javítások

| Prioritás | Típus | Leírás | Státusz |
| :---: | :---: | :--- | :---: |
| **P1** | **Reaktivitás** | A `useLicenseStore` automatikusan feliratkozik a `LICENSE_STATUS_CHANGE_EVENT` eseményre, így a licenc mentése vagy törlése azonnal frissíti az összes Zustand komponens állapotát. | ✅ Javítva v2.27.0-ban |
| **P2** | **Dokumentáció** | `README.md` verziószám szinkronizálása a legújabb `v2.27.0`-ra. | ✅ Javítva v2.27.0-ban |

---

*A Licenckezelő Rendszer éles termelésre kész és megbízhatóan védi az alkalmazás integritását.*
