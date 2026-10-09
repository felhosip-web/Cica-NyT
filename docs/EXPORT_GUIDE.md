# Cica-NyT — Exportálási és Kimutatás-Készítési Útmutató (v2.29.0)

Ez a dokumentum összefoglalja a **Cica-NyT** nyilvántartó rendszerben elérhető PDF és ODF (OpenDocument Format) exportálási lehetőségeket, a támogatott formátumok különbségeit, valamint a hivatalos igazolások kiállítási szabályait.

---

## 1. Elérhető Exportálási Formátumok

### 1.1. PDF (.pdf) — Hivatalos Nyomtatható Riportok
- **Célja:** Nyomtatásra kész, nem módosítható hatósági vagy belső igazolások kiállítása.
- **Megjelenés:** Választható **HITELES** (fejléccel, adószámmal, iktatószámmal és aláírási rovattal) vagy **NEM HITELES / MUNKAPÉLDÁNY** módban.
- **Karakterkészlet:** Standard PDF hordozhatóság érdekében a magyar ékezetes karakterek többsége megőrzésre kerül; az *ő* és *ű* karakterek *ö* és *ü* betűkre képződnek le a vizuális kompatibilitás garantálásához.

### 1.2. ODS (.ods) — OpenDocument Spreadsheet (Bővíthető Táblázat)
- **Célja:** Részletes adatállományok kinyerése táblázatkezelő programokba (**LibreOffice Calc**, **Microsoft Excel**, **Google Táblázatok**).
- **Előnyei:**
  - Teljes UTF-8 támogatás, hiánytalan magyar ékezetekkel (*ő, ű* is korlátozás nélkül).
  - Számtípusú mezők (összegek, számlálók) közvetlenül képletezhetőként kerülnek mentésre.
  - Pénzügyi export esetén külön **"Tételek"** és **"Összesítő"** munkalapokat tartalmaz.

### 1.3. ODT (.odt) — OpenDocument Text (Szöveges Dokumentum)
- **Célja:** Szerkeszthető hivatalos jelentések és iktatott beszámolók készítése (**LibreOffice Writer**, **Microsoft Word**).
- **Megjelenés:** Tartalmazza a szervezet adatait, az időszaki pénzügyi összesítőt, a részletes tranzakciós táblázatot és a hivatalos felelősségi nyilatkozatot.

---

## 2. Pénzügyi Főkönyvi Kimutatások Szabályai

### 2.1. Stornó Tételek Kezelése
- A **stornózott (érvénytelenített)** pénzügyi tételek a számviteli átláthatóság érdekében nem törlődnek véglegesen az adatbázisból, hanem megőrződnek az audit naplóban.
- **Fő szabály:** Az exportált összesítők (bevétel, kiadás, nettó egyenleg, átlagok) **minden esetben kizárják** a stornózott tételek összegét.
- Az ODS és PDF beállításoknál lehetőség van a stornózott tételek külön megjelenítésére a táblázatban a tételes áttekinthetőség kedvéért.

### 2.2. Jogi Nyilatkozat (Kötelező Lábjegyzet)
Minden generált pénzügyi kimutatás automatikusan tartalmazza az alábbi kötelező jogi nyilatkozatot:

> *"Ez a kimutatás a Cica-NyT belső nyilvántartásából készült. Nem minősül számlának, számviteli bizonylatnak vagy NAV által kibocsátott dokumentumnak."*

---

## 3. Használati Útmutató a PDF / ODF Modulhoz

1. Nyisd meg a **Pénzügyek** menüpontot vagy az **Események / Állatok** nézetet.
2. Kattints a **Nyomtatás / PDF Export** gombra.
3. A megnyíló párbeszédablakban állítsd be a kívánt opciókat:
   - **Hitelesség:** Hiteles igazolás vagy Nem hiteles munkapéldány.
   - **Tájolás:** Fekvő (ajánlott széles táblázatokhoz) vagy Álló.
   - **Szűrők & Időszak:** Ez a hónap, Előző hónap, Idei év vagy Egyéni dátumtartomány.
   - **Megjelenítendő oszlopok:** Válaszd ki a riportba felvenni kívánt adatmezőket.
4. Válaszd ki a kívánt kimeneti formátumot:
   - **📊 Letöltés .ODS:** Táblázatkezelőbe való elemzéshez.
   - **📄 Letöltés .ODT:** Szöveges dokumentum szerkesztéséhez.
   - **📥 Letöltés .PDF:** Nyomtatásra kész dokumentum mentéséhez.
