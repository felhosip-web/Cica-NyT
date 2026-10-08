# Changelog - Cica-NYT (Macska Nyilvántartó)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **🛠️ Service Kód (Távoli segítség)**: Lehetőség egyszer használatos `CICA-SERVICE-<PAYLOAD>-<SIGNATURE>` formátumú kódok megadására a Root belépésnél, amivel az alap licenc megváltoztatása nélkül lehet diagnosztikát/javítást végezni korlátozott ideig (60 perc).

## [2.13.0] - 2026-08-16

### Added / Hozzáadva
- **🔑 Licenc Ellenőrző Rendszer (v1)**:
  - **Helyi Licenckezelés**: Helyi (client-side) licenckezelő modul integrálása a beállításokba, ami egy 7 napos türelmi (grace) időszakot biztosít az érvényesítéshez.
  - **Soft Lock Biztonsági Rendszer**: Lejárt vagy hiányzó licenc esetén a rendszer automatikusan "olvasási módba" (soft lock) vált, amely minden írási, mentési és törlési műveletet blokkol az adatbázisban és a felhőszinkronizációban, ezzel megakadályozva a jogosulatlan adatmódosításokat.
  - **Vizuális Figyelmeztetések**: A főoldalon és egy felugró toast üzeneten keresztül is vizuálisan tájékoztatja a felhasználót a licencállapotról és a hátralévő türelmi napokról.

---

## [2.10.0] - 2026-08-13

### Added / Hozzáadva
- **💳 Pénzügyi Kezelés Modul (Be/Ki mozgások & Lekérdezések)**:
  - **Főmenü & Navigáció Integráció**: Új *💳 Pénzügyek* fül a felső és alsó navigációs sávokban, élő tételszámlálóval és közvetlen gyorseléréssel.
  - **📈 Bevételek (Be) & Kiadások (Ki) Rögzítése**:
    - **Bevételek**: Adományok, 1% felajánlások, örökbefogadási díjak, pályázati források és egyéb bevételek.
    - **Kiadások**: Állatorvosi kezelések, táp & alom költségek, felszerelés, rezsi / működési költségek, szállítás / üzemanyag és TNR kiadások.
  - **⚡ Intelligens Gyors-Űrlap (`FinanceFormModal`)**:
    - Egykattintásos gyorsösszeg hozzáadó gombok (+2 000 Ft, +5 000 Ft, +10 000 Ft, +25 000 Ft, +50 000 Ft, +100 000 Ft).
    - Fizetési mód választó (Készpénz, Bankkártya, Banki átutalás, PayPal/Online).
    - Számlaszám / bizonylatszám, partner/adományozó/szállító megnevezése és státusz (*Teljesült*, *Függőben*, *Stornózva*).
    - Közvetlen összekapcsolási lehetőség a nyilvántartott macskákkal vagy ideiglenes befogadókkal.
  - **📊 Pénzügyi MÉRLEG & Dinamikus KPI Műszerfal**:
    - Valós idejű mutatók: Összes Bevétel, Összes Kiadás, Nettó Pénzügyi Egyenleg (Mérleg) és Függőben lévő kifizetések/bevételek.
    - Havi bevételeket és kiadásokat összehasonlító 12 hónapos oszlopgrafikon.
    - Kategóriánkénti kiadás- és bevétel-megoszlási kördiagram.
  - **🔍 Részletes Időszakos Szűrés & Keresés**:
    - Időszak választó (*Ez a hónap*, *Előző hónap*, *Idei év*, *Egyéni dátumtartomány*).
    - Típus, kategória és státusz szűrők, valamint azonnali szöveges keresés tételre, partnerre vagy számlaszámra.
  - **📥 Exportálás & 🖨️ Nyomtatás**:
    - Szűrt pénzügyi tranzakciók letöltése CSV / Excel formátumba.
    - Letisztult, hivatalos egyesületi nyomtatható kimutatás nyomtatása / PDF mentése.
  - **🔄 Offline IndexedDB v14 & Felhő Szinkronizáció**:
    - Új `finances` adattábla a helyi Dexie adatbázisban, automatikus Google Drive mentési és Supabase szinkronizációs támogatással, valamint PostgreSQL DDL generátorral.

---

## [2.9.1] - 2026-08-13

### Added / Hozzáadva
- **🔍 Mentési Adatbázis Validáció & Különbség-Elemző Modal (`v2.9.1 Patch`)**:
  - **Visszaállítás Előtti Biztonsági Ellenőrzés**: Automatikus összehasonlítás a helyi adatbázis és a kiválasztott mentési fájl között a visszaállítás végrehajtása előtt.
  - **📊 Rekordszám & Nettó Eltérés Elemzés**: Megjeleníti a jelenlegi és mentésbeli rekordszámokat, valamint a nettó változásokat kategóriánként.
  - **🔎 Elem-Szintű Változás Kimutatás**: Részletes lista a felvételre kerülő új elemekről (`+ Új`), a frissülő tartalmú rekordokról (`✏️ Módosul`) és a mentésben nem szereplő helyi adatokról (`⚠️ Felülíródik`).
  - **🛡️ Kockázati Besorolás & Felülírási Nyilatkozat**: Kockázati elemzés (alacsony, közepes, magas); adatvesztési kockázat esetén kötelező felhasználói megerősítés.
  - **🔄 Univerzális Integráció**: Elérhető Google Drive mentések, Helyi Auto-Mentések és Kézi JSON fájl import esetén egyaránt.

---

## [2.9.0] - 2026-08-13

### Added / Hozzáadva
- **⏱️ Inkrementális & Automatikus Biztonsági Mentési Rendszer (Automated Backups)**:
  - **Háttérbeli Ütemezés**: Automatikus mentési pontok generálása tesztreszabható gyakorisággal (Belépéskor, Óránként, 6 óránként, Naponta, Hetente).
  - **🛡️ Inkrementális Változás-Észlelés**: Intelligens hash ellenőrzéssel csak akkor készít új mentési pontot, ha történt tényleges adatváltozás, megakadályozva a felesleges duplikátumokat.
  - **🛠️ PostgreSQL / SQL Dump Export (.sql)**: Szabványos, termelésre kész SQL beszúró script generálás Supabase / PostgreSQL adatbázisokhoz.
  - **💾 Célhely & Formátum Testreszabás**: Mentés Helyi IndexedDB pillanatképekbe, Google Drive Felhőbe, vagy mindkettőbe JSON és SQL formátumban.
  - **🕒 Mentési Pontok Története & 1-Kattintásos Visszaállítás**: Beépített helyi mentési felület előnézettel, rekordszámokkal, letöltési opciókkal és biztonságos visszaállítással.
  - **🔍 Mentési Validáció & Különbség-Elemzés**: Visszaállítás előtti automatikus összehasonlítás a jelenlegi adatbázis és a mentési fájl között (rekordszámok, nettó eltérések, új, módosuló és felülíródó elemek részletes kimutatása kockázati besorolással).
  - **📦 Megőrzési Szabályzat (Retention Policy)**: Automatikus tisztítás a beállított maximális mentési pontok száma alapján.

---

## [2.8.0] - 2026-08-13

### Added / Hozzáadva
- **☁️ Személyes Google Drive Mentés & Visszaállítás**:
  - **Manuális Feltöltés & Letöltés**: Teljes adatbázis (macskák, események, ideiglenes befogadók, készlet, TNR adatok) biztonsági mentése és helyreállítása közvetlenül a felhasználó saját Google Drive tárhelyéről.
  - **Biztonságos Google Bejelentkezés**: Firebase Google Auth popup bejelentkezés szigorúan `drive.file` hatókörrel, amely kizárólag az alkalmazás saját mentési fájljaihoz ad hozzáférést.
  - **Kétirányú Supabase Szinkronizáció**:
    - **Drive ➔ Supabase**: Visszaállítás során lehetőség van a helyreállított adatok automatikus feltöltésére és frissítésére a Supabase felhő adatbázisban is.
    - **Supabase ➔ Drive**: Egykattintásos Supabase adatok letöltése a helyi adatbázisba, majd friss biztonsági mentés automatikus feltöltése a Google Drive-ra.
  - **Kötelező Megerősítő Párbeszédablakok**: A felülíró/törlő műveletek előtt részletes adatösszegző megerősítő ablak véd a véletlen adatvesztés ellen.
  - **Drive Mentési Fájlkezelő**: Előnézeti adatok (rekordszámok, mentés dátuma), közvetlen letöltés és törlési lehetőség.

---

## [2.6.0] - 2026-08-12

### Added / Hozzáadva
- **🏷️ Egyedi Címke (Tag) Rendszer**:
  - **Állapotok és Csoportosítás**: Macskák tetszőleges állapot szerinti címkézése (pl. `karanténban`, `kezelés alatt`, `gazdihoz vár`, `félős / szocializálandó`, `elkülönítve`, `örökbefogadható`, `orvosi megfigyelés`, `diétás étrend`, `műtétre vár`).
  - **Kényelmes Gyorsválasztó & Egyedi Címke Beviteli Mező**: Egykattintásos gyakori címkekiválasztás és tetszőleges saját címke hozzáadása Enter / kattintás segítségével a cica felvételi és szerkesztési űrlapján.
  - **Vizuális Jelvények (Badges)**: Színkódolt, ikonokkal ellátott badge-ek a cica kártyákon, a cica adatlapján és a táblázatos nézetben.
  - **Szűrés & Keresés Címke Szerint**: Interaktív címkeszűrő sáv (quick tag pills) a cica listában, címke szerinti lebegő szűrőválasztó, valamint intelligens keresőmező, ami címke nevére is azonnal keres.
  - **📜 Supabase DDL Séma**: Frissített `cats` PostgreSQL tábladefiníció `tags TEXT[] DEFAULT '{}'` mezővel.

---

## [2.5.0] - 2026-08-12

### Added / Hozzáadva
- **📦 Alom és Táp Készletező Modul (Inventory Management)**:
  - **Bejövő készletmozgások**: Adományok (dátum, forrás/adományozó) és saját vásárlások (saját vagy alapítványi költségen) rögzítése.
  - **Kimenő készletmozgások**: Kiadások nyomon követése (dátum, címzett - pl. ideiglenes befogadó, saját helyi menhely - és célállomás).
  - **Kategóriák és Mértékegységek**:
    - **🥫 Nedves táp**: Konzerv, alutasak, paté kiszerelések darabszámos (`db`) nyilvántartása.
    - **🥣 Száraz táp**: Tápok és tápszerek nyilvántartása `kg` vagy `csomag / zsák` mértékegységgel.
    - **📦 Alom**: Szilikát, fapellet és csomósodó alom nyilvántartása `kg`, `zsák`, `liter`, vagy `doboz` mértékegységben.
  - **📊 Raktári KPI Műszerfal**: Valós idejű készletegyenleg számítás (bőséges / megfelelő / alacsony raktárkészlet jelzés), irány és kategória szerinti szűrők, intelligens keresőmező.
  - **🔄 Offline IndexedDB & Supabase Szinkronizáció**: Kétirányú sorban álló felhő szinkronizáció és helyi IndexedDB tárolás (Version 12 `inventory` tábla).
  - **📜 Supabase DDL & RLS Séma**: Automatizált `inventory` táblalétrehozó SQL script és PostgreSQL Row Level Security (RLS) szabályok generálása a Beállítások menüben.

### Fixed / Javítva
- **🎨 Készletmozgás Űrlap Fejléc & Kontraszt**: A készletmozgás ablak fejlécének és beviteli mezőinek vizuális és kontraszt javítása kényszerített sötét módú mobilkijelzőkön is.
- **📱 PWA Verzióváltás & Toast Hurok**: Szigorú semver alapú frissítés-ellenőrzés a PWA frissítési felugró hurok végleges kijavítására.

---

## [2.4.1] - 2026-08-12

### Added / Hozzáadva
- **🔄 Helyi & Felhő Szinkronizáció**: Befogadó hálózat adatainak szinkronizációja (`foster_parents`, `foster_supplies`, `foster_expenses`).
- **📜 Supabase / PostgreSQL SQL DDL Séma**: Foster care tábladefiníciók és RLS szabályok frissítése.

### Fixed / Javítva
- **📱 PWA Finomhangolás**: Service Worker gyorsítótár frissítés és offline működés optimalizálása.

---

## [2.4.0] - 2026-08-12

### Added / Hozzáadva
- **🏡 Ideiglenes Befogadó Hálózat Menedzsment Modul**: Kapacitási KPI műszerfal, táp- és alomigény kalkulátor, támogatási napló.
- **🐈 Cica-Befogadó Hozzárendelés**: Áthelyezés a gondozási központ és a befogadók között.
- **🌐 Összefüggések Vizuális Canvas**: Interaktív Node-Link SVG canvas felület.
