import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../js/db.js';
import { APP_VERSION } from '../version';
import { useAppStore } from '../store/useAppStore';

interface FooterProps {
  activeTab: 'animals' | 'events' | 'calendar' | 'tnr' | 'foster' | 'inventory' | 'stats' | 'finance';
  setActiveTab: (tab: 'animals' | 'events' | 'calendar' | 'tnr' | 'foster' | 'inventory' | 'stats' | 'finance') => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenPdfReports: () => void;
  onAddCat: () => void;
  onAddEvent: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenHelp,
  onOpenPdfReports,
  onAddCat,
  onAddEvent,
}) => {
  const { isRootMode, getCurrentUser, footerMode } = useAppStore();
  const currentUser = getCurrentUser();

  // Live counters for system status indicator
  const catsCount = useLiveQuery(() => db.cats.count(), []) || 0;
  const eventsCount = useLiveQuery(() => db.events.count(), []) || 0;
  const tnrCount = useLiveQuery(() => db.tnr.count(), []) || 0;
  const fosterCount = useLiveQuery(() => db.fosterParents.count(), []) || 0;
  const inventoryCount = useLiveQuery(() => db.inventory ? db.inventory.count() : 0, []) || 0;
  const financesCount = useLiveQuery(() => db.finances ? db.finances.count() : 0, []) || 0;
  const pendingEventsCount = useLiveQuery(
    () => db.events.where('status').equals('pending').count(),
    []
  ) || 0;

  const showCompact = footerMode === 'compact' || footerMode === 'both';
  const showFull = footerMode === 'full' || footerMode === 'both';

  return (
    <>
      {/* Full Detailed Grid Footer */}
      {showFull && (
        <footer className={`mt-12 ${showCompact ? 'mb-12' : ''} bg-gradient-to-b from-gray-900 via-slate-900 to-gray-950 text-gray-300 border-t border-gray-800 transition-colors`}>
          {/* Top Subtle Accent Bar */}
          <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
            {/* Main Grid Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Column 1: Brand & Mission */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white text-lg font-black shadow-md ring-2 ring-pink-400/30">
                    🐾
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight leading-none">
                      CatRescue <span className="text-pink-400">PWA</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                      Állatvédelem & TNR Nyilvántartó
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed font-normal">
                  A civil állatmentő egyesületek, ideiglenes befogadók és TNR önkéntesek digitális, offline-first munkatársa. Mikrochipes azonosítás, oltási naptár és ivartalanítási nyilvántartás egy helyen.
                </p>

                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    IndexedDB / Offline Támogatás
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                    v{APP_VERSION}
                  </span>
                </div>
              </div>

              {/* Column 2: Quick Navigation */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <span>🧭 Navigáció & Modulok</span>
                </h4>
                <ul className="space-y-1.5 text-xs font-medium">
                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('animals');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left py-1 px-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                        activeTab === 'animals'
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                          : 'hover:bg-gray-800/60 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">🐱 Gondozott Állatok</span>
                      <span className="text-[10px] font-black bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
                        {catsCount}
                      </span>
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('events');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left py-1 px-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                        activeTab === 'events'
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                          : 'hover:bg-gray-800/60 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">📋 Események Listája</span>
                      <span className="text-[10px] font-black bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
                        {eventsCount}
                      </span>
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('calendar');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left py-1 px-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                        activeTab === 'calendar'
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                          : 'hover:bg-gray-800/60 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">📅 Kezelési Naptár</span>
                      {pendingEventsCount > 0 && (
                        <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                          {pendingEventsCount} esedékes
                        </span>
                      )}
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('tnr');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left py-1 px-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                        activeTab === 'tnr'
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                          : 'hover:bg-gray-800/60 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">✂️ TNR Ivartalanítás</span>
                      <span className="text-[10px] font-black bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
                        {tnrCount}
                      </span>
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('inventory');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left py-1 px-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                        activeTab === 'inventory'
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                          : 'hover:bg-gray-800/60 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">📦 Alom & Táp Készlet</span>
                      <span className="text-[10px] font-black bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
                        {inventoryCount}
                      </span>
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('finance');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left py-1 px-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                        activeTab === 'finance'
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                          : 'hover:bg-gray-800/60 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">💳 Pénzügyi Kezelés</span>
                      <span className="text-[10px] font-black bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
                        {financesCount}
                      </span>
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('stats');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left py-1 px-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                        activeTab === 'stats'
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                          : 'hover:bg-gray-800/60 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">📊 Statisztika & Riportok</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* Column 3: Quick Action Tools */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <span>⚡ Munkatársi Eszközök</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <button
                    onClick={onAddCat}
                    className="w-full text-left p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-gray-200 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-bold">➕ Új Cica Befogadása</span>
                    <span className="text-gray-400 font-mono">🐱</span>
                  </button>

                  <button
                    onClick={onAddEvent}
                    className="w-full text-left p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-gray-200 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-bold">💉 Esemény / Oltás Rögzítés</span>
                    <span className="text-gray-400 font-mono">🩺</span>
                  </button>

                  <button
                    onClick={onOpenPdfReports}
                    className="w-full text-left p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-gray-200 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-bold">📄 PDF Riport Generálás</span>
                    <span className="text-gray-400 font-mono">📑</span>
                  </button>

                  <button
                    onClick={onOpenHelp}
                    className="w-full text-left p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-gray-200 transition flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-bold">❓ Súgó & Rendszerútmutató</span>
                    <span className="text-gray-400 font-mono">📖</span>
                  </button>
                </div>
              </div>

              {/* Column 4: System Status & Emergency Advice */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <span>🛡️ Rendszerállapot & Fiók</span>
                </h4>

                <div className="p-3 rounded-2xl bg-gray-800/40 border border-gray-700/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Bejelentkezve:</span>
                    <span className="font-bold text-white truncate max-w-[140px]">
                      {currentUser?.name || 'Vendég / Helyi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Jogosultság:</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-800">
                      {currentUser?.role === 'admin' ? '🛡️ Adminisztrátor' : '👤 Munkatárs'}
                    </span>
                  </div>

                  {isRootMode && (
                    <div className="p-1.5 bg-purple-950/80 border border-purple-700/80 rounded-xl text-[10px] text-purple-200 font-bold flex items-center gap-1">
                      <span>⚡ Root / Fejlesztői Mód Aktív</span>
                    </div>
                  )}

                  <button
                    onClick={onOpenSettings}
                    className="w-full mt-1 py-1.5 px-3 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs rounded-xl transition shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>⚙️ Beállítások & Tesztadatok</span>
                  </button>
                </div>

                {/* Micro Emergency Advice */}
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-200/90 leading-tight">
                  <span className="font-extrabold text-amber-300 block mb-0.5">💡 Mentett Állat Tegyünk:</span>
                  Mielőtt új adatlapot hozol létre, mindig ellenőrizd a mikrochipet a helyi állatorvosnál vagy chipleolvasóval!
                </div>
              </div>
            </div>

            {/* Bottom Copyright & Footer Bar */}
            <div className="pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
                <span>© {new Date().getFullYear()} CatRescue Manager PWA.</span>
                <span className="hidden sm:inline">•</span>
                <span>Minden jog fenntartva a civil állatmentők számára.</span>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                <button
                  onClick={onOpenHelp}
                  className="hover:text-pink-400 transition cursor-pointer"
                >
                  Használati Útmutató
                </button>
                <span>•</span>
                <button
                  onClick={onOpenSettings}
                  className="hover:text-pink-400 transition cursor-pointer"
                >
                  Adatbázis & Logok
                </button>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Compact Fixed Bottom Bar */}
      {showCompact && (
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md text-gray-200 border-t border-slate-800/80 px-3 sm:px-6 py-2.5 shadow-2xl transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 text-xs">
            {/* Left side: Live counters */}
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar font-bold text-gray-300 text-[11px] sm:text-xs">
              <button
                onClick={() => {
                  setActiveTab('animals');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  activeTab === 'animals'
                    ? 'bg-pink-500/20 text-pink-300 font-extrabold border border-pink-500/40'
                    : 'hover:bg-slate-800/70 text-gray-300 hover:text-white'
                }`}
                title="Gondozott állatok megtekintése"
              >
                <span>🐱 Állatok:</span>
                <span className="bg-pink-950/90 text-pink-300 border border-pink-800/80 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {catsCount}
                </span>
              </button>

              <span className="text-slate-700 font-normal shrink-0">•</span>

              <button
                onClick={() => {
                  setActiveTab('tnr');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  activeTab === 'tnr'
                    ? 'bg-rose-500/20 text-rose-300 font-extrabold border border-rose-500/40'
                    : 'hover:bg-slate-800/70 text-gray-300 hover:text-white'
                }`}
                title="TNR akciók megtekintése"
              >
                <span>✂️ TNR:</span>
                <span className="bg-rose-950/90 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {tnrCount}
                </span>
              </button>

              <span className="text-slate-700 font-normal shrink-0">•</span>

              <button
                onClick={() => {
                  setActiveTab('foster');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  activeTab === 'foster'
                    ? 'bg-indigo-500/20 text-indigo-300 font-extrabold border border-indigo-500/40'
                    : 'hover:bg-slate-800/70 text-gray-300 hover:text-white'
                }`}
                title="Ideiglenes befogadók megtekintése"
              >
                <span>🏡 Befogadók:</span>
                <span className="bg-indigo-950/90 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {fosterCount}
                </span>
              </button>

              <span className="text-slate-700 font-normal shrink-0">•</span>

              <button
                onClick={() => {
                  setActiveTab('events');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  activeTab === 'events'
                    ? 'bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/40'
                    : 'hover:bg-slate-800/70 text-gray-300 hover:text-white'
                }`}
                title="Események megtekintése"
              >
                <span>📅 Események:</span>
                <span className="bg-purple-950/90 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {eventsCount}
                </span>
              </button>

              <span className="text-slate-700 font-normal shrink-0">•</span>

              <button
                onClick={() => {
                  setActiveTab('finance');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  activeTab === 'finance'
                    ? 'bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/40'
                    : 'hover:bg-slate-800/70 text-gray-300 hover:text-white'
                }`}
                title="Pénzügyi kezelés megtekintése"
              >
                <span>💳 Pénzügy:</span>
                <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {financesCount}
                </span>
              </button>
            </div>

            {/* Right side: Branding signature */}
            <div className="font-extrabold tracking-tight shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-purple-950/80 to-pink-950/80 text-pink-300 border border-pink-800/50 px-3 py-1 rounded-full text-[10px] sm:text-xs shadow-xs hover:border-pink-500 transition">
              <span>HES Projects® by FP</span>
            </div>
          </div>
        </footer>
      )}

      {/* Extra padding spacer at bottom when fixed compact bar is visible so page content isn't obscured */}
      {showCompact && !showFull && <div className="h-12 w-full" />}
    </>
  );
};
