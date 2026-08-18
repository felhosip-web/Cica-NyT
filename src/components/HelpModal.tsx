import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';

interface HelpModalProps {
  onClose: () => void;
}

interface ChangelogItem {
  version: string;
  date: string;
  changes: string[];
}

const FALLBACK_CHANGELOG: ChangelogItem[] = [
  {
    "version": "2.12.1",
    "date": "2026-08-14",
    "changes": [
      "🔔 Értesítések, Push Preferenciák & Riasztási Küszöbök (Új!): Átfogó értesítéskezelő és küszöbérték-beállító almenü rendszer a Beállítások felületen",
      "📱 Böngésző Web Push & In-App Riasztási Csatornák: Böngésző push engedély kezelése, közvetlen zárolt képernyős push, alkalmazáson belüli figyelmeztető sávok, egyéni hangjelzés és haptikus rezgésvezérlés",
      "⏰ Időzítés, Napi Összefoglaló & Csendes Időszak: Testreszabható napi ellenőrzési időpont (pl. 08:00), riasztási frekvencia módok (Azonnali + Napi összefoglaló, Csak azonnali, Csak napi digest), valamint éjszakai 'Ne zavarjanak' (Quiet Hours) némítás",
      "💉 Oltási és Orvosi Határidő Küszöbök: Általános előzetes figyelmeztetési napok (lead days), sürgős határidők (urgent days), lejárt oltások figyelése, és külön protokoll-időzítők (Kölyök cica protokoll, Veszettség elleni kötelező oltás, Éves ismétlő oltások)",
      "📅 Eseménytípusonkénti Finomhangolás: Oltások, orvosi kezelések, műtétek/ivartalanítások, tesztek és egyedi feladatok egyenkénti ki/bekapcsolása, előzetes napjai és push/in-app csatornái gyorsválasztó gombokkal",
      "📦 Raktárkészlet Biztonsági Küszöbök: Kategóriánkénti minimum készletszintek meghatározása (nedves táp, száraz táp, alom, gyógyszer, parazitamentesítő, fertőtlenítő, felszerelés, egyéb) élő raktári egyenlegekkel",
      "⏳ Lejárat & Szavatosság Figyelő: Raktáron lévő tételek automatikus lejárati figyelmeztetése beállítható előzetes figyelmeztetési nappal és lejárt készlet riasztással",
      "🧪 Élő Diagnosztikai Vizsgálat & Tesztelő: Egykattintásos valós idejű rendszervizsgálat esedékes oltásokra, készlethiányra és lejáró termékekre, teszt push küldési és alaphelyzetbe állítási lehetőséggel"
    ]
  },
  {
    "version": "2.12.0",
    "date": "2026-08-14",
    "changes": [
      "🛡️ 360° Review & Audit Center (Új!): Átfogó, mélyreható auditáló és biztonsági diagnosztikai központ a rendszerintegritás felügyeletére",
      "👥 Felhasználói Szintek & Jogosultság Audit (RBAC Audit): Teljes szerepkör- és felhasználói struktúra ellenőrzése, Biztonsági Index (Security Score 0-100%), PIN-kódos védettség vizsgálata, egyedi jogosultság-felülbírálások (custom overrides) és jogosultsági túlcsordulások azonnali kimutatása",
      "🩺 Kezelések & Orvosi Napló Audit (Medical Integrity): Oltások, kezelések, laborvizsgálatok és egészségügyi események tételes vizsgálata (kezelőorvos hozzárendelés, költségek érvényessége, hibás dátumok kiszűrése)",
      "⚡ Egykattintásos Orvosi Pecsétpótlás & Normalizálás: Automatikus segédeszköz a hiányzó audit időbélyegek, felelős orvosi/kezelői pecsétek és numerikus költségek pótlására az adatbázisban",
      "🔑 Be- és Kiléptetések & Munkamenet Napló (Auth Audit): Valós idejű és historikus hozzáférési naplózás (sikeres belépések, PIN hibák, felhasználóváltások, Root hozzáférések, felhasználó/szerepkör létrehozás és módosítás)",
      "⚡ 360° Egykattintásos Rendszeraudit Diagnosztika: Teljes adatbázis és jogosultsági felülvizsgálat összesített minőségi pontszámmal és azonnali észrevételekkel",
      "💰 Cica Profil Összköltség Kimutatás (Patch C): Teljes pénzügyi és orvosi költségmérleg a cica profilban (orvosi beavatkozások, események és befogadói ellátások összesítése)"
    ]
  },
  {
    "version": "2.11.0",
    "date": "2026-08-14",
    "changes": [
      "🧩 Patch Upgrade & Verziókövető Rendszer (Új!): Dedikált menüfül és háttérszolgáltatás az adatbázis-rekordok inkrementális javítására és sémaintegritás ellenőrzésére",
      "🐈 Patch A (Állatnyilvántartás & Egészségügyi Modul): Alapadatok, státuszok, kiskönyv/chip logikai értékek normalizálása, egyedi címkék (tags) tisztítása, oltási és kezelési költségek számszerűsítése és audit időbélyegek pótlása",
      "📦 Patch B (Befogadó Hálózat, Raktár & Pénzügy): Befogadói szülők kapacitás- és státuszellenőrzése, raktárkészlet tranzakciók mennyiségeinek és mértékegységeinek érvényesítése, pénzügyi bevételek és kiadások tételeinek normalizálása",
      "🔗 Kapcsolódó Elemek Patch (Relációs Kereszt-Entitás Indexelés): Macskák, naptári események, befogadói ellátmányok, raktári mozgások és pénzügyi tranzakciók közötti keresztkapcsolatok intelligens feloldása és indexelése",
      "⚡ Valós Idejű Futtatási Konzol & Részletes Napló: Élő visszajelzés a patch műveletekről, érintett rekordok számlálójával, futásidővel és idempotens újrafuttatási lehetőséggel",
      "🐾 Cica Adatlap Gyorsművelet: Közvetlen '⚡ Relációk Patch' gomb a Cica Részletes Nézet Kapcsolódó Elemek fülén az azonnali kapcsolat-újraindexeléshez"
    ]
  },
  {
    "version": "2.10.0",
    "date": "2026-08-13",
    "changes": [
      "💳 Pénzügyi Kezelés Modul (Új!): Bevételek és kiadások tételes nyilvántartása, kategorizálása és kezelése az új 💳 Pénzügyek főmenü fülön",
      "📈 Bevételek & Kiadások Rögzítése: Adományok, 1% felajánlások, örökbefogadások, pályázatok, orvosi számlák, táp/alom, rezsi, szállítás és TNR költségek",
      "⚡ Gyors-Űrlap: Egykattintásos összeghozzáadás, fizetési módok (KP, Kártya, Átutalás, PayPal), bizonylatszám, partner és közvetlen Cica/Befogadó összekapcsolás",
      "📊 Pénzügyi Mérleg & KPI Műszerfal: Valós idejű mutatók (Összes Bevétel, Kiadás, Nettó Egyenleg, Függő tételek), havi oszlopgrafikon és kategóriamegoszlási diagram",
      "🔍 Időszakos Szűrők & Keresés: Éves, havi és egyéni dátumtartomány szűrő, kategóriaszűrők, státuszválasztó és azonnali szöveges kereső",
      "📥 Exportálás & 🖨️ Nyomtatás: Szűrt tranzakciók CSV / Excel letöltése és hivatalos nyomtatható egyesületi pénzügyi kimutatás generálása",
      "🔄 IndexedDB v14 & Felhő Szinkronizáció: Helyi 'finances' tábla, kétirányú Supabase és Google Drive integráció, PostgreSQL DDL generátor"
    ]
  },
  {
    "version": "2.9.1",
    "date": "2026-08-13",
    "changes": [
      "🔍 Mentési Validáció & Különbség-Elemző Modal: Visszaállítás előtti automatikus összehasonlítás a helyi adatbázis és a kiválasztott mentési fájl között",
      "📊 Rekordszám & Nettó Eltérés Elemzés: Megjeleníti a jelenlegi és mentésbeli rekordszámokat, valamint a nettó eltéréseket kategóriánként",
      "🔎 Elem-Szintű Változás Kimutatás: Részletes lista az új elemekről (+ Új), módosuló adatokról (Módosul) és felülírt adatokról (Felülíródik)",
      "🛡️ Kockázati Besorolás & Nyilatkozat: Alacsony, közepes és magas kockázati szintek jelzése; magas kockázat esetén kötelező megerősítéssel",
      "🔄 Univerzális Integráció: Működik Google Drive mentéseknél, helyi auto-mentési pontoknál és kézi JSON fájl importnál is"
    ]
  },
  {
    "version": "2.9.0",
    "date": "2026-08-13",
    "changes": [
      "⏱️ Inkrementális & Automatikus Mentési Rendszer: Háttérbeli ütemezett mentések tesztreszabható gyakorisággal (Belépéskor, Óránként, 6 óránként, Naponta, Hetente)",
      "🛡️ Inkrementális Változás-Észlelés: Intelligens hash ellenőrzéssel csak akkor ment, ha történt adatváltozás, elkerülve a felesleges duplikátumokat",
      "🛠️ PostgreSQL / SQL Dump Export (.sql): Szabványos SQL adatbázis mentés beszúró script generálás Supabase / PostgreSQL rendszerekhez",
      "💾 Célhely & Formátum Finomhangolás: Mentés helyi IndexedDB pillanatképekbe, Google Drive-ra, vagy mindkettőbe JSON és SQL formátumban",
      "🕒 Helyi Mentési Pontok Története & 1-Kattintásos Visszaállítás: Visszaállítási felület rekordszámokkal, előnézettel, letöltési opcióval és megerősítéssel"
    ]
  },
  {
    "version": "2.8.0",
    "date": "2026-08-13",
    "changes": [
      "☁️ Személyes Google Drive Mentés & Visszaállítás: Teljes adatbázis (macskák, események, ideiglenes befogadók, készlet) manuális biztonsági mentése és helyreállítása közvetlenül a saját Google Drive tárhelyedről",
      "🔐 Firebase Google OAuth Integráció: Biztonságos bejelentkezés szigorúan 'drive.file' csökkentett jogosultsággal",
      "🔄 Kétirányú Supabase Szinkronizáció: Drive ➔ Supabase felhő frissítés visszaállításkor, valamint Supabase ➔ Drive egykattintásos felhő mentés",
      "⚠️ Interaktív Megerősítő Modallok: Részletes adatösszegzés és védelmi megerősítés a felülíró / törlő műveletek előtt",
      "📁 Drive Fájlkezelő & Előnézet: Rekordszámok ellenőrzése és fájlok kezelése közvetlenül a Beállítások menüben"
    ]
  },
  {
    version: "2.5.0",
    date: "2026-08-12",
    changes: [
      "📦 Alom és Táp Készletező Modul: Bejövő adományok (mikor, kitől/forrás) és saját vásárlások külön nyilvántartása, kimenő kiadások nyomon követése (címzett/helyszín pl. befogadók vagy helyi menhely)",
      "🥫 Elkülönített Nedves & Száraz Táp és Alom Készletkezelés: Nedves tápok (darabszám szerint), száraz tápok (választhatóan kg vagy csomag/zsák szerint), alomok (kg, zsák/csomag, liter, doboz szerint)",
      "📊 Valós Idejű Raktár KPI Műszerfal & Szűrők: Bőséges / alacsony raktárkészlet állapotkijelzés, kategória és mozgásirány szerinti szűrés, megjegyzés és keresési lehetőség",
      "🔄 Teljes Offline IndexedDB Persistence & Supabase Felhő Szinkronizáció: Automatikus sorban álló és kétirányú felhő szinkronizáció az új 'inventory' adattáblával",
      "📜 Supabase PostgreSQL SQL DDL & RLS Séma Kiterjesztés: Új 'inventory' tábla DDL és sorközi biztonsági (RLS) szabályok generálása a beállítások menüben"
    ]
  },
  {
    version: "2.4.1",
    date: "2026-08-12",
    changes: [
      "🔄 Helyi (IndexedDB) & Felhő (Supabase) Bidirekcionális Szinkronizáció: A Befogadó Hálózat adatainak (foster_parents, foster_supplies, foster_expenses) kiterjesztése a sorban állási és automatikus újrakapcsolódási szinkronizációra",
      "📜 Frissített Supabase / PostgreSQL SQL DDL Séma Generátor: Foster care tábladefiníciók, PostgreSQL Row Level Security (RLS) szabályok, auditálás és foster.* jogosultsági mátrix generálása egy kattintásos másolással",
      "📱 PWA Finomhangolás & Service Worker v2.4.1: Frissített gyorsítótár verziózás (Cache v2.4.1), intelligens offline tartalékképzés, gyorsabb alkalmazásbetöltés és háttérbeli frissítés-érzékelés"
    ]
  },
  {
    version: "2.4.0",
    date: "2026-08-12",
    changes: [
      "🏡 Ideiglenes Befogadó Hálózat Menedzsment Modul: Új főmenü lapfül, kapacitási és kihasználtsági KPI műszerfal, automatikus táp- és alomigény kalkulátor, támogatási napló és költségnyilvántartás bizonylatszámmal",
      "🐈 Dinamikus Cica-Befogadó Hozzárendelés: Egykattintásos áthelyezés a gondozási központ és a befogadók között, élő létszámszámlálóval és különleges karantén/kölyök/beteg címkékkel",
      "🌐 Állatok – Események – TNR Összefüggések Vizuális Canvas Munkaterület: Interaktív csomópont alapú (Node-Link SVG Canvas) felület az állatok, orvosi naplók és TNR beavatkozások kapcsolati hálójának vizuális áttekintésére és elemzésére",
      "📋 Esemény Sablonkezelő & Gyors Kitöltő Rendszer: Előre konfigurált űrlap-sablonok gyakori beavatkozásokhoz (oltások, ivartalanítás, labor, parazitamentesítés) a gyors adatbevitelhez, saját sablonok mentésével és kezelésével"
    ]
  },
  {
    version: "2.3.0",
    date: "2026-08-12",
    changes: [
      "🎨 Vizuális Drag & Drop RBAC & RLS Canvas Munkaterület: Interaktív csomópont alapú (Node Canvas) felület a felhasználók, szerepkörök, atomi CRUD jogosultságok és Supabase PostgreSQL táblák vizuális összekötésére és szerkesztésére",
      "📊 Interaktív CRUD Jogosultsági Mátrix: Részletes (R|C|U|D) és összegző [R|C|U|D] táblázatos áttekintő nézet az összes szerepkör és moduláris művelet jogosultsági lefedettségének ellenőrzésére",
      "🧪 Live Role Simulator & Access Tester: Valós idejű szerepkör tesztelő konzol, amellyel bármely felhasználói szerepkör szimulálható a felületi elemek és adatbázis műveletek korlátozásának ellenőrzésére",
      "📜 Supabase RLS SQL DDL Script Generátor: Automatizált PostgreSQL Row Level Security (RLS) SQL szabályok és check_user_permission segédfüggvények generálása egy kattintásos vágólapra másolással",
      "📋 Mátrix Exportálása Markdown Formátumban: A teljes jogosultsági mátrix exportálása dokumentációs és auditálási célokra"
    ]
  },
  {
    version: "2.2.2",
    date: "2026-08-08",
    changes: [
      "🔑 Felhasználói szerepkörök (ROOT, OWNER, STAFF, FOSTER, VOLUNTEER, GUEST) logikája és engedély-kezelése a store-ban",
      "⚙️ Szerepkörök és felhasználói fiókok kezelése a Settings modulban kizárólag ROOT szintű belépéssel",
      "🛡️ Audit Event Lekérdezés & Napló (Audit Log) a Debug panelben a rendszeresemények és módosítások nyomon követésére",
      "📋 Supabase / PostgreSQL Row Level Security (RLS) SQL script generálás és vágólapra másolható utasítás a Debug modulban",
      "⚖️ Új bekerülési típus: 'Elkobzott' kategória a cica rögzítésnél, szűréseknél, adatlapokon, statisztikákban és PDF exportokban"
    ]
  },
  {
    version: "2.2.1",
    date: "2026-08-06",
    changes: [
      "✂️ TNR (Befog-Ivartalanít-Elenged) nyilvántartó modul és új főmenü lapfül",
      "🎴 Dual felületi nézetek: Kártyás (Grid) és Listás (Táblázatos) felület gyors-váltóval",
      "📍 Részletes TNR adatrögzítés: Befogás helye/ideje/befogója, Műtét helye/orvosa, Elengedés helye/ideje, fülcsipke jelzés és megjegyzések",
      "🛡️ Jogosultságkezelési integráció: TNR rögzítési és módosítási engedély (canManageTnr) beépítése a szerepkörökbe",
      "📄 Hatósági PDF Exportálás: Tetszőleges időszakra vonatkozó TNR jegyzőkönyv és hivatalos kimutatás generálása aláírási rovatokkal",
      "📊 Dinamikus TNR statisztikai összefoglaló kártyák és státusz-alapú szűrés (Befogva, Műtét alatt, Elengedve)"
    ]
  },
  {
    version: "2.1.1",
    date: "2026-08-06",
    changes: [
      "👥 Több-felhasználós üzemmód (Multi-User Mode) & PIN kóddal védett profilváltás",
      "🛡️ Hozzáférési jogosultsági szintek: Rendszergazda (Root), Főgondozó, Gondozó és Csak Megtekintő szerepkörök",
      "🔑 Egyedi jogosultság-felülbírálások és műveleti gombok (új cica, szerkesztés, törlés, pénzügy) dinamikus zárolása",
      "⚙️ Beállítások felület bővítés: Új 'Felhasználók & Jogosultságok' kezelő lapfül"
    ]
  },
  {
    version: "2.0.2",
    date: "2026-08-06",
    changes: [
      "📱 Automatikus Mobil & Desktop nézet detektálás",
      "🖥️/📱 Nézet mód választó és státusz ikon a fejlécedben",
      "🔑 Root hozzáférési mód finomhangolási és SQL séma konzollal"
    ]
  },
  {
    version: "2.0.1",
    date: "2026-08-06",
    changes: [
      "🚀 2.0.1 Teljes React 19 + TypeScript + Vite PWA modernizáció",
      "Offline-first IndexedDB (Dexie.js) biztonságos adatkezelés",
      "Modern FullCalendar interaktív naptár és eseménykezelő",
      "Továbbfejlesztett Súgó & Változási napló (Change Log)",
      "Frissített témák, reszponzív felület és PDF exportálási funkciók"
    ]
  },
  {
    version: "1.6.4",
    date: "2026-08-02",
    changes: [
      "Bugfix: Kijelölési módban a kártyára kattintáskor a szerkesztés nyílt meg a kijelölés helyett"
    ]
  },
  {
    version: "1.4.0",
    date: "2026-07-31",
    changes: [
      "🕊️ 1.4.0 Elhunyt státusz kulturált szürke design, megemlékezés, validáció, szűrés"
    ]
  },
  {
    version: "1.3.1",
    date: "2026-07-31",
    changes: [
      "PDF autoTable import fix"
    ]
  },
  {
    version: "1.3.0",
    date: "2026-05-13",
    changes: [
      "Kiskönyv (oltási könyv) checkbox és adatok rögzítése",
      "Kijelölő mód a lista kártyáin, exportáláshoz",
      "PDF Kimutatás generálása (Sima és Könyvelői/Pénzügyi formátumban)",
      "Kereső kiterjesztése a kiskönyv számára"
    ]
  },
  {
    version: "1.2.0",
    date: "2026-05-13",
    changes: [
      "Befogott és Behozott kategóriák szétválasztása (dinamikus űrlap)",
      "Gyorsszűrő gombok a főoldalon (Befogott, Behozott, Gazdis)",
      "Kereső kiterjesztése a beérkezés adataira",
      "Kártya design frissítés (címkék a listában és az adatlapon)"
    ]
  },
  {
    version: "1.1.0",
    date: "2026-05-13",
    changes: [
      "Beállítások menü",
      "Szervezet neve + státusz a főoldalon",
      "Felhő szinkron alapok + export/import",
      "Átfogó Súgó és Changelog",
      "Verziókezelés javítva"
    ]
  },
  {
    version: "1.0.2",
    date: "2026-05-12",
    changes: [
      "Gazdis extra mezők: dátum, örökbefogadó neve, elérhetőség",
      "Lista render bug javítva szerkesztés után"
    ]
  },
  {
    version: "1.0.1",
    date: "2026-05-12",
    changes: [
      "Tailwind build javítva, deploy yaml deploy-pages@v4-re"
    ]
  },
  {
    version: "1.0.0",
    date: "2026-05-12",
    changes: [
      "Alap nyilvántartás, Dexie IndexedDB, PWA"
    ]
  }
];

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'changelog'>('guide');
  const [changelog, setChangelog] = useState<ChangelogItem[]>(FALLBACK_CHANGELOG);

  useEffect(() => {
    fetch('/changelog.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setChangelog(data);
        }
      })
      .catch(() => {
        // Fallback initialized in state
      });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-gray-900">
              ❓ Cica-NyT Súgó
            </h3>
            <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
              v{APP_VERSION}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 font-bold text-xs border-b-2 text-center transition ${
              activeTab === 'guide'
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📖 Útmutató
          </button>
          <button
            onClick={() => setActiveTab('changelog')}
            className={`flex-1 py-2 font-bold text-xs border-b-2 text-center transition ${
              activeTab === 'changelog'
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📜 Változási napló (Change log)
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 font-medium text-gray-700 leading-relaxed">
          {activeTab === 'guide' ? (
            <div className="space-y-3">
              {/* v2.12.1 Notifications & Thresholds System */}
              <div className="p-3.5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-xl border border-purple-500/40 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-purple-200 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    🔔 Értesítések, Push Preferenciák & Küszöbök (Új v2.12.1!)
                  </h4>
                  <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700/60 font-bold px-2 py-0.5 rounded-full">
                    Beállítások ➔ Értesítések
                  </span>
                </div>
                <p className="text-purple-100 text-[11px] leading-relaxed">
                  Átfogó, finomhangolható értesítési központ a védőoltások, orvosi kontrollok és raktárkészlet-szintek automatikus felügyeletére. Négy integrált modulból áll:
                </p>
                <div className="grid grid-cols-1 gap-2 pt-1 text-[11px]">
                  <div className="p-2 bg-slate-950/70 rounded-lg border border-purple-500/20">
                    <span className="font-extrabold text-purple-300 block">📱 Push Preferenciák & Csatornák:</span>
                    <span className="text-slate-300">Böngésző Web Push engedélyezés (asztali és mobil zárolt képernyőre), In-App figyelmeztető szalagok, egyéni hang- és haptikus rezgésjelzés, napi rendszeres ellenőrzési időpont (alapértelmezett 08:00), riasztási gyakoriság (Azonnali / Napi összefoglaló), valamint éjszakai <i>'Ne zavarjanak'</i> csendes időszak.</span>
                  </div>
                  <div className="p-2 bg-slate-950/70 rounded-lg border border-purple-500/20">
                    <span className="font-extrabold text-pink-300 block">💉 Oltási és Kezelési Határidő Küszöbök:</span>
                    <span className="text-slate-300">Előzetes figyelmeztetési napok (pl. 14 nap), kritikus/sürgős határidők (3 nap), múltbeli elmaradt/lejárt oltások figyelése, kiemelt protokollok időzítése (Kölyök cica 8/12 hetes oltás, Veszettség, Éves ismétlő) és eseménytípusonkénti egyedi finomhangolás gyorsválasztó gombokkal.</span>
                  </div>
                  <div className="p-2 bg-slate-950/70 rounded-lg border border-purple-500/20">
                    <span className="font-extrabold text-amber-300 block">📦 Raktárkészlet Biztonsági Küszöbök & Lejárat:</span>
                    <span className="text-slate-300">Kategóriánkénti biztonsági minimum készletszintek (nedves táp db, száraz táp kg, alom kg/zsák, gyógyszerek, spot-on cseppek, fertőtlenítők, felszerelések) élő raktári egyenleg összehasonlítással, valamint beérkezett adományok és termékek szavatossági lejárat figyelője.</span>
                  </div>
                  <div className="p-2 bg-slate-950/70 rounded-lg border border-purple-500/20">
                    <span className="font-extrabold text-emerald-300 block">🧪 Élő Rendszerdiagnosztika & Tesztelő:</span>
                    <span className="text-slate-300">Egykattintásos azonnali vizsgálat, amely átvizsgálja az egész adatbázist, kilistázza az esedékes oltásokat, a minimális szint alá esett készleteket és a lejáró tételeket, valamint teszt push küldést és gyári alaphelyzetbe állítást biztosít.</span>
                  </div>
                </div>
              </div>

              {/* v2.12.0 Audit Center */}
              <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-emerald-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    🛡️ 360° Rendszeraudit & Integritás Központ (v2.12.0)
                  </h4>
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-600 font-bold px-2 py-0.5 rounded-full">
                    Beállítások ➔ Rendszeraudit
                  </span>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  Mélyreható biztonsági és adatbázis-integritási felügyelet: <b>RBAC jogosultság audit</b> (Biztonsági Index 0-100%, PIN védettség, egyedi jogosultság-túlcsordulások kiszűrése), <b>Orvosi napló integritás</b> (kezelőorvos és költség érvényesség, egykattintásos orvosi pecsétpótlás), valamint valós idejű <b>Be- és kiléptetési munkamenet napló</b>.
                </p>
              </div>

              {/* v2.11.0 Patch System */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-1">
                <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  🧩 Patch Upgrade & Relációs Indexelés (v2.11.0)
                </h4>
                <p className="text-gray-700 dark:text-amber-100 text-[11px] leading-relaxed">
                  Inkrementális adatbázis-javító és sémaintegritási motor: Állatnyilvántartási adatok (Patch A), Befogadó Hálózat és Raktár (Patch B), Pénzügyi tranzakciók (Patch C) és Kereszt-entitás relációs kapcsolatok indexelése élő futtatási konzollal.
                </p>
              </div>

              <div className="p-3 bg-pink-50 border border-pink-300 rounded-xl space-y-1">
                <h4 className="font-extrabold text-pink-950 text-xs flex items-center gap-1.5">
                  💳 Pénzügyi Kezelés & MÉRLEG (v2.10.0)
                </h4>
                <p className="text-gray-700 text-[11px] leading-relaxed">
                  Tételes bevételek (adományok, 1% felajánlások, örökbefogadási támogatások, pályázatok) és kiadások (állatorvos, táp & alom, felszerelés, rezsi, TNR) nyilvántartása a felső sáv <b>💳 Pénzügyek</b> fülén. Tartalmaz valós idejű pénzügyi mérleget (KPI kártyák), 12 havi trend oszlopdiagramot, kategóriamegoszlási grafikont, időszakos és kulcsszavas szűrőket, valamint 1-kattintásos <b>CSV/Excel exportot</b> és <b>hivatalos nyomtatható pénzügyi kimutatást</b>.
                </p>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
                  ⏱️ Inkrementális Auto-Mentések & SQL Export (Új v2.9.0!)
                </h4>
                <p className="text-gray-600">
                  Háttérben futó, ütemezett adatbázis-mentési rendszer (belépéskor, óránként, naponta stb.). Intelligens inkrementális védelemmel csak akkor ment, ha változás történt. Támogatja a helyi IndexedDB snapshots helyreállítást, a Google Drive automatikus feltöltést, valamint az azonnali szabványos PostgreSQL / SQL Dump (.sql) exportot! A Beállítások (⚙️) menüben finomhangolható.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                  ☁️ Google Drive & Supabase Biztonsági Mentés (Új v2.8.0!)
                </h4>
                <p className="text-gray-600">
                  Biztonsági mentés készítése közvetlenül a saját Google Drive tárhelyedre, és visszaállítás a helyi adatbázisba. Opcionálisan kétirányú Supabase felhő szinkronizációval (Drive ➔ Supabase frissítés visszaállításkor, illetve Supabase ➔ Drive egykattintásos mentés). A Beállítások (⚙️) menüben érhető el.
                </p>
              </div>

              <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-pink-900 text-xs flex items-center gap-1.5">
                  🐾 Macskák Nyilvántartása & 🏷️ Egyedi Címkék
                </h4>
                <p className="text-gray-600">
                  Minden cicához egyedi adatlap tartható fent sorszámmal, mikrochip számmal, ivartalanítási státusszal, kiskönyv bejegyzéssel és bekerülési előélettel. A cicák állapota tetszőleges egyedi címkékkel (pl. <i>'karanténban'</i>, <i>'kezelés alatt'</i>, <i>'gazdihoz vár'</i>) csoportosítható.
                </p>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-teal-900 text-xs flex items-center gap-1.5">
                  📦 Alom és Táp Készletező Modul (Új!)
                </h4>
                <p className="text-gray-600">
                  Bejövő adományok és vásárlások (mikor, kitől/honnan), valamint kimenő kiadások (befogadóknak, helyi menhelynek) rögzítése. Elkülönített nedves táp (db), száraz táp (kg/zsák) és alom (kg/zsák/liter) egyenleggel és KPI kártyákkal.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-blue-900 text-xs flex items-center gap-1.5">
                  🏡 Ideiglenes Befogadó Hálózat
                </h4>
                <p className="text-gray-600">
                  Befogadók nyilvántartása, kapacitások és elérhetőségek nyomon követése, egykattintásos cica-befogadó áthelyezések, automatikus táp- és alomigény kalkulátorral.
                </p>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-purple-900 text-xs flex items-center gap-1.5">
                  ✂️ TNR & Vizuális Összefüggések Canvas
                </h4>
                <p className="text-gray-600">
                  Befog-Ivartalanít-Elenged akciók részletes rögzítése hatósági PDF exporttal, valamint interaktív csomópont-alapú (SVG Canvas) hálózati térkép az állatok és események kapcsolatáról.
                </p>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-indigo-900 text-xs flex items-center gap-1.5">
                  💉 Naptár & Oltási Emlékeztetők
                </h4>
                <p className="text-gray-600">
                  Az interaktív FullCalendar összegzi az oltási, orvosi és szűrési határidőket. A lejárt vagy esedékes eseményekről kiemelt sáv tájékoztat.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                  📄 Kimutatások & PDF Export
                </h4>
                <p className="text-gray-600">
                  Személyre szabott PDF adatlaptól a könyvelői és pénzügyi áttekintő kimutatásokig minden adat egyszerűen kinyomtatható vagy menthető.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <h4 className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5">
                  📡 Offline-First IndexedDB & Supabase Felhő
                </h4>
                <p className="text-gray-600">
                  Az alkalmazás internetkapcsolat nélkül is teljes mértékben működik (Dexie IndexedDB tároló), és automatikusan szinkronizálódik a Supabase felhőbe.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {changelog.map((release) => (
                <div
                  key={release.version}
                  className={`p-3 rounded-xl border ${
                    release.version === APP_VERSION
                      ? 'bg-pink-50/70 border-pink-300 shadow-xs'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded-full ${
                        release.version === APP_VERSION
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      v{release.version}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      📅 {release.date}
                    </span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 pl-1">
                    {release.changes.map((item, idx) => (
                      <li key={idx} className="leading-snug">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-xs transition"
          >
            Értem, Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
