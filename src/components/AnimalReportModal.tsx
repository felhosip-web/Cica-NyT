import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';
import { Cat } from '../types';
import { CustomSelect } from './CustomSelect';
import {
  ExportOptions,
  ReportType,
  Orientation,
  DEFAULT_ANIMAL_COLUMNS,
  DEFAULT_FINANCIAL_COLUMNS,
  filterCatsByOptions,
  buildSafeFilename,
} from '../utils/exportShared';
import { generatePdfReport } from '../utils/pdfReportExport';
import { generateOdsReport, generateOdtReport } from '../utils/odfExport';
import { useToastStore } from '../store/useToastStore';
import { logEvent, logError } from '../utils/eventLog';

interface AnimalReportModalProps {
  onClose: () => void;
}

export const AnimalReportModal: React.FC<AnimalReportModalProps> = ({ onClose }) => {
  const { orgName, orgTaxNumber, orgRegistrationNo, addDebugLog } = useAppStore();

  // Scope & Filters
  const [reportType, setReportType] = useState<ReportType>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'bak' | 'nosteny'>('all');
  const [intakeTypeFilter, setIntakeTypeFilter] = useState<'all' | 'sajat' | 'befogott' | 'leadott' | 'elkobzott'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includeDeceasedInAll, setIncludeDeceasedInAll] = useState<boolean>(false);

  // Document Mode
  const [isOfficial, setIsOfficial] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<Orientation>('landscape');

  // Identity & Headers
  const [customTitle, setCustomTitle] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>(orgName || 'Macskamenhely & Gondozó Nyilvántartó');
  const [taxNumber, setTaxNumber] = useState<string>(orgTaxNumber || '');
  const [registrationNo, setRegistrationNo] = useState<string>(orgRegistrationNo || '');
  const [targetAuthority, setTargetAuthority] = useState<string>('Illetékes Hatóság / Belső Nyilvántartó');
  const [signatoryName, setSignatoryName] = useState<string>('Elnök / Hivatalos Képviselő');
  const [registryFileNo, setRegistryFileNo] = useState<string>(`IKT-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [customNotes, setCustomNotes] = useState<string>('Hivatalos állatjóléti és egyed-nyilvántartási igazolás.');

  // Visual Toggles
  const [showSignatureBlock, setShowSignatureBlock] = useState<boolean>(true);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(true);

  // Checkbox Column Selections
  const [animalCols, setAnimalCols] = useState(DEFAULT_ANIMAL_COLUMNS);

  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch live cats
  const allCats = (useLiveQuery(() => db.cats.toArray(), []) || []) as Cat[];

  const animalFilters = {
    reportType,
    genderFilter,
    intakeTypeFilter,
    startDate,
    endDate,
    includeDeceasedInAll,
  };

  const filteredCats = filterCatsByOptions(allCats, reportType, animalFilters);

  const getExportOptions = (): ExportOptions => ({
    isOfficial,
    orientation,
    pageSize: 'a4',
    reportType,
    periodFilter: 'all',
    includeStorno: false,
    animalFilters,
    customTitle: customTitle.trim() || 'HIVATALOS ÁLLATNYILVÁNTARTÁSI KIMUTATÁS',
    organizationName,
    taxNumber,
    registrationNo,
    targetAuthority,
    registryFileNo,
    signatoryName,
    customNotes,
    showSignatureBlock,
    showDisclaimer,
    financialColumns: DEFAULT_FINANCIAL_COLUMNS,
    animalColumns: animalCols,
  });

  const getCombinedData = () => ({
    cats: allCats,
    tnr: [],
    finances: [],
  });

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
      await logEvent({
        category: 'export',
        action: 'export.animal_pdf',
        summary: `Állatkimutatás PDF kiexportálva (${opts.reportType})`,
      });
      useToastStore.getState().showSuccess('PDF állatkimutatás sikeresen generálva!');
      addDebugLog(`[Állatkimutatás] PDF (${opts.reportType}) generálva.`);
      onClose();
    } catch (err: any) {
      console.error('PDF Export hiba:', err);
      await logError('export.animal_pdf', err, {
        category: 'export',
        summary: `Hiba a PDF állatkimutatás generálásakor: ${err?.message || err}`,
      });
      useToastStore.getState().showError('Hiba történt a PDF generálásakor!', {
        details: err?.message,
      });
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
      await logEvent({
        category: 'export',
        action: 'export.animal_ods',
        summary: `Állatkimutatás ODS kiexportálva (${filename})`,
      });
      useToastStore.getState().showSuccess('ODS táblázat sikeresen kiexportálva!');
      addDebugLog(`[Állatkimutatás] ODS (${filename}) letöltve.`);
      onClose();
    } catch (err: any) {
      console.error('ODS Export hiba:', err);
      await logError('export.animal_ods', err, {
        category: 'export',
        summary: `Hiba az ODS exportálásakor: ${err?.message || err}`,
      });
      useToastStore.getState().showError('Hiba történt az ODS exportálásakor!', {
        details: err?.message,
      });
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
      await logEvent({
        category: 'export',
        action: 'export.animal_odt',
        summary: `Állatkimutatás ODT kiexportálva (${filename})`,
      });
      useToastStore.getState().showSuccess('ODT dokumentum sikeresen kiexportálva!');
      addDebugLog(`[Állatkimutatás] ODT (${filename}) letöltve.`);
      onClose();
    } catch (err: any) {
      console.error('ODT Export hiba:', err);
      await logError('export.animal_odt', err, {
        category: 'export',
        summary: `Hiba az ODT exportálásakor: ${err?.message || err}`,
      });
      useToastStore.getState().showError('Hiba történt az ODT exportálásakor!', {
        details: err?.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl font-black">
              📋
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">Állatkimutatás Beállítások</h2>
              <p className="text-xs text-purple-100/90 font-medium mt-0.5">
                Részletes állatnyilvántartási jelentés generálása PDF, ODS (Calc / Excel) és ODT formátumban
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
          {/* SECTION 1: Scope & Filters */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
            <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
              1. Kimutatás Típusa & Hatóköre
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 uppercase block mb-1">Státusz Szerint</label>
                <CustomSelect
                  value={reportType}
                  onChange={(val) => setReportType(val as any)}
                  options={[
                    { value: 'all', label: 'Összes Állat Regiszter', icon: '🐾' },
                    { value: 'active', label: 'Csak Gondozásban Lévő (Aktív)', icon: '🏡' },
                    { value: 'adopted', label: 'Csak Gazdisodott (Örökbeadott)', icon: '🏠' },
                    { value: 'deceased', label: 'Csak Elhunyt Állatok', icon: '🕊️' },
                  ]}
                  title="Státusz Szerint"
                  colorScheme="purple"
                  buttonClassName="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-xs text-gray-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-500 uppercase block mb-1">Ivar Szűrő</label>
                <CustomSelect
                  value={genderFilter}
                  onChange={(val) => setGenderFilter(val as any)}
                  options={[
                    { value: 'all', label: 'Minden Ivar', icon: '🐾' },
                    { value: 'bak', label: 'Kandúr (Bak)', icon: '♂️' },
                    { value: 'nosteny', label: 'Nőstény', icon: '♀️' },
                  ]}
                  title="Ivar Szűrő"
                  colorScheme="purple"
                  buttonClassName="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-xs text-gray-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-500 uppercase block mb-1">Bekerülés Típusa</label>
                <CustomSelect
                  value={intakeTypeFilter}
                  onChange={(val) => setIntakeTypeFilter(val as any)}
                  options={[
                    { value: 'all', label: 'Minden Bekerülés', icon: '📋' },
                    { value: 'sajat', label: 'Saját Mentés', icon: '🐾' },
                    { value: 'befogott', label: 'Befogott Kóbor', icon: '🐈' },
                    { value: 'leadott', label: 'Gazda Által Leadott', icon: '📦' },
                    { value: 'elkobzott', label: 'Elkobzott', icon: '⚖️' },
                  ]}
                  title="Bekerülés Típusa"
                  colorScheme="purple"
                  buttonClassName="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-xs text-gray-800"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500">Bekerülés kezdete:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-gray-900"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500">Bekerülés vége:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-gray-900"
                />
              </div>

              {reportType === 'all' && (
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 ml-auto">
                  <input
                    type="checkbox"
                    checked={includeDeceasedInAll}
                    onChange={(e) => setIncludeDeceasedInAll(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Elhunyt állatok is szerepeljenek a teljes listában</span>
                </label>
              )}
            </div>
          </div>

          {/* SECTION 2: Document Mode & Identity */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
            <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
              2. Hitelesség, Fejléc & Szervezeti Adatok
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsOfficial(true)}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
                  isOfficial
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
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
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">📝</span>
                <div>
                  <div className="font-extrabold text-xs">NEM HITELES Munkapéldány</div>
                  <p className="text-[10px] text-gray-500 leading-tight">Belső áttekintő tájékoztató</p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Jogi felelősségi nyilatkozat megjelenítése</span>
              </label>

              {isOfficial && (
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={showSignatureBlock}
                    onChange={(e) => setShowSignatureBlock(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Hivatalos aláírási rovat</span>
                </label>
              )}
            </div>
          </div>

          {/* SECTION 3: Detailed Field Checkboxes */}
          <div className="space-y-3">
            <label className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px] block">
              3. Megjelenítendő Adatmezők / Oszlopok
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Group 1: Azonosítás */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <h5 className="font-extrabold text-purple-900 text-[11px] border-b border-gray-200 pb-1">
                  🆔 Azonosítás
                </h5>
                <div className="grid grid-cols-2 gap-1.5 font-semibold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incSorszam}
                      onChange={(e) => setAnimalCols({ ...animalCols, incSorszam: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Sorszám</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incName}
                      onChange={(e) => setAnimalCols({ ...animalCols, incName: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Név</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incChip}
                      onChange={(e) => setAnimalCols({ ...animalCols, incChip: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Chip szám</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incGender}
                      onChange={(e) => setAnimalCols({ ...animalCols, incGender: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Ivar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incColor}
                      onChange={(e) => setAnimalCols({ ...animalCols, incColor: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Szín / Mintázat</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incAge}
                      onChange={(e) => setAnimalCols({ ...animalCols, incAge: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Kor / Születés</span>
                  </label>
                </div>
              </div>

              {/* Group 2: Státusz & Elhelyezés */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <h5 className="font-extrabold text-purple-900 text-[11px] border-b border-gray-200 pb-1">
                  🏡 Státusz & Elhelyezés
                </h5>
                <div className="grid grid-cols-2 gap-1.5 font-semibold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incStatus}
                      onChange={(e) => setAnimalCols({ ...animalCols, incStatus: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Státusz</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incLocation}
                      onChange={(e) => setAnimalCols({ ...animalCols, incLocation: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Tartási hely</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={animalCols.incNotes}
                      onChange={(e) => setAnimalCols({ ...animalCols, incNotes: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Megjegyzés / Belső megjegyzés</span>
                  </label>
                </div>
              </div>

              {/* Group 3: Bekerülés */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <h5 className="font-extrabold text-purple-900 text-[11px] border-b border-gray-200 pb-1">
                  📥 Bekerülés
                </h5>
                <div className="grid grid-cols-2 gap-1.5 font-semibold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incIntakeType}
                      onChange={(e) => setAnimalCols({ ...animalCols, incIntakeType: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Bekerülés típusa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incIntakeDate}
                      onChange={(e) => setAnimalCols({ ...animalCols, incIntakeDate: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Bekerülés dátuma</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incIntakeBy}
                      onChange={(e) => setAnimalCols({ ...animalCols, incIntakeBy: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Ki hozta / befogó</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incIntakeLocation}
                      onChange={(e) => setAnimalCols({ ...animalCols, incIntakeLocation: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Befogás helyszíne</span>
                  </label>
                </div>
              </div>

              {/* Group 4: Egészség */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <h5 className="font-extrabold text-purple-900 text-[11px] border-b border-gray-200 pb-1">
                  🩺 Egészség
                </h5>
                <div className="grid grid-cols-2 gap-1.5 font-semibold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incSpayed}
                      onChange={(e) => setAnimalCols({ ...animalCols, incSpayed: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Ivartalanítva</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incVaccines}
                      onChange={(e) => setAnimalCols({ ...animalCols, incVaccines: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Oltások</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incPassbook}
                      onChange={(e) => setAnimalCols({ ...animalCols, incPassbook: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Kiskönyv</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incMedicalNotes}
                      onChange={(e) => setAnimalCols({ ...animalCols, incMedicalNotes: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Orvosi megjegyzés</span>
                  </label>
                </div>
              </div>

              {/* Group 5: Örökbefogadás */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <h5 className="font-extrabold text-purple-900 text-[11px] border-b border-gray-200 pb-1">
                  🏠 Örökbefogadás
                </h5>
                <div className="grid grid-cols-2 gap-1.5 font-semibold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incAdopterName}
                      onChange={(e) => setAnimalCols({ ...animalCols, incAdopterName: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Gazdi neve</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incAdoptedDate}
                      onChange={(e) => setAnimalCols({ ...animalCols, incAdoptedDate: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Örökbeadás dátuma</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={animalCols.incAdopterContact}
                      onChange={(e) => setAnimalCols({ ...animalCols, incAdopterContact: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Gazdi elérhetősége</span>
                  </label>
                </div>
              </div>

              {/* Group 6: Egyéb */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <h5 className="font-extrabold text-purple-900 text-[11px] border-b border-gray-200 pb-1">
                  📷 Egyéb
                </h5>
                <div className="grid grid-cols-2 gap-1.5 font-semibold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incHasPhoto}
                      onChange={(e) => setAnimalCols({ ...animalCols, incHasPhoto: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Fotó jelölés</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={animalCols.incAuditDates}
                      onChange={(e) => setAnimalCols({ ...animalCols, incAuditDates: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Audit dátumok</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Summary Box */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between font-bold text-purple-950 text-xs">
            <span>📊 Generálandó állatállomány létszám:</span>
            <span className="text-sm font-black font-mono bg-purple-200 px-3 py-0.5 rounded-full">
              {filteredCats.length} db cica
            </span>
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
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{isGenerating ? '⏳ Generálás...' : '📥 Letöltés .PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
