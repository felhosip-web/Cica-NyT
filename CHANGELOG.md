# Changelog - Cica-NYT (Macska Nyilvántartó)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.31.0] - 2026-10-08

### Added / Hozzáadva
- **📜 Strukturált Eseménynapló & Audit Rendszer (`docs/EVENT_LOG.md`)**:
  - Helyi Dexie `audit_events` (Séma v18) és Supabase `public.audit_events` tábla a kritikus műveletek, biztonsági és rendszeresemények tartós naplózására.
  - Központi `logEvent()`, `logError()` és `withErrorHandling()` segédfüggvények.
  - Automatikus érzékeny adat redaktálás (jelszavak, PIN-ek, tokenek, titkos kulcsok, base64 képadatok maszkolása).
  - Globális ablak hiba- és aszinkron Promise elutasítás-figyelők (`window.onerror`, `unhandledrejection`) intelligens hibafolyatási korlátozással.
  - Instrumentált kritikus műveletek: Hitelesítés & Munkamenetek, RBAC jogosultság megtagadások (`rbac.denied`), Licencelfogadás & soft-lock események, Cica CRUD/örökbefogadás, Pénzügyi CRUD/stornó indoklással, Raktár, Adománygyűjtés, Exportálások, Felhő szinkronizáció és Rendszerindítás.
  - Kizárólag ROOT szerepkörből elérhető "Eseménynapló" fül a Beállításokban, szűrési opciókkal (szint, kategória, dátumtartomány, keresés), kiterjeszthető JSON részletekkel, karbantartási (90 nap) funkcióval és CSV exportálási lehetőséggel.

## [2.30.0] - 2026-10-08

### Added / Hozzáadva
- **📋 Dedikált Állatkimutatás Modul (`AnimalReportModal.tsx`)**:
  - Részletes mező-checkboxok csoportosítva (Azonosítás, Státusz & Elhelyezés, Bekerülés, Egészség, Örökbefogadás, Egyéb).
  - Állatállomány hatóköri szűrés (Összes állat, Gondozásban lévő aktív, Gazdisodott, Elhunyt), ivar, bekerülés típusa és dátumintervallum szerint.
  - ODS (.ods - OpenDocument Spreadsheet) letöltés 'Állatok' adatlappal és kategóriánkénti 'Összesítő' munkalappal (státusz, ivar, ivartalanítás, mikrochip megoszlás).
  - ODT (.odt - OpenDocument Text) és PDF (.pdf) letöltési opciók Hiteles vagy Munkapéldány módban.
  - Közvetlen "📋 Állatkimutatás" gomb a Gondozásban lévő állatok nézet eszköztárán (`CatList.tsx`).

## [2.29.0] - 2026-10-08

### Added / Hozzáadva
- **📊 Bővített PDF & ODF (OpenDocument Format) Export Modul (`docs/EXPORT_GUIDE.md`)**:
  - ODS (.ods) letöltés LibreOffice Calc / Microsoft Excel környezethez 'Tételek' és 'Összesítő' munkalapokkal.
  - ODT (.odt) letöltés LibreOffice Writer környezethez szerkeszthető hivatalos igazolásokhoz.
  - Átfogó export beállítási panel: Hitelesség, Tájolás (Fekvő/Álló), Időszak szűrő, Stornó tételek kezelése, egyedi oszlopválasztó és hivatalos aláírási rovat.
  - Pénzügyek nézet közvetlen "📊 ODS Export" gombbal kiegészítve.

## [2.28.0] - 2026-10-08

### Fixed / Javítva
- **💳 Pénzügyi Modul & Hivatalos Nyomtatási/PDF Rendszer Átfogó Audit (`docs/FINANCE_AUDIT.md`)**:
  - Valódi `db.finances` főkönyv PDF exportálása a `PdfReportsModal`-ban cica adatok helyett.
  - Magyar ékezetes karakterek megőrzése (`á, é, í, ó, ö, ú, ü`) a PDF generálóban.
  - Nyomtatási nézet frissítése dinamikus szervezetnévvel (`orgName`), felhasználói névvel, timestamp-el és kötelező jogi disclaimerrel.
  - Granuláris pénzügyi jogosultságok (`finance.read`, `finance.create`, `finance.update`, `finance.delete`) érvényesítése a felületen.

## [2.27.0] - 2026-10-08

### Fixed / Javítva
- **📜 Licenckezelési Rendszer & Soft-Lock Architektúra Átfogó Audit (`docs/LICENSE_AUDIT.md`)**:
  - `useLicenseStore` állapotfrissítés feliratkoztatása a globális `cica-license-status-change` eseményre a reaktív felületi visszajelzéshez.
  - Soft-lock írásvédelem (Dexie hooks), First-launch licencelfogadás és Root bypass biztonságos működésének ellenőrzése és megerősítése.

## [2.26.0] - 2026-10-08

### Fixed / Javítva
- **🛡️ RBAC, Szerepkör és SQL RLS Átfogó Audit & Hibajavítások (`docs/RBAC_AUDIT.md`)**:
  - Supabase SQL RLS role ID-k kisbetűsítése (`'root'`, `'owner'`, `'staff'`, `'foster'`, `'volunteer'`, `'guest'`) és mind a 6 gyári szerepkör beszúrása az adatbázis seed-be.
  - Hiánytalan RLS házirendek (SELECT/INSERT/UPDATE/DELETE) hozzáadása mind az 16 adatbázis táblához (`foster_supplies`, `foster_expenses`, `cat_weights`, `donation_campaign_items`, `event_templates`, `auto_backups`, `settings`, `app_roles`).
  - Pénzügyi modul táblanév elnevezésének szinkronizálása: `expenses` javítása `finances` névre az RBAC Mátrix és Drag-and-Drop Canvas felületeken.
  - Új felhasználó felvételekor az alapértelmezett szerepkör javítása `caregiver`-ről `staff`-ra.

## [2.24.0] - 2026-10-06

### Added
- **🩺 Audit / Belső ellenőrzés modul (`SystemAuditPanel` & `runSystemHealthAudit`)**:
  - Egykattintásos átfogó egészségügyi teszt a Beállítások menüben.
  - Ellenőrzések: Környezet (APP_VERSION, online státusz, localStorage, IndexedDB), Adatbázis (kapcsolat, séma, táblák rekordszámai, adatintegritás, függőben lévő szinkronok), Zustand állapottár, Service Worker & PWA, Licenc státusz, Felhő beállítások (Supabase, Google Drive) és Tárhely kvóta.
  - Összegző műszerfal (OK / FIGYELMEZTETÉS / HIBA számlálók), kategória szűrők, valamint Text és JSON formátumú riport exportálási lehetőség.
  - Root módból elérhető biztonságos adatbázis javítási funkció hiányzó mezők pótlására.

## [2.23.0] - 2026-10-06

### Added
- Teljes Supabase DDL & RLS séma generáló modul (`generateFullSupabaseSchemaSql()`), amely hiánytalan, azonnal futtatható SQL scriptet ad a Supabase SQL Editor számára (minden tábla, RLS szabály, segédfüggvény, seed adatok és indexek).
- Átdolgozott "Teljes Supabase séma (SQL Editor)" szekció a Beállítások diagnosztika fülén, egykattintásos vágólapra másolási és `.sql` fájlként történő letöltési opcióval.

### Improved
- Egységesített SQL séma generálás a `SupabaseRbacSection` és `VisualRbacCanvasModal` komponensekben a kódduplikáció elkerülésére.

## [2.22.0] - 2026-10-06

### Improved
- Mobile UX: forms, modals, bottom nav spacing, touch targets, list/filter layouts on small screens

## [2.21.0] - 2026-10-06

### Fixed
- Fixed broken bump-version.js; package.json remains single source of truth for version

### Added
- Stronger cat form validation (chip 15 digits, date logic, required fields)
- Duplicate warning for similar name / same chip on cat save

### Changed
- Replaced default README with proper Hungarian project README

## [2.20.0] - 2026-10-06

### Fixed
- Completed Donation Campaigns data layer: types + Dexie tables for donationCampaigns and donationCampaignItems (UI already existed).

### Notes
- App version set to 2.20.0.

## [2.16.0] - 2026-10-06

### Added / Hozzáadva
- **📜 Licencfeltételek elfogadása (First-launch)**:
  - Kötelező, blokkoló License Acceptance Modal az első indításkor
  - Checkbox + „Elfogadom” gomb, elfogadás mentése localStorage-ba timestamppel
  - Teljes kétnyelvű (angol + magyar) licencszöveg megtekintése
- **⚙️ Beállítások → Licenc fül bővítése**:
  - Licencinformáció szekció (© HES Projects® by FePe – All Rights Reserved)
  - Elfogadás dátumának megjelenítése
  - Teljes licenc modal megnyitása
- **🎗️ Adó 1% Felajánlás továbbfejlesztés**:
  - Bővített rögzítés: adóév, NAV / utalási azonosító mezők
  - Dedikált 1% KPI kártya a Pénzügyek áttekintőn (idei / előző évi összeg, tranzakciószám)
  - Szűrhető 1% kategória a pénzügyi listában
- **🎁 Adománygyűjtő akciók modul**:
  - Akciók rögzítése, tételes gyűjtött termékek, kategória összesítés és raktárba vezetés
- **🛡️ Adatvalidáció & Duplikáció szűrés**:
  - Kötelező mezők, 15 jegyű magyar mikrochip formátum ellenőrzése, dátum-logika és duplikáció szűrés
- **🛠️ Verzió szinkronizáció megerősítése**:
  - `bump-version` és `sync-version` scriptek javítása, `package.json` mint egyetlen hiteles forrás
- **📄 LICENSE fájl**: Kétnyelvű All Rights Reserved licenc (HES Projects® by FePe)

## [2.15.0] - 2026-09-06

### Added / Hozzáadva
- **🔑 Ideiglenes Root jogosultság-emelés (Ideiglenes Root Timeout)**: 30 perces automatikus kilépés Root módból normál (PIN kódos) belépés esetén.
- **🛠️ Service Kód (Távoli segítség)**: Lehetőség egyszer használatos `CICA-SERVICE-<PAYLOAD>-<SIGNATURE>` formátumú kódok megadására a Root belépésnél, amivel az alap licenc megváltoztatása nélkül lehet diagnosztikát/javítást végrehajtani korlátozott ideig (60 perc).

## [2.13.0] - 2026-08-16

### Added / Hozzáadva
- **🔑 Licenc Ellenőrző Rendszer (v1)**:
  - **Helyi Licenckezelés**: Helyi (client-side) licenckezelő modul integrálása a beállításokba, ami egy 7 napos türelmi (grace) időszakot biztosít az érvényesítéshez.
  - **Soft Lock Biztonsági Rendszer**: Lejárt vagy hiányzó licenc esetén a rendszer automatikusan "olvasási módba" (soft lock) vált, amely minden írási, mentési és törlési műveletet blokkol az adatbázisban és a felhőszinkronizációban, ezzel megakadályozva a jogosulatlan adatmódosításokat.
  - **Vizuális Figyelmeztetések**: A főoldalon és egy felugró toast üzeneten keresztül is vizuálisan tájékoztatja a felhasználót a licencállapotról és a hátralévő türelmi napokról.
