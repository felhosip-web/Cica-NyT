import React, { useEffect, Suspense } from 'react';
import { APP_VERSION } from './version';
import { Header } from './components/Header';
import { VaccinationAlertBanner } from './components/VaccinationAlertBanner';
import { CatList } from './components/CatList';
const CalendarView = React.lazy(() => import('./components/CalendarView').then(module => ({ default: module.CalendarView })));
const EventsListView = React.lazy(() => import('./components/EventsListView').then(module => ({ default: module.EventsListView })));
const StatsView = React.lazy(() => import('./components/StatsView').then(module => ({ default: module.StatsView })));
const TnrView = React.lazy(() => import('./components/TnrView').then(module => ({ default: module.TnrView })));
const FosterView = React.lazy(() => import('./components/FosterView').then(module => ({ default: module.FosterView })));
const InventoryView = React.lazy(() => import('./components/InventoryView').then(module => ({ default: module.InventoryView })));
const DonationCampaignsView = React.lazy(() => import('./components/DonationCampaignsView').then(module => ({ default: module.DonationCampaignsView })));
const FinanceView = React.lazy(() => import('./components/FinanceView').then(module => ({ default: module.FinanceView })));
const CatDetailModal = React.lazy(() => import('./components/CatDetailModal').then(module => ({ default: module.CatDetailModal })));
const CatFormModal = React.lazy(() => import('./components/CatFormModal').then(module => ({ default: module.CatFormModal })));
const EventFormModal = React.lazy(() => import('./components/EventFormModal').then(module => ({ default: module.EventFormModal })));
const SettingsDebugModal = React.lazy(() => import('./components/SettingsDebugModal').then(module => ({ default: module.SettingsDebugModal })));
const UiCustomizationModal = React.lazy(() => import('./components/UiCustomizationModal').then(module => ({ default: module.UiCustomizationModal })));
const HelpModal = React.lazy(() => import('./components/HelpModal').then(module => ({ default: module.HelpModal })));
const RootAuthModal = React.lazy(() => import('./components/RootAuthModal').then(module => ({ default: module.RootAuthModal })));
const PdfReportsModal = React.lazy(() => import('./components/PdfReportsModal').then(module => ({ default: module.PdfReportsModal })));
import { VersionWelcomeModal } from './components/VersionWelcomeModal';
import { EventStartupToast } from './components/EventStartupToast';
import { PwaToast } from './components/PwaToast';
import { BotDetection } from './components/BotDetection';
import { Footer } from './components/Footer';
import { FAB } from './components/FAB';
import { LicenseBanner } from './components/LicenseBanner';
import { RootBanner } from './components/RootBanner';
import { LicenseWarningToast } from './components/LicenseWarningToast';
import { LicenseAcceptanceModal } from './components/LicenseAcceptanceModal';
import { ToastContainer } from './components/ToastContainer';
import { OfflineBanner } from './components/OfflineBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLicenseStore } from './store/useLicenseStore';
import { useAppStore } from './store/useAppStore';
import { useUIStore } from './store/useUIStore';
import { initAutoBackupScheduler } from './services/autoBackupEngine';
import { checkAndRunAutoMirror } from './services/localMirrorService';
import { logEvent } from './utils/eventLog';

export default function App() {
  const { termsAccepted, acceptTerms } = useLicenseStore();

  useEffect(() => {
    localStorage.setItem('appVersion', APP_VERSION);
    initAutoBackupScheduler();
    checkAndRunAutoMirror().catch(() => {});
    useLicenseStore.getState().backgroundCheck();
    logEvent({
      category: 'system',
      action: 'system.app_start',
      summary: `Cica-NyT elindítva (v${APP_VERSION})`,
    }).catch(() => {});
  }, []);

  // Root Mode State via Zustand Store
  const { isRootMode, rootSessionUntil, setIsRootMode } = useAppStore();

  // Root Mode Auto-Timeout Check
  useEffect(() => {
    const checkRootTimeout = () => {
      if (isRootMode && rootSessionUntil) {
        if (Date.now() > rootSessionUntil) {
          setIsRootMode(false);
        }
      }
    };

    checkRootTimeout(); // Check on mount
    const interval = setInterval(checkRootTimeout, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isRootMode, rootSessionUntil, setIsRootMode]);

  // Navigation and Modal states via UI Store
  const {
    activeTab, setActiveTab,
    showRootAuth, setShowRootAuth,
    selectedCatId, setSelectedCatId,
    catToEdit, setCatToEdit,
    eventToEditId, setEventToEditId,
    eventInitialCatId, setEventInitialCatId,
    showSettings, setShowSettings,
    showUiCustomization, setShowUiCustomization,
    showHelp, setShowHelp,
    showPdfReportsModal, setShowPdfReportsModal,
    openEventModal
  } = useUIStore();

  const handleActivateRoot = (durationMinutes: number) => {
    setIsRootMode(true, durationMinutes);
    setShowRootAuth(false);
    setShowSettings(true);
  };

  const handleDeactivateRoot = () => {
    setIsRootMode(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 sm:pb-24 font-sans overflow-x-clip max-w-full">
      {/* First-launch mandatory license acceptance modal */}
      <LicenseAcceptanceModal
        isOpen={!termsAccepted}
        onAccept={acceptTerms}
      />

      {/* Bot Detection Toast & Modal */}
      <BotDetection />

      {/* PWA Install & Update Toast */}
      <PwaToast />

      {/* New Version Welcome & Changelog Announcement Modal */}
      <VersionWelcomeModal />

      {/* Startup Toast for Upcoming Events & Push Notifications */}
      <EventStartupToast onOpenEvents={() => setActiveTab('events')} />

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
        isRootMode={isRootMode}
        onOpenRootAuth={() => setShowRootAuth(true)}
        onDeactivateRoot={handleDeactivateRoot}
        onAddCat={() => setCatToEdit('new')}
        onAddTnr={() => setActiveTab('tnr')}
        onAddEvent={() => openEventModal('new', 'general')}
        onOpenPdfReports={() => setShowPdfReportsModal(true)}
      />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4 space-y-4 overflow-x-clip">
        <OfflineBanner />
        <LicenseBanner />
        <RootBanner />

        <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div></div>}>
        {/* Vaccination Alert Banner */}
        <VaccinationAlertBanner onOpenEvents={() => setActiveTab('events')} />

        {/* Tab 1: Animals */}
        {activeTab === 'animals' && (
          <ErrorBoundary fallbackTitle="Hiba a Macskák nézetben">
            <CatList
              onOpenDetail={(catId) => setSelectedCatId(catId)}
              onEditCat={(cat) => setCatToEdit(cat)}
              onAddCat={() => setCatToEdit('new')}
            />
          </ErrorBoundary>
        )}

        {/* Tab 2: Events List */}
        {activeTab === 'events' && (
          <ErrorBoundary fallbackTitle="Hiba az Események nézetben">
            <EventsListView
              onOpenEventModal={(eventId) => openEventModal(eventId || 'new', 'general')}
              onOpenCatDetail={(catId) => setSelectedCatId(catId)}
            />
          </ErrorBoundary>
        )}

        {/* Tab 3: Calendar View */}
        {activeTab === 'calendar' && (
          <ErrorBoundary fallbackTitle="Hiba a Naptár nézetben">
            <CalendarView
              onOpenEventModal={(eventId) => openEventModal(eventId || 'new', 'general')}
              onOpenCatDetail={(catId) => setSelectedCatId(catId)}
            />
          </ErrorBoundary>
        )}

        {/* Tab 4: TNR */}
        {activeTab === 'tnr' && (
          <ErrorBoundary fallbackTitle="Hiba a TNR nézetben">
            <TnrView />
          </ErrorBoundary>
        )}

        {/* Tab 5: Foster / Ideiglenes Befogadók */}
        {activeTab === 'foster' && (
          <ErrorBoundary fallbackTitle="Hiba a Befogadó nézetben">
            <FosterView onOpenCatDetail={(catId) => setSelectedCatId(catId)} />
          </ErrorBoundary>
        )}

        {/* Tab 6: Inventory / Alom és Táp Készlet */}
        {activeTab === 'inventory' && (
          <ErrorBoundary fallbackTitle="Hiba a Raktár nézetben">
            <InventoryView />
          </ErrorBoundary>
        )}

        {/* Tab 7: Donation Campaigns / Adománygyűjtő Akciók */}
        {activeTab === 'donation' && (
          <ErrorBoundary fallbackTitle="Hiba az Adománygyűjtő nézetben">
            <DonationCampaignsView />
          </ErrorBoundary>
        )}

        {/* Tab 8: Finance / Pénzügyi Kezelés */}
        {activeTab === 'finance' && (
          <ErrorBoundary fallbackTitle="Hiba a Pénzügyek nézetben">
            <FinanceView />
          </ErrorBoundary>
        )}

        {/* Tab 8: Stats */}
        {activeTab === 'stats' && (
          <ErrorBoundary fallbackTitle="Hiba a Statisztika nézetben">
            <StatsView
              onOpenUiCustomization={() => setShowUiCustomization(true)}
              onOpenPdfReports={() => setShowPdfReportsModal(true)}
            />
          </ErrorBoundary>
        )}
              </Suspense>
      </main>

      {/* Modern Footer Component */}
      <Footer
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
        onOpenPdfReports={() => setShowPdfReportsModal(true)}
        onAddCat={() => setCatToEdit('new')}
        onAddEvent={() => openEventModal('new', 'general')}
      />

      {/* Floating Action Button */}
      <FAB
        onAddCat={() => setCatToEdit('new')}
        onAddTnr={() => setActiveTab('tnr')}
        onAddEvent={() => openEventModal('new', 'general')}
        onOpenPdfReports={() => setShowPdfReportsModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
      />

      {/* Suspense wrapper for modals */}
      <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div></div>}>
      {/* Cat Detail Modal */}
      {selectedCatId && (
        <CatDetailModal
          catId={selectedCatId}
          onClose={() => setSelectedCatId(null)}
          onEditCat={(cat) => {
            setSelectedCatId(null);
            setCatToEdit(cat);
          }}
          onOpenAddEventForCat={(catId) => openEventModal('new', catId)}
        />
      )}

      {/* Cat Form Modal (Add/Edit) */}
      {catToEdit && (
        <CatFormModal
          catToEdit={catToEdit === 'new' ? null : catToEdit}
          onClose={() => setCatToEdit(null)}
          onSaved={() => setCatToEdit(null)}
        />
      )}

      {/* Event Form Modal (Add/Edit) */}
      {eventToEditId && (
        <EventFormModal
          eventId={eventToEditId === 'new' ? null : eventToEditId}
          initialCatId={eventInitialCatId}
          onClose={() => setEventToEditId(null)}
        />
      )}

      {/* Settings & Debug Modal */}
      {showSettings && (
        <SettingsDebugModal
          onClose={() => setShowSettings(false)}
          isRootMode={isRootMode}
          onOpenRootAuth={() => {
            setShowSettings(false);
            setShowRootAuth(true);
          }}
          onDeactivateRoot={handleDeactivateRoot}
          onOpenUiCustomization={() => setShowUiCustomization(true)}
        />
      )}

      {/* UI Elements Customization Modal */}
      {showUiCustomization && (
        <UiCustomizationModal onClose={() => setShowUiCustomization(false)} />
      )}

      {/* Root Password Auth Modal */}
      {showRootAuth && (
        <RootAuthModal
          onClose={() => setShowRootAuth(false)}
          onSuccess={handleActivateRoot}
        />
      )}

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </Suspense>

      <LicenseWarningToast />
      <ToastContainer />

      {/* PDF Reports Modal (Hiteles / Nem Hiteles) */}
      <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div></div>}>
        {showPdfReportsModal && (
          <PdfReportsModal onClose={() => setShowPdfReportsModal(false)} />
        )}
      </Suspense>
    </div>
  );
}
