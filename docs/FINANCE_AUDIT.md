# Cica-NyT Pénzügyi Modul Audit és Formális Minőségi Felülvizsgálat (v2.28.0)

## 1. Jogi Nyilatkozat és Rendszerjelleg

> **FIGYELMEZTETÉS & JOGI NYILATKOZAT:**
> A Cica-NyT alkalmazás pénzügyi modulja kizárólag az állatmentő egyesületek, alapítványok és menhelyek **belső működési és gazdálkodási nyilvántartására** szolgál.
> **NEM minősül a Nemzeti Adó- és Vámhivatal (NAV) által tanúsított számlázó szoftvernek**, nem végez NAV Online Számla adatszolgáltatást, és az általa generált nyomtatványok vagy PDF dokumentumok **nem minősülnek számviteli bizonylatnak, e-számlának vagy adóhatósági igazolásnak**.

---

## 2. Felülvizsgálat Terjedelme (Scope)

A v2.28.0 verziójú frissítés során elvégzett pénzügyi audit és minőségi javítások a következő területekre terjedtek ki:
1. Adatintegritás és űrlap validáció (`FinanceFormModal.tsx`, `types.ts`).
2. Stornózás vs. Végleges törlés kezelése az auditálhatóság biztosítására.
3. Formális nyomtatási nézet javítása (P0 print fixek, `FinanceView.tsx`).
4. Hivatalos PDF riport generálás és magyar ékezetkezelés (P0 PDF fixek, `PdfReportsModal.tsx`, `pdf-export.ts`).
5. CSV export szinkronizáció és Excel kompatibilitás.

---

## 3. Megállapítások és Alkalmazott Javítások

### A) Adatmodell és Űrlap Validáció
- **Pozitív összegek és egész Ft rögzítés**: A pénzügyi tételek mentésekor kötelező a pozitív, 0-nál nagyobb összeg megadása, amely automatikusan kerekített egész forintként (`Math.round`) kerül tárolásra.
- **Kötelező mezők**: Érvényes `YYYY-MM-DD` dátum, nem üres megnevezés/leírás, kategória, típus (bevétel/kiadás) és fizetési mód.
- **Adó 1% kezelése**: A `szazalek1` kategória kiválasztása esetén kötelező az adóév (`taxYear`, pl. 2024, 2025) megadása. Az adó 1%-os KPI mutatók elsődlegesen a `taxYear` mezőt használják az aggregációhoz.

### B) Stornózási Logika és Audit Nyomvonal
- **Teljesült tételek védelme**: Teljesült (`teljesult`) pénzügyi tételek esetén a felhasználó figyelmeztetést kap, és a rendszer elsődlegesen a tétel **stornózását** (`status = 'storno'`) ajánlja fel a stornó indokának rögzítésével, ahelyett hogy véglegesen törölné a bejegyzést az adatbázisból.
- **KPI-k és Összesítők**: Valamennyi mutató (Összes Bevétel, Összes Kiadás, Nettó Mérleg, Havi trendek, Kategória bontás, CSV és Nyomtatási összesítők) szigorúan kizárja a `storno` státuszú tételeket a számításokból.

### C) Nyomtatási Nézet (P0 Print Fixes)
- **Valós Szervezeti Fejléc**: A nyomtatási fejléc a beállításokban megadott szervezetnevet (`useAppStore().orgName`) jeleníti meg. Megszüntetésre került a korábbi kódolt "CatRescue Manager" alapértelmezett felirat.
- **Szervezeti azonosítók**: Az adószám és nyilvántartási szám kizárólag akkor jelenik meg a nyomtatási lapon, ha az a szervezet beállításaiban rögzítve van. Hamis/kitalált adószámok generálása megszűnt.
- **Tartalom**: Tartalmazza a szűrési időszakot, a generálás pontos időpontját (`hu-HU`), a nyomtató munkatárs nevét, a nem-stornó összesítőket (Bevétel, Kiadás, Nettó, Tételek száma) és a részletes tranzakciós táblázatot.
- **Kötelező lábjegyzet nyilatkozat**:
  > *"Ez a kimutatás a Cica-NyT belső nyilvántartásából készült. Nem minősül számlának, számviteli bizonylatnak vagy NAV által kibocsátott dokumentumnak."*
- **@media print CSS**: A böngészős nyomtatás során a navigáció, gombok, szűrők és menük automatikusan rejtésre kerülnek.

### D) PDF Riportok és Magyar Ékezetek (P0 PDF Fixes)
- **Karakterkészlet és Ékezetek**: A PDF generáló megőrzi a standard magyar ékezetes magánhangzókat (`á, é, í, ó, ö, ú, ü`), melyek a jsPDF szabványos Helvetica betűtípusában helyesen jelennek meg. A dupla éles ékezeteket (`ő, ű`) a betűtípus-korlátok miatt `ö, ü` karakterre képezi le a rendszer, megszüntetve a korábbi teljes ASCII karaktertörlést.
- **Valós Pénzügyi Főkönyv (`reportType === 'financial'`)**: A PDF riport közvetlenül a `db.finances` adatbázisból építi fel a főkönyvi tételeket a stornózott tételek külön megjelölésével és az egyenlegből való kizárásával.
- **Hitelességi megjelölés & Aláírás**: HITELES vs. NEM HITELES (MUNKAPÉLDÁNY) jelvénnyel, aláírási rovatokkal és a kötelező belső nyilvántartási nyilatkozattal ellátott PDF kimenet.
- **Fájlnevezés**: Kvantifikálható fájlnevek (`CicaNyT_Penzugy_HITELES_YYYY-MM-DD.pdf` / `MUNKAPELDANY`).

### E) CSV Export
- **UTF-8 BOM & Pontosvessző**: A letöltött CSV fájl UTF-8 BOM (`\uFEFF`) bájtsorozattal és pontosvessző (`;`) elválasztóval készül a magyar nyelvű Microsoft Excel azonnali, hibátlan megnyitásához.
- **Fejlécek**: Azonosító, Típus, Kategória, Megnevezés, Összeg (Ft), Dátum, Fizetési Mód, Partner / Adományozó, Számlaszám, Adóév (1%), NAV iktatószám, Státusz, Kapcsolódó Cica, Kapcsolódó Befogadó, Forrás Modul, Megjegyzések.

---

## 4. Összegzés

A v2.28.0 frissítéssel a Cica-NyT pénzügyi modulja egy teljeskörűen auditálható, formálisan megbízható belső nyilvántartó rendszerré vált, amely biztosítja az adatok konzisztenciáját a képernyős felület, a CSV export, a nyomtatási nézet és a PDF riportok között.
