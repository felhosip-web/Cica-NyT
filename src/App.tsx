import React, { useState, useEffect } from 'react';
import { APP_VERSION } from './version';
import { Header } from './components/Header';
import { VaccinationAlertBanner } from './components/VaccinationAlertBanner';
import { CatList } from './components/CatList';
import { CatCard, Cat } from './components/CatCard';
import { CalendarView } from './components/CalendarView';
import { EventsListView } from './components/EventsListView';
import { StatsView } from './components/StatsView';
import { TnrView } from './components/TnrView';
import { FosterView } from './components/FosterView';
import { InventoryView } from './components/InventoryView';
import { FinanceView } from './components/FinanceView';
import { CatDetailModal } from './components/CatDetailModal';
import { CatFormModal } from './components/CatFormModal';
import { EventFormModal } from './components/EventFormModal';
import { SettingsDebugModal } from './components/SettingsDebugModal';
import { UiCustomizationModal } from './components/UiCustomizationModal';
import { HelpModal } from './components/HelpModal';
import { RootAuthModal } from './components/RootAuthModal';
import { PdfReportsModal } from './components/PdfReportsModal';
import { VersionWelcomeModal } from './components/VersionWelcomeModal';
import { EventStartupToast } from './components/EventStartupToast';
import { PwaToast } from './components/PwaToast';
import { Footer } from './components/Footer';
import { FAB } from './components/FAB';
import { useAppStore } from './store/useAppStore';
import { initAutoBackupScheduler } from './services/autoBackupEngine';

export default function App() {
  useEffect(() => {
    localStorage.setItem('appVersion', APP_VERSION);
    initAutoBackupScheduler();
  }, []);

  const [activeTab, setActiveTab] = useState<'animals' | 'events' | 'calendar' | 'tnr' | 'foster' | 'inventory' | 'stats' | 'finance'>('animals');

  // Root Mode State via Zustand Store
  const { isRootMode, setIsRootMode } = useAppStore();
  const [showRootAuth, setShowRootAuth] = useState<boolean>(false);

  // Modal states
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [catToEdit, setCatToEdit] = useState<Cat | null | 'new'>(null);
  const [eventToEditId, setEventToEditId] = useState<number | null | 'new'>(null);
  const [eventInitialCatId, setEventInitialCatId] = useState<string>('general');

  const [showSettings, setShowSettings] = useState(false);
  const [showUiCustomization, setShowUiCustomization] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPdfReportsModal, setShowPdfReportsModal] = useState(false);

  const handleActivateRoot = () => {
    setIsRootMode(true);
    setShowRootAuth(false);
    setShowSettings(true);
  };

  const handleDeactivateRoot = () => {
    setIsRootMode(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans overflow-x-clip max-w-full">
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
        onAddEvent={() => {
          setEventInitialCatId('general');
          setEventToEditId('new');
        }}
        onOpenPdfReports={() => setShowPdfReportsModal(true)}
      />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4 space-y-4 overflow-x-clip">
        {/* Vaccination Alert Banner */}
        <VaccinationAlertBanner onOpenEvents={() => setActiveTab('events')} />

        {/* Tab 1: Animals */}
        {activeTab === 'animals' && (
          <CatList
            onOpenDetail={(catId) => setSelectedCatId(catId)}
            onEditCat={(cat) => setCatToEdit(cat)}
            onAddCat={() => setCatToEdit('new')}
          />
        )}

        {/* Tab 2: Events List */}
        {activeTab === 'events' && (
          <EventsListView
            onOpenEventModal={(eventId) => {
              setEventInitialCatId('general');
              setEventToEditId(eventId || 'new');
            }}
            onOpenCatDetail={(catId) => setSelectedCatId(catId)}
          />
        )}

        {/* Tab 3: Calendar View */}
        {activeTab === 'calendar' && (
          <CalendarView
            onOpenEventModal={(eventId) => {
              setEventInitialCatId('general');
              setEventToEditId(eventId || 'new');
            }}
            onOpenCatDetail={(catId) => setSelectedCatId(catId)}
          />
        )}

        {/* Tab 4: TNR */}
        {activeTab === 'tnr' && <TnrView />}

        {/* Tab 5: Foster / Ideiglenes Befogadók */}
        {activeTab === 'foster' && (
          <FosterView onOpenCatDetail={(catId) => setSelectedCatId(catId)} />
        )}

        {/* Tab 6: Inventory / Alom és Táp Készlet */}
        {activeTab === 'inventory' && <InventoryView />}

        {/* Tab 7: Finance / Pénzügyi Kezelés */}
        {activeTab === 'finance' && <FinanceView />}

        {/* Tab 8: Stats */}
        {activeTab === 'stats' && (
          <StatsView
            onOpenUiCustomization={() => setShowUiCustomization(true)}
            onOpenPdfReports={() => setShowPdfReportsModal(true)}
          />
        )}
      </main>

      {/* Modern Footer Component */}
      <Footer
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
        onOpenPdfReports={() => setShowPdfReportsModal(true)}
        onAddCat={() => setCatToEdit('new')}
        onAddEvent={() => {
          setEventInitialCatId('general');
          setEventToEditId('new');
        }}
      />

      {/* Floating Action Button */}
      <FAB
        onAddCat={() => setCatToEdit('new')}
        onAddTnr={() => setActiveTab('tnr')}
        onAddEvent={() => {
          setEventInitialCatId('general');
          setEventToEditId('new');
        }}
        onOpenPdfReports={() => setShowPdfReportsModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
      />

      {/* Cat Detail Modal */}
      {selectedCatId && (
        <CatDetailModal
          catId={selectedCatId}
          onClose={() => setSelectedCatId(null)}
          onEditCat={(cat) => {
            setSelectedCatId(null);
            setCatToEdit(cat);
          }}
          onOpenAddEventForCat={(catId) => {
            setEventInitialCatId(catId);
            setEventToEditId('new');
          }}
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

      {/* PDF Reports Modal (Hiteles / Nem Hiteles) */}
      {showPdfReportsModal && (
        <PdfReportsModal onClose={() => setShowPdfReportsModal(false)} />
      )}
    </div>
  );
}

