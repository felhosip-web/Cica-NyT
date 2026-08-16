import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../js/db.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../store/useAppStore';
import { APP_VERSION } from '../version';

interface HeaderProps {
  activeTab: 'animals' | 'events' | 'calendar' | 'tnr' | 'foster' | 'inventory' | 'stats' | 'finance';
  setActiveTab: (tab: 'animals' | 'events' | 'calendar' | 'tnr' | 'foster' | 'inventory' | 'stats' | 'finance') => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  isRootMode: boolean;
  onOpenRootAuth: () => void;
  onDeactivateRoot: () => void;
  onAddCat?: () => void;
  onAddTnr?: () => void;
  onAddEvent?: () => void;
  onOpenPdfReports?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenHelp,
  isRootMode,
  onOpenRootAuth,
  onDeactivateRoot,
  onAddCat,
  onAddTnr,
  onAddEvent,
  onOpenPdfReports,
}) => {
  const {
    viewportWidth,
    viewOverride,
    setViewportWidth,
    orgName,
    canInstall,
    isInstalled,
    isIos,
    updateAvailable,
    triggerInstall,
    triggerUpdate,
    multiUserModeEnabled,
    users,
    roles,
    currentUserId,
    theme,
  } = useAppStore();

  const [showMainMenu, setShowMainMenu] = useState(false);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const isAutoMobile = viewportWidth < 768;

  const catCount = useLiveQuery(() => db.cats.where('status').notEqual('elhunyt').count(), []) || 0;
  const expiredEventCount = useLiveQuery(
    () => db.events.where('status').equals('expired').count(),
    []
  ) || 0;
  const totalEventsCount = useLiveQuery(() => db.events.count(), []) || 0;
  const tnrCount = useLiveQuery(() => db.tnr.count(), []) || 0;
  const fosterCount = useLiveQuery(() => db.fosterParents.count(), []) || 0;
  const inventoryCount = useLiveQuery(() => db.inventory ? db.inventory.count() : 0, []) || 0;
  const financeCount = useLiveQuery(() => db.finances ? db.finances.count() : 0, []) || 0;

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setViewportWidth]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/90 shadow-sm max-w-full">
      <div className="max-w-7xl mx-auto px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveTab('animals')}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center text-white text-lg sm:text-xl font-black shadow-sm shrink-0">
            🐾
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-gray-900 leading-tight flex items-center gap-1">
              <span>Cica-NyT</span>
              <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.2 rounded-full border border-pink-200">
                v{APP_VERSION}
              </span>
              {isRootMode && (
                <span className="text-[9px] font-black text-purple-700 bg-purple-100 border border-purple-300 px-1.5 py-0.2 rounded-full animate-pulse">
                  ⚡ ROOT
                </span>
              )}
            </h1>
            <p className="hidden sm:block text-[11px] text-gray-500 font-medium truncate max-w-[200px] sm:max-w-none">
              {orgName?.trim() || 'Macskamenhely & Gondozó Nyilvántartó'}
            </p>
          </div>
        </div>

        {/* Header Right Controls - Streamlined with Main Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Update notification badge in header if available */}
          {updateAvailable && (
            <button
              onClick={triggerUpdate}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs rounded-xl shadow-xs animate-pulse cursor-pointer"
              title="Frissítés"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">Frissítés</span>
            </button>
          )}

          {/* Active User Badge (Desktop only) */}
          {multiUserModeEnabled && currentUser && (
            <button
              onClick={() => setShowMainMenu(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl font-bold text-xs cursor-pointer"
              title={`Profil: ${currentUser.name}`}
            >
              <span className="text-xs">{currentUser.avatarEmoji || '👤'}</span>
              <span className="font-extrabold max-w-[90px] truncate">{currentUser.name}</span>
            </button>
          )}

          {/* Main Menu Button (Includes Settings / Beállítások inside) */}
          <button
            onClick={() => setShowMainMenu(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
            title="Főmenü és Beállítások megnyitása"
          >
            <span className="text-base leading-none">☰</span>
            <span className="font-black text-xs">Menü & ⚙️</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex gap-1 sm:gap-4 border-t border-gray-100 text-xs sm:text-sm font-bold overflow-x-auto no-scrollbar whitespace-nowrap min-w-0">
        <button
          onClick={() => setActiveTab('animals')}
          className={`py-2 px-2.5 sm:px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'animals'
              ? 'border-pink-600 text-pink-600 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🐱 Állatok</span>
          <span className="bg-pink-100 text-pink-800 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-extrabold">{catCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`py-2 px-2.5 sm:px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'events'
              ? 'border-pink-600 text-pink-600 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📋 Események</span>
          {expiredEventCount > 0 ? (
            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
              {expiredEventCount} lejárt
            </span>
          ) : (
            <span className="bg-purple-100 text-purple-800 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-extrabold">{totalEventsCount}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`py-2 px-2.5 sm:px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'calendar'
              ? 'border-pink-600 text-pink-600 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📅 Naptár</span>
        </button>

        <button
          onClick={() => setActiveTab('tnr')}
          className={`py-2 px-2.5 sm:px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'tnr'
              ? 'border-pink-600 text-pink-600 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>✂️ TNR Program</span>
          {tnrCount > 0 && (
            <span className="bg-pink-100 text-pink-800 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-extrabold">{tnrCount}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('foster')}
          className={`py-2 px-2.5 sm:px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'foster'
              ? 'border-pink-600 text-pink-600 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🏡 Befogadók</span>
          {fosterCount > 0 && (
            <span className="bg-indigo-100 text-indigo-800 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-extrabold">{fosterCount}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`py-2 px-2.5 sm:px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'inventory'
              ? 'border-pink-600 text-pink-600 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📦 Készlet</span>
          {inventoryCount > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-extrabold">{inventoryCount}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`py-2 px-2.5 sm:px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'finance'
              ? 'border-pink-600 text-pink-600 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>💳 Pénzügyek</span>
          {financeCount > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-extrabold">{financeCount}</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2 px-2.5 sm:px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            activeTab === 'stats'
              ? 'border-pink-600 text-pink-600 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📊 Kimutatások</span>
        </button>
      </div>

      {/* Main Menu Slide-Over Drawer using React Portal to avoid header clipping */}
      {showMainMenu &&
        createPortal(
          <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
            {/* Backdrop Click */}
            <div
              className="fixed inset-0 cursor-pointer"
              onClick={() => setShowMainMenu(false)}
            />

            {/* Slide Drawer Box */}
            <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-250">
              {/* Drawer Header (Fixed) */}
              <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-purple-700 text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black shadow-xs">
                    🐾
                  </div>
                  <div>
                    <h2 className="font-black text-sm tracking-tight leading-tight flex items-center gap-1.5">
                      <span>Cica-NyT Főmenü</span>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">⚙️</span>
                    </h2>
                    <p className="text-[10px] text-pink-100/90 font-medium mt-0.5">Műveletek, beállítások & navigáció</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMainMenu(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition cursor-pointer"
                  title="Bezárás"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="p-4 space-y-4 text-xs flex-1 overflow-y-auto min-h-0">
                {/* SETTINGS HIGHLIGHT BUTTON (User requested Settings gear button inside Menu) */}
                <div className="p-3 bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 border border-purple-200 rounded-2xl space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <span>⚙️ Rendszer Beállítások</span>
                    </span>
                    <span className="text-[9px] bg-purple-200 text-purple-900 font-extrabold px-2 py-0.5 rounded-full">
                      Törzsadatok & Profilok
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">
                    Testreszabás, adatbázis mentés/visszaállítás, felhasználók és felületi opciók.
                  </p>
                  <button
                    onClick={() => {
                      setShowMainMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-700 to-pink-600 hover:from-purple-800 hover:to-pink-700 text-white font-black rounded-xl text-center shadow-xs transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                  >
                    <span>⚙️ BEÁLLÍTÁSOK MEGNYITÁSA</span>
                    <span>➔</span>
                  </button>
                </div>

                {/* Navigation Tabs Shortcuts */}
                <div className="space-y-1.5">
                  <div className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">
                    📌 Nézetek
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('animals');
                        setShowMainMenu(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-extrabold flex items-center justify-between cursor-pointer transition ${
                        activeTab === 'animals' ? 'bg-pink-50 border-pink-300 text-pink-900' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>🐱 Állatok</span>
                      <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded-full border">{catCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('events');
                        setShowMainMenu(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-extrabold flex items-center justify-between cursor-pointer transition ${
                        activeTab === 'events' ? 'bg-pink-50 border-pink-300 text-pink-900' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>📋 Események</span>
                      <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded-full border">{totalEventsCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('calendar');
                        setShowMainMenu(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-extrabold flex items-center justify-between cursor-pointer transition ${
                        activeTab === 'calendar' ? 'bg-pink-50 border-pink-300 text-pink-900' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>📅 Naptár</span>
                      {expiredEventCount > 0 && (
                        <span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{expiredEventCount}</span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('tnr');
                        setShowMainMenu(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-extrabold flex items-center justify-between cursor-pointer transition ${
                        activeTab === 'tnr' ? 'bg-pink-50 border-pink-300 text-pink-900' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>✂️ TNR</span>
                      <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded-full border">{tnrCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('finance');
                        setShowMainMenu(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-extrabold flex items-center justify-between cursor-pointer transition ${
                        activeTab === 'finance' ? 'bg-pink-50 border-pink-300 text-pink-900' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>💳 Pénzügyek</span>
                      <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded-full border">{financeCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('stats');
                        setShowMainMenu(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-extrabold flex items-center justify-between cursor-pointer transition ${
                        activeTab === 'stats' ? 'bg-pink-50 border-pink-300 text-pink-900' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>📊 Kimutatások</span>
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="space-y-1.5">
                  <div className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">
                    🚀 Gyors Rögzítés
                  </div>
                  <div className="space-y-1.5">
                    {onAddCat && (
                      <button
                        onClick={() => {
                          setShowMainMenu(false);
                          onAddCat();
                        }}
                        className="w-full p-2.5 bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 border border-pink-200 text-pink-900 font-extrabold rounded-xl text-left flex items-center justify-between cursor-pointer transition shadow-2xs"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">🐱</span>
                          <span>Új Cica Regisztrálása</span>
                        </span>
                        <span className="text-pink-600 font-black">+</span>
                      </button>
                    )}

                    {onAddTnr && (
                      <button
                        onClick={() => {
                          setShowMainMenu(false);
                          onAddTnr();
                        }}
                        className="w-full p-2.5 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 text-purple-900 font-extrabold rounded-xl text-left flex items-center justify-between cursor-pointer transition shadow-2xs"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">✂️</span>
                          <span>Új TNR Akció Rögzítése</span>
                        </span>
                        <span className="text-purple-600 font-black">+</span>
                      </button>
                    )}

                    {onAddEvent && (
                      <button
                        onClick={() => {
                          setShowMainMenu(false);
                          onAddEvent();
                        }}
                        className="w-full p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 text-amber-900 font-extrabold rounded-xl text-left flex items-center justify-between cursor-pointer transition shadow-2xs"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">📅</span>
                          <span>Új Oltás / Kezelés Rögzítése</span>
                        </span>
                        <span className="text-amber-600 font-black">+</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Documents & PDF Section */}
                <div className="space-y-1.5">
                  <div className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">
                    📄 Jelentések & Export
                  </div>
                  {onOpenPdfReports && (
                    <button
                      onClick={() => {
                        setShowMainMenu(false);
                        onOpenPdfReports();
                      }}
                      className="w-full p-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-extrabold rounded-xl text-left flex items-center justify-between cursor-pointer transition shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span>📄</span>
                        <span>PDF Riport Generálása</span>
                      </span>
                      <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-black">Hiteles / Belső</span>
                    </button>
                  )}
                </div>

                {/* System & Support */}
                <div className="space-y-1.5">
                  <div className="font-extrabold text-gray-400 text-[10px] uppercase tracking-wider">
                    🛠️ További Eszközök
                  </div>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        setShowMainMenu(false);
                        onOpenHelp();
                      }}
                      className="w-full p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-left flex items-center justify-between cursor-pointer transition"
                    >
                      <span className="flex items-center gap-2">
                        <span>❓</span>
                        <span>Súgó & Használati Útmutató</span>
                      </span>
                      <span>➔</span>
                    </button>

                    {/* PWA Install / Update Button inside Menu */}
                    {updateAvailable ? (
                      <button
                        onClick={() => {
                          setShowMainMenu(false);
                          triggerUpdate();
                        }}
                        className="w-full p-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl text-left flex items-center justify-between cursor-pointer transition shadow-2xs animate-pulse"
                      >
                        <span className="flex items-center gap-2">
                          <span>🔄</span>
                          <span>Alkalmazás Frissítése</span>
                        </span>
                        <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-black">ÚJ VERZIÓ</span>
                      </button>
                    ) : (!isInstalled && (canInstall || isIos)) ? (
                      <button
                        onClick={() => {
                          setShowMainMenu(false);
                          triggerInstall();
                        }}
                        className="w-full p-2.5 bg-purple-100 hover:bg-purple-200 text-purple-950 font-extrabold rounded-xl text-left flex items-center justify-between cursor-pointer transition"
                      >
                        <span className="flex items-center gap-2">
                          <span>📲</span>
                          <span>Alkalmazás Telepítése (PWA)</span>
                        </span>
                        <span>➔</span>
                      </button>
                    ) : null}

                    {isRootMode ? (
                      <button
                        onClick={() => {
                          setShowMainMenu(false);
                          onOpenSettings();
                        }}
                        className="w-full p-2.5 bg-purple-900 text-purple-100 font-bold rounded-xl text-left flex items-center justify-between cursor-pointer transition"
                      >
                        <span className="flex items-center gap-2">
                          <span>⚡</span>
                          <span>Root Debug Konzol</span>
                        </span>
                        <span className="text-[10px] bg-purple-800 px-1.5 py-0.5 rounded font-mono">AKTÍV</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMainMenu(false);
                          onOpenRootAuth();
                        }}
                        className="w-full p-2.5 bg-gray-100 hover:bg-purple-50 text-gray-700 hover:text-purple-800 font-bold rounded-xl text-left flex items-center justify-between cursor-pointer transition border border-transparent hover:border-purple-200"
                      >
                        <span className="flex items-center gap-2">
                          <span>🔑</span>
                          <span>Root Belépés (Jelszó: 1342)</span>
                        </span>
                        <span>➔</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer (Fixed) */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500 font-medium flex items-center justify-between shrink-0">
                <span>Cica-NyT v{APP_VERSION}</span>
                <span className="font-semibold text-gray-700">{orgName || 'Macskamenhely'}</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
