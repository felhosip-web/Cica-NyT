# Cica-NyT Pénzügyi Modul & Hivatalos Nyomtatási/PDF Rendszer Audit

**Dátum:** 2026. március
**Verzió:** 2.28.0
**Szerző:** Jules / Software Engineering Agent
**Szervezet:** Cica-NyT (Macskamenhely & Gondozó Nyilvántartó)

---

## 💡 Fontos Jogi Nyilatkozat
> **A Cica-NyT alkalmazás belső egyesületi és alapítványi főkönyv / nyilvántartó rendszer. NEM minősül a NAV által minősített online számlázó szoftvernek, és nem végez NAV e-számla adatszolgáltatást (B2B/B2C).**
> A kiállított kimutatások és igazolások belső könyvelési és hatósági tájékoztatási célokat szolgálnak.

---

## 1. Összefoglaló (Summary)

**Státusz:** FIGYELMEZTETÉS ➔ OK (Megállapított P0/P1 hiányosságok javítása után termelésre kész)

A pénzügyi modul (`FinanceView`, `FinanceFormModal`), valamint a nyomtatási és PDF generáló alrendszer (`PdfReportsModal`) felülvizsgálata megtörtént. Az audit feltárta, hogy bár az alapadatbázis sémája (`db.finances`) és a tranzakciós modell megfelelően kezeli a bevételeket, kiadásokat és az Adó 1% felajánlásokat, a nyomtatási és PDF exportálási felületeken súlyos P0/P1 hiányosságok voltak jelen.

### Főbb megállapítások és javítások:
1. **Érvényes Pénzügyi Főkönyv PDF Export (P0):** A `PdfReportsModal`-ban a `financial` típus kiválasztásakor korábban hibásan a macskák törzsadat-listája generálódott le. Ez javításra került: mostantól a `db.finances` adattáblából lekért valódi pénzügyi főkönyv jelenik meg tételekkel, kategóriákkal, bevételek/kiadások összesítésével és nettó mérleggel.
2. **Magyar Ékezetkezelés PDF-ben (P0):** A `cleanText` függvény korábban az összes magyar ékezetes betűt ékezetmentesítette (`á` -> `a`, `é` -> `e`), ami hivatalos ("HITELES") dokumentumoknál elfogadhatatlan volt. A javított algoritmus megőrzi a standard magyar ékezetes betűket (`á`, `é`, `í`, `ó`, `ö`, `ú`, `ü`), és kizárólag a jsPDF által nem támogatott hullámékezetes `ő`/`ű` betűket alakítja `ö`/`ü` karakterekké.
3. **Szervezeti Adatok & Nyomtatási Stílus (P0/P1):** A `FinanceView` nyomtatási nézetében a korábban hardkódolt mock szervezetnév ("CatRescue Manager") helyett a rendszer a Zustand store-ban beállított `orgName`-et, adószámot és nyilvántartási számot jeleníti meg. Továbbá hozzáadásra kerültek a kötelező jogi nyilatkozatok és a `@media print` CSS szabályok (a felületi gombok és menük elrejtésére).
4. **Stornó Kezelés & Adatintegritás (P0):** A stornózott (`status === 'storno'`) tranzakciók mostantól egyértelműen ki vannak zárva az összesített KPI számításokból és grafikonokból, megakadályozva a halmozott duplikációt.

---

## 2. Adatintegritás & Validáció

- **Összeg validáció:** A `FinanceFormModal`-ban a beviteli mező szigorúan pozitív egész számra (`Math.round(parsedAmount)`) kerekít és ellenőrzi a `> 0` értéket.
- **Dátum:** A tranzakció dátuma kötelező mező (alapértelmezetten a mai nap: `YYYY-MM-DD`).
- **Stornó logika:** A rendszer támogatja a soft-stornó állapotot (`storno`), ami megőrzi az auditálhatóságot és az előzményeket, miközben nem torzítja el a mérleget.
- **Adó 1% (szazalek1):** Külön mezők biztosítottak az adóév (`taxYear`) és a NAV utalási azonosító (`navReference`) rögzítésére.

---

## 3. KPI Műszerfal & Szűrők

- **Mérleg számítás:**
  $$\text{Nettó Egyenleg} = \sum \text{Bevételek (teljesült/függő)} - \sum \text{Kiadások (teljesült/függő)}$$
- **Időszak szűrők:** Az "Ez a hónap", "Előző hónap", "Idei év", "Egyéni időintervallum" és "Összes időszak" szűrők egységesen alkalmazkodnak a képernyőn megjelenő listához, a CSV exportban és a nyomtatási nézetben.

---

## 4. CSV Export

- **BOM Fejléc:** `\uFEFF` UTF-8 BOM kóddal ellátva a magyar ékezetes betűk hibátlan megjelenítéséhez Microsoft Excel-ben.
- **Mezők:** Azonosító, Típus, Kategória, Megnevezés, Összeg (Ft), Dátum, Fizetési mód, Partner, Számlaszám, Adóév (1%), NAV iktatószám, Státusz, Csatolt cica, Csatolt befogadó, Megjegyzés.

---

## 5. Nyomtatás (FinanceView Print)

- **Szervezeti azonosítás:** A nyomtatási fejléc a Zustand `useAppStore` `orgName` értékét veszi alapul.
- **Metaadatok:** Generálás időpontja, igazoló felhasználó neve és szerepköre.
- **Jogi disclaimer elhelyezve:**
  *"Belső pénzügyi kimutatás — nem minősül hivatalos számlának / NAV B2B dokumentumnak."*
- **`@media print` illesztés:** A nyomtatási kép automatikusan elrejti a navigációt, gombokat és sötét módú háttérszíneket.

---

## 6. PDF Generálás (PdfReportsModal)

| Funkció | Korábbi Állapot | Javított Állapot |
| :--- | :--- | :--- |
| **Pénzügyi Riport (`financial`)** | Cica törzsadatokat exportált hibásan | Valódi `db.finances` főkönyvet exportál tételekkel, kategóriákkal és mérleggel |
| **Magyar Ékezetek** | Minden ékezet le lett cserélve (`á`->`a`) | Standard ékezetek megőrizve (`á, é, í, ó, ö, ú, ü`), hullámékezet `ő/ű` -> `ö/ü` |
| **Hiteles Mód (Official)** | Szervezet neve, adószáma, nyilvántartási száma, iktatószám, aláírási rovat | Dinamikusan kitölthető és szerkeszthető adatok |
| **Fájlnév** | `CicaNyT_Riport_...pdf` | `CicaNyT_Riport_HITELES_YYYY.MM.DD.pdf` / `MUNKAPELDANY` |

---

## 7. Jogosultságkezelés (Permissions)

A pénzügyi modul műveletei szigorúan ellenőrzik a bejelentkezett felhasználó jogosultságait:
- `finance.read`: A 💳 Pénzügyek fül és a kapcsolódó kimutatások megtekintése.
- `finance.create`: "➕ Új Bevétel" és "➕ Új Kiadás" gombok megjelenítése és mentése.
- `finance.update`: Tranzakció szerkesztése (✏️ gomb).
- `finance.delete`: Tranzakció törlése (🗑️ gomb).

---

## 8. Prioritási Mátrix (P0/P1/P2) & Elvégzett Javítások

| Prioritás | Terület | Leírás | Státusz |
| :---: | :--- | :--- | :---: |
| **P0** | **PDF** | Pénzügyi PDF export javítása, hogy valódi `db.finances` adatokat jelenítsen meg cica törzsadatok helyett. | ✅ Javítva v2.28.0-ban |
| **P0** | **PDF** | Magyar diakritikus ékezetkezelés javítása a `cleanText` függvényben. | ✅ Javítva v2.28.0-ban |
| **P0** | **Nyomtatás** | Szervezet név és beállítások dinamikus behúzása a nyomtatási fejlécbe. | ✅ Javítva v2.28.0-ban |
| **P1** | **Nyomtatás** | `@media print` CSS szabályok és kötelező jogi disclaimer hozzáadása. | ✅ Javítva v2.28.0-ban |
| **P1** | **Validáció** | Pozitív egész szám validáció megerősítése a `FinanceFormModal`-ban. | ✅ Javítva v2.28.0-ban |

---

*A Pénzügyi Modul és Nyomtatási/PDF alrendszer teljes körűen auditálva és javítva v2.28.0-ban.*
