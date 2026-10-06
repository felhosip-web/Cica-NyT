import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Gift,
  Calendar,
  MapPin,
  Users,
  Plus,
  Trash2,
  Edit2,
  PackageCheck,
  Package,
  Printer,
  CheckCircle,
  FileText
} from 'lucide-react';
import {
  DonationCampaign,
  DonationCampaignItem,
  CampaignItemCategory,
  CampaignItemUnit,
  InventoryCategory
} from '../types';
import { db } from '../lib/db';
import { CustomSelect } from './CustomSelect';

interface DonationCampaignDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: DonationCampaign | null;
  onCampaignUpdated: () => void;
}

export const DonationCampaignDetailModal: React.FC<DonationCampaignDetailModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onCampaignUpdated
}) => {
  const [items, setItems] = useState<DonationCampaignItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DonationCampaignItem | null>(null);

  // Form states for campaign item
  const [category, setCategory] = useState<CampaignItemCategory>('szaraz_tap');
  const [nameOrBrand, setNameOrBrand] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState<CampaignItemUnit>('kg');
  const [itemNotes, setItemNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    if (!campaign?.id) return;
    try {
      const list = await db.table('donationCampaignItems').where('campaignId').equals(campaign.id).toArray();
      setItems(list);
    } catch (err) {
      console.error('Failed to load campaign items:', err);
    }
  }, [campaign?.id]);

  useEffect(() => {
    if (isOpen && campaign) {
      loadItems();
    }
  }, [isOpen, campaign, loadItems]);

  if (!isOpen || !campaign) return null;

  const categoryLabels: Record<CampaignItemCategory, string> = {
    szaraz_tap: '🥣 Száraz táp',
    nedves_tap: '🥫 Nedves táp',
    alom: '📦 Alom',
    felszereles: '🧸 Felszerelés',
    egyeb: '✨ Egyéb'
  };

  const unitLabels: Record<CampaignItemUnit, string> = {
    kg: 'kg',
    db: 'db',
    tasak: 'tasak',
    zsak: 'zsák',
    doboz: 'doboz',
    l: 'liter (l)',
    csomag: 'csomag'
  };

  // Calculate category totals
  const categoryTotals: Record<CampaignItemCategory, Record<string, number>> = {
    szaraz_tap: {},
    nedves_tap: {},
    alom: {},
    felszereles: {},
    egyeb: {}
  };

  items.forEach((item) => {
    const cat = item.category || 'egyeb';
    const u = item.unit || 'db';
    if (!categoryTotals[cat]) categoryTotals[cat] = {};
    categoryTotals[cat][u] = (categoryTotals[cat][u] || 0) + Number(item.quantity || 0);
  });

  const handleOpenItemForm = (item?: DonationCampaignItem) => {
    if (item) {
      setEditingItem(item);
      setCategory(item.category);
      setNameOrBrand(item.nameOrBrand || '');
      setQuantity(item.quantity);
      setUnit(item.unit);
      setItemNotes(item.notes || '');
    } else {
      setEditingItem(null);
      setCategory('szaraz_tap');
      setNameOrBrand('');
      setQuantity('');
      setUnit('kg');
      setItemNotes('');
    }
    setShowItemForm(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) {
      alert('Kérjük, adjon meg érvényes mennyiséget!');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemData: Partial<DonationCampaignItem> = {
        campaignId: campaign.id!,
        category,
        nameOrBrand: nameOrBrand.trim() || undefined,
        quantity: Number(quantity),
        unit,
        notes: itemNotes.trim() || undefined
      };

      if (editingItem?.id) {
        await db.table('donationCampaignItems').update(editingItem.id, itemData);
      } else {
        itemData.createdAt = new Date().toISOString();
        await db.table('donationCampaignItems').add(itemData);
      }

      setShowItemForm(false);
      loadItems();
    } catch (err) {
      console.error('Error saving item:', err);
      alert('Hiba történt a tétel mentésekor!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: number | string) => {
    if (!confirm('Biztosan törölni szeretné ezt a tételt?')) return;
    try {
      await db.table('donationCampaignItems').delete(itemId);
      loadItems();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleConvertToInventory = async () => {
    if (items.length === 0) {
      alert('Az akcióhoz még nem rögzítettek gyűjtött tételeket!');
      return;
    }

    if (!confirm(`Biztosan bevezeti mind a(z) ${items.length} gyűjtött tételt a Raktárkészletbe bejövő adományként?`)) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Map campaign category to inventory itemType
      const categoryMap: Record<CampaignItemCategory, InventoryCategory> = {
        szaraz_tap: 'szaraz_tap',
        nedves_tap: 'nedves_tap',
        alom: 'alom',
        felszereles: 'felszereles',
        egyeb: 'egyeb'
      };

      for (const item of items) {
        const invCategory = categoryMap[item.category] || 'egyeb';
        await db.table('inventory').add({
          direction: 'bejovo',
          itemType: invCategory,
          sourceType: 'adomany',
          brandOrName: item.nameOrBrand || categoryLabels[item.category],
          quantity: Number(item.quantity),
          unit: item.unit,
          date: today,
          sourceOrRecipient: `Adományakció: ${campaign.name} (${campaign.location})`,
          notes: item.notes ? `Akció tétel: ${item.notes}` : `Gyűjtve: ${campaign.name}`,
          syncStatus: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      await db.table('donationCampaigns').update(campaign.id!, {
        inventoryConverted: true,
        updatedAt: new Date().toISOString()
      });

      alert('A gyűjtött tételek sikeresen bevezetésre kerültek a raktárkészletbe! 📦');
      onCampaignUpdated();
    } catch (err) {
      console.error('Error converting campaign items to inventory:', err);
      alert('Hiba történt a raktárba vezetés során: ' + (err as Error).message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const categoryOptions = [
    { value: 'szaraz_tap', label: '🥣 Száraz táp' },
    { value: 'nedves_tap', label: '🥫 Nedves táp' },
    { value: 'alom', label: '📦 Alom' },
    { value: 'felszereles', label: '🧸 Felszerelés' },
    { value: 'egyeb', label: '✨ Egyéb' }
  ];

  const unitOptions = [
    { value: 'kg', label: 'kg' },
    { value: 'db', label: 'db' },
    { value: 'tasak', label: 'tasak' },
    { value: 'zsak', label: 'zsák' },
    { value: 'doboz', label: 'doboz' },
    { value: 'l', label: 'liter (l)' },
    { value: 'csomag', label: 'csomag' }
  ];

  const participantsList = Array.isArray(campaign.participants)
    ? campaign.participants
    : campaign.participants
    ? campaign.participants.split(',').map((p) => p.trim())
    : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold">{campaign.name}</h2>
              <p className="text-xs text-white/80 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {campaign.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {campaign.startDate} {campaign.endDate ? `– ${campaign.endDate}` : ''}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Nyomtatás / PDF"
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Campaign Details Info Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Státusz
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  campaign.status === 'folyamatban'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : campaign.status === 'lezart'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                }`}
              >
                {campaign.status === 'folyamatban' && '⚡ Folyamatban'}
                {campaign.status === 'lezart' && '✅ Lezárt'}
                {campaign.status === 'tervezett' && '🗓️ Tervezett'}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Résztvevők / Önkéntesek
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {participantsList.length > 0 ? participantsList.join(', ') : 'Nincs megadva'}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5" /> Raktárba vezetés
              </span>
              {campaign.inventoryConverted ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Bevezetve a raktárba
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Még nincs bevezetve
                </span>
              )}
            </div>

            {campaign.notes && (
              <div className="md:col-span-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-0.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Megjegyzés
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic">{campaign.notes}</p>
              </div>
            )}
          </div>

          {/* Category Summary Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-pink-500" /> Összesítés kategóriánként
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(Object.keys(categoryTotals) as CampaignItemCategory[]).map((cat) => {
                const totals = categoryTotals[cat];
                const totalEntries = Object.entries(totals);
                return (
                  <div
                    key={cat}
                    className="p-3 bg-pink-50/50 dark:bg-pink-950/20 rounded-xl border border-pink-100 dark:border-pink-900/40"
                  >
                    <span className="text-xs font-bold text-pink-900 dark:text-pink-300 block mb-1">
                      {categoryLabels[cat]}
                    </span>
                    {totalEntries.length === 0 ? (
                      <span className="text-xs text-slate-400">0 tétel</span>
                    ) : (
                      <div className="space-y-0.5">
                        {totalEntries.map(([unitKey, sum]) => (
                          <div key={unitKey} className="text-sm font-extrabold text-pink-600 dark:text-pink-400">
                            {sum} {unitLabels[unitKey as CampaignItemUnit] || unitKey}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Item List Header & Action Button */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              📋 Gyűjtött tételek ({items.length} db)
            </h3>
            <div className="flex items-center gap-2">
              {!campaign.inventoryConverted && (
                <button
                  onClick={handleConvertToInventory}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <PackageCheck className="w-4 h-4" /> Készletbe vezetés
                </button>
              )}
              <button
                onClick={() => handleOpenItemForm()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-md shadow-pink-500/20 transition-all flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Új tétel
              </button>
            </div>
          </div>

          {/* Add / Edit Item Inline Modal Form */}
          {showItemForm && (
            <form
              onSubmit={handleSaveItem}
              className="p-4 bg-pink-50/70 dark:bg-slate-700/60 rounded-2xl border border-pink-200 dark:border-slate-600 space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {editingItem ? 'Tétel szerkesztése' : 'Új tétel rögzítése'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategória
                  </label>
                  <CustomSelect
                    options={categoryOptions}
                    value={category}
                    onChange={(val) => setCategory(val as CampaignItemCategory)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Megnevezés / Márka (opcionális)
                  </label>
                  <input
                    type="text"
                    placeholder="pl. Felix tasakos, Cat Chow..."
                    value={nameOrBrand}
                    onChange={(e) => setNameOrBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mennyiség <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="pl. 10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mértékegység
                  </label>
                  <CustomSelect
                    options={unitOptions}
                    value={unit}
                    onChange={(val) => setUnit(val as CampaignItemUnit)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Megjegyzés (opcionális)
                </label>
                <input
                  type="text"
                  placeholder="pl. Csirke ízű, 4x100g..."
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-lg"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg shadow transition-all"
                >
                  {isSubmitting ? 'Mentés...' : 'Tétel Mentése'}
                </button>
              </div>
            </form>
          )}

          {/* Items Table */}
          {items.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Még nincsenek adomány tételek rögzítve
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Kattintson az "Új tétel" gombra az összegyűjtött termékek felvételéhez!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Kategória</th>
                    <th className="px-4 py-3">Megnevezés / Márka</th>
                    <th className="px-4 py-3">Mennyiség</th>
                    <th className="px-4 py-3">Megjegyzés</th>
                    <th className="px-4 py-3 text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-bold">
                        {categoryLabels[item.category] || item.category}
                      </td>
                      <td className="px-4 py-2.5">
                        {item.nameOrBrand || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="px-4 py-2.5 font-extrabold text-pink-600 dark:text-pink-400">
                        {item.quantity} {unitLabels[item.unit] || item.unit}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        {item.notes || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenItemForm(item)}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Szerkesztés"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id!)}
                            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition-colors"
                            title="Törlés"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-xl transition-colors shadow-sm"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
