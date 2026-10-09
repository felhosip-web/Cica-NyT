# Cica-NyT — Exportálási és Kimutatás-Készítési Útmutató (v2.30.0)

Ez a dokumentum összefoglalja a **Cica-NyT** nyilvántartó rendszerben elérhető PDF, ODF (OpenDocument Format) és Pénzügyi / Állatállomány kimutatási lehetőségeket.

---

## 1. Elérhető Exportálási Formátumok

### 1.1. PDF (.pdf) — Hivatalos Nyomtatható Riportok
- **Célja:** Nyomtatásra kész, nem módosítható hatósági vagy belső igazolások kiállítása.
- **Megjelenés:** Választható **HITELES** (fejléccel, adószámmal, iktatószámmal és aláírási rovattal) vagy **NEM HITELES / MUNKAPÉLDÁNY** módban.
- **Tájolás:** Fekvő (landscape) vagy álló (portrait) elrendezés.

### 1.2. ODS (.ods) — OpenDocument Spreadsheet (Szerkeszthető Munkalapok)
- **Célja:** Részletes adatállományok kinyerése táblázatkezelő programokba (**LibreOffice Calc**, **Microsoft Excel**, **Google Táblázatok**).
- **Előnyei:**
  - Teljes UTF-8 támogatás, hiánytalan magyar ékezetekkel (*ő, ű* is korlátozás nélkül).
  - Számtípusú mezők közvetlenül képletezhetőként kerülnek mentésre.
  - Tartalmaz egy tételes adatlapot és egy kategóriánkénti **"Összesítő"** munkalapot.

### 1.3. ODT (.odt) — OpenDocument Text (Szöveges Dokumentum)
- **Célja:** Szerkeszthető hivatalos jelentések és iktatott beszámolók készítése (**LibreOffice Writer**, **Microsoft Word**).

---

## 2. Dedikált Állatkimutatás Modul (v2.30.0)

Az állatok nyilvántartásából tetszőleges részletezettségű és szűrt állatkimutatás generálható a **Gondozásban lévő állatok** felületén található **"📋 Állatkimutatás"** gombbal.

### 2.1. Szűrési és Hatóköri Opciók
- **Státusz szerinti szűrés:** Összes állat, Csak gondozásban lévő (aktív), Csak gazdisodott, Csak elhunyt.
- **Finomhangolás:** Ivar szerinti szűrő (Minden / Kandúr / Nőstény), bekerülés típusa szerint (Saját, Befogott, Leadott, Elkobzott) és bekerülési dátumintervallum.

### 2.2. Részletes Oszlopválasztó Csoportok
Az űrlapon csoportosított checkboxokkal határozható meg, hogy melyik mező jelenjen meg a riportban:
1. **🆔 Azonosítás:** Sorszám, Név, Chip szám, Ivar, Szín/Mintázat, Kor/Születés.
2. **🏡 Státusz & Elhelyezés:** Státusz, Tartási hely, Megjegyzés.
3. **📥 Bekerülés:** Bekerülés típusa, Dátum, Ki hozta/befogó, Befogás helyszíne.
4. **🩺 Egészség:** Ivartalanítva, Oltások, Kiskönyv van/szám, Orvosi megjegyzés.
5. **🏠 Örökbefogadás:** Gazdi neve, Örökbeadás dátuma, Gazdi elérhetősége.
6. **📷 Egyéb:** Fotó meglétének jelölése, Audit dátumok.

---

## 3. Pénzügyi Kimutatások Szabályai

### 3.1. Stornó Tételek Kezelése
- A **stornózott (érvénytelenített)** pénzügyi tételek a számviteli átláthatóság érdekében megőrződnek az adatbázisban.
- **Fő szabály:** Az exportált összesítők (bevétel, kiadás, nettó egyenleg) **kizárják** a stornózott tételek összegét.

### 3.2. Jogi Nyilatkozat
Minden generált kimutatás tartalmazza az alábbi kötelező jogi nyilatkozatot:
> *"Ez a kimutatás a Cica-NyT belső nyilvántartásából készült. Nem minősül számlának, számviteli bizonylatnak vagy NAV által kibocsátott dokumentumnak."*
