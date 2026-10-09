import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ExportOptions,
  OFFICIAL_DISCLAIMER_TEXT,
  filterFinancesByOptions,
  filterCatsByOptions,
  getFinancialSummaryMetrics,
  getHungarianCategoryName,
} from './exportShared';
import { Cat, TnrRecord, FinancialTransaction } from '../types';
import { PAYMENT_METHOD_LABELS } from '../components/FinanceFormModal';

// Map double-acute Hungarian accents (ő, ű) to closest standard accents (ö, ü) for standard jsPDF Helvetica font compatibility
export const cleanPdfText = (str?: string | null): string => {
  if (!str) return '';
  return str
    .replace(/ő/g, 'ö')
    .replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü')
    .replace(/Ű/g, 'Ü');
};

export function generatePdfReport(
  options: ExportOptions,
  data: { cats: Cat[]; tnr: TnrRecord[]; finances: FinancialTransaction[] }
): void {
  const doc = new jsPDF(options.orientation === 'portrait' ? 'p' : 'l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '.');

  const defaultTitle =
    options.reportType === 'tnr'
      ? 'HATÓSÁGI TNR (BEFOGÁS-IVARTALANÍTÁS) JEGYZŐKÖNYV'
      : options.reportType === 'financial'
      ? 'PÉNZÜGYI BELSŐ FŐKÖNYVI KIMUTATÁS'
      : options.reportType === 'active'
      ? 'GONDOZÁSBAN LÉVŐ ÁLLATOK HIVATALOS JEGYZÉKE'
      : options.reportType === 'adopted'
      ? 'ÖRÖKBEFOGADOTT (GAZDIS) ÁLLATOK KIMUTATÁSA'
      : options.reportType === 'deceased'
      ? 'ELHUNYT ÁLLATOK NYILVÁNTARTÁSA'
      : 'TELJES ÁLLATNYILVÁNTARTÁSI REGISZTER';

  const finalTitle = cleanPdfText(options.customTitle.trim() || defaultTitle);

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(finalTitle, 14, 16);

  // Status Badge
  if (options.isOfficial) {
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(34, 197, 94);
    doc.rect(pageWidth - 65, 10, 51, 10, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text('HITELES IGAZOLÁS', pageWidth - 40, 16, { align: 'center' });
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.rect(pageWidth - 75, 10, 61, 10, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27);
    doc.text('NEM HITELES - MUNKAPÉLDÁNY', pageWidth - 44, 16, { align: 'center' });
  }

  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  let orgLine = `Szervezet: ${cleanPdfText(options.organizationName)}`;
  if (options.isOfficial) {
    if (options.taxNumber) orgLine += `  |  Adószám: ${cleanPdfText(options.taxNumber)}`;
    if (options.registrationNo) orgLine += `  |  ${cleanPdfText(options.registrationNo)}`;
  }
  doc.text(orgLine, 14, 23);

  if (options.isOfficial) {
    doc.text(`Célhatóság / Címzett: ${cleanPdfText(options.targetAuthority)}  |  Iktatószám: ${cleanPdfText(options.registryFileNo)}`, 14, 28);
  } else {
    doc.text(`Besorolás: Belső Használatú Tájékoztató  |  Készült: ${dateStr}`, 14, 28);
  }

  let startY = 33;

  // Header Summary Box
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(14, startY, pageWidth - 28, 12, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  if (options.reportType === 'financial') {
    const filteredFinances = filterFinancesByOptions(data.finances, options);
    const metrics = getFinancialSummaryMetrics(filteredFinances);
    doc.text(
      `Összes Bevétel: ${metrics.totalIncome.toLocaleString('hu-HU')} Ft   |   Összes Kiadás: ${metrics.totalExpense.toLocaleString('hu-HU')} Ft   |   Nettó Egyenleg: ${metrics.netBalance.toLocaleString('hu-HU')} Ft   |   Érvényes Tételek: ${metrics.validCount} db`,
      18,
      startY + 7.5
    );
  } else if (options.reportType === 'tnr') {
    doc.text(`Összes TNR rekord: ${data.tnr.length} db   |   Kiállítás dátuma: ${dateStr}`, 18, startY + 7.5);
  } else {
    const filteredCats = filterCatsByOptions(data.cats, options.reportType, options.animalFilters);
    const activeCount = filteredCats.filter((c) => c.status !== 'gazdis' && c.status !== 'elhunyt').length;
    const adoptedCount = filteredCats.filter((c) => c.status === 'gazdis').length;
    doc.text(
      `Listázott állatok száma: ${filteredCats.length} db   |   Aktív gondozásban: ${activeCount} db   |   Gazdisodott: ${adoptedCount} db   |   Kelt: ${dateStr}`,
      18,
      startY + 7.5
    );
  }

  startY += 17;

  // Table Data Preparation
  let headCols: string[] = [];
  let bodyData: string[][] = [];

  if (options.reportType === 'financial') {
    const filteredFinances = filterFinancesByOptions(data.finances, options);
    const cols = options.financialColumns;

    if (cols.date) headCols.push('Dátum');
    if (cols.type) headCols.push('Típus');
    if (cols.category) headCols.push('Kategória');
    if (cols.title) headCols.push('Megnevezés');
    if (cols.partnerName) headCols.push('Partner');
    if (cols.invoiceNumber) headCols.push('Számla');
    if (cols.amount) headCols.push('Összeg Ft');
    if (cols.status) headCols.push('Státusz');
    if (cols.paymentMethod) headCols.push('Mód');
    if (cols.taxYear) headCols.push('Adóév');

    bodyData = filteredFinances.map((fin) => {
      const row: string[] = [];
      if (cols.date) row.push(fin.date || '-');
      if (cols.type) row.push(fin.type === 'bevetel' ? 'Bevétel' : 'Kiadás');
      if (cols.category) row.push(cleanPdfText(getHungarianCategoryName(fin.category)));
      if (cols.title) row.push(cleanPdfText(fin.title || '-'));
      if (cols.partnerName) row.push(cleanPdfText(fin.partnerName || '-'));
      if (cols.invoiceNumber) row.push(cleanPdfText(fin.invoiceNumber || '-'));
      if (cols.amount) row.push(`${fin.type === 'bevetel' ? '+' : '-'}${fin.amount?.toLocaleString('hu-HU') || '0'} Ft`);
      if (cols.status) row.push(fin.status === 'teljesult' ? 'Teljesült' : fin.status === 'fuggoben' ? 'Függőben' : 'Stornó');
      if (cols.paymentMethod) row.push(cleanPdfText(PAYMENT_METHOD_LABELS[fin.paymentMethod]?.name || fin.paymentMethod));
      if (cols.taxYear) row.push(cleanPdfText(fin.taxYear || '-'));
      return row;
    });
  } else if (options.reportType === 'tnr') {
    headCols = ['Azonosító / Neve', 'Befogás Helyszíne', 'Befogás Dátuma', 'Befogó Személy', 'Klinika / Orvos', 'Elengedve'];
    bodyData = data.tnr.map((t) => [
      cleanPdfText(t.catNameOrTag || 'TNR Cica'),
      cleanPdfText(t.locationTrapped || '-'),
      t.dateTrapped || '-',
      cleanPdfText(t.trappedBy || '-'),
      cleanPdfText(`${t.clinicLocation || ''} ${t.surgeonName ? '(' + t.surgeonName + ')' : ''}`.trim() || '-'),
      cleanPdfText(t.locationReleased ? `${t.locationReleased} (${t.dateReleased || ''})` : t.status),
    ]);
  } else {
    const filteredCats = filterCatsByOptions(data.cats, options.reportType, options.animalFilters);
    const ac = options.animalColumns;

    if (ac.incSorszam) headCols.push('Sorszám');
    if (ac.incName) headCols.push('Név');
    if (ac.incChip) headCols.push('Chip szám');
    if (ac.incGender) headCols.push('Ivar');
    if (ac.incColor) headCols.push('Szín');
    if (ac.incAge) headCols.push('Kor');
    if (ac.incStatus) headCols.push('Státusz');
    if (ac.incLocation) headCols.push('Tartási hely');
    if (ac.incNotes) headCols.push('Megjegyzés');
    if (ac.incIntakeType) headCols.push('Bekerülés');
    if (ac.incIntakeDate) headCols.push('Dátum');
    if (ac.incSpayed) headCols.push('Ivartalan');
    if (ac.incVaccines) headCols.push('Oltás');
    if (ac.incPassbook) headCols.push('Kiskönyv');
    if (ac.incAdopterName) headCols.push('Gazdi');
    if (ac.incAdoptedDate) headCols.push('Örökbeadás');

    bodyData = filteredCats.map((cat) => {
      const row: string[] = [];
      if (ac.incSorszam) row.push(`#${cat.sorszam || cat.id.slice(0, 4)}`);
      if (ac.incName) row.push(cleanPdfText(cat.nev || 'Névtelen'));
      if (ac.incChip) row.push(cat.chipNumber ? cleanPdfText(cat.chipNumber) : 'Nincs');
      if (ac.incGender) row.push(cat.ivar === 'bak' ? 'Bak' : 'Nőstény');
      if (ac.incColor) row.push(cleanPdfText(cat.szin || '-'));
      if (ac.incAge) row.push(cleanPdfText(cat.kor || cat.szuletett || '-'));
      if (ac.incStatus) row.push(cleanPdfText(cat.status || 'Gondozásban'));
      if (ac.incLocation) row.push(cleanPdfText(cat.tartasiHely || '-'));
      if (ac.incNotes) row.push(cleanPdfText(cat.megjegyzes || '-'));
      if (ac.incIntakeType) {
        const typeStr = cat.intakeType === 'befogott' ? 'Befogott' : cat.intakeType === 'leadott' ? 'Leadott' : cat.intakeType === 'elkobzott' ? 'Elkobzott' : 'Saját';
        row.push(cleanPdfText(typeStr));
      }
      if (ac.incIntakeDate) {
        const dateVal = cat.befogottMikor || cat.behozottMikor || (cat.created ? cat.created.split('T')[0] : '');
        row.push(cleanPdfText(dateVal || '-'));
      }
      if (ac.incSpayed) row.push(cat.isSpayed ? 'Igen' : 'Nem');
      if (ac.incVaccines) {
        const vStr = [
          cat.oltasKombinalt ? 'Komb' : '',
          cat.oltasVeszettseg ? 'Vesz' : '',
          cat.oltasLeukosis ? 'Leuk' : '',
        ].filter(Boolean).join(',') || 'Nincs';
        row.push(cleanPdfText(vStr));
      }
      if (ac.incPassbook) row.push(cat.hasKiskonyv ? cleanPdfText(`Van (${cat.kiskonyvSzam || '-'})`) : 'Nincs');
      if (ac.incAdopterName) row.push(cleanPdfText(cat.gazdisPerson || '-'));
      if (ac.incAdoptedDate) row.push(cleanPdfText(cat.gazdisDate || '-'));
      return row;
    });
  }

  const tableOptions = {
    startY,
    head: [headCols],
    body: bodyData,
    theme: 'grid' as const,
    headStyles: {
      fillColor: options.isOfficial ? [219, 39, 119] : [100, 116, 139],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold' as const,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    margin: { top: 15, left: 14, right: 14 },
    didDrawPage: (data: any) => {
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);

      if (options.showDisclaimer) {
        doc.text(cleanPdfText(OFFICIAL_DISCLAIMER_TEXT), 14, pageHeight - 10);
      }

      const footerStr = `Készült: ${now.toLocaleString('hu-HU')} | ${cleanPdfText(options.organizationName)} | Oldal ${data.pageNumber}`;
      doc.text(footerStr, 14, pageHeight - 6);

      if (options.showSignatureBlock && options.isOfficial && data.pageNumber === doc.internal.getNumberOfPages()) {
        const sigY = pageHeight - 26;
        doc.setFontSize(7.5);
        doc.setTextColor(40, 40, 40);
        doc.text('Kiadta és igazolta:', pageWidth - 80, sigY);
        doc.line(pageWidth - 80, sigY + 8, pageWidth - 14, sigY + 8);
        doc.setFont('helvetica', 'bold');
        doc.text(cleanPdfText(options.signatoryName), pageWidth - 80, sigY + 12);
        doc.setFont('helvetica', 'normal');
        doc.text('P.H. / Hivatalos aláírás', pageWidth - 80, sigY + 16);

        if (options.customNotes.trim()) {
          doc.text(`Megjegyzés: ${cleanPdfText(options.customNotes)}`, 14, pageHeight - 18);
        }
      }
    },
  };

  try {
    autoTable(doc, tableOptions);
  } catch (err) {
    console.error('autoTable PDF error:', err);
  }

  const safeFilename =
    options.reportType === 'financial'
      ? `CicaNyT_Penzugy_${options.isOfficial ? 'HITELES' : 'MUNKAPELDANY'}_${dateStr}.pdf`
      : `CicaNyT_Riport_${options.isOfficial ? 'HITELES' : 'MUNKAPELDANY'}_${dateStr}.pdf`;

  doc.save(safeFilename);
}
