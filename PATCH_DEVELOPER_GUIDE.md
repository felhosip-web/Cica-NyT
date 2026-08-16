# 🧩 Patch Plugin Fejlesztési Útmutató (Developer & AI Agent Guide)

Ez a dokumentum részletesen bemutatja, hogyan lehet új **Patch Modult (Plugint)** létrehozni és integrálni a macskamentő szoftver adatbázis-karbantartó és verziókövető rendszerébe.

A rendszer **Vite Native Plugin Discovery (`import.meta.glob`)** motort használ, ami azt jelenti, hogy **nem kell módosítani a meglévő komponenseket vagy központi regisztrációs fájlokat** — elég egy új `.ts` fájlt elhelyezni az `src/patches/` könyvtárban, és a rendszer **automatikusan felismeri, megjeleníti a UI-on, és bevonja a teljes frissítési folyamatba**.

---

## 📁 Architektúra Áttekintés

```
src/
├── types/
│   └── patchPlugin.ts          # Generic PatchPlugin & ValidationReport típusdefiníciók
├── patches/                    # Önálló, izolált Patch Plugin modulok
│   ├── patchA.ts               # Állatnyilvántartás & Egészségügy
│   ├── patchB.ts               # Befogadó Hálózat & Ellátmány
│   ├── patchC.ts               # Költségelszámolás & Főkönyv
│   ├── patchD.ts               # Felhasználók & RBAC Jogosultságok
│   ├── patchE.ts               # TNR Kolóniák & Fülcsípés
│   ├── patchF.ts               # Orvosi Protokollok & Sablonok
│   ├── patchG.ts               # Raktárkészlet, Szavatosság & Adományok
│   ├── patchH.ts               # Rendszermentés & Adatbázis Integritás
│   ├── patchConnectedElements.ts # Relációs Keresztkapcsolatok
│   └── patchI_...ts            # 🚀 ÚJ MODULOK HELYE
├── services/
│   ├── patchPluginRegistry.ts  # Dinamikus modul-betöltő motor (Auto-discovery)
│   └── patchUpgradeService.ts  # Történeti migrációs függvények & Dexie DB
└── components/
    └── PatchUpgradeSection.tsx # Dinamikus UI (Kártyák & Pre-flight Ellenőrző Modál)
```

---

## 🛠️ A `PatchPlugin` Interfész Felépítése

Minden új patchnek implementálnia kell a `PatchPlugin` interfészt (`src/types/patchPlugin.ts`):

```typescript
export interface PatchPlugin {
  /** Egyedi azonosító kulcs (pl.: 'patch_i_adoptions_v1') */
  id: string;

  /** Olvasható név a felhasználói felületen */
  name: string;

  /** Célverzió, amelyhez a patch tartozik (pl.: 'v2.13.0') */
  targetVersion: string;

  /** Kategória az ikonokhoz és vizuális csoportosításhoz */
  category: 
    | 'animal_core'
    | 'foster_finance'
    | 'cost_financial'
    | 'user_rbac'
    | 'tnr_field'
    | 'medical_protocols'
    | 'inventory_warehouse'
    | 'system_backup_security'
    | 'adoption_contracts'
    | 'custom_plugin'
    | string;

  /** Opcionális egyedi Emoji ikon (pl.: '📜', '🐱', '💉') */
  icon?: string;

  /** 1-2 mondatos részletes funkcionális leírás */
  description: string;

  /** Végrehajtási prioritás (pl.: 1-100; a 'Minden Patch Futtatása' sorrendje) */
  order?: number;

  /** 
   * 1. Előzetes Ellenőrző & Diagnosztikai Függvény (Pre-flight Inspection)
   * FONTOS: Ez a függvény NEM módosíthat adatot, csak olvas és kiértékel!
   */
  validate: () => Promise<GenericPatchValidationReport>;

  /** 
   * 2. Végrehajtó Függvény (Execution Runner)
   * Tényleges adatbázis normalizálás, hiányzó mezők pótlása és mentés.
   */
  run: () => Promise<PatchResult>;
}
```

---

## 📋 Visszatérési Értékek Részletezése

### 1. `GenericPatchValidationReport` (Pre-flight UI Renderelés)
A `validate()` függvény által visszaadott objektumot a modális ablak **automatikusan formázva és színekkel jeleníti meg**:

```typescript
export interface GenericPatchValidationReport {
  isValid: boolean;             // Igaz, ha nincsenek hibák
  integrityScore: number;       // 0-100 közötti pontszám (pl. 95)
  metrics: [                    // 2-4 db kiemelt KPI kártya a modál tetején
    { label: 'Összes Szerződés', value: '45 db', color: 'purple' },
    { label: 'Aktív Próbaidő', value: '8 cica', color: 'blue' },
    { label: 'Integritás', value: '98%', color: 'emerald' }
  ];
  subMetrics?: [                // Részletező kis címkék a kártyák alatt
    { icon: '📝', label: 'Aláírt', count: '37 db' },
    { icon: '⏳', label: 'Folyamatban', count: '8 db' }
  ];
  anomalies: [                  // Talált hibák vagy javítandó pontok listája
    {
      severity: 'high' | 'medium' | 'low';
      type: 'missing_adoption_date';
      description: '[Cirmos]: Gazdis státuszú, de hiányzik a szerződés dátuma.';
      targetId: 'cat-123';
    }
  ];
  summary: string;              // Rövid összefoglaló szöveg
}
```

Támogatott színek a metrikákhoz (`color`):
`'purple'` | `'blue'` | `'emerald'` | `'amber'` | `'rose'` | `'indigo'` | `'sky'` | `'teal'` | `'slate'`

---

## 🚀 Új Patch Létrehozása (Lépésről Lépésre Mintapélda)

Példa egy új **Patch I (Örökbefogadási & Szerződéskezelési Modul)** elkészítésére:

### 1. Hozd létre a fájlt: `src/patches/patchI.ts`

```typescript
import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { PatchResult } from '../services/patchUpgradeService';
import { db } from '../js/db.js';

export const patchI: PatchPlugin = {
  id: 'patch_i_adoptions_v1',
  name: 'Patch I: Örökbefogadási & Szerződéskezelési Modul (Adoptions & Contracts)',
  targetVersion: 'v2.13.0',
  category: 'adoption_contracts',
  icon: '📜',
  description: 'Örökbefogadási szerződések, próbaidős státuszok, gazdi adatok és chip-átírási feladatok normalizálása.',
  order: 10,

  /**
   * 1. Előzetes Diagnosztika (Read-only)
   */
  validate: async (): Promise<GenericPatchValidationReport> => {
    const anomalies: any[] = [];
    const allCats = await db.cats.toArray();
    const allEvents = await db.events.toArray();

    let adoptedCount = 0;
    let trialCount = 0;

    for (const cat of allCats) {
      if (cat.status === 'gazdis') {
        adoptedCount++;
        if (!cat.orokbefogado_neve && !cat.orokbefogadas_datuma) {
          anomalies.push({
            severity: 'medium',
            type: 'missing_adopter_data',
            description: `[${cat.nev}]: 'Gazdis' státuszú, de hiányzik az örökbefogadó neve vagy dátuma.`,
            targetId: cat.id,
          });
        }
      } else if (cat.status === 'probaidon') {
        trialCount++;
      }
    }

    const integrityScore = Math.max(0, 100 - anomalies.length * 5);

    return {
      isValid: anomalies.length === 0,
      integrityScore,
      metrics: [
        { label: 'Örökbefogadott', value: `${adoptedCount} cica`, color: 'emerald' },
        { label: 'Próbaidős', value: `${trialCount} cica`, color: 'sky' },
        { label: 'Adatminőség', value: `${integrityScore}%`, color: integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '🏡', label: 'Gazdis', count: `${adoptedCount} db` },
        { icon: '⏳', label: 'Próbaidő', count: `${trialCount} db` },
      ],
      anomalies,
      issuesCount: anomalies.length,
      summary: anomalies.length === 0 
        ? 'Minden örökbefogadási adat és szerződés sémahelyes.' 
        : `${anomalies.length} db javítandó tétel azonosítva.`,
    };
  },

  /**
   * 2. Végrehajtó Logika (Normalizáció & Mentés)
   */
  run: async (): Promise<PatchResult> => {
    const startTime = performance.now();
    const details: string[] = [];
    let recordsAffected = 0;

    try {
      const allCats = await db.cats.toArray();

      for (const cat of allCats) {
        let changed = false;

        // Alapértelmezések pótlása ha hiányzik
        if (cat.status === 'gazdis' && !cat.orokbefogadas_statusz) {
          cat.orokbefogadas_statusz = 'lezart';
          changed = true;
        }

        if (changed) {
          await db.cats.put(cat);
          recordsAffected++;
        }
      }

      details.push(`Örökbefogadási rekordok ellenőrizve: ${allCats.length} cica, Módosítva: ${recordsAffected} db.`);

      const durationMs = Math.round(performance.now() - startTime);
      return {
        id: 'patch_i_adoptions_v1',
        name: 'Patch I: Örökbefogadási & Szerződéskezelési Modul',
        version: 'v2.13.0',
        appliedAt: new Date().toISOString(),
        success: true,
        recordsAffected,
        details,
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        id: 'patch_i_adoptions_v1',
        name: 'Patch I: Örökbefogadási & Szerződéskezelési Modul',
        version: 'v2.13.0',
        appliedAt: new Date().toISOString(),
        success: false,
        recordsAffected: 0,
        details: [`Hiba a patch végrehajtása során: ${error?.message || error}`],
        durationMs,
      };
    }
  },
};

export default patchI;
```

---

## ⚡ Mit csinál a keretrendszer automatikusan?

Miután elmented az új fájlt (`src/patches/patchI.ts`):
1. **Auto-Discovery**: A `patchPluginRegistry.ts` a Vite `import.meta.glob` segítségével automatikusan beolvassa.
2. **Kártya Megjelenés**: Azonnal megjelenik a `PatchUpgradeSection` rácsában a megfelelő ikonnal, leírással és verziószámmal.
3. **Előzetes Ellenőrző Ablak (Pre-flight Inspection)**: Amikor a felhasználó rákattint a *"Patch Futtatása"* gombra, a rendszer meghívja a `validate()` metódust és automatikusan kirajzolja a KPI kártyákat és az észlelt anomáliákat.
4. **Minden Patch Futtatása (`Run All`)**: A központi *"Minden Patch Futtatása"* gomb automatikusan sorban lefuttatja az új modult is az `order` száma szerinti prioritási sorrendben.
5. **Audit Naplózás & Helyi Tárolás**: A futás eredményét elmenti a `localStorage`-ba és az audit naplóba.

---

## 🔒 Biztonsági & Minőségi Szabályzat

1. **Soha ne törölj érvényes felhasználói adatot!** Csak formátumot javíts, hiányzó mezőket pótolj (`null` vagy `undefined` helyett alapértelmezett érték), és duplikációkat konszolidálj.
2. **A `validate()` mindig legyen mellékhatás-mentes (Read-Only)!** Nem végezhet `db.put()`, `db.add()` vagy `db.delete()` műveleteket.
3. **Mindig kezeld a hibákat `try-catch` blokkban** és adj vissza értelmes `details` hibaüzeneteket.
4. **Ellenőrizd a fordítást** a `compile_applet` eszközzel, hogy ne legyen szintaktikai vagy típus-összeférhetetlenségi hiba.
