import React, { useState } from 'react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TnrRecord } from '../types';
import { CustomSelect } from './CustomSelect';

interface TnrPdfExportModalProps {
  records: TnrRecord[];
  onClose: () => void;
}

// Helper to replace double-accented Hungarian characters for safe rendering in standard jsPDF WinAnsi fonts
const cleanPdfText = (str?: string | null): string => {
  if (!str) return '';
  return str
    .replace(/ő/g, 'ö')
    .replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü')
    .replace(/Ű/g, 'Ü');
};

export const TnrPdfExportModal: React.FC<TnrPdfExportModalProps> = ({ records, onClose }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfYearStr = `${new Date().getFullYear()}-01-01`;

  const [startDate, setStartDate] = useState(firstDayOfYearStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState<'all' | 'befogva' | 'mutet_alatt' | 'elengedve'>('all');
  
  const [organizationName, setOrganizationName] = useState('Cica-NyT Állatvédő Egyesület');
  const [reporterName, setReporterName] = useState('');
  const [targetAuthority, setTargetAuthority] = useState('Hatósági Állatorvos / Illékes Önkormányzat');
  const [isGenerating, setIsGenerating] = useState(false);

  // Quick preset handlers
  const handleThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(todayStr);
  };

  const handleThisYear = () => {
    setStartDate(firstDayOfYearStr);
    setEndDate(todayStr);
  };

  const handleAllTime = () => {
    setStartDate('2020-01-01');
    setEndDate(todayStr);
  };

  // Filter records based on selected date range and status
  const filteredRecords = records.filter((r) => {
    // Date filter on trapped date or created date
    const recordDate = r.dateTrapped || (r.createdAt ? r.createdAt.split('T')[0] : '');
    
    if (startDate && recordDate < startDate) return false;
    if (endDate && recordDate > endDate) return false;

    if (statusFilter !== 'all' && r.status !== statusFilter) return false;

    return true;
  });

  // Export PDF generator logic
  const generatePdf = () => {
    setIsGenerating(true);

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
        const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm

        // Colors
        const primaryColor = [190, 24, 93]; // Deep Pink / Rose #be185d
        const darkTextColor = [31, 41, 55]; // Gray-800
        const lightBgColor = [249, 250, 251];

        // Header Background Bar
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 22, 'F');

        // Header Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('HATOSAGI TNR (BEFOGAS - IVARTALANITAS - ELENGEDES) JEGYZOKONYV', 14, 11);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Kiállítás dátuma: ${todayStr}`, pageWidth - 14, 11, { align: 'right' });
        doc.text(`Cica-NyT Nyilvantartasi Rendszer`, pageWidth - 14, 16, { align: 'right' });

        // Metadata Subheader
        let startY = 28;
        doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Szervezet / Menhely: ${cleanPdfText(organizationName || 'Cica-NyT Egyesület')}`, 14, startY);

        doc.setFont('helvetica', 'normal');
        doc.text(`Vizsgált időszak: ${startDate} - ${endDate}`, 14, startY + 5);
        
        if (targetAuthority) {
          doc.text(`Célhatóság / Címzett: ${cleanPdfText(targetAuthority)}`, 14, startY + 10);
        }

        if (reporterName) {
          doc.text(`Jelentést tevő / Felelős: ${cleanPdfText(reporterName)}`, pageWidth - 14, startY + 5, { align: 'right' });
        }

        startY += targetAuthority ? 16 : 12;

        // Statistics Summary Box
        const totalInPdf = filteredRecords.length;
        const releasedInPdf = filteredRecords.filter((r) => r.status === 'elengedve').length;
        const careInPdf = filteredRecords.filter((r) => r.status === 'mutet_alatt').length;
        const trappedInPdf = filteredRecords.filter((r) => r.status === 'befogva').length;
        const earTipInPdf = filteredRecords.filter((r) => r.earTip).length;

        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(209, 213, 219);
        doc.roundedRect(14, startY, pageWidth - 28, 14, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text('ÖSSZESÍTŐ STATISZTIKA A KIJELÖLT IDŐSZAKBAN:', 18, startY + 5);

        doc.setFont('helvetica', 'normal');
        const statsStr = `Összes TNR akció: ${totalInPdf} db   |   Sikeresen visszaengedve: ${releasedInPdf} db   |   Műtét/Lábadozás alatt: ${careInPdf} db   |   Befogva: ${trappedInPdf} db   |   Fülcsipkézett: ${earTipInPdf} db`;
        doc.text(statsStr, 18, startY + 10);

        startY += 18;

        // AutoTable Columns and Rows
        const tableColumns = [
          { header: '#', dataKey: 'index' },
          { header: 'Cica azonosító / Név', dataKey: 'catName' },
          { header: 'Befogás Helyszíne & Dátuma', dataKey: 'trapped' },
          { header: 'Ki fogta be', dataKey: 'trappedBy' },
          { header: 'Műtét Helyszíne (Klinika) & Állatorvos', dataKey: 'clinic' },
          { header: 'Elengedés Helyszíne & Dátuma', dataKey: 'released' },
          { header: 'Státusz', dataKey: 'status' },
          { header: 'Fülcsipke', dataKey: 'earTip' },
          { header: 'Megjegyzés', dataKey: 'notes' },
        ];

        const tableRows = filteredRecords.map((r, idx) => {
          let statusTxt = 'Befogva';
          if (r.status === 'elengedve') statusTxt = 'Elengedve';
          if (r.status === 'mutet_alatt') statusTxt = 'Műtét alatt';

          return {
            index: `${idx + 1}.`,
            catName: cleanPdfText(r.catNameOrTag || 'Névtelen cica'),
            trapped: `${cleanPdfText(r.locationTrapped)}\n(${r.dateTrapped})`,
            trappedBy: cleanPdfText(r.trappedBy),
            clinic: `${cleanPdfText(r.clinicLocation)}${r.surgeonName ? `\nDr. ${cleanPdfText(r.surgeonName)}` : ''}`,
            released: `${cleanPdfText(r.locationReleased)}${r.dateReleased ? `\n(${r.dateReleased})` : ''}`,
            status: statusTxt,
            earTip: r.earTip ? 'IGEN (Fülcsipkés)' : 'NEM',
            notes: cleanPdfText(r.notes || '-'),
          };
        });

        // Generate Table
        autoTable(doc, {
          startY,
          columns: tableColumns,
          body: tableRows,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2.5,
            valign: 'middle',
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: [190, 24, 93],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251],
          },
          columnStyles: {
            index: { cellWidth: 10, halign: 'center' },
            catName: { cellWidth: 32, fontStyle: 'bold' },
            trapped: { cellWidth: 42 },
            trappedBy: { cellWidth: 30 },
            clinic: { cellWidth: 45 },
            released: { cellWidth: 42 },
            status: { cellWidth: 22, fontStyle: 'bold' },
            earTip: { cellWidth: 20, halign: 'center' },
            notes: { cellWidth: 'auto' },
          },
          didDrawPage: (data) => {
            // Footer on every page
            const currentPg = data.pageNumber;
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(
              `Oldal: ${currentPg}`,
              pageWidth - 14,
              pageHeight - 8,
              { align: 'right' }
            );
            doc.text(
              `Hivatalos TNR Jelentés - Cica-NyT Nyilvántartás & Állatvédelmi Adatbázis`,
              14,
              pageHeight - 8
            );
          },
        });

        // Official Signature Block at the end of the document
        let finalY = (doc as any).lastAutoTable.finalY + 12;

        // Check if we need a new page for signature block
        if (finalY + 30 > pageHeight) {
          doc.addPage();
          finalY = 25;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55);

        // Signatures 3 columns
        const col1 = 14;
        const col2 = pageWidth / 2 - 25;
        const col3 = pageWidth - 70;

        doc.text('Kelt: ................................, ......... év ......... hó ......... nap', col1, finalY);

        doc.line(col1, finalY + 18, col1 + 55, finalY + 18);
        doc.text('Jelentést készítő aláírása', col1, finalY + 23);

        doc.line(col2, finalY + 18, col2 + 55, finalY + 18);
        doc.text('P.H. / Bélyegző helye', col2 + 10, finalY + 23);

        doc.line(col3, finalY + 18, col3 + 55, finalY + 18);
        doc.text('Hatósági / Szervezeti képviselő', col3, finalY + 23);

        // Save PDF
        const filename = `TNR_Hatosagi_Jelentes_${startDate}_${endDate}.pdf`;
        doc.save(filename);
        onClose();
      } catch (err: any) {
        console.error('Hiba a PDF generálása során:', err);
        alert('Hiba történt a PDF generálása során: ' + (err?.message || 'Ismeretlen hiba'));
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-200 text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📄</span>
            <div>
              <h3 className="font-black text-gray-900 text-sm">
                Hatósági TNR PDF Exportálás
              </h3>
              <p className="text-[10px] text-gray-500">
                Hivatalos kimutatás generálása önkormányzatok, állatorvosok és NÉBIH számára
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Date Filters & Presets */}
        <div className="space-y-2 bg-pink-50/60 p-3 rounded-xl border border-pink-200">
          <div className="flex items-center justify-between">
            <label className="font-extrabold text-pink-900 text-[11px] flex items-center gap-1">
              📅 Időszak Kiválasztása
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleThisMonth}
                className="px-2 py-0.5 bg-white border border-pink-300 hover:bg-pink-100 text-pink-800 font-bold text-[10px] rounded-lg transition"
              >
                E hónap
              </button>
              <button
                type="button"
                onClick={handleThisYear}
                className="px-2 py-0.5 bg-white border border-pink-300 hover:bg-pink-100 text-pink-800 font-bold text-[10px] rounded-lg transition"
              >
                Ezen év
              </button>
              <button
                type="button"
                onClick={handleAllTime}
                className="px-2 py-0.5 bg-white border border-pink-300 hover:bg-pink-100 text-pink-800 font-bold text-[10px] rounded-lg transition"
              >
                Összes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold text-gray-600">Kezdő dátum:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-600">Záró dátum:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block font-bold text-gray-800 mb-1 text-[11px]">
            ⚡ Szűrés TNR Státusz szerint
          </label>
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'all', label: 'Minden státusz (Összes érintett akció)', icon: '🌐' },
              { value: 'elengedve', label: 'Csak sikeresen Visszaengedett cicák', icon: '💚' },
              { value: 'mutet_alatt', label: 'Műtét alatt / Lábadozik', icon: '✂️' },
              { value: 'befogva', label: 'Befogva / Befogás alatt', icon: '🪤' },
            ]}
            title="TNR Státusz Szűrés"
            colorScheme="pink"
            buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800"
          />
        </div>

        {/* Official Header Details */}
        <div className="space-y-2.5 pt-1">
          <h4 className="font-extrabold text-gray-900 text-xs flex items-center gap-1 border-b pb-1">
            🏛️ Hivatalos Jelentés Fejléc Adatai
          </h4>

          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
              Szervezet / Menhely neve:
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Pl. Cica-NyT Állatvédő Egyesület"
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
              Célhatóság / Címzett (Opcionális):
            </label>
            <input
              type="text"
              value={targetAuthority}
              onChange={(e) => setTargetAuthority(e.target.value)}
              placeholder="Pl. Helyi Polgármesteri Hivatal / Hatósági Állatorvos"
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
              Jelentést tevő felelős személy neve (Opcionális):
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Pl. Kovács Ágnes - TNR Programkoordinátor"
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-medium text-gray-900"
            />
          </div>
        </div>

        {/* Live Export Preview Count Box */}
        <div className="p-3 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="font-black text-gray-900 block text-xs">
              📊 Exportálandó adatsorok:
            </span>
            <span className="text-[10px] text-gray-600 font-medium">
              Időszak: {startDate} &rarr; {endDate}
            </span>
          </div>
          <span className="text-base font-black px-3 py-1 bg-pink-600 text-white rounded-full">
            {filteredRecords.length} db
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
          >
            Mégse
          </button>
          <button
            type="button"
            onClick={generatePdf}
            disabled={isGenerating || filteredRecords.length === 0}
            className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>{isGenerating ? 'Generálás...' : '📥 Hatósági PDF Generálása & Letöltése'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
