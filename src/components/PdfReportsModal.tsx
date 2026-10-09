import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';
import { Cat, TnrRecord, FinancialTransaction } from '../types';
import { CustomSelect } from './CustomSelect';
import {
  ExportOptions,
  ReportType,
  PeriodFilter,
  Orientation,
  DEFAULT_FINANCIAL_COLUMNS,
  DEFAULT_ANIMAL_COLUMNS,
  filterFinancesByOptions,
  filterCatsByOptions,
  getFinancialSummaryMetrics,
  buildSafeFilename,
} from '../utils/exportShared';
import { generatePdfReport } from '../utils/pdfReportExport';
import { generateOdsReport, generateOdtReport } from '../utils/odfExport';

interface PdfReportsModalProps {
  onClose: () => void;
}

export const PdfReportsModal: React.FC<PdfReportsModalProps> = ({ onClose }) => {
  const { orgName, orgTaxNumber, orgRegistrationNo, addDebugLog } = useAppStore();

  // Mode & Orientation
  const [isOfficial, setIsOfficial] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<Orientation>('landscape');

  // Scope & Filters
  const [reportType, setReportType] = useState<ReportType>('financial');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [includeStorno, setIncludeStorno] = useState<boolean>(false);

  // Identity & Headers
  const [customTitle, setCustomTitle] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>(orgName || 'Macskamenhely & Gondozó Nyilvántartó');
  const [taxNumber, setTaxNumber] = useState<string>(orgTaxNumber || '');
  const [registrationNo, setRegistrationNo] = useState<string>(orgRegistrationNo || '');
  const [targetAuthority, setTargetAuthority] = useState<string>('Illetékes Hatóság / Könyvelés');
  const [signatoryName, setSignatoryName] = useState<string>('Elnök / Hivatalos Képviselő');
  const [registryFileNo, setRegistryFileNo] = useState<string>(`IKT-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [customNotes, setCustomNotes] = useState<string>('Hivatalos állatjóléti és belső nyilvántartási igazolás.');

  // Toggles
  const [showSignatureBlock, setShowSignatureBlock] = useState<boolean>(true);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(true);

  // Column Selections
  const [finCols, setFinCols] = useState(DEFAULT_FINANCIAL_COLUMNS);
  const [animalCols, setAnimalCols] = useState(DEFAULT_ANIMAL_COLUMNS);

  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch live cats, TNR records & finances
  const allCats = (useLiveQuery(() => db.cats.toArray(), []) || []) as Cat[];
  const allTnr = (useLiveQuery(() => db.tnr.toArray(), []) || []) as TnrRecord[];
  const allFinances = (useLiveQuery(() => db.finances ? db.finances.toArray() : [], []) || []) as FinancialTransaction[];

  // Build options object
  const getExportOptions = (): ExportOptions => ({
    isOfficial,
    orientation,
    pageSize: 'a4',
    reportType,
    periodFilter,
    customStartDate,
    customEndDate,
    includeStorno,
    customTitle,
    organizationName,
    taxNumber,
    registrationNo,
    targetAuthority,
    registryFileNo,
    signatoryName,
    customNotes,
    showSignatureBlock,
    showDisclaimer,
    financialColumns: finCols,
    animalColumns: animalCols,
  });

  const getCombinedData = () => ({
    cats: allCats,
    tnr: allTnr,
    finances: allFinances,
  });

  // Calculate live preview metrics
  const filteredFinances = filterFinancesByOptions(allFinances, {
    periodFilter,
    customStartDate,
    customEndDate,
    includeStorno,
  });
  const financeMetrics = getFinancialSummaryMetrics(filteredFinances);
  const filteredCats = filterCatsByOptions(allCats, reportType);

  const handleDownloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const opts = getExportOptions();
      generatePdfReport(opts, getCombinedData());
      addDebugLog(`[Export] PDF (${opts.reportType}) generálva.`);
      onClose();
    } catch (err: any) {
      console.error('PDF Export hiba:', err);
      alert('Hiba történt a PDF generálásakor: ' + (err?.message || 'Ismeretlen hiba'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOds = async () => {
    setIsGenerating(true);
    try {
      const opts = getExportOptions();
      const blob = generateOdsReport(opts, getCombinedData());
      const filename = buildSafeFilename(opts, 'ods');
      handleDownloadBlob(blob, filename);
      addDebugLog(`[Export] ODS (${filename}) letöltve.`);
      onClose();
    } catch (err: any) {
      console.error('ODS Export hiba:', err);
      alert('Hiba történt az ODS exportálásakor: ' + (err?.message || 'Ismeretlen hiba'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOdt = async () => {
    setIsGenerating(true);
    try {
      const opts = getExportOptions();
      const blob = generateOdtReport(opts, getCombinedData());
      const filename = buildSafeFilename(opts, 'odt');
      handleDownloadBlob(blob, filename);
      addDebugLog(`[Export] ODT (${filename}) letöltve.`);
      onClose();
    } catch (err: any) {
      console.error('ODT Export hiba:', err);
      alert('Hiba történt az ODT exportálásakor: ' + (err?.message || 'Ismeretlen hiba'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-purple-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl font-black">
              📊
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">Export Beállítások & Kimutatások</h2>
              <p className="text-xs text-pink-100/90 font-medium mt-0.5">
                PDF, ODS (LibreOffice Calc / Excel) és ODT (Writer) dokumentumok generálása
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

        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto text-xs">
          {/* STEP 1: Document Mode & Orientation */}
          <div className="space-y-2">
            <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
              1. Dokumentum Típusa, Hitelessége & Tájolása
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setIsOfficial(true)}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
                  isOfficial
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">🛡️</span>
                <div>
                  <div className="font-extrabold text-xs">HITELES Kiadvány</div>
                  <p className="text-[10px] text-gray-500 leading-tight">Adószámmal, iktatószámmal, aláírással</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsOfficial(false)}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
                  !isOfficial
                    ? 'border-rose-400 bg-rose-50/70 text-rose-950 shadow-xs'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">📝</span>
                <div>
                  <div className="font-extrabold text-xs">NEM HITELES Munkapéldány</div>
                  <p className="text-[10px] text-gray-500 leading-tight">Belső áttekintő tájékoztató</p>
                </div>
              </button>

              <div className="p-3 rounded-2xl border border-gray-200 bg-gray-50 space-y-1">
                <label className="font-bold text-gray-700 block text-[10px]">Tájolás (PDF)</label>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      orientation === 'landscape' ? 'bg-pink-600 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    ↔️ Fekvő
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      orientation === 'portrait' ? 'bg-pink-600 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    ↕️ Álló
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Scope & Filters */}
          <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
            <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
              2. Kimutatás Témaköre & Szűrési Időszak
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 uppercase block mb-1">Témakör</label>
                <CustomSelect
                  value={reportType}
                  onChange={(val) => setReportType(val as any)}
                  options={[
                    { value: 'financial', label: 'Pénzügyi Belső Főkönyvi Kimutatás', icon: '💰' },
                    { value: 'all', label: 'Teljes Állatállomány Regiszter', icon: '🐾' },
                    { value: 'active', label: 'Gondozásban Lévő (Aktív) Állatok', icon: '🏡' },
                    { value: 'adopted', label: 'Gazdisodott (Örökbefogadott) Állatok', icon: '🏠' },
                    { value: 'tnr', label: 'TNR Program & Kóbor Cica Akciók', icon: '✂️' },
                  ]}
                  title="Témakör Kiválasztása"
                  colorScheme="pink"
                  buttonClassName="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-xs text-gray-800"
                />
              </div>

              {reportType === 'financial' && (
                <div>
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase block mb-1">Időszak Szűrő</label>
                  <CustomSelect
                    value={periodFilter}
                    onChange={(val) => setPeriodFilter(val as any)}
                    options={[
                      { value: 'this_month', label: 'Ez a hónap', icon: '📅' },
                      { value: 'last_month', label: 'Előző hónap', icon: '📅' },
                      { value: 'this_year', label: `Idei év (${new Date().getFullYear()})`, icon: '📆' },
                      { value: 'all', label: 'Összes időszak', icon: '♾️' },
                      { value: 'custom', label: 'Egyéni időintervallum', icon: '🎯' },
                    ]}
                    title="Időszak Szűrése"
                    colorScheme="pink"
                    buttonClassName="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-xs text-gray-800"
                  />
                </div>
              )}
            </div>

            {reportType === 'financial' && periodFilter === 'custom' && (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-500">Kezdő dátum</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1 font-semibold text-xs text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-500">Záró dátum</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1 font-semibold text-xs text-gray-900"
                  />
                </div>
              </div>
            )}

            {reportType === 'financial' && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 pt-1">
                <input
                  type="checkbox"
                  checked={includeStorno}
                  onChange={(e) => setIncludeStorno(e.target.checked)}
                  className="rounded text-pink-600 focus:ring-pink-500"
                />
                <span>Stornózott (érvénytelenített) tételek megjelenítése a listában</span>
              </label>
            )}
          </div>

          {/* STEP 3: Header / Identity */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-gray-800 text-xs flex items-center gap-1.5">
              <span>⚙️ Fejléc és Szervezeti Adatok</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">Egyedi Cím</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="pl. HIVATALOS ÁLLATNYILVÁNTARTÁSI KIMUTATÁS"
                  className="w-full mt-0.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-semibold text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-500 uppercase">Szervezet Neve</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full mt-0.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-semibold text-xs text-gray-900"
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
                      className="w-full mt-0.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-mono text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Nyilvántartási Szám</label>
                    <input
                      type="text"
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value)}
                      className="w-full mt-0.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-mono text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Iktatószám</label>
                    <input
                      type="text"
                      value={registryFileNo}
                      onChange={(e) => setRegistryFileNo(e.target.value)}
                      className="w-full mt-0.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-mono text-xs text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase">Aláíró Neve</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full mt-0.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 font-semibold text-xs text-gray-900"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={showDisclaimer}
                  onChange={(e) => setShowDisclaimer(e.target.checked)}
                  className="rounded text-pink-600 focus:ring-pink-500"
                />
                <span>Jogi felelősségi nyilatkozat megjelenítése</span>
              </label>

              {isOfficial && (
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={showSignatureBlock}
                    onChange={(e) => setShowSignatureBlock(e.target.checked)}
                    className="rounded text-pink-600 focus:ring-pink-500"
                  />
                  <span>Hivatalos aláírási rovat</span>
                </label>
              )}
            </div>
          </div>

          {/* STEP 4: Columns Toggle */}
          {reportType === 'financial' ? (
            <div className="space-y-2">
              <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
                3. Pénzügyi Oszlopok Kiválasztása
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200 font-bold text-gray-700">
                {Object.entries({
                  date: 'Dátum',
                  type: 'Típus',
                  category: 'Kategória',
                  title: 'Megnevezés',
                  partnerName: 'Partner',
                  invoiceNumber: 'Számlaszám',
                  amount: 'Összeg Ft',
                  status: 'Státusz',
                  paymentMethod: 'Fizetési mód',
                  taxYear: 'Adóév (1%)',
                  navReference: 'NAV iktatószám',
                  sourceModule: 'Forrás modul',
                  notes: 'Megjegyzés',
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(finCols as any)[key]}
                      onChange={(e) => setFinCols({ ...finCols, [key]: e.target.checked })}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : reportType !== 'tnr' ? (
            <div className="space-y-2">
              <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
                3. Állatnyilvántartási Oszlopok Kiválasztása
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200 font-bold text-gray-700">
                {Object.entries({
                  incSorszam: '# Sorszám',
                  incName: '🐱 Cica neve',
                  incGenderColor: '♂️♀️ Ivar & Szín',
                  incChip: '🏷️ Chip szám',
                  incIntake: '📥 Bekerülés',
                  incSpayed: '✂️ Ivartalanítva',
                  incPassbook: '📘 Kiskönyv',
                  incAdopter: '🏠 Státusz / Gazdi',
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(animalCols as any)[key]}
                      onChange={(e) => setAnimalCols({ ...animalCols, [key]: e.target.checked })}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {/* Live Preview Summary Box */}
          <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl flex flex-wrap items-center justify-between font-bold text-pink-900 text-xs">
            <span>📊 Generálandó tételek:</span>
            {reportType === 'financial' ? (
              <span>
                {financeMetrics.validCount} db érvényes tétel | Bevétel: {financeMetrics.totalIncome.toLocaleString('hu-HU')} Ft | Kiadás: {financeMetrics.totalExpense.toLocaleString('hu-HU')} Ft | Egyenleg: {financeMetrics.netBalance.toLocaleString('hu-HU')} Ft
              </span>
            ) : reportType === 'tnr' ? (
              <span>{allTnr.length} db TNR rekord</span>
            ) : (
              <span>{filteredCats.length} db cica rekord</span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Mégse
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateOds}
              disabled={isGenerating}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>📊 Letöltés .ODS (Spreadsheet)</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateOdt}
              disabled={isGenerating}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>📄 Letöltés .ODT (Writer)</span>
            </button>

            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{isGenerating ? '⏳ Generálás...' : '📥 Letöltés .PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
