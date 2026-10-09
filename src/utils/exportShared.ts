import { Cat, TnrRecord, FinancialTransaction, FinanceCategory } from '../types';
import { CATEGORY_LABELS } from '../components/FinanceFormModal';

export type ReportType = 'all' | 'active' | 'adopted' | 'tnr' | 'financial';
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
  incSorszam: boolean;
  incName: boolean;
  incGenderColor: boolean;
  incChip: boolean;
  incIntake: boolean;
  incSpayed: boolean;
  incPassbook: boolean;
  incAdopter: boolean;
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
  incGenderColor: true,
  incChip: true,
  incIntake: true,
  incSpayed: true,
  incPassbook: true,
  incAdopter: true,
};

export function filterFinancesByOptions(
  finances: FinancialTransaction[],
  options: Pick<ExportOptions, 'periodFilter' | 'customStartDate' | 'customEndDate' | 'includeStorno'>
): FinancialTransaction[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return finances.filter((t) => {
    // Exclude storno unless explicitly requested
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

export function filterCatsByOptions(cats: Cat[], reportType: ReportType): Cat[] {
  return cats.filter((cat) => {
    if (reportType === 'active') return cat.status !== 'gazdis' && cat.status !== 'elhunyt';
    if (reportType === 'adopted') return cat.status === 'gazdis';
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
      : 'Allatregiszter';

  const modeTag = options.isOfficial ? 'HITELES' : 'MUNKAPELDANY';
  return `CicaNyT_${typeTag}_${modeTag}_${dateStr}.${extension}`;
}
