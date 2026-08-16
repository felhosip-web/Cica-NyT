import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';
import { Cat, TnrRecord } from '../types';
import { CustomSelect } from './CustomSelect';

interface PdfReportsModalProps {
  onClose: () => void;
}

// Convert Hungarian specific characters to closest ASCII match for standard jsPDF fonts
const cleanText = (str?: string | null): string => {
  if (!str) return '';
  return str
    .replace(/ő/g, 'ö')
    .replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü')
    .replace(/Ű/g, 'Ü')
    .replace(/á/g, 'a')
    .replace(/Á/g, 'A')
    .replace(/é/g, 'e')
    .replace(/É/g, 'E')
    .replace(/í/g, 'i')
    .replace(/Í/g, 'I')
    .replace(/ó/g, 'o')
    .replace(/Ó/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ú/g, 'u')
    .replace(/Ú/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U');
};

export const PdfReportsModal: React.FC<PdfReportsModalProps> = ({ onClose }) => {
  const { orgName, addDebugLog } = useAppStore();

  // Mode: Hiteles (Certified) vs Nem hiteles (Unofficial / Working draft)
  const [isOfficial, setIsOfficial] = useState<boolean>(true);

  // Report Category
  const [reportType, setReportType] = useState<'all' | 'active' | 'adopted' | 'tnr' | 'financial'>('all');

  // Custom Editable Fields
  const [customTitle, setCustomTitle] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>(orgName || 'Cica-NyT Macskamenhely Egyesület');
  const [taxNumber, setTaxNumber] = useState<string>('19283746-1-42');
  const [registrationNo, setRegistrationNo] = useState<string>('Ny.sz.: 01-02-0012345');
  const [targetAuthority, setTargetAuthority] = useState<string>('Illetékes Hatóság / Könyvelés');
  const [signatoryName, setSignatoryName] = useState<string>('Elnök / Hivatalos Képviselő');
  const [registryFileNo, setRegistryFileNo] = useState<string>(`IKT-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [customNotes, setCustomNotes] = useState<string>('Hivatalos állatjóléti és egyed-nyilvántartási igazolás.');

  // Field selector toggles
  const [incSorszam, setIncSorszam] = useState(true);
  const [incName, setIncName] = useState(true);
  const [incGenderColor, setIncGenderColor] = useState(true);
  const [incChip, setIncChip] = useState(true);
  const [incIntake, setIncIntake] = useState(true);
  const [incSpayed, setIncSpayed] = useState(true);
  const [incPassbook, setIncPassbook] = useState(true);
  const [incAdopter, setIncAdopter] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch live cats & TNR records
  const allCats = (useLiveQuery(() => db.cats.toArray(), []) || []) as Cat[];
  const allTnr = (useLiveQuery(() => db.tnr.toArray(), []) || []) as TnrRecord[];

  // Filter cats based on selected reportType
  const filteredCats = allCats.filter((cat) => {
    if (reportType === 'active') return cat.status !== 'gazdis' && cat.status !== 'elhunyt';
    if (reportType === 'adopted') return cat.status === 'gazdis';
    if (reportType === 'financial') return true;
    return true; // 'all'
  });

  // Calculate stats
  const totalCatCount = filteredCats.length;
  const totalTnrCount = allTnr.length;

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rich tables
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '.');

      const defaultTitle =
        reportType === 'tnr'
          ? 'HATÓSÁGI TNR (BEFOGÁS-IVARTALANÍTÁS) JEGYZŐKÖNYV'
          : reportType === 'financial'
          ? 'PÉNZÜGYI ÉS EGÉSZSÉGÜGYI ÁLLATNYILVÁNTARTÁSI KIMUTATÁS'
          : reportType === 'active'
          ? 'GONDOZÁSBAN LÉVŐ ÁLLATOK HIVATALOS JEGYZÉKE'
          : reportType === 'adopted'
          ? 'ÖRÖKBEFOGADOTT (GAZDIS) ÁLLATOK KIMUTATÁSA'
          : 'TELJES ÁLLATNYILVÁNTARTÁSI REGISZTER';

      const finalTitle = cleanText(customTitle.trim() || defaultTitle);

      // --- HEADER SECTION ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(finalTitle, 14, 16);

      // Status Badge: Hiteles vs Nem Hiteles
      if (isOfficial) {
        doc.setFillColor(220, 252, 231); // Green bg
        doc.setDrawColor(34, 197, 94);
        doc.rect(pageWidth - 65, 10, 51, 10, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(22, 101, 52);
        doc.text('HITELES IGAZOLAS', pageWidth - 40, 16, { align: 'center' });
      } else {
        doc.setFillColor(254, 242, 242); // Red bg
        doc.setDrawColor(239, 68, 68);
        doc.rect(pageWidth - 75, 10, 61, 10, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(153, 27, 27);
        doc.text('NEM HITELES - MUNKAPELDANY', pageWidth - 44, 16, { align: 'center' });
      }

      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Organization info
      let orgLine = `Szervezet: ${cleanText(organizationName)}`;
      if (isOfficial) {
        orgLine += `  |  Adoszam: ${cleanText(taxNumber)}  |  ${cleanText(registrationNo)}`;
      }
      doc.text(orgLine, 14, 23);

      if (isOfficial) {
        doc.text(`Celhatosag / Cimzett: ${cleanText(targetAuthority)}  |  Iktatoszam: ${cleanText(registryFileNo)}`, 14, 28);
      } else {
        doc.text(`Besorolas: Belso Hasznalatu Tajekoztato  |  Keszult: ${dateStr}`, 14, 28);
      }

      let startY = 33;

      // Header summary box
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220, 225, 230);
      doc.roundedRect(14, startY, pageWidth - 28, 12, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      if (reportType === 'tnr') {
        doc.text(`Osszes TNR rekord: ${totalTnrCount} db   |   Kiállítás dátuma: ${dateStr}`, 18, startY + 7.5);
      } else {
        const activeCount = filteredCats.filter((c) => c.status !== 'gazdis' && c.status !== 'elhunyt').length;
        const adoptedCount = filteredCats.filter((c) => c.status === 'gazdis').length;
        doc.text(
          `Listazott allatok szama: ${totalCatCount} db   |   Aktiv gondozasban: ${activeCount} db   |   Gazdisodott: ${adoptedCount} db   |   Kelt: ${dateStr}`,
          18,
          startY + 7.5
        );
      }

      startY += 17;

      // --- TABLE GENERATION ---
      let headCols: string[] = [];
      let bodyData: string[][] = [];

      if (reportType === 'tnr') {
        headCols = ['Azonosíto / Neve', 'Befogas Helyszine', 'Befogas Datuma', 'Befogo Szemely', 'Klinika / Orvos', 'Elengedve'];
        bodyData = allTnr.map((t) => [
          cleanText(t.catNameOrTag || 'TNR Cica'),
          cleanText(t.locationTrapped || '-'),
          t.dateTrapped || '-',
          cleanText(t.trappedBy || '-'),
          cleanText(`${t.clinicLocation || ''} ${t.surgeonName ? '(' + t.surgeonName + ')' : ''}`.trim() || '-'),
          cleanText(t.locationReleased ? `${t.locationReleased} (${t.dateReleased || ''})` : t.status),
        ]);
      } else {
        // Build dynamic columns based on checkboxes
        if (incSorszam) headCols.push('Sorszam');
        if (incName) headCols.push('Nev');
        if (incGenderColor) {
          headCols.push('Ivar');
          headCols.push('Szin');
        }
        if (incChip) headCols.push('Chip szam');
        if (incIntake) headCols.push('Bekerules');
        if (incSpayed) headCols.push('Ivartalanitva');
        if (incPassbook) headCols.push('Kiskonyv');
        if (incAdopter) headCols.push('Statusz / Gazdi');

        bodyData = filteredCats.map((cat) => {
          const row: string[] = [];
          if (incSorszam) row.push(`#${cat.sorszam || cat.id.slice(0, 4)}`);
          if (incName) row.push(cleanText(cat.nev || 'Névtelen'));
          if (incGenderColor) {
            row.push(cat.ivar === 'bak' ? 'Bak (Kandur)' : 'Nosteny');
            row.push(cleanText(cat.szin || '-'));
          }
          if (incChip) row.push(cat.chipNumber ? cleanText(cat.chipNumber) : 'Nincs');
          if (incIntake) {
            const typeStr =
              cat.intakeType === 'befogott'
                ? 'Befogott'
                : cat.intakeType === 'leadott'
                ? 'Leadott'
                : cat.intakeType === 'elkobzott'
                ? 'Elkobzott'
                : 'Sajat';
            const dateVal = cat.befogottMikor || cat.behozottMikor || (cat.created ? cat.created.split('T')[0] : '');
            row.push(cleanText(`${typeStr} ${dateVal}`));
          }
          if (incSpayed) row.push(cat.isSpayed ? 'Igen' : 'Nem');
          if (incPassbook) row.push(cat.hasKiskonyv ? cleanText(`Van (${cat.kiskonyvSzam || '-'})`) : 'Nincs');
          if (incAdopter) {
            if (cat.status === 'gazdis') {
              row.push(cleanText(`Gazdis: ${cat.gazdisPerson || '-'} (${cat.gazdisDate || ''})`));
            } else {
              row.push(cleanText(cat.status || 'Gondozasban'));
            }
          }
          return row;
        });
      }

      const tableOptions = {
        startY: startY,
        head: [headCols],
        body: bodyData,
        theme: 'grid' as const,
        headStyles: {
          fillColor: isOfficial ? [219, 39, 119] : [100, 116, 139], // Pink for official, Slate for unofficial
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
          // Footer on every page
          doc.setFontSize(7.5);
          doc.setTextColor(120, 120, 120);
          const footerStr = `Keszult: ${now.toLocaleString()} | ${cleanText(organizationName)} | Oldal ${data.pageNumber}`;
          doc.text(footerStr, 14, pageHeight - 8);

          // Official verification signature box on last page
          if (isOfficial && data.pageNumber === doc.internal.getNumberOfPages()) {
            const sigY = pageHeight - 24;
            doc.setFontSize(7.5);
            doc.setTextColor(40, 40, 40);
            doc.text('Kiadta es igazolta:', pageWidth - 80, sigY);
            doc.line(pageWidth - 80, sigY + 10, pageWidth - 14, sigY + 10);
            doc.setFont('helvetica', 'bold');
            doc.text(cleanText(signatoryName), pageWidth - 80, sigY + 14);
            doc.setFont('helvetica', 'normal');
            doc.text('P.H. / Hivatalos alairas', pageWidth - 80, sigY + 18);

            if (customNotes.trim()) {
              doc.text(`Megjegyzés: ${cleanText(customNotes)}`, 14, pageHeight - 15);
            }
          }
        },
      };

      try {
        autoTable(doc, tableOptions);
      } catch (err) {
        console.error('autoTable fallback call:', err);
      }

      const safeFilename = `CicaNyT_Riport_${isOfficial ? 'HITELES' : 'MUNKAPELDANY'}_${dateStr}.pdf`;
      doc.save(safeFilename);
      addDebugLog(`[PDF Export] ${safeFilename} sikeresen letöltve.`);
      onClose();
    } catch (error: any) {
      console.error('PDF Generálási hiba:', error);
      alert('Hiba történt a PDF generálásakor: ' + (error?.message || 'Ismeretlen hiba'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-purple-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl font-black">
              📄
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">PDF Riport Generáló & Export</h2>
              <p className="text-xs text-pink-100/90 font-medium mt-0.5">
                Testreszabható hatósági vagy belső használatú kimutatás generálása
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-base flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          {/* STEP 1: Select Mode (Hiteles vs Nem Hiteles) */}
          <div className="space-y-2">
            <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
              1. Dokumentum Típusa & Hitelessége
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsOfficial(true)}
                className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-start gap-3 ${
                  isOfficial
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">🛡️</span>
                <div className="space-y-0.5">
                  <div className="font-extrabold text-xs flex items-center gap-1.5">
                    <span>HITELES Kiadvány</span>
                    <span className="text-[9px] bg-emerald-200 text-emerald-900 font-black px-1.5 py-0.2 rounded-full">
                      Hivatalos
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-normal leading-relaxed">
                    Hatóságok (NÉBIH, Önkormányzat, Könyvelés) részére. Tartalmazza a szervezet adószámát, iktatószámát és aláírási rovatát.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsOfficial(false)}
                className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-start gap-3 ${
                  !isOfficial
                    ? 'border-rose-400 bg-rose-50/70 text-rose-950 shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">📝</span>
                <div className="space-y-0.5">
                  <div className="font-extrabold text-xs flex items-center gap-1.5">
                    <span>NEM HITELES Munkapéldány</span>
                    <span className="text-[9px] bg-rose-200 text-rose-900 font-black px-1.5 py-0.2 rounded-full">
                      Belső
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-normal leading-relaxed">
                    Gyors belső áttekintésre, gondozók vagy önkéntesek részére. Kötöttségek nélkül, rugalmas adatmező választással.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 2: Select Category */}
          <div className="space-y-2">
            <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
              2. Kimutatás Témaköre
            </label>
            <CustomSelect
              value={reportType}
              onChange={(val) => setReportType(val as any)}
              options={[
                { value: 'all', label: 'Teljes Állatállomány Jegyzék (Összes cica)', icon: '🐾' },
                { value: 'active', label: 'Gondozásban Lévő (Aktív) Állatok', icon: '🏡' },
                { value: 'adopted', label: 'Gazdisodott (Örökbefogadott) Állatok', icon: '🏠' },
                { value: 'tnr', label: 'TNR Program & Kóbor Cica Akciók', icon: '✂️' },
                { value: 'financial', label: 'Pénzügyi & Egészségügyi Kimutatás', icon: '💰' },
              ]}
              title="Kimutatás Témakörének Kiválasztása"
              colorScheme="pink"
              buttonClassName="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold text-xs text-gray-800"
            />
          </div>

          {/* STEP 3: Document Details */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-gray-800 text-xs flex items-center gap-1.5">
              <span>⚙️ Fejléc és Szervezeti Adatok Szerkesztése</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">Egyedi Dokumentum Cím</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="pl. HIVATALOS ÁLLATNYILVÁNTARTÁSI KIMUTATÁS"
                  className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-semibold text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">Szervezet / Menhely Neve</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-semibold text-xs text-gray-900"
                />
              </div>

              {isOfficial && (
                <>
                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Adószám</label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-mono text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Nyilvántartási Szám</label>
                    <input
                      type="text"
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value)}
                      className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-mono text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Célhatóság / Címzett</label>
                    <input
                      type="text"
                      value={targetAuthority}
                      onChange={(e) => setTargetAuthority(e.target.value)}
                      className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-semibold text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Iktatószám</label>
                    <input
                      type="text"
                      value={registryFileNo}
                      onChange={(e) => setRegistryFileNo(e.target.value)}
                      className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-mono text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Aláíró Képviselő Neve</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-semibold text-xs text-gray-900"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-gray-500 uppercase">Lábjegyzet / Megjegyzés</label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full mt-1 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-medium text-xs text-gray-900"
              />
            </div>
          </div>

          {/* STEP 4: Column / Data Toggles (Only for Cat lists) */}
          {reportType !== 'tnr' && (
            <div className="space-y-2">
              <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
                3. Megjelenítendő Adatmezők / Oszlopok
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={incSorszam}
                    onChange={(e) => setIncSorszam(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span># Sorszám</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={incName}
                    onChange={(e) => setIncName(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span>🐱 Cica Neve</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={incGenderColor}
                    onChange={(e) => setIncGenderColor(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span>♂️♀️ Ivar & Szín</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={incChip}
                    onChange={(e) => setIncChip(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span>🏷️ Chip Szám</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={incIntake}
                    onChange={(e) => setIncIntake(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span>📥 Bekerülés</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={incSpayed}
                    onChange={(e) => setIncSpayed(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span>✂️ Ivartalanítva</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={incPassbook}
                    onChange={(e) => setIncPassbook(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span>📘 Kiskönyv</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={incAdopter}
                    onChange={(e) => setIncAdopter(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span>🏠 Státusz / Gazdi</span>
                </label>
              </div>
            </div>
          )}

          {/* Record Count Preview */}
          <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl flex items-center justify-between font-bold text-pink-900">
            <span className="flex items-center gap-1.5">
              <span>📊 Generálandó rekordok száma:</span>
            </span>
            <span className="text-sm font-black font-mono bg-pink-200 px-2.5 py-0.5 rounded-full">
              {reportType === 'tnr' ? `${totalTnrCount} TNR rekord` : `${totalCatCount} cica rekord`}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Mégse
          </button>
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isGenerating ? '⏳ Generálás...' : '📥 PDF Riport Generálása & Letöltése'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
