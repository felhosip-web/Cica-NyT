import React, { useState, useEffect } from 'react';
import { X, Gift, Calendar, MapPin, Users, FileText } from 'lucide-react';
import { DonationCampaign, CampaignStatus } from '../types';
import { db } from '../lib/db';
import { useToastStore } from '../store/useToastStore';
import { logEvent, logError } from '../utils/eventLog';
import { CustomSelect } from './CustomSelect';

interface DonationCampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit?: DonationCampaign | null;
  onSaved: () => void;
}

export const DonationCampaignFormModal: React.FC<DonationCampaignFormModalProps> = ({
  isOpen,
  onClose,
  campaignToEdit,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [participantsStr, setParticipantsStr] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('tervezett');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (campaignToEdit) {
      setName(campaignToEdit.name || '');
      setStartDate(campaignToEdit.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(campaignToEdit.endDate || '');
      setLocation(campaignToEdit.location || '');
      if (Array.isArray(campaignToEdit.participants)) {
        setParticipantsStr(campaignToEdit.participants.join(', '));
      } else {
        setParticipantsStr(campaignToEdit.participants || '');
      }
      setStatus(campaignToEdit.status || 'tervezett');
      setNotes(campaignToEdit.notes || '');
    } else {
      setName('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setLocation('');
      setParticipantsStr('');
      setStatus('tervezett');
      setNotes('');
    }
  }, [campaignToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !location.trim()) {
      alert('Kérjük, töltse ki a kötelező mezőket (Akció neve, Kezdő dátum, Helyszín)!');
      return;
    }

    setIsSubmitting(true);
    try {
      const participantsList = participantsStr
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const campaignData: Partial<DonationCampaign> = {
        name: name.trim(),
        startDate,
        endDate: endDate || undefined,
        location: location.trim(),
        participants: participantsList,
        status,
        notes: notes.trim() || undefined,
        syncStatus: 'pending',
        updatedAt: new Date().toISOString()
      };

      let savedId = campaignToEdit?.id;
      if (campaignToEdit?.id) {
        await db.table('donationCampaigns').update(campaignToEdit.id, campaignData);
      } else {
        campaignData.createdAt = new Date().toISOString();
        campaignData.inventoryConverted = false;
        savedId = await db.table('donationCampaigns').add(campaignData);
      }

      await logEvent({
        category: 'donation',
        action: campaignToEdit?.id ? 'donation.campaign_update' : 'donation.campaign_create',
        summary: `Adománygyűjtő akció ${campaignToEdit?.id ? 'módosítva' : 'létrehozva'}: ${name.trim()}`,
        entityType: 'donation_campaign',
        entityId: String(savedId),
      });

      useToastStore.getState().showSuccess(`Adománygyűjtő akció ${campaignToEdit?.id ? 'módosítva' : 'elmentve'}!`);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error saving donation campaign:', err);
      await logError(campaignToEdit?.id ? 'donation.campaign_update' : 'donation.campaign_create', err, {
        category: 'donation',
        summary: `Hiba az adománygyűjtő akció mentése során: ${err?.message || err}`,
      });
      useToastStore.getState().showError('Hiba történt az adománygyűjtő akció mentése során!', {
        details: err?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: { value: CampaignStatus; label: string }[] = [
    { value: 'tervezett', label: '🗓️ Tervezett' },
    { value: 'folyamatban', label: '⚡ Folyamatban' },
    { value: 'lezart', label: '✅ Lezárt' }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto my-4 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold">
              {campaignToEdit ? 'Adománygyűjtő akció szerkesztése' : 'Új Adománygyűjtő akció'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Akció neve <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="pl. Tavaszi Tápgyűjtő Nap - Fressnapf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-500" />
                Kezdő dátum <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-500" />
                Záró dátum (opcionális)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-pink-500" />
                Helyszín <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="pl. Budapest, Fressnapf Belváros"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Státusz
              </label>
              <CustomSelect
                options={statusOptions}
                value={status}
                onChange={(val) => setStatus(val as CampaignStatus)}
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-pink-500" />
              Résztvevők / Önkéntesek (vesszővel elválasztva)
            </label>
            <input
              type="text"
              placeholder="pl. Kovács Anna, Szabó Éva, Tóth Dániel"
              value={participantsStr}
              onChange={(e) => setParticipantsStr(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-pink-500" />
              Megjegyzés
            </label>
            <textarea
              rows={3}
              placeholder="Adománygyűjtő akció részletei, szervezési megjegyzések..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800 z-10 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors min-h-[44px]"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? 'Mentés...' : 'Mentés'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
