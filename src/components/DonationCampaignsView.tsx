import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift,
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  Edit,
  Trash2,
  Eye,
  Download,
  Printer,
  Package,
  PackageCheck,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { DonationCampaign, DonationCampaignItem, CampaignStatus, CampaignItemCategory } from '../types';
import { db } from '../lib/db';
import { CustomSelect } from './CustomSelect';
import { DonationCampaignFormModal } from './DonationCampaignFormModal';
import { DonationCampaignDetailModal } from './DonationCampaignDetailModal';

export const DonationCampaignsView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [campaignItems, setCampaignItems] = useState<DonationCampaignItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<DonationCampaign | null>(null);

  const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<DonationCampaign | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allCampaigns = await db.table('donationCampaigns').toArray();
      const allItems = await db.table('donationCampaignItems').toArray();

      // Sort by startDate desc
      allCampaigns.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      setCampaigns(allCampaigns);
      setCampaignItems(allItems);
    } catch (err) {
      console.error('Error loading donation campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering
  const filteredCampaigns = campaigns.filter((c) => {
    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    // Search query (name, location, participants)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = c.name.toLowerCase().includes(q);
      const locMatch = c.location.toLowerCase().includes(q);
      const partMatch = Array.isArray(c.participants)
        ? c.participants.some((p) => p.toLowerCase().includes(q))
        : (c.participants || '').toLowerCase().includes(q);
      if (!nameMatch && !locMatch && !partMatch) return false;
    }

    // Date range filter
    if (dateFilter !== 'all') {
      const campaignYear = new Date(c.startDate).getFullYear();
      const currentYear = new Date().getFullYear();

      if (dateFilter === 'this_year' && campaignYear !== currentYear) return false;
      if (dateFilter === 'last_year' && campaignYear !== currentYear - 1) return false;
    }

    return true;
  });

  // Calculate summaries
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'folyamatban').length;
  const completedCampaigns = campaigns.filter((c) => c.status === 'lezart').length;

  // Items count per campaign
  const getItemsForCampaign = (campaignId: number | string) => {
    return campaignItems.filter((item) => String(item.campaignId) === String(campaignId));
  };

  const handleCreateNew = () => {
    setCampaignToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (c: DonationCampaign, e: React.MouseEvent) => {
    e.stopPropagation();
    setCampaignToEdit(c);
    setIsFormOpen(true);
  };

  const handleDelete = async (c: DonationCampaign, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Biztosan törölni szeretné a(z) "${c.name}" adománygyűjtő akciót és annak összes rögzített tételét?`)) {
      return;
    }

    try {
      if (c.id) {
        // Delete items
        const itemsToDelete = campaignItems.filter((i) => String(i.campaignId) === String(c.id));
        for (const item of itemsToDelete) {
          if (item.id) await db.table('donationCampaignItems').delete(item.id);
        }
        // Delete campaign
        await db.table('donationCampaigns').delete(c.id);
      }
      loadData();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      alert('Hiba történt a törlés során!');
    }
  };

  const handleOpenDetail = (c: DonationCampaign) => {
    setSelectedCampaignForDetail(c);
    setIsDetailOpen(true);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredCampaigns.length === 0) {
      alert('Nincs exportálható adománygyűjtő akció!');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Akció Neve,Kezdő Dátum,Záró Dátum,Helyszín,Státusz,Résztvevők,Raktárba Vezetve,Tételek Száma\n';

    filteredCampaigns.forEach((c) => {
      const itemsCount = getItemsForCampaign(c.id!).length;
      const participantsStr = Array.isArray(c.participants) ? c.participants.join('; ') : c.participants || '';
      const statusLabel =
        c.status === 'folyamatban' ? 'Folyamatban' : c.status === 'lezart' ? 'Lezárt' : 'Tervezett';

      const row = [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.startDate}"`,
        `"${c.endDate || ''}"`,
        `"${c.location.replace(/"/g, '""')}"`,
        `"${statusLabel}"`,
        `"${participantsStr.replace(/"/g, '""')}"`,
        `"${c.inventoryConverted ? 'Igen' : 'Nem'}"`,
        itemsCount
      ].join(',');

      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Adomanygyujto_Akciok_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Report
  const handlePrintReport = () => {
    window.print();
  };

  const statusOptions = [
    { value: 'all', label: 'Összes státusz' },
    { value: 'folyamatban', label: '⚡ Folyamatban' },
    { value: 'tervezett', label: '🗓️ Tervezett' },
    { value: 'lezart', label: '✅ Lezárt' }
  ];

  const dateOptions = [
    { value: 'all', label: 'Minden időszak' },
    { value: 'this_year', label: 'Idei év' },
    { value: 'last_year', label: 'Előző év' }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-2">
              <Gift className="w-4 h-4 text-pink-100" /> Adománygyűjtő Modul
            </div>
            <h1 className="text-2xl md:text-3xl font-black">🎁 Adománygyűjtő Akciók</h1>
            <p className="text-pink-100 text-xs md:text-sm mt-1 max-w-xl">
              Helyszíni táp- és alomgyűjtések nyilvántartása, önkéntesek koordinálása, tételes gyűjtési napló és automatikus raktárba vezetés.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 text-xs font-bold text-pink-900 bg-white hover:bg-pink-50 rounded-2xl shadow-lg transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> CSV Export
            </button>
            <button
              onClick={handlePrintReport}
              className="px-4 py-2.5 text-xs font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Nyomtatás
            </button>
            <button
              onClick={handleCreateNew}
              className="px-5 py-2.5 text-xs font-black text-white bg-pink-700 hover:bg-pink-800 rounded-2xl shadow-xl transition-all flex items-center gap-2 border border-pink-400/30"
            >
              <Plus className="w-4 h-4" /> Új akció
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-pink-100 dark:bg-pink-950/50 rounded-2xl text-pink-600 dark:text-pink-400">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Összes Gyűjtőakció
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {totalCampaigns} <span className="text-xs font-normal text-slate-400">akció</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/50 rounded-2xl text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Folyamatban lévő
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {activeCampaigns} <span className="text-xs font-normal text-slate-400">aktív</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Lezárt Akciók
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {completedCampaigns} <span className="text-xs font-normal text-slate-400">befejezett</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Keresés név, helyszín, résztvevők szerint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-40">
            <CustomSelect
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
            />
          </div>
          <div className="w-full sm:w-40">
            <CustomSelect
              options={dateOptions}
              value={dateFilter}
              onChange={(val) => setDateFilter(val)}
            />
          </div>
        </div>
      </div>

      {/* Campaigns Grid / List */}
      {loading ? (
        <div className="text-center py-16">
          <Sparkles className="w-8 h-8 text-pink-500 animate-spin mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Adománygyűjtő akciók betöltése...
          </p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
          <Gift className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
            Nincs találat adománygyűjtő akcióra
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Nem található a szűrési feltételeknek megfelelő akció. Módosítsa a szűrőket vagy hozzon létre egy új adománygyűjtést!
          </p>
          <button
            onClick={handleCreateNew}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-lg shadow-pink-500/20 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Új Akció Létrehozása
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((c) => {
            const campaignItemsList = getItemsForCampaign(c.id!);
            const participantsList = Array.isArray(c.participants)
              ? c.participants
              : c.participants
              ? c.participants.split(',').map((p) => p.trim())
              : [];

            return (
              <div
                key={c.id}
                onClick={() => handleOpenDetail(c)}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col group"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-2 ${
                        c.status === 'folyamatban'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : c.status === 'lezart'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {c.status === 'folyamatban' && '⚡ Folyamatban'}
                      {c.status === 'lezart' && '✅ Lezárt'}
                      {c.status === 'tervezett' && '🗓️ Tervezett'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors line-clamp-1">
                      {c.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleEdit(c, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
                      title="Szerkesztés"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(c, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Törlés"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-5 space-y-3 flex-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-pink-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {c.location}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>
                      {c.startDate} {c.endDate ? `– ${c.endDate}` : ''}
                    </span>
                  </div>

                  {participantsList.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1 text-slate-500 dark:text-slate-400">
                        {participantsList.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Summary Footer bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" /> {campaignItemsList.length} rögzített tétel
                    </span>

                    {c.inventoryConverted ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5" /> Raktárban
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Megtekintés
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DonationCampaignFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        campaignToEdit={campaignToEdit}
        onSaved={loadData}
      />

      <DonationCampaignDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        campaign={selectedCampaignForDetail}
        onCampaignUpdated={loadData}
      />
    </div>
  );
};
