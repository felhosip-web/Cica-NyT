# 💾 Helyi Lemezes Tükrözés (Local Disk Mirroring) - Cica-NyT

## Áttekintés

A **Helyi Lemezes Tükrözés (Local Disk Mirroring)** funkció lehetővé teszi a Cica-NyT adatbázisának automatikus és közvetlen biztonsági mentését a felhasználó saját számítógépének háttértárára (pl. `Dokumentumok/Cica-NyT` mappa).

Ez a megoldás teljes offline függetlenséget és maximális adatbiztonságot nyújt, garantálva, hogy az adatállomány bármikor elérhető marad az alábbi felépítésben:
- `cica_nyt_latest_mirror.json`: Mindig a legfrissebb pillanatkép.
- `archive/cica_nyt_mirror_YYYY-MM-DD.json`: Napi/dátumozott archivált másolatok.

---

## 🛠️ Működési Elv & Támogatott Platformok

### 1. File System Access API (Asztali böngészők)
- **Támogatott böngészők:** Google Chrome, Microsoft Edge, Opera, Brave (Windows, macOS, Linux / Ubuntu).
- **Működés:** A böngésző biztonságos File System Access API-ja segítségével a felhasználó egyszeri engedélyezés után kijelölhet egy helyi mappát a számítógépén.
- **Tartósság:** A mappához tartozó hivatkozást (DirectoryHandle) az alkalmazás biztonságosan tárolja az IndexedDB-ben.

### 2. Ajánlott Mentési Mappák Operációs Rendszerint
- **Windows:** `C:\Users\<Felhasználó>\Documents\Cica-NyT`
- **macOS:** `/Users/<Felhasználó>/Documents/Cica-NyT`
- **Linux:** `/home/<felhasználó>/Documents/Cica-NyT`

### 3. Helyettesítő Letöltés (Mobil & Safari)
- **Safari, iOS (iPhone/iPad), Android:** A W3C File System Access API korlátozásai miatt a böngésző nem teszi lehetővé a közvetlen mappa-bejegyzést.
- **Megoldás:** Ezeken a készülékeken az alkalmazás egykattintásos **"Tükör Letöltése Fájlként"** opciót kínál fel.

---

## ⏱️ Automatikus Napi Tükrözés

Amennyiben az **"Automatikus napi mentés indításkor"** opció be van kapcsolva a *Beállítások ➔ Helyi Mentés (Lemez)* fülön:
1. Az alkalmazás minden elindításkor (az `App.tsx` betöltésekor) megvizsgálja az utolsó mentés időpontját.
2. Ha az aznapi mentés még nem készült el, és a lemezes mappa kapcsolat aktív, csendben, a háttérben elkészíti a friss `cica_nyt_latest_mirror.json` és a dátumozott archivált másolatot.
3. Minden lemezes mentési akcióról strukturált bejegyzés készül a rendszerszintű audit eseménynaplóban (`export.ods` / `export.local_mirror` néven).

---

## 🔒 Adatvédelem & Biztonság

- **100% Helyi Adatkezelés:** A mentési fájlok kizárólag a felhasználó saját eszközére íródnak ki.
- **Nincs Külső Szerver:** Semmilyen személyes vagy állatgondozási adat nem kerül harmadik fél szerverére ezen a csatornán keresztül.
