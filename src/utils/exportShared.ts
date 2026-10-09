import { Cat, TnrRecord, FinancialTransaction, FinanceCategory } from '../types';
import { CATEGORY_LABELS } from '../components/FinanceFormModal';

export type ReportType = 'all' | 'active' | 'adopted' | 'deceased' | 'tnr' | 'financial';
export type PeriodFilter = 'this_month' | 'last_month' | 'this_year' | 'custom' | 'all';
export type Orientation = 'landscape' | 'portrait';

export interface FinancialColumnSelection {
  date: boolean;
  type: boolean;
  category: boolean;
  title: boolean;
  partnerName: boolean;
  invoiceNumber: boolean;
  amount: boolean;
  status: boolean;
  paymentMethod: boolean;
  taxYear: boolean;
  navReference: boolean;
  catId: boolean;
  fosterId: boolean;
  sourceModule: boolean;
  notes: boolean;
}

export interface AnimalColumnSelection {
  // Azonosítás
  incSorszam: boolean;
  incName: boolean;
  incChip: boolean;
  incGender: boolean;
  incColor: boolean;
  incAge: boolean;

  // Státusz & Elhelyezés
  incStatus: boolean;
  incLocation: boolean;
  incNotes: boolean;

  // Bekerülés
  incIntakeType: boolean;
  incIntakeDate: boolean;
  incIntakeBy: boolean;
  incIntakeLocation: boolean;

  // Egészség
  incSpayed: boolean;
  incVaccines: boolean;
  incPassbook: boolean;
  incMedicalNotes: boolean;

  // Örökbefogadás
  incAdopterName: boolean;
  incAdoptedDate: boolean;
  incAdopterContact: boolean;

  // Egyéb
  incHasPhoto: boolean;
  incAuditDates: boolean;
}

export interface AnimalFilterOptions {
  reportType: ReportType; // 'all' | 'active' | 'adopted' | 'deceased'
  genderFilter: 'all' | 'bak' | 'nosteny';
  intakeTypeFilter: 'all' | 'sajat' | 'befogott' | 'leadott' | 'elkobzott';
  startDate?: string;
  endDate?: string;
  includeDeceasedInAll?: boolean;
}

export interface ExportOptions {
  // Document mode
  isOfficial: boolean; // HITELES vs NEM HITELES (munkapéldány)
  orientation: Orientation;
  pageSize: 'a4';

  // Scope
  reportType: ReportType;
  periodFilter: PeriodFilter;
  customStartDate?: string;
  customEndDate?: string;
  includeStorno: boolean;

  // Animal specific filters
  animalFilters?: AnimalFilterOptions;

  // Header & Identity
  customTitle: string;
  organizationName: string;
  taxNumber: string;
  registrationNo: string;
  targetAuthority: string;
  registryFileNo: string;
  signatoryName: string;
  customNotes: string;

  // Visual toggles
  showSignatureBlock: boolean;
  showDisclaimer: boolean;

  // Column choices
  financialColumns: FinancialColumnSelection;
  animalColumns: AnimalColumnSelection;
}

export const OFFICIAL_DISCLAIMER_TEXT =
  'Ez a kimutatás a Cica-NyT belső nyilvántartásából készült. Nem minősül számlának, számviteli bizonylatnak vagy NAV által kibocsátott dokumentumnak.';

export const DEFAULT_FINANCIAL_COLUMNS: FinancialColumnSelection = {
  date: true,
  type: true,
  category: true,
  title: true,
  partnerName: true,
  invoiceNumber: true,
  amount: true,
  status: true,
  paymentMethod: true,
  taxYear: true,
  navReference: false,
  catId: true,
  fosterId: true,
  sourceModule: false,
  notes: false,
};

export const DEFAULT_ANIMAL_COLUMNS: AnimalColumnSelection = {
  incSorszam: true,
  incName: true,
  incChip: true,
  incGender: true,
  incColor: true,
  incAge: true,
  incStatus: true,
  incLocation: true,
  incNotes: false,
  incIntakeType: true,
  incIntakeDate: true,
  incIntakeBy: false,
  incIntakeLocation: false,
  incSpayed: true,
  incVaccines: true,
  incPassbook: true,
  incMedicalNotes: false,
  incAdopterName: true,
  incAdoptedDate: true,
  incAdopterContact: false,
  incHasPhoto: true,
  incAuditDates: false,
};

export function filterFinancesByOptions(
  finances: FinancialTransaction[],
  options: Pick<ExportOptions, 'periodFilter' | 'customStartDate' | 'customEndDate' | 'includeStorno'>
): FinancialTransaction[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return finances.filter((t) => {
    if (!options.includeStorno && t.status === 'storno') {
      return false;
    }

    if (!t.date || !/^\d{4}-\d{2}-\d{2}/.test(t.date)) {
      return true;
    }

    const [yearStr, monthStr] = t.date.split('-');
    const tYear = parseInt(yearStr, 10);
    const tMonth = parseInt(monthStr, 10) - 1;

    if (options.periodFilter === 'this_month') {
      if (tYear !== currentYear || tMonth !== currentMonth) return false;
    } else if (options.periodFilter === 'last_month') {
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      if (tYear !== lastMonthYear || tMonth !== lastMonth) return false;
    } else if (options.periodFilter === 'this_year') {
      if (tYear !== currentYear) return false;
    } else if (options.periodFilter === 'custom') {
      if (options.customStartDate && t.date < options.customStartDate) return false;
      if (options.customEndDate && t.date > options.customEndDate) return false;
    }

    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function filterCatsByOptions(cats: Cat[], reportType: ReportType, filters?: AnimalFilterOptions): Cat[] {
  return cats.filter((cat) => {
    // Report Type Scope
    if (reportType === 'active') {
      if (cat.status === 'gazdis' || cat.status === 'elhunyt') return false;
    } else if (reportType === 'adopted') {
      if (cat.status !== 'gazdis') return false;
    } else if (reportType === 'deceased') {
      if (cat.status !== 'elhunyt') return false;
    } else if (reportType === 'all') {
      if (!filters?.includeDeceasedInAll && cat.status === 'elhunyt') return false;
    }

    if (filters) {
      if (filters.genderFilter && filters.genderFilter !== 'all' && cat.ivar !== filters.genderFilter) {
        return false;
      }

      if (filters.intakeTypeFilter && filters.intakeTypeFilter !== 'all') {
        if (filters.intakeTypeFilter === 'sajat') {
          if (cat.intakeType && cat.intakeType !== 'sajat') return false;
        } else {
          if (cat.intakeType !== filters.intakeTypeFilter) return false;
        }
      }

      const catDate = cat.befogottMikor || cat.behozottMikor || (cat.created ? cat.created.split('T')[0] : '');
      if (filters.startDate && catDate && catDate < filters.startDate) return false;
      if (filters.endDate && catDate && catDate > filters.endDate) return false;
    }

    return true;
  });
}

export function getFinancialSummaryMetrics(finances: FinancialTransaction[]) {
  const valid = finances.filter((f) => f.status !== 'storno');
  const totalIncome = valid.filter((f) => f.type === 'bevetel').reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalExpense = valid.filter((f) => f.type === 'kiadas').reduce((sum, f) => sum + (f.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;
  const stornoCount = finances.filter((f) => f.status === 'storno').length;

  return {
    validCount: valid.length,
    totalCount: finances.length,
    stornoCount,
    totalIncome,
    totalExpense,
    netBalance,
  };
}

export function getHungarianCategoryName(categoryKey: string): string {
  if (categoryKey in CATEGORY_LABELS) {
    return CATEGORY_LABELS[categoryKey as FinanceCategory].name;
  }
  return categoryKey;
}

export function buildSafeFilename(options: ExportOptions, extension: 'pdf' | 'ods' | 'odt'): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const typeTag =
    options.reportType === 'financial'
      ? 'Penzugy'
      : options.reportType === 'tnr'
      ? 'TNR'
      : options.reportType === 'active'
      ? 'Aktiv_Allatok'
      : options.reportType === 'adopted'
      ? 'Gazdis_Allatok'
      : options.reportType === 'deceased'
      ? 'Elhunyt_Allatok'
      : 'Allatregiszter';

  const modeTag = options.isOfficial ? 'HITELES' : 'MUNKAPELDANY';
  return `CicaNyT_${typeTag}_${modeTag}_${dateStr}.${extension}`;
}
