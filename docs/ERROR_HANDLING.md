# Cica-NyT Alkalmazásszintű Hibakezelési Architektúra (v2.33.0)

A Cica-NyT offline-first PWA alkalmazás egységesített hibakezelési és diagnosztikai rendszert alkalmaz, amely garantálja, hogy a felhasználói felület és az adatintegritás hiba esetén is stabil marad, miközben strukturált audit naplózást biztosít.

---

## 1. Hibakezelési Rétegek (Error UI & Diagnostic Layers)

A rendszer 4 egymásra épülő rétegből áll:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. React ErrorBoundary (Összeomlás-védelem & Fallback UI)   │
├─────────────────────────────────────────────────────────────┤
│ 2. Felhasználói Toast & Banner Visszajelzések (useToastStore)│
├─────────────────────────────────────────────────────────────┤
│ 3. Aszinkron Akció Csomagoló (withErrorHandling & logError)  │
├─────────────────────────────────────────────────────────────┤
│ 4. Adatbázis Audit Eseménynapló (audit_events / Dexie)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. React ErrorBoundary (`src/components/ErrorBoundary.tsx`)

A React ErrorBoundary komponens elkapja a renderelés során keletkező nem kezelt kivételeket.

- **Kiterjedés:** Az alkalmazás teljes gyökere (`main.tsx`) és minden egyes navigációs fül / modul (`CatList`, `FinanceView`, `InventoryView`, `StatsView` stb.).
- **Működés hiba esetén:** Megakadályozza a PWA teljes fehér képernyős összeomlását. Az adott modul helyén egy barátságos magyar nyelvű üzenet jelenik meg ("Váratlan hiba történt") "Újrapróbálás" és "Főoldal" gombokkal.
- **Audit integráció:** A kiterjedt hiba automatikusan rögzítésre kerül az audit naplóban `system.react_error` akcióval és a technikai `componentStack` kivonattal.

---

## 3. UI Toast Visszajelző Rendszer (`useToastStore` & `ToastContainer`)

Hagyományos `alert()` és `confirm()` ablakok helyett a rendszer egységesített Zustand alapú Toast értesítési rendszert használ.

- **Típusok:**
  - `showError(messageHu, options)` – Piros hibaüzenet (6mp, opcionális "Részletek" gombbal Root/Dev módban).
  - `showSuccess(messageHu, duration)` – Zöld sikeres művelet jelzés (3.5mp).
  - `showWarning(messageHu, duration)` – Sárga figyelmeztetés (4.5mp).
  - `showInfo(messageHu, duration)` – Kék tájékoztatás (3.5mp).
- **Offline Banner (`OfflineBanner.tsx`):** A böngésző `online` / `offline` állapotát automatikusan detektálja és finom jelző sávot jelenít meg hálózati kimaradás esetén.

---

## 4. Aszinkron Műveletek & Audit Naplózás (`eventLog.ts`)

Minden kritikus adatbázis és hálózati művelet (mentés, törlés, szinkronizáció, export) a `logEvent` és `logError` / `withErrorHandling` függvényeken keresztül fut.

### `withErrorHandling<T>(action, fn, userMessageHu, extra)`
- Végrehajtja a megadott aszinkron modult.
- **Siker esetén:** Visszaadja az eredményt.
- **Hiba esetén:**
  1. Rögzíti a hibát az `audit_events` táblában (`logError`).
  2. Megjeleníti a magyar nyelvű toast hibaértesítést.
  3. `null` értékkel tér vissza anélkül, hogy a felület összeomlását okozná.

---

## 5. Biztonság & Adatvédelem (Sensitive Data Redaction)

Minden audit esemény rögzítése előtt a `redactSensitiveData` segédfüggvény automatikusan maszkolja a kényes mezőket:
- Jelszavak, PIN kódok, tokenek, titkos kulcsok (`[REDACTED]`).
- Bázis-64 fotó adatok és nagy méretű bináris fájlok (`[TRUNCATED_BINARY_DATA]`).

---

## 6. Root Adminisztrátori Hibadiagnosztika ("Utolsó hibák")

A `EventLogSection.tsx` kizárólag Root szerepkörrel érhető el:
- **"Csak hibák" gyorsszűrő:** Egy kattintással szűri az `error` szintű audit eseményeket.
- **"Utolsó hibák" sáv:** A legutóbbi 5 hiba kompakt gyorsnézete az azonnali hibafeltáráshoz.
