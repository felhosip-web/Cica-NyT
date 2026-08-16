import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useAppStore,
  HealthCoverageItemConfig,
  DEFAULT_HEALTH_COVERAGE_ITEMS,
  QuickFilterCardConfig,
  DEFAULT_QUICK_FILTER_CARDS,
  CatCardInfoPocketConfig,
  CatCardInfoPocketType,
  DEFAULT_CARD_INFO_POCKETS,
  getCardStyles,
} from '../store/useAppStore';
import { CustomSelect } from './CustomSelect';

interface UiCustomizationModalProps {
  onClose: () => void;
}

export const UiCustomizationModal: React.FC<UiCustomizationModalProps> = ({ onClose }) => {
  const {
    healthCoverageItems,
    setHealthCoverageItems,
    resetHealthCoverageItems,
    quickFilterCards,
    quickFilterLayout,
    catListViewMode,
    setQuickFilterCards,
    setQuickFilterLayout,
    setCatListViewMode,
    resetQuickFilterCards,
    cardInfoPockets,
    setCardInfoPockets,
    resetCardInfoPockets,
    addDebugLog,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<'health' | 'cats_cards' | 'card_pockets'>('health');

  // --- Quick Filter Layout State ---
  const [qfLayout, setQfLayout] = useState<'grid' | 'scroll'>(quickFilterLayout);

  // --- Health Coverage Items State ---
  const [items, setItems] = useState<HealthCoverageItemConfig[]>(healthCoverageItems);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('📌');
  const [newType, setNewType] = useState<HealthCoverageItemConfig['type']>('custom');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');

  // --- Quick Filter Cards State ---
  const [qfCards, setQfCards] = useState<QuickFilterCardConfig[]>(quickFilterCards);
  const [showAddQfForm, setShowAddQfForm] = useState(false);
  const [newQfLabel, setNewQfLabel] = useState('');
  const [newQfIcon, setNewQfIcon] = useState('🐱');
  const [newQfType, setNewQfType] = useState<QuickFilterCardConfig['filterType']>('gondozasban');
  const [newQfColor, setNewQfColor] = useState<QuickFilterCardConfig['colorScheme']>('sky');

  const [editingQfId, setEditingQfId] = useState<string | null>(null);
  const [editQfLabel, setEditQfLabel] = useState('');
  const [editQfIcon, setEditQfIcon] = useState('');
  const [editQfType, setEditQfType] = useState<QuickFilterCardConfig['filterType']>('gondozasban');
  const [editQfColor, setEditQfColor] = useState<QuickFilterCardConfig['colorScheme']>('sky');

  // --- Animal Card Info Pockets State ---
  const [pockets, setPockets] = useState<CatCardInfoPocketConfig[]>(cardInfoPockets || DEFAULT_CARD_INFO_POCKETS);
  const [deletingPocketId, setDeletingPocketId] = useState<string | null>(null);

  // Confirm Modals State
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingQfId, setDeletingQfId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- Handlers for Health Coverage Items ---
  const handleToggle = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setItems(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...items];
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, movedItem);
    setItems(newItems);
  };

  const handleStartEdit = (item: HealthCoverageItemConfig) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditIcon(item.icon);
  };

  const handleSaveEdit = (id: string) => {
    if (!editLabel.trim()) return;
    const updated = items.map((item) =>
      item.id === id ? { ...item, label: editLabel.trim(), icon: editIcon.trim() || '🏷️' } : item
    );
    setItems(updated);
    setEditingId(null);
  };

  const confirmDeleteItem = () => {
    if (deletingItemId) {
      const updated = items.filter((item) => item.id !== deletingItemId);
      setItems(updated);
      setDeletingItemId(null);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newItem: HealthCoverageItemConfig = {
      id: 'custom_' + Date.now().toString(36),
      label: newLabel.trim(),
      icon: newIcon.trim() || '📌',
      enabled: true,
      type: newType,
      showPercentage: false,
    };

    setItems([...items, newItem]);
    setNewLabel('');
    setNewIcon('📌');
    setShowAddForm(false);
  };

  // --- Handlers for Quick Filter Cards ---
  const handleToggleQf = (id: string) => {
    const updated = qfCards.map((card) =>
      card.id === id ? { ...card, enabled: !card.enabled } : card
    );
    setQfCards(updated);
  };

  const handleMoveQf = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === qfCards.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newCards = [...qfCards];
    const [movedCard] = newCards.splice(index, 1);
    newCards.splice(targetIndex, 0, movedCard);
    setQfCards(newCards);
  };

  const handleStartEditQf = (card: QuickFilterCardConfig) => {
    setEditingQfId(card.id);
    setEditQfLabel(card.label);
    setEditQfIcon(card.icon);
    setEditQfType(card.filterType);
    setEditQfColor(card.colorScheme);
  };

  const handleSaveEditQf = (id: string) => {
    if (!editQfLabel.trim()) return;
    const updated = qfCards.map((card) =>
      card.id === id
        ? {
            ...card,
            label: editQfLabel.trim(),
            icon: editQfIcon.trim() || '🐱',
            filterType: editQfType,
            colorScheme: editQfColor,
          }
        : card
    );
    setQfCards(updated);
    setEditingQfId(null);
  };

  const confirmDeleteQf = () => {
    if (deletingQfId) {
      const updated = qfCards.filter((card) => card.id !== deletingQfId);
      setQfCards(updated);
      setDeletingQfId(null);
    }
  };

  const handleAddQfCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQfLabel.trim()) return;

    const newCard: QuickFilterCardConfig = {
      id: 'qf_custom_' + Date.now().toString(36),
      label: newQfLabel.trim(),
      icon: newQfIcon.trim() || '🐱',
      filterType: newQfType,
      colorScheme: newQfColor,
      enabled: true,
    };

    setQfCards([...qfCards, newCard]);
    setNewQfLabel('');
    setNewQfIcon('🐱');
    setShowAddQfForm(false);
  };

  // --- Animal Card Info Pocket Actions ---
  const handleTogglePocket = (id: string) => {
    const updated = pockets.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setPockets(updated);
  };

  const handleMovePocket = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === pockets.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newPockets = [...pockets];
    const [moved] = newPockets.splice(index, 1);
    newPockets.splice(targetIndex, 0, moved);
    setPockets(newPockets);
  };

  const handleChangePocketType = (id: string, type: CatCardInfoPocketType) => {
    const updated = pockets.map((p) =>
      p.id === id ? { ...p, type } : p
    );
    setPockets(updated);
  };

  const handleAddPocket = () => {
    const newPocket: CatCardInfoPocketConfig = {
      id: 'pocket_' + Date.now().toString(36),
      label: `${pockets.length + 1}. Infó zseb`,
      enabled: true,
      type: 'chip',
    };
    setPockets([...pockets, newPocket]);
  };

  const confirmDeletePocket = () => {
    if (deletingPocketId) {
      const updated = pockets.filter((p) => p.id !== deletingPocketId);
      setPockets(updated);
      setDeletingPocketId(null);
    }
  };

  // --- Global Actions ---
  const handleSaveAll = () => {
    setHealthCoverageItems(items);
    setQuickFilterCards(qfCards);
    setQuickFilterLayout(qfLayout);
    setCardInfoPockets(pockets);
    addDebugLog('[UI Customization] Beállítások, szűrő kártyák és kártya infó zsebek frissítve');
    onClose();
  };

  const confirmReset = () => {
    resetHealthCoverageItems();
    resetQuickFilterCards();
    resetCardInfoPockets();
    setItems(DEFAULT_HEALTH_COVERAGE_ITEMS);
    setQfCards(DEFAULT_QUICK_FILTER_CARDS);
    setQfLayout('grid');
    setPockets(DEFAULT_CARD_INFO_POCKETS);
    addDebugLog('[UI Customization] Gyári alapértelmezések visszaállítva');
    setShowResetConfirm(false);
  };

  const pocketTypeLabels: Record<CatCardInfoPocketType, string> = {
    chip: '🏷️ Mikrochip Státusz (Megvan / Hiányzik)',
    vaccination: '💉 Oltottsági Státusz (Oltva / Nincs oltása)',
    spayed: '✂️ Ivartalanítási Státusz (Ivartalanítva / Nem ivartalanított)',
    color: '🎨 Bundaszín',
    kiskonyv: '📘 Oltási Kiskönyv (Megvan / Hiányzik)',
    tests: '🧪 FeLV / FIV Tesztek (Tesztelt / Tesztre vár)',
    intake: '🏠 Beérkezési Mód (Befogott / Leadott / Saját)',
    age: '🎂 Életkor (Kiszámított kor)',
    cost: '💰 Összköltség (Orvosi & ellátási kiadások Ft-ban)',
    none: '🚫 Üres / Kikapcsolva',
  };

  const filterTypeLabels: Record<QuickFilterCardConfig['filterType'], string> = {
    expired: '🔴 Lejárt Oltások',
    'no-chip': '🟡 Chipre Vár',
    gondozasban: '🏡 Gondozásban',
    gazdis: '🟢 Gazdis',
    ideiglenes: '🔵 Ideiglenes Nevelés',
    'not-spayed': '✂️ Ivartalanításra Vár',
    'no-kiskonyv': '📘 Oltási Könyv Híján',
    'no-photos': '📷 Fotó Híján',
    elhunyt: '🖤 Elhunyt',
    custom: '📌 Egyedi Szűrő',
  };

  const colorLabels: Record<QuickFilterCardConfig['colorScheme'], string> = {
    red: '🔴 Piros (Veszély/Lejárt)',
    amber: '🟡 Sárga/Borostyán (Figyelmeztetés)',
    sky: '🩵 Égkék (Gondozásban)',
    emerald: '🟢 Smaragdzöld (Gazdis)',
    indigo: '🔵 Indigó/Kék (Ideiglenes)',
    rose: '🌸 Rózsaszín/Rose (Műtét/Oltás)',
    blue: '🟦 Kék (Könyv/Okmány)',
    purple: '🟪 Lila (Média/Kép)',
    slate: '⬛ Palaszürke (Semleges)',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              🛠️ Felületi Elemek Testreszabása
            </h3>
            <p className="text-xs text-gray-500">
              Szabd személyre a kezelőfelület kártyáit, listáit és gyors szűrőit.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 text-xs sm:text-sm shrink-0 min-w-0">
          <button
            onClick={() => setActiveSection('health')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeSection === 'health'
                ? 'border-pink-600 text-pink-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>📊</span>
            <span>Egészségügyi Ellátottság Listája</span>
          </button>

          <button
            onClick={() => setActiveSection('cats_cards')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeSection === 'cats_cards'
                ? 'border-pink-600 text-pink-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🐱</span>
            <span>Állatok Tab - Gyors Szűrő Kártyák</span>
          </button>

          <button
            onClick={() => setActiveSection('card_pockets')}
            className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
              activeSection === 'card_pockets'
                ? 'border-pink-600 text-pink-600 font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🏷️</span>
            <span>Állat Kártya 3 Infó Zseb</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* SECTION 1: Health Coverage Items */}
          {activeSection === 'health' && (
            <div className="space-y-4">
              <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-xl space-y-1">
                <div className="font-extrabold text-pink-900 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Kimutatások - Egészségügyi Ellátottság Elemei</span>
                </div>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Itt tetszőlegesen be- és kikapcsolhatod, átrendezheted, átnevezheted vagy bővítheted a "Kimutatások és költségek" lapon megjelenő Egészségügyi Ellátottság lista mutatóit.
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px]">
                    📋 Megjelenő Elemek ({items.filter((i) => i.enabled).length} / {items.length} aktív):
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <span>+</span>
                      <span>Új Elem Hozzáadása</span>
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      ↺ Gyári Alap
                    </button>
                  </div>
                </div>

                {/* Add new item inline form */}
                {showAddForm && (
                  <form onSubmit={handleAddItem} className="p-3 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-700">
                    <h5 className="font-extrabold text-pink-300">➕ Új Kimutatási Elem Hozzáadása</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Ikon / Emoji:</label>
                        <input
                          type="text"
                          value={newIcon}
                          onChange={(e) => setNewIcon(e.target.value)}
                          className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-center"
                          placeholder="📌"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Megnevezés:</label>
                        <input
                          type="text"
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                          placeholder="pl. Parazitamentesítve..."
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg cursor-pointer"
                      >
                        Mégse
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-lg cursor-pointer"
                      >
                        Hozzáadás
                      </button>
                    </div>
                  </form>
                )}

                {/* List items */}
                <div className="space-y-1.5">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                        item.enabled
                          ? 'bg-white border-gray-200 shadow-2xs'
                          : 'bg-gray-50/80 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => handleToggle(item.id)}
                          className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500 cursor-pointer shrink-0"
                        />

                        {editingId === item.id ? (
                          <div className="flex gap-1.5 flex-1 items-center">
                            <input
                              type="text"
                              value={editIcon}
                              onChange={(e) => setEditIcon(e.target.value)}
                              className="w-10 p-1 bg-gray-100 border border-gray-300 rounded font-bold text-center text-xs"
                            />
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="flex-1 p-1 bg-gray-100 border border-gray-300 rounded font-bold text-xs"
                            />
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-2 py-1 bg-emerald-600 text-white font-bold rounded text-[10px] cursor-pointer"
                            >
                              Mentés
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-base shrink-0">{item.icon}</span>
                            <span className={`font-bold truncate text-xs ${item.enabled ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                              {item.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {editingId !== item.id && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer font-bold"
                            title="Mozgatás fel"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === items.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer font-bold"
                            title="Mozgatás le"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-blue-500 hover:text-blue-700 font-bold cursor-pointer"
                            title="Szerkesztés"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeletingItemId(item.id)}
                            className="p-1 text-red-400 hover:text-red-600 font-bold cursor-pointer"
                            title="Törlés"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-pink-300 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    👁️ Élő Előnézet (Kimutatások Tab):
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                    {items.filter((i) => i.enabled).length} elem látható
                  </span>
                </div>

                <div className="p-3 bg-white text-gray-800 rounded-lg border border-gray-200 space-y-1 text-xs">
                  <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px] border-b pb-1">
                    🏷️ Egészségügyi Ellátottság
                  </h4>
                  {items.filter((i) => i.enabled).length === 0 ? (
                    <p className="text-gray-400 italic text-center py-2">
                      (Nincs engedélyezett elem)
                    </p>
                  ) : (
                    items
                      .filter((i) => i.enabled)
                      .map((item) => (
                        <div key={item.id} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span>{item.icon}</span>
                            <span>{item.label}:</span>
                          </span>
                          <span className="font-bold text-pink-600 font-mono">X cica</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Cats Tab Quick Filter Cards Customization */}
          {activeSection === 'cats_cards' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                <div className="font-extrabold text-purple-900 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Állatok Tab - Gyors Szűrő Kártyák Testreszabása</span>
                </div>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Itt testreszabhatod az "Állatok" fül tetején megjelenő gyors szűrő kártyákat. Átrendezheted, ki/be kapcsolhatod, átnevezheted a kártyákat vagy új szűrő kártyát adhatsz hozzá tetszőleges színnel és feladattal.
                </p>
              </div>

              {/* Cat List View Mode Selector (Cards vs Table) */}
              <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2 shadow-2xs">
                <label className="block text-[11px] font-extrabold text-gray-800 uppercase tracking-wider">
                  🐱 Állatlista Megjelenítési Nézete:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setCatListViewMode('grid');
                      addDebugLog('Cat list view mode changed to grid');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer relative overflow-hidden transition-colors ${
                      catListViewMode === 'grid'
                        ? 'bg-pink-50 border-pink-500 text-pink-900 ring-2 ring-pink-300 font-extrabold shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <span className="text-xl shrink-0">📱</span>
                    <div>
                      <div className="text-xs font-bold">Kártyás Nézet (Grid)</div>
                      <div className="text-[10px] text-gray-500">Képes kártyák részletes információkkal</div>
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setCatListViewMode('table');
                      addDebugLog('Cat list view mode changed to table');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer relative overflow-hidden transition-colors ${
                      catListViewMode === 'table'
                        ? 'bg-pink-50 border-pink-500 text-pink-900 ring-2 ring-pink-300 font-extrabold shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <span className="text-xl shrink-0">📊</span>
                    <div>
                      <div className="text-xs font-bold">Táblázatos Nézet (Table)</div>
                      <div className="text-[10px] text-gray-500">Tömör, jól áttekinthető listás táblázat</div>
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Layout Mode Selector Card */}
              <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2 shadow-2xs">
                <label className="block text-[11px] font-extrabold text-gray-800 uppercase tracking-wider">
                  📐 Gyorsszűrő Kártyák Megjelenítési Módja:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setQfLayout('grid')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer relative overflow-hidden transition-colors ${
                      qfLayout === 'grid'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-300 font-extrabold shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    {qfLayout === 'grid' && (
                      <motion.div
                        layoutId="layoutModeIndicator"
                        className="absolute inset-0 bg-purple-500/10 pointer-events-none rounded-xl"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="text-xl shrink-0">🔲</span>
                    <div>
                      <div className="text-xs font-bold">Rács Nézet (Grid - 2x2 / 4 oszlop)</div>
                      <div className="text-[10px] text-gray-500">Kétdimenziós elrendezés (2 oszlop mobilon, 4 asztalin)</div>
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setQfLayout('scroll')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer relative overflow-hidden transition-colors ${
                      qfLayout === 'scroll'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-300 font-extrabold shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    {qfLayout === 'scroll' && (
                      <motion.div
                        layoutId="layoutModeIndicator"
                        className="absolute inset-0 bg-purple-500/10 pointer-events-none rounded-xl"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="text-xl shrink-0">↔️</span>
                    <div>
                      <div className="text-xs font-bold">Vízszintes Görgetés (Horizontal Scroll)</div>
                      <div className="text-[10px] text-gray-500">1 soros vízszintesen görgethető kártyasáv</div>
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Cards List Controls */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px]">
                    📱 Megjelenő Szűrő Kártyák ({qfCards.filter((c) => c.enabled).length} / {qfCards.length} aktív):
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddQfForm(!showAddQfForm)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <span>+</span>
                      <span>Új Kártya Hozzáadása</span>
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      ↺ Gyári Alap
                    </button>
                  </div>
                </div>

                {/* Add new quick filter card inline form */}
                {showAddQfForm && (
                  <form onSubmit={handleAddQfCard} className="p-3 bg-slate-900 text-white rounded-xl space-y-3 border border-slate-700">
                    <h5 className="font-extrabold text-purple-300 flex items-center gap-1.5">
                      <span>➕</span>
                      <span>Új Gyors Szűrő Kártya Létrehozása</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Ikon / Emoji:</label>
                        <input
                          type="text"
                          value={newQfIcon}
                          onChange={(e) => setNewQfIcon(e.target.value)}
                          className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-center"
                          placeholder="🐱"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Kártya Címke / Felirat:</label>
                        <input
                          type="text"
                          value={newQfLabel}
                          onChange={(e) => setNewQfLabel(e.target.value)}
                          className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                          placeholder="pl. Ideiglenes Nevelés..."
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Szűrő Funkció / Típus:</label>
                        <CustomSelect
                          value={newQfType}
                          onChange={(val) => setNewQfType(val as QuickFilterCardConfig['filterType'])}
                          options={[
                            { value: 'expired', label: 'Lejárt Oltások', icon: '🔴' },
                            { value: 'no-chip', label: 'Chipre Vár', icon: '🟡' },
                            { value: 'gondozasban', label: 'Gondozásban', icon: '🏡' },
                            { value: 'gazdis', label: 'Gazdis', icon: '🟢' },
                            { value: 'ideiglenes', label: 'Ideiglenes Nevelés', icon: '🔵' },
                            { value: 'not-spayed', label: 'Ivartalanításra Vár', icon: '✂️' },
                            { value: 'no-kiskonyv', label: 'Oltási Könyv Híján', icon: '📘' },
                            { value: 'no-photos', label: 'Fotó Híján', icon: '📷' },
                            { value: 'elhunyt', label: 'Elhunyt', icon: '🖤' },
                          ]}
                          title="Szűrő Funkció Kiválasztása"
                          colorScheme="pink"
                          buttonClassName="w-full p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Kártya Színvilág:</label>
                        <CustomSelect
                          value={newQfColor}
                          onChange={(val) => setNewQfColor(val as QuickFilterCardConfig['colorScheme'])}
                          options={Object.entries(colorLabels).map(([key, label]) => ({
                            value: key,
                            label,
                            icon: '🎨',
                          }))}
                          title="Kártya Színvilág Kiválasztása"
                          colorScheme="pink"
                          buttonClassName="w-full p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowAddQfForm(false)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg cursor-pointer"
                      >
                        Mégse
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-lg cursor-pointer"
                      >
                        Kártya Hozzáadása
                      </button>
                    </div>
                  </form>
                )}

                {/* Cards List */}
                <div className="space-y-2">
                  {qfCards.map((card, index) => {
                    const styles = getCardStyles(card.colorScheme);

                    return (
                      <div
                        key={card.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                          card.enabled
                            ? 'bg-white border-gray-200 shadow-2xs'
                            : 'bg-gray-50/80 border-gray-200 opacity-60'
                        }`}
                      >
                        {/* Left: Checkbox, Icon, Label & Badges */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={card.enabled}
                            onChange={() => handleToggleQf(card.id)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer shrink-0"
                          />

                          {editingQfId === card.id ? (
                            <div className="space-y-2 flex-1">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editQfIcon}
                                  onChange={(e) => setEditQfIcon(e.target.value)}
                                  className="w-12 p-1.5 bg-gray-100 border border-gray-300 rounded font-bold text-center text-xs"
                                  placeholder="🐱"
                                />
                                <input
                                  type="text"
                                  value={editQfLabel}
                                  onChange={(e) => setEditQfLabel(e.target.value)}
                                  className="flex-1 p-1.5 bg-gray-100 border border-gray-300 rounded font-bold text-xs"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <CustomSelect
                                  value={editQfType}
                                  onChange={(val) => setEditQfType(val as QuickFilterCardConfig['filterType'])}
                                  options={[
                                    { value: 'expired', label: 'Lejárt Oltások', icon: '🔴' },
                                    { value: 'no-chip', label: 'Chipre Vár', icon: '🟡' },
                                    { value: 'gondozasban', label: 'Gondozásban', icon: '🏡' },
                                    { value: 'gazdis', label: 'Gazdis', icon: '🟢' },
                                    { value: 'ideiglenes', label: 'Ideiglenes Nevelés', icon: '🔵' },
                                    { value: 'not-spayed', label: 'Ivartalanításra Vár', icon: '✂️' },
                                    { value: 'no-kiskonyv', label: 'Oltási Könyv Híján', icon: '📘' },
                                    { value: 'no-photos', label: 'Fotó Híján', icon: '📷' },
                                    { value: 'elhunyt', label: 'Elhunyt', icon: '🖤' },
                                  ]}
                                  title="Szűrő Funkció Kiválasztása"
                                  colorScheme="purple"
                                  buttonClassName="p-1 bg-gray-100 border border-gray-300 rounded text-[11px] font-bold"
                                />
                                <CustomSelect
                                  value={editQfColor}
                                  onChange={(val) => setEditQfColor(val as QuickFilterCardConfig['colorScheme'])}
                                  options={Object.entries(colorLabels).map(([key, label]) => ({
                                    value: key,
                                    label,
                                    icon: '🎨',
                                  }))}
                                  title="Kártya Színvilág Kiválasztása"
                                  colorScheme="purple"
                                  buttonClassName="p-1 bg-gray-100 border border-gray-300 rounded text-[11px] font-bold"
                                />
                              </div>
                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingQfId(null)}
                                  className="px-2.5 py-1 bg-gray-200 text-gray-700 font-bold rounded text-[11px] cursor-pointer"
                                >
                                  Mégse
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditQf(card.id)}
                                  className="px-3 py-1 bg-purple-600 text-white font-extrabold rounded text-[11px] cursor-pointer"
                                >
                                  Mentés
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 truncate">
                              <span className="text-lg shrink-0">{card.icon}</span>
                              <span className={`font-extrabold truncate text-xs ${card.enabled ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                                {card.label}
                              </span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-bold">
                                {filterTypeLabels[card.filterType] || card.filterType}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${styles.inactive}`}>
                                {card.colorScheme.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right Actions */}
                        {editingQfId !== card.id && (
                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleMoveQf(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer font-bold"
                              title="Mozgatás fel"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveQf(index, 'down')}
                              disabled={index === qfCards.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer font-bold"
                              title="Mozgatás le"
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => handleStartEditQf(card)}
                              className="p-1 text-blue-500 hover:text-blue-700 font-bold cursor-pointer"
                              title="Szerkesztés"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeletingQfId(card.id)}
                              className="p-1 text-red-400 hover:text-red-600 font-bold cursor-pointer"
                              title="Törlés"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Cards Preview Box */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-extrabold text-purple-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <span>👁️</span>
                    <span>Élő Előnézet (Így fog megjelenni az Állatok Tab-on):</span>
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                    {qfCards.filter((c) => c.enabled).length} kártya aktív
                  </span>
                </div>

                {qfCards.filter((c) => c.enabled).length === 0 ? (
                  <p className="text-gray-400 italic text-center py-4 text-xs">
                    (Nincs engedélyezett szűrő kártya - a felső sáv üres lesz)
                  </p>
                ) : (
                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    className={
                      qfLayout === 'scroll'
                        ? 'flex overflow-x-auto gap-2.5 pt-1 pb-1 scrollbar-thin'
                        : 'grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1'
                    }
                  >
                    {qfCards
                      .filter((c) => c.enabled)
                      .map((card) => {
                        const styles = getCardStyles(card.colorScheme);

                        return (
                          <motion.div
                            key={card.id}
                            layout
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                              qfLayout === 'scroll' ? 'min-w-[130px] sm:min-w-[150px] shrink-0' : ''
                            } ${styles.inactive}`}
                          >
                            <span className="text-[11px] font-bold truncate flex items-center gap-1">
                              <span>{card.icon}</span>
                              <span className="truncate">{card.label}</span>
                            </span>
                            <span className="text-xl font-black mt-1">12</span>
                          </motion.div>
                        );
                      })}
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: Animal Card Info Pockets */}
          {activeSection === 'card_pockets' && (
            <div className="space-y-4">
              <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-pink-950 flex items-center gap-1.5 text-xs">
                    <span>🏷️</span>
                    <span>Állat Kártyák 3 Infó Zsebe</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-[10px] font-bold text-gray-500 hover:text-pink-600 underline cursor-pointer"
                  >
                    ↺ Gyári visszaállítás
                  </button>
                </div>
                <p className="text-[11px] text-pink-900 leading-snug">
                  Minden állat kártyáján (a rácsos nézetben) megjelenik 3 testreszabható "infó zseb" jelvény.
                  Itt tetszőlegesen beállíthatod, hogy mely tulajdonságok (Chip, Oltás, Ivartalanítás, Szín, Kiskönyv, stb.) szerepeljenek az egyes slotokban.
                </p>
              </div>

              {/* List of Pockets */}
              <div className="space-y-2">
                {pockets.map((pocket, idx) => (
                  <div
                    key={pocket.id}
                    className={`p-3 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-2.5 ${
                      pocket.enabled
                        ? 'bg-white border-gray-200 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* Toggle Active Switch */}
                      <button
                        type="button"
                        onClick={() => handleTogglePocket(pocket.id)}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                          pocket.enabled ? 'bg-pink-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                            pocket.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      {/* Pocket Number Badge */}
                      <span className="text-[10px] font-extrabold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full shrink-0">
                        #{idx + 1} Zseb
                      </span>

                      {/* Pocket Type Select Dropdown */}
                      <div className="flex-1 min-w-0">
                        <CustomSelect
                          value={pocket.type}
                          onChange={(val) => handleChangePocketType(pocket.id, val as CatCardInfoPocketType)}
                          disabled={!pocket.enabled}
                          options={(Object.keys(pocketTypeLabels) as CatCardInfoPocketType[]).map((typeKey) => ({
                            value: typeKey,
                            label: pocketTypeLabels[typeKey],
                            icon: '📌',
                          }))}
                          title="Zseb Típusának Kiválasztása"
                          colorScheme="pink"
                          buttonClassName="w-full text-xs font-bold border border-gray-300 rounded-lg p-1.5 bg-white text-gray-800 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    {/* Controls: Reorder & Delete */}
                    <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => handleMovePocket(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 px-2 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded-md font-bold text-xs cursor-pointer"
                        title="Mozgatás fel"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePocket(idx, 'down')}
                        disabled={idx === pockets.length - 1}
                        className="p-1 px-2 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded-md font-bold text-xs cursor-pointer"
                        title="Mozgatás le"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPocketId(pocket.id)}
                        className="p-1 px-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md font-bold text-xs cursor-pointer ml-1"
                        title="Törlés"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Pocket Button */}
              <button
                type="button"
                onClick={handleAddPocket}
                className="w-full py-2 bg-pink-50 hover:bg-pink-100 border border-dashed border-pink-300 text-pink-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>➕</span>
                <span>Új Infó Zseb Slot Hozzáadása</span>
              </button>

              {/* Live Preview Card */}
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-gray-800 text-xs flex items-center gap-1.5">
                    <span>👁️</span>
                    <span>Élő Előnézet (Így jelenik meg egy Állat Kártyáján)</span>
                  </h5>
                  <span className="text-[10px] text-gray-400 italic">Minta adatokkal</span>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 max-w-sm mx-auto shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                          #1024
                        </span>
                        <h3 className="text-base font-extrabold text-gray-900">
                          Szerencsés Mici
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        ♀️ Nőstény • 2 év 3 hónap
                      </p>
                    </div>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      🏡 Gondozásban
                    </span>
                  </div>

                  {/* Configured Pockets Preview */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {pockets.filter((p) => p.enabled && p.type !== 'none').length > 0 ? (
                      pockets.map((p) => {
                        if (!p.enabled || p.type === 'none') return null;
                        switch (p.type) {
                          case 'chip':
                            return (
                              <span key={p.id} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                🏷️ Chip: 348098129381
                              </span>
                            );
                          case 'vaccination':
                            return (
                              <span key={p.id} className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                💉 Oltva (2)
                              </span>
                            );
                          case 'spayed':
                            return (
                              <span key={p.id} className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                ✂️ Ivartalanítva
                              </span>
                            );
                          case 'color':
                            return (
                              <span key={p.id} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                                🎨 Fekete-fehér
                              </span>
                            );
                          case 'kiskonyv':
                            return (
                              <span key={p.id} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                📘 Kiskönyv megvan
                              </span>
                            );
                          case 'tests':
                            return (
                              <span key={p.id} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                🧪 FeLV/FIV Negatív
                              </span>
                            );
                          case 'intake':
                            return (
                              <span key={p.id} className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                🏠 Befogott
                              </span>
                            );
                          case 'age':
                            return (
                              <span key={p.id} className="bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                🎂 2 év 3 hónap
                              </span>
                            );
                          case 'cost':
                            return (
                              <span key={p.id} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-bold text-[11px] font-mono">
                                💰 24 500 Ft
                              </span>
                            );
                          default:
                            return null;
                        }
                      })
                    ) : (
                      <span className="text-gray-400 italic text-[11px]">
                        Nincs aktív infó zseb kiválasztva.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer"
          >
            Mégse
          </button>
          <button
            onClick={handleSaveAll}
            className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>Beállítások Mentése</span>
          </button>
        </div>
      </motion.div>

      {/* Item Delete Confirm Modal */}
      {(deletingItemId || deletingQfId || deletingPocketId) && (
        <div className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-center">
            <span className="text-3xl">⚠️</span>
            <h4 className="font-black text-gray-900 text-sm">Biztosan törlöd ezt az elemet?</h4>
            <p className="text-xs text-gray-600">
              A törlést követően a beállítások mentésekor ez a kártya/elem törlődik a kezelőfelületről.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setDeletingItemId(null);
                  setDeletingQfId(null);
                  setDeletingPocketId(null);
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Mégse
              </button>
              <button
                onClick={() => {
                  confirmDeleteItem();
                  confirmDeleteQf();
                  confirmDeletePocket();
                }}
                className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Végleges törlés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-center">
            <span className="text-3xl">↺</span>
            <h4 className="font-black text-gray-900 text-sm">Visszaállítás alapértelmezettre?</h4>
            <p className="text-xs text-gray-600">
              Ezzel az összes egyéni kártya, elem és sorrend visszaáll a gyári alapértelmezett állapotra.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Mégse
              </button>
              <button
                onClick={confirmReset}
                className="flex-1 py-2 bg-pink-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Visszaállítás
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
