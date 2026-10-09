import { ZipBuilder } from './zipBuilder';
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

function escapeXml(str?: string | number | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const MANIFEST_ODS = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

const MANIFEST_ODT = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" office:version="1.2">
</office:document-styles>`;

const META_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2">
  <office:meta>
    <meta:generator>Cica-NyT PWA Generator</meta:generator>
  </office:meta>
</office:document-meta>`;

export function generateOdsReport(
  options: ExportOptions,
  data: { cats: Cat[]; tnr: TnrRecord[]; finances: FinancialTransaction[] }
): Blob {
  const zip = new ZipBuilder();
  zip.addFile('mimetype', 'application/vnd.oasis.opendocument.spreadsheet');
  zip.addFile('META-INF/manifest.xml', MANIFEST_ODS);
  zip.addFile('styles.xml', STYLES_XML);
  zip.addFile('meta.xml', META_XML);

  let contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:officeooo="http://openoffice.org/2009/office"
 office:version="1.2">
  <office:body>
    <office:spreadsheet>`;

  if (options.reportType === 'financial') {
    const filteredFinances = filterFinancesByOptions(data.finances, options);
    const metrics = getFinancialSummaryMetrics(filteredFinances);

    // Sheet 1: Tételek
    contentXml += `<table:table table:name="Tételek">`;
    const headers: string[] = [];
    const cols = options.financialColumns;
    if (cols.date) headers.push('Dátum');
    if (cols.type) headers.push('Típus');
    if (cols.category) headers.push('Kategória');
    if (cols.title) headers.push('Megnevezés');
    if (cols.partnerName) headers.push('Partner / Adományozó');
    if (cols.invoiceNumber) headers.push('Számlaszám');
    if (cols.amount) headers.push('Összeg (Ft)');
    if (cols.status) headers.push('Státusz');
    if (cols.paymentMethod) headers.push('Fizetési mód');
    if (cols.taxYear) headers.push('Adóév (1%)');
    if (cols.navReference) headers.push('NAV iktatószám');
    if (cols.sourceModule) headers.push('Forrás modul');
    if (cols.notes) headers.push('Megjegyzés');

    contentXml += `<table:table-row>`;
    headers.forEach((h) => {
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(h)}</text:p></table:table-cell>`;
    });
    contentXml += `</table:table-row>`;

    filteredFinances.forEach((f) => {
      contentXml += `<table:table-row>`;
      if (cols.date) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.date || '')}</text:p></table:table-cell>`;
      if (cols.type) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.type === 'bevetel' ? 'Bevétel' : 'Kiadás')}</text:p></table:table-cell>`;
      if (cols.category) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(getHungarianCategoryName(f.category))}</text:p></table:table-cell>`;
      if (cols.title) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.title || '')}</text:p></table:table-cell>`;
      if (cols.partnerName) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.partnerName || '-')}</text:p></table:table-cell>`;
      if (cols.invoiceNumber) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.invoiceNumber || '-')}</text:p></table:table-cell>`;
      if (cols.amount) contentXml += `<table:table-cell office:value-type="float" office:value="${f.amount || 0}"><text:p>${f.amount || 0}</text:p></table:table-cell>`;
      if (cols.status) {
        const stLabel = f.status === 'teljesult' ? 'Teljesült' : f.status === 'fuggoben' ? 'Függőben' : 'Stornó';
        contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(stLabel)}</text:p></table:table-cell>`;
      }
      if (cols.paymentMethod) {
        const pmLabel = PAYMENT_METHOD_LABELS[f.paymentMethod]?.name || f.paymentMethod;
        contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(pmLabel)}</text:p></table:table-cell>`;
      }
      if (cols.taxYear) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.taxYear || '-')}</text:p></table:table-cell>`;
      if (cols.navReference) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.navReference || '-')}</text:p></table:table-cell>`;
      if (cols.sourceModule) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.sourceModule || 'manual')}</text:p></table:table-cell>`;
      if (cols.notes) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.notes || '')}</text:p></table:table-cell>`;
      contentXml += `</table:table-row>`;
    });
    contentXml += `</table:table>`;

    // Sheet 2: Összesítő
    contentXml += `<table:table table:name="Összesítő">`;
    const summaryRows = [
      ['Szervezet neve', options.organizationName],
      ['Adószám', options.taxNumber || 'Nincs megadva'],
      ['Nyilvántartási szám', options.registrationNo || 'Nincs megadva'],
      ['Iktatószám', options.registryFileNo],
      ['Kiállítás ideje', new Date().toLocaleString('hu-HU')],
      ['Időszak', options.periodFilter],
      ['Érvényes tételek száma', `${metrics.validCount} db`],
      ['Stornózott tételek száma', `${metrics.stornoCount} db`],
      ['Összes bevétel (Ft)', `${metrics.totalIncome}`],
      ['Összes kiadás (Ft)', `${metrics.totalExpense}`],
      ['Nettó egyenleg (Ft)', `${metrics.netBalance}`],
      ['Felelősségi nyilatkozat', OFFICIAL_DISCLAIMER_TEXT],
    ];

    summaryRows.forEach(([label, val]) => {
      contentXml += `<table:table-row>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(label)}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(val)}</text:p></table:table-cell>`;
      contentXml += `</table:table-row>`;
    });
    contentXml += `</table:table>`;
  } else if (options.reportType === 'tnr') {
    contentXml += `<table:table table:name="TNR Program">`;
    contentXml += `<table:table-row>`;
    ['Azonosító / Név', 'Befogás helyszíne', 'Befogás dátuma', 'Befogó személy', 'Klinika / Orvos', 'Státusz / Elengedés'].forEach((h) => {
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(h)}</text:p></table:table-cell>`;
    });
    contentXml += `</table:table-row>`;

    data.tnr.forEach((t) => {
      contentXml += `<table:table-row>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(t.catNameOrTag || 'TNR Cica')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(t.locationTrapped || '-')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(t.dateTrapped || '-')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(t.trappedBy || '-')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(`${t.clinicLocation || ''} ${t.surgeonName ? '(' + t.surgeonName + ')' : ''}`.trim() || '-')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(t.locationReleased ? `${t.locationReleased} (${t.dateReleased || ''})` : t.status)}</text:p></table:table-cell>`;
      contentXml += `</table:table-row>`;
    });

    contentXml += `</table:table>`;
  } else {
    // Cats list (Detailed Animal Export)
    const filteredCats = filterCatsByOptions(data.cats, options.reportType, options.animalFilters);
    const ac = options.animalColumns;

    contentXml += `<table:table table:name="Állatok">`;
    contentXml += `<table:table-row>`;
    if (ac.incSorszam) contentXml += `<table:table-cell office:value-type="string"><text:p>Sorszám</text:p></table:table-cell>`;
    if (ac.incName) contentXml += `<table:table-cell office:value-type="string"><text:p>Cica neve</text:p></table:table-cell>`;
    if (ac.incChip) contentXml += `<table:table-cell office:value-type="string"><text:p>Chip szám</text:p></table:table-cell>`;
    if (ac.incGender) contentXml += `<table:table-cell office:value-type="string"><text:p>Ivar</text:p></table:table-cell>`;
    if (ac.incColor) contentXml += `<table:table-cell office:value-type="string"><text:p>Szín / Mintázat</text:p></table:table-cell>`;
    if (ac.incAge) contentXml += `<table:table-cell office:value-type="string"><text:p>Kor / Született</text:p></table:table-cell>`;
    if (ac.incStatus) contentXml += `<table:table-cell office:value-type="string"><text:p>Státusz</text:p></table:table-cell>`;
    if (ac.incLocation) contentXml += `<table:table-cell office:value-type="string"><text:p>Tartási hely</text:p></table:table-cell>`;
    if (ac.incNotes) contentXml += `<table:table-cell office:value-type="string"><text:p>Megjegyzés</text:p></table:table-cell>`;
    if (ac.incIntakeType) contentXml += `<table:table-cell office:value-type="string"><text:p>Bekerülés Típusa</text:p></table:table-cell>`;
    if (ac.incIntakeDate) contentXml += `<table:table-cell office:value-type="string"><text:p>Bekerülés Dátuma</text:p></table:table-cell>`;
    if (ac.incIntakeBy) contentXml += `<table:table-cell office:value-type="string"><text:p>Ki Hozta / Befogó</text:p></table:table-cell>`;
    if (ac.incIntakeLocation) contentXml += `<table:table-cell office:value-type="string"><text:p>Befogás Helyszíne</text:p></table:table-cell>`;
    if (ac.incSpayed) contentXml += `<table:table-cell office:value-type="string"><text:p>Ivartalanítva</text:p></table:table-cell>`;
    if (ac.incVaccines) contentXml += `<table:table-cell office:value-type="string"><text:p>Oltások</text:p></table:table-cell>`;
    if (ac.incPassbook) contentXml += `<table:table-cell office:value-type="string"><text:p>Kiskönyv</text:p></table:table-cell>`;
    if (ac.incMedicalNotes) contentXml += `<table:table-cell office:value-type="string"><text:p>Orvosi Megjegyzés</text:p></table:table-cell>`;
    if (ac.incAdopterName) contentXml += `<table:table-cell office:value-type="string"><text:p>Örökbefogadó Neve</text:p></table:table-cell>`;
    if (ac.incAdoptedDate) contentXml += `<table:table-cell office:value-type="string"><text:p>Örökbeadás Dátuma</text:p></table:table-cell>`;
    if (ac.incAdopterContact) contentXml += `<table:table-cell office:value-type="string"><text:p>Gazdi Elérhetősége</text:p></table:table-cell>`;
    if (ac.incHasPhoto) contentXml += `<table:table-cell office:value-type="string"><text:p>Fotó</text:p></table:table-cell>`;
    if (ac.incAuditDates) contentXml += `<table:table-cell office:value-type="string"><text:p>Rögzítve / Módosítva</text:p></table:table-cell>`;
    contentXml += `</table:table-row>`;

    filteredCats.forEach((cat) => {
      contentXml += `<table:table-row>`;
      if (ac.incSorszam) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(`#${cat.sorszam || cat.id.slice(0, 4)}`)}</text:p></table:table-cell>`;
      if (ac.incName) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.nev || 'Névtelen')}</text:p></table:table-cell>`;
      if (ac.incChip) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.chipNumber || 'Nincs')}</text:p></table:table-cell>`;
      if (ac.incGender) contentXml += `<table:table-cell office:value-type="string"><text:p>${cat.ivar === 'bak' ? 'Bak (Kandúr)' : 'Nőstény'}</text:p></table:table-cell>`;
      if (ac.incColor) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.szin || '-')}</text:p></table:table-cell>`;
      if (ac.incAge) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.kor || cat.szuletett || '-')}</text:p></table:table-cell>`;
      if (ac.incStatus) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.status || 'Gondozásban')}</text:p></table:table-cell>`;
      if (ac.incLocation) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.tartasiHely || '-')}</text:p></table:table-cell>`;
      if (ac.incNotes) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.megjegyzes || '-')}</text:p></table:table-cell>`;
      if (ac.incIntakeType) {
        const typeStr = cat.intakeType === 'befogott' ? 'Befogott' : cat.intakeType === 'leadott' ? 'Leadott' : cat.intakeType === 'elkobzott' ? 'Elkobzott' : 'Saját';
        contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(typeStr)}</text:p></table:table-cell>`;
      }
      if (ac.incIntakeDate) {
        const dateVal = cat.befogottMikor || cat.behozottMikor || (cat.created ? cat.created.split('T')[0] : '');
        contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(dateVal || '-')}</text:p></table:table-cell>`;
      }
      if (ac.incIntakeBy) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.befogtaKi || cat.behoztaKi || '-')}</text:p></table:table-cell>`;
      if (ac.incIntakeLocation) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.befogottHol || '-')}</text:p></table:table-cell>`;
      if (ac.incSpayed) contentXml += `<table:table-cell office:value-type="string"><text:p>${cat.isSpayed ? 'Igen' : 'Nem'}</text:p></table:table-cell>`;
      if (ac.incVaccines) {
        const vStr = [
          cat.oltasKombinalt ? 'Kombinált' : '',
          cat.oltasVeszettseg ? 'Veszettség' : '',
          cat.oltasLeukosis ? 'Leukosis' : '',
        ].filter(Boolean).join(', ') || 'Nincs rögzítve';
        contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(vStr)}</text:p></table:table-cell>`;
      }
      if (ac.incPassbook) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.hasKiskonyv ? `Van (${cat.kiskonyvSzam || '-'})` : 'Nincs')}</text:p></table:table-cell>`;
      if (ac.incMedicalNotes) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.orvosiMegjegyzes || '-')}</text:p></table:table-cell>`;
      if (ac.incAdopterName) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.gazdisPerson || '-')}</text:p></table:table-cell>`;
      if (ac.incAdoptedDate) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.gazdisDate || '-')}</text:p></table:table-cell>`;
      if (ac.incAdopterContact) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.gazdisPhone || '-')}</text:p></table:table-cell>`;
      if (ac.incHasPhoto) contentXml += `<table:table-cell office:value-type="string"><text:p>${cat.fotoUrl ? 'Van fotó' : 'Nincs'}</text:p></table:table-cell>`;
      if (ac.incAuditDates) contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(cat.created ? cat.created.split('T')[0] : '-')}</text:p></table:table-cell>`;
      contentXml += `</table:table-row>`;
    });

    contentXml += `</table:table>`;

    // Sheet 2: Összesítő (Summary Sheet)
    contentXml += `<table:table table:name="Összesítő">`;
    const totalCount = filteredCats.length;
    const activeCount = filteredCats.filter((c) => c.status !== 'gazdis' && c.status !== 'elhunyt').length;
    const adoptedCount = filteredCats.filter((c) => c.status === 'gazdis').length;
    const deceasedCount = filteredCats.filter((c) => c.status === 'elhunyt').length;
    const kandurCount = filteredCats.filter((c) => c.ivar === 'bak').length;
    const nostenyCount = filteredCats.filter((c) => c.ivar === 'nosteny').length;
    const spayedCount = filteredCats.filter((c) => c.isSpayed).length;
    const chipCount = filteredCats.filter((c) => !!c.chipNumber).length;

    const animalSummaryRows = [
      ['Szervezet neve', options.organizationName],
      ['Adószám', options.taxNumber || 'Nincs megadva'],
      ['Nyilvántartási szám', options.registrationNo || 'Nincs megadva'],
      ['Iktatószám', options.registryFileNo],
      ['Kiállítás ideje', new Date().toLocaleString('hu-HU')],
      ['Listázott állatok száma', `${totalCount} db`],
      ['Gondozásban (Aktív)', `${activeCount} db`],
      ['Gazdisodott (Örökbefogadott)', `${adoptedCount} db`],
      ['Elhunyt', `${deceasedCount} db`],
      ['Bak (Kandúr) száma', `${kandurCount} db`],
      ['Nőstény száma', `${nostenyCount} db`],
      ['Ivartalanított állatok', `${spayedCount} db`],
      ['Mikrochippel ellátott', `${chipCount} db`],
      ['Felelősségi nyilatkozat', OFFICIAL_DISCLAIMER_TEXT],
    ];

    animalSummaryRows.forEach(([label, val]) => {
      contentXml += `<table:table-row>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(label)}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(val)}</text:p></table:table-cell>`;
      contentXml += `</table:table-row>`;
    });
    contentXml += `</table:table>`;
  }

  contentXml += `</office:spreadsheet></office:body></office:document-content>`;
  zip.addFile('content.xml', contentXml);

  return zip.buildBlob('application/vnd.oasis.opendocument.spreadsheet');
}

export function generateOdtReport(
  options: ExportOptions,
  data: { cats: Cat[]; tnr: TnrRecord[]; finances: FinancialTransaction[] }
): Blob {
  const zip = new ZipBuilder();
  zip.addFile('mimetype', 'application/vnd.oasis.opendocument.text');
  zip.addFile('META-INF/manifest.xml', MANIFEST_ODT);
  zip.addFile('styles.xml', STYLES_XML);
  zip.addFile('meta.xml', META_XML);

  let contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 office:version="1.2">
  <office:body>
    <office:text>`;

  // Title Block
  contentXml += `<text:h text:outline-level="1">${escapeXml(options.customTitle)}</text:h>`;
  contentXml += `<text:p><text:span text:style-name="Bold">Szervezet:</text:span> ${escapeXml(options.organizationName)}</text:p>`;
  if (options.taxNumber) contentXml += `<text:p><text:span text:style-name="Bold">Adószám:</text:span> ${escapeXml(options.taxNumber)}</text:p>`;
  if (options.registrationNo) contentXml += `<text:p><text:span text:style-name="Bold">Nyilvántartási szám:</text:span> ${escapeXml(options.registrationNo)}</text:p>`;
  contentXml += `<text:p><text:span text:style-name="Bold">Hitelesség:</text:span> ${options.isOfficial ? 'HITELES IGAZOLÁS' : 'NEM HITELES - MUNKAPÉLDÁNY'}</text:p>`;
  contentXml += `<text:p><text:span text:style-name="Bold">Iktatószám:</text:span> ${escapeXml(options.registryFileNo)} | <text:span text:style-name="Bold">Dátum:</text:span> ${new Date().toLocaleDateString('hu-HU')}</text:p>`;

  contentXml += `<text:p></text:p>`;

  if (options.reportType === 'financial') {
    const filteredFinances = filterFinancesByOptions(data.finances, options);
    const metrics = getFinancialSummaryMetrics(filteredFinances);

    contentXml += `<text:h text:outline-level="2">Pénzügyi Összesítés</text:h>`;
    contentXml += `<text:p>Érvényes tételek: ${metrics.validCount} db | Összes bevétel: ${metrics.totalIncome.toLocaleString('hu-HU')} Ft | Összes kiadás: ${metrics.totalExpense.toLocaleString('hu-HU')} Ft | Nettó egyenleg: ${metrics.netBalance.toLocaleString('hu-HU')} Ft</text:p>`;
    if (metrics.stornoCount > 0) {
      contentXml += `<text:p>Stornózott tételek száma (összesítőből kizárva): ${metrics.stornoCount} db</text:p>`;
    }

    contentXml += `<text:h text:outline-level="2">Részletes Tranzakciós Lista</text:h>`;
    contentXml += `<table:table table:name="FinancesTable">`;
    contentXml += `<table:table-row>`;
    ['Dátum', 'Típus', 'Kategória', 'Megnevezés', 'Partner', 'Összeg (Ft)', 'Státusz'].forEach((h) => {
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(h)}</text:p></table:table-cell>`;
    });
    contentXml += `</table:table-row>`;

    filteredFinances.forEach((f) => {
      contentXml += `<table:table-row>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.date || '-')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.type === 'bevetel' ? 'Bevétel' : 'Kiadás')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(getHungarianCategoryName(f.category))}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.title || '-')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.partnerName || '-')}</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${f.amount || 0} Ft</text:p></table:table-cell>`;
      contentXml += `<table:table-cell office:value-type="string"><text:p>${escapeXml(f.status === 'teljesult' ? 'Teljesült' : f.status === 'fuggoben' ? 'Függőben' : 'Stornó')}</text:p></table:table-cell>`;
      contentXml += `</table:table-row>`;
    });
    contentXml += `</table:table>`;
  } else {
    const filteredCats = filterCatsByOptions(data.cats, options.reportType, options.animalFilters);
    contentXml += `<text:h text:outline-level="2">Állatállomány Összesítés</text:h>`;
    contentXml += `<text:p>Kimutatásban szereplő állatok száma: ${filteredCats.length} db</text:p>`;
    contentXml += `<text:p>Részletes táblázat az exportált ODS munkalapon érhető el.</text:p>`;
  }

  if (options.showDisclaimer) {
    contentXml += `<text:p></text:p>`;
    contentXml += `<text:p><text:span text:style-name="Italic">${escapeXml(OFFICIAL_DISCLAIMER_TEXT)}</text:span></text:p>`;
  }

  if (options.showSignatureBlock && options.isOfficial) {
    contentXml += `<text:p></text:p>`;
    contentXml += `<text:p>Kiadta és igazolta: __________________________</text:p>`;
    contentXml += `<text:p>${escapeXml(options.signatoryName)} (P.H. / Hivatalos képviselő)</text:p>`;
  }

  contentXml += `</office:text></office:body></office:document-content>`;
  zip.addFile('content.xml', contentXml);

  return zip.buildBlob('application/vnd.oasis.opendocument.text');
}
