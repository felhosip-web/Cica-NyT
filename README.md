# Cica-NyT — Macska nyilvántartó állatvédő szervezeteknek

A **Cica-NyT** egy offline-first felépítésű, webes és Progressive Web App (PWA) alapon működő nyilvántartó és menedzsment rendszer macskamentő egyesületek, alapítványok és menhelyek számára.

🔗 **Élő weboldal / PWA:** [https://felhosip-web.github.io/Cica-NyT/](https://felhosip-web.github.io/Cica-NyT/)

---

## 🌟 Főbb funkciók

- 🐈 **Macska nyilvántartás:** Részletes adatlapon kezelhető macska profilok, szigorú adatvalidáció (15 jegyű mikrochipszám, dátum-logika), automatikus duplikáció-szűrés, orvosi napló (oltások, ivartalanítás, kezelések) és egyedi állapotcímkék.
- 🏡 **Ideiglenes befogadó hálózat:** Befogadók kapacitásának, a hozzájuk rendelhető macskáknak, ellátási igényeiknek és támogatásaiknak nyomon követése.
- 📦 **Táp & alom készletkezelés:** Bejövő adományok és saját vásárlások, valamint kimenő készletmozgások pontos nyilvántartása (nedves/száraz táp, alom).
- 💳 **Pénzügyi modul (beleértve az Adó 1%-ot):** Bevételek és kiadások tételes rögzítése, kategorizálás, bizonylatszámok, Adó 1% felajánlások dedikált nyilvántartása és pénzügyi kimutatások.
- 🎁 **Adománygyűjtő akciók:** Akciók indítása, beérkezett adományok tételes rögzítése és raktárkészletbe vezetése.
- ☁️ **Mentés & Szinkronizáció:** Helyi offline tárolás (IndexedDB/Dexie.js), automatikus és manuális biztonsági mentések helyben, Google Drive integráció, valamint Supabase felhőszinkronizáció élő állapotkövetéssel.
- 🔑 **Licenckezelés:** Kliensoldali algoritmus-alapú licencellenőrzés, soft-lock írásvédelem, First-launch licencelfogadás és Service kódos távoli segítségnyújtás.
- 📱 **Progressive Web App (PWA):** Telepíthető mobilra és asztali számítógépre, teljes offline működéssel és automatikus frissítéssel.

---

## 🚀 Futtatás helyben

### Előfeltételek
- **Node.js** (v18 vagy újabb ajánlott)
- **npm** (v9 vagy újabb)

### Lépések

1. Telepítsd a függőségeket:
   ```bash
   npm install
   ```

2. Szükség esetén hozz létre helyi környezeti változókat az `.env.example` alapján:
   ```bash
   cp .env.example .env.local
   ```

3. Indítsd el a fejlesztői szervert:
   ```bash
   npm run dev
   ```

4. Nyisd meg a böngészőben a megjelenő címet (alapértelmezetten: `http://localhost:3000/Cica-NyT/`).

---

## 📜 Licenc

© 2025-2026 HES Projects® by FePe
All Rights Reserved.

Részletekért lásd a [LICENSE](LICENSE) fájlt.

---

## 🏷️ Jelenlegi verzió

**v2.25.0**
