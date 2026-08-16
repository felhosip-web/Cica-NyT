import { PatchResult } from '../services/patchUpgradeService';

export type PatchCategory =
  | 'animal_core'
  | 'foster_finance'
  | 'connected_elements'
  | 'cost_financial'
  | 'user_rbac'
  | 'tnr_field'
  | 'medical_protocols'
  | 'inventory_warehouse'
  | 'system_backup_security'
  | 'adoption_contracts'
  | 'custom_plugin'
  | string;

export interface PatchMetric {
  label: string;
  value: string | number;
  color?: 'purple' | 'blue' | 'amber' | 'emerald' | 'rose' | 'indigo' | 'slate' | 'sky' | 'teal';
  subLabel?: string;
}

export interface PatchSubMetric {
  icon: string;
  label: string;
  count: number | string;
}

export interface PatchAnomaly {
  severity: 'high' | 'medium' | 'low';
  type: string;
  description: string;
  targetId?: string | number;
}

export interface GenericPatchValidationReport {
  isValid: boolean;
  integrityScore: number;
  metrics: PatchMetric[];
  subMetrics?: PatchSubMetric[];
  anomalies: PatchAnomaly[];
  issuesCount: number;
  summary: string;
  details?: string[];
  customBreakdownHtml?: string;
  [key: string]: any;
}

export interface PatchPlugin {
  /** Egyedi azonosító, pl.: 'patch_i_adoptions_v1' */
  id: string;
  /** Felhasználóbarát megjelenített név */
  name: string;
  /** Célverzió, pl.: 'v2.13.0' */
  targetVersion: string;
  /** Kategória az ikonokhoz és színekhez */
  category: PatchCategory;
  /** Egyedi ikon emoji (pl.: '📜', '🐈', '💉') */
  icon?: string;
  /** Részletes leírás arról, mit csinál a modul */
  description: string;
  /** Végrehajtási sorrend prioritása (alacsonyabb szám fut elébb 'run all' esetén) */
  order?: number;
  /** Előzetes diagnosztikai és validáló függvény (Pre-flight Inspection) */
  validate: () => Promise<GenericPatchValidationReport>;
  /** A tényleges adatbázis normalizációs és migrációs függvény */
  run: () => Promise<PatchResult>;
}
