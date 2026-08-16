import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../js/db.js';
import { CatCard, Cat } from './CatCard';
import { useAppStore, QuickFilterCardConfig, getCardStyles } from '../store/useAppStore';
import { getTagStyle, getTagIcon } from '../utils/tagUtils';
import { CustomSelect } from './CustomSelect';

interface CatListProps {
  onOpenDetail: (catId: string) => void;
  onEditCat: (cat: Cat) => void;
  onAddCat: () => void;
}

export const CatList: React.FC<CatListProps> = ({ onOpenDetail, onEditCat, onAddCat }) => {
  const { quickFilterCards, quickFilterLayout, catListViewMode, getCurrentUserPermissions } = useAppStore();
  const perms = getCurrentUserPermissions();
  const activeCards = quickFilterCards.filter((card) => card.enabled);

  const [search, setSearch] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'bak' | 'nosteny'>('all');
  const [intakeFilter, setIntakeFilter] = useState<'all' | 'sajat' | 'befogott' | 'leadott' | 'elkobzott'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const viewMode = catListViewMode;

  const allCats = useLiveQuery(() => db.cats.toArray(), []) || [];

  // Extract all unique tags present across all cats
  const availableTags = Array.from(
    new Set(allCats.flatMap((cat) => (Array.isArray(cat.tags) ? cat.tags : [])))
  ).sort();
  const expiredEventCatIds = useLiveQuery(
    async () => {
      const expired = await db.events.where('status').equals('expired').toArray();
      return new Set(expired.map((e) => e.catId));
    },
    []
  );

  // Helper function to check if a cat matches a quick filter card
  const catMatchesCard = (cat: Cat, card: QuickFilterCardConfig): boolean => {
    switch (card.filterType) {
      case 'expired':
        return !!expiredEventCatIds?.has(cat.id);
      case 'no-chip':
        return !cat.chipNumber && cat.status !== 'elhunyt';
      case 'gondozasban':
        return cat.status === 'gondozasban' || cat.status === 'ideiglenes';
      case 'gazdis':
        return cat.status === 'gazdis';
      case 'ideiglenes':
        return cat.status === 'ideiglenes';
      case 'not-spayed':
        return !cat.isSpayed && cat.status !== 'elhunyt';
      case 'no-kiskonyv':
        return !cat.hasKiskonyv && cat.status !== 'elhunyt';
      case 'no-photos':
        return (!cat.fotoUrl || cat.fotoUrl.trim() === '') && cat.status !== 'elhunyt';
      case 'elhunyt':
        return cat.status === 'elhunyt';
      case 'custom':
        return card.customStatus ? cat.status === card.customStatus : true;
      default:
        return true;
    }
  };

  // Filter cats based on search, quick filter card, gender
  const filteredCats = allCats.filter((cat) => {
    // Hide deceased by default unless explicitly filtering for deceased
    const isElhunytCardSelected = selectedCardId !== 'all' && activeCards.find((c) => c.id === selectedCardId)?.filterType === 'elhunyt';
    if (cat.status === 'elhunyt' && !isElhunytCardSelected && selectedCardId !== 'all') return false;

    // Search query
    if (search) {
      const q = search.toLowerCase();
      const matchName = String(cat.nev || '').toLowerCase().includes(q);
      const matchSorszam = String(cat.sorszam || '').toLowerCase().includes(q);
      const matchChip = String(cat.chipNumber || '').toLowerCase().includes(q);
      const matchSzin = String(cat.szin || '').toLowerCase().includes(q);
      const matchIntake = String(cat.intakeType || '').toLowerCase().includes(q);
      const matchTag = Array.isArray(cat.tags) && cat.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchSorszam && !matchChip && !matchSzin && !matchIntake && !matchTag) return false;
    }

    // Gender filter
    if (genderFilter !== 'all' && cat.ivar !== genderFilter) return false;

    // Tag filter
    if (tagFilter !== 'all') {
      if (!Array.isArray(cat.tags) || !cat.tags.includes(tagFilter)) return false;
    }

    // Intake filter
    if (intakeFilter !== 'all') {
      if (intakeFilter === 'sajat') {
        if (cat.intakeType && cat.intakeType !== 'sajat') return false;
      } else {
        if (cat.intakeType !== intakeFilter) return false;
      }
    }

    // Quick filter card selection
    if (selectedCardId !== 'all') {
      const activeCard = activeCards.find((c) => c.id === selectedCardId);
      if (activeCard) {
        return catMatchesCard(cat, activeCard);
      }
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Quick Filter Cards */}
      {activeCards.length > 0 && (
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className={
            quickFilterLayout === 'scroll'
              ? 'flex overflow-x-auto gap-2.5 pb-1 scrollbar-thin'
              : 'grid grid-cols-2 sm:grid-cols-4 gap-2.5'
          }
        >
          {activeCards.map((card) => {
            const count = allCats.filter((cat) => catMatchesCard(cat, card)).length;
            const styles = getCardStyles(card.colorScheme);
            const isSelected = selectedCardId === card.id;

            return (
              <motion.button
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                type="button"
                onClick={() => setSelectedCardId(isSelected ? 'all' : card.id)}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between cursor-pointer relative overflow-hidden transition-colors duration-200 ${
                  quickFilterLayout === 'scroll' ? 'min-w-[150px] sm:min-w-[170px] shrink-0' : ''
                } ${isSelected ? styles.active : styles.inactive}`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeFilterIndicator"
                    className="absolute inset-0 bg-white/10 pointer-events-none rounded-2xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="text-xs font-bold block truncate flex items-center gap-1.5 relative z-10">
                  <span className="text-sm shrink-0">{card.icon}</span>
                  <span className="truncate">{card.label}</span>
                </span>
                <span className="text-2xl font-black mt-1 relative z-10">{count}</span>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Controls Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Név, sorszám, chip, szín..."
            className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls (Gender & Intake) */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
          {/* Tag Filter Dropdown */}
          <div className="min-w-[140px] flex-1 sm:flex-none">
            <CustomSelect
              value={tagFilter}
              onChange={(val) => setTagFilter(val)}
              options={[
                { value: 'all', label: `Minden címke (${availableTags.length})`, icon: '🏷️' },
                ...availableTags.map((t) => ({ value: t, label: t, icon: '🏷️' })),
              ]}
              title="🏷️ Címke szerinti szűrés"
              colorScheme="purple"
              buttonClassName="text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-2 text-gray-700"
            />
          </div>

          <div className="min-w-[120px] flex-1 sm:flex-none">
            <CustomSelect
              value={genderFilter}
              onChange={(val) => setGenderFilter(val as any)}
              options={[
                { value: 'all', label: 'Minden ivar', icon: '🐾' },
                { value: 'bak', label: 'Kandúr (Bak)', icon: '♂️' },
                { value: 'nosteny', label: 'Nőstény', icon: '♀️' },
              ]}
              title="Ivar szerinti szűrés"
              colorScheme="pink"
              buttonClassName="text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-2 text-gray-700"
            />
          </div>

          <div className="min-w-[130px] flex-1 sm:flex-none">
            <CustomSelect
              value={intakeFilter}
              onChange={(val) => setIntakeFilter(val as any)}
              options={[
                { value: 'all', label: 'Minden bekerülés', icon: '📋' },
                { value: 'sajat', label: 'Saját mentés', icon: '🐾' },
                { value: 'befogott', label: 'Befogott kóbor', icon: '🐈' },
                { value: 'leadott', label: 'Gazda által leadott', icon: '📦' },
                { value: 'elkobzott', label: 'Elkobzott', icon: '⚖️' },
              ]}
              title="📥 Bekerülés szerinti szűrés"
              colorScheme="indigo"
              buttonClassName="text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-2 text-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Quick Tag Filter Pills */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          <span className="text-[11px] font-bold text-gray-500 shrink-0 flex items-center gap-1">
            🏷️ Címkék:
          </span>
          <button
            type="button"
            onClick={() => setTagFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border ${
              tagFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Összes ({allCats.length})
          </button>
          {availableTags.map((tag) => {
            const isSelected = tagFilter === tag;
            const tagCount = allCats.filter((c) => Array.isArray(c.tags) && c.tags.includes(tag)).length;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(isSelected ? 'all' : tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'ring-2 ring-purple-600 font-extrabold shadow-2xs ' + getTagStyle(tag)
                    : getTagStyle(tag) + ' opacity-80 hover:opacity-100'
                }`}
              >
                <span>{getTagIcon(tag)}</span>
                <span>{tag}</span>
                <span className="ml-0.5 text-[10px] opacity-75">({tagCount})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cat List Content */}
      {filteredCats.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-3">
          <span className="text-4xl block">🐾</span>
          <h3 className="font-extrabold text-base text-gray-800">Nincs a szűrésnek megfelelő cica</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Módosítsd a keresési feltételeket, vagy vegyél fel egy új cicát a nyilvántartásba!
          </p>
          <button
            onClick={onAddCat}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            ➕ Új cica hozzáadása
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <AnimatePresence mode="popLayout">
            {filteredCats.map((cat) => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <CatCard
                  cat={cat as Cat}
                  onOpenDetail={onOpenDetail}
                  onEditCat={onEditCat}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* Table View */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Sorszám & Név</th>
                  <th className="px-4 py-3">Ivar</th>
                  <th className="px-4 py-3">Címkék</th>
                  <th className="px-4 py-3">Chip No.</th>
                  <th className="px-4 py-3">Státusz</th>
                  <th className="px-4 py-3 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredCats.map((cat) => (
                  <tr
                    key={cat.id}
                    onClick={() => onOpenDetail(cat.id)}
                    className="hover:bg-pink-50/50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">
                      <span className="text-gray-400 font-mono mr-1">#{cat.sorszam || cat.id.slice(0, 4)}</span>
                      {cat.nev}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {cat.ivar === 'bak' ? '♂️ Kandúr' : '♀️ Nőstény'}
                    </td>
                    <td className="px-4 py-3">
                      {Array.isArray(cat.tags) && cat.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cat.tags.map((t) => (
                            <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getTagStyle(t)}`}>
                              {getTagIcon(t)} {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {cat.chipNumber ? `🏷️ ${cat.chipNumber}` : <span className="text-red-500 font-bold">Nincs</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">
                        {cat.status || 'Gondozásban'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onEditCat(cat as Cat)}
                        className="px-2.5 py-1 text-gray-600 hover:text-pink-600 hover:bg-pink-100 rounded-lg transition font-bold"
                      >
                        ✏️ Szerkesztés
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
