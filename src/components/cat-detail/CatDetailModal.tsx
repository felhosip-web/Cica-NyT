import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Cat } from '../CatCard';
import { calculateAge } from '../../utils/age';
import { generateCatPdf } from '../../utils/pdf-export';
import { formatAuditDate } from '../../utils/audit';
import { getTagStyle, getTagIcon } from '../../utils/tagUtils';
import {
  FinancialTransaction,
  FinanceType,
  FinanceCategory,
  PaymentMethod,
  FosterSupply,
  InventoryItem,
  FosterExpense,
  FosterParent,
  InventoryCategory,
} from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { runPatchConnectedElements } from '../../services/patchUpgradeService';
import { CustomSelect } from '../CustomSelect';
import { useCatDetailData } from './useCatDetailData';
import { CatDetailHeader } from './CatDetailHeader';
import { CatDetailProfileTab } from './CatDetailProfileTab';
import { CatDetailMedicalTab } from './CatDetailMedicalTab';
import { CatDetailEventsTab } from './CatDetailEventsTab';
import { CatDetailCostTab } from './CatDetailCostTab';
import { CatDetailConnectedTab } from './CatDetailConnectedTab';
import { CatDetailMedicalLogModal, CatDetailFinanceModal, CatDetailSupplyModal } from './CatDetailModals';


interface CatDetailModalProps {
  catId: string;
  onClose: () => void;
  onEditCat: (cat: Cat) => void;
  onOpenAddEventForCat: (catId: string) => void;
}

export const CatDetailModal: React.FC<CatDetailModalProps> = ({
  catId,
  onClose,
  onEditCat,
  onOpenAddEventForCat,
}) => {
  const { getCurrentUser } = useAppStore();
  const currentUser = getCurrentUser();

  const {
    cat,
    catEvents,
    catFinances,
    catFosterExpenses,
    allFosterSupplies,
    allInventoryItems,
    fosterParents,
  } = useCatDetailData(catId);

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'medical' | 'events' | 'cost' | 'connected'>('profile');

  // Connected elements tab filters & search
  const [connectedFilter, setConnectedFilter] = useState<'all' | 'event' | 'finance' | 'supply'>('all');
  const [connectedSearch, setConnectedSearch] = useState('');
  const [connectedSort, setConnectedSort] = useState<'date_desc' | 'date_asc'>('date_desc');

  // Form states for adding new inline medical log
  const [showAddLogModal, setShowAddLogModal] = useState<false | 'oltas' | 'kezeles' | 'teszt'>(false);
  const [logName, setLogName] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logCost, setLogCost] = useState<number | ''>('');
  const [logNotes, setLogNotes] = useState('');
  const [syncMedicalToFinance, setSyncMedicalToFinance] = useState(true);

  // Form states for adding inline finance transaction directly to this cat
  const [showAddFinanceModal, setShowAddFinanceModal] = useState(false);
  const [finType, setFinType] = useState<FinanceType>('kiadas');
  const [finCategory, setFinCategory] = useState<FinanceCategory>('orvosi');
  const [finAmount, setFinAmount] = useState<number | ''>('');
  const [finTitle, setFinTitle] = useState('');
  const [finDate, setFinDate] = useState(new Date().toISOString().split('T')[0]);
  const [finPartner, setFinPartner] = useState('');
  const [finPaymentMethod, setFinPaymentMethod] = useState<PaymentMethod>('bankkartya');
  const [finInvoiceNumber, setFinInvoiceNumber] = useState('');
  const [isSubmittingFin, setIsSubmittingFin] = useState(false);

  // Form states for adding inline supply/inventory requirement for this cat
  const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
  const [supplyType, setSupplyType] = useState<'tap' | 'alom' | 'gyogyszer' | 'felszereles' | 'egyeb'>('tap');
  const [supplyItem, setSupplyItem] = useState('');
  const [supplyQty, setSupplyQty] = useState<number | ''>(1);
  const [supplyUnit, setSupplyUnit] = useState<'kg' | 'db' | 'tasak' | 'zsak' | 'doboz' | 'pipetta'>('db');
  const [supplyDate, setSupplyDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplyStatus, setSupplyStatus] = useState<'igenyelve' | 'kiadva' | 'teljesitve'>('kiadva');
  const [supplyNotes, setSupplyNotes] = useState('');
  const [supplyDeductInventory, setSupplyDeductInventory] = useState(true);
  const [isSavingSupply, setIsSavingSupply] = useState(false);

  // Delete confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Patch relations state
  const [isPatchingRelations, setIsPatchingRelations] = useState(false);
  const [patchFeedback, setPatchFeedback] = useState<string | null>(null);

  const handleRunConnectedPatch = async () => {
    setIsPatchingRelations(true);
    try {
      const res = await runPatchConnectedElements();
      setPatchFeedback(`✅ Kapcsolatok indexelve (${res.recordsAffected} rekord frissült)`);
      setTimeout(() => setPatchFeedback(null), 4000);
    } catch (e: any) {
      setPatchFeedback(`❌ Hiba: ${e.message}`);
      setTimeout(() => setPatchFeedback(null), 4000);
    } finally {
      setIsPatchingRelations(false);
    }
  };

  const ageStr = cat?.szuletes ? calculateAge(cat.szuletes) : 'Ismeretlen kor';

  // Cost calculation from medical items
  let vaxCost = 0;
  if (Array.isArray(cat?.oltasok)) {
    cat?.oltasok.forEach((i: any) => (vaxCost += Number(i.koltseg) || 0));
  }

  let medCost = 0;
  if (Array.isArray(cat?.kezelesek)) {
    cat?.kezelesek.forEach((i: any) => (medCost += Number(i.koltseg) || 0));
  }

  let testCost = 0;
  if (Array.isArray(cat?.tesztek)) {
    cat?.tesztek.forEach((i: any) => (testCost += Number(i.koltseg) || 0));
  }

  let eventCost = 0;
  catEvents.forEach((ev: any) => (eventCost += Number(ev.cost) || 0));

  let fosterCost = 0;
  catFosterExpenses.forEach((exp: any) => (fosterCost += Number(exp.amount) || 0));

  // Comprehensive Financial Totals (from db.finances ledger)
  let totalFinanceExpense = 0;
  let totalFinanceIncome = 0;

  catFinances.forEach((t) => {
    if (t.status === 'storno') return;
    if (t.type === 'kiadas') {
      totalFinanceExpense += t.amount || 0;
    } else {
      totalFinanceIncome += t.amount || 0;
    }
  });

  const totalMedicalDirect = vaxCost + medCost + testCost + eventCost;
  // Calculate combined expenses (max between medical inline + foster expenses and finance ledger)
  const totalCatCost = Math.max(totalMedicalDirect + fosterCost, totalFinanceExpense);
  const netCatBalance = totalFinanceIncome - totalCatCost;



  const handleAddMedicalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cat || !showAddLogModal) return;

    const numCost = logCost !== '' ? Number(logCost) : 0;
    const entry = {
      nev: logName.trim() || 'Bejegyzés',
      datum: logDate,
      koltseg: numCost,
      megjegyzes: logNotes,
    };

    const typeLabel = showAddLogModal === 'oltas' ? 'Védőoltás' : showAddLogModal === 'kezeles' ? 'Kezelés' : 'Teszt';

    if (showAddLogModal === 'oltas') {
      const updatedOltasok = Array.isArray(cat.oltasok) ? [...cat.oltasok, entry] : [entry];
      await db.cats.update(cat.id, { oltasok: updatedOltasok });
    } else if (showAddLogModal === 'kezeles') {
      const updatedKezelesek = Array.isArray(cat.kezelesek) ? [...cat.kezelesek, entry] : [entry];
      await db.cats.update(cat.id, { kezelesek: updatedKezelesek });
    } else if (showAddLogModal === 'teszt') {
      const updatedTesztek = Array.isArray(cat.tesztek) ? [...cat.tesztek, entry] : [entry];
      await db.cats.update(cat.id, { tesztek: updatedTesztek });
    }

    // Auto sync to finance ledger
    if (syncMedicalToFinance && numCost > 0 && db.finances) {
      await db.finances.add({
        type: 'kiadas',
        category: 'orvosi',
        amount: Math.round(numCost),
        date: logDate,
        title: `${cat.nev} - ${typeLabel}: ${logName.trim()}`,
        catId: cat.id,
        paymentMethod: 'bankkartya',
        status: 'teljesult',
        sourceModule: 'medical_event',
        notes: logNotes ? `Orvosi napló: ${logNotes}` : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
        created_by_name: currentUser?.name || 'Munkatárs',
      });
    }

    setLogName('');
    setLogCost('');
    setLogNotes('');
    setShowAddLogModal(false);
  };

  const handleAddFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cat || !finAmount || Number(finAmount) <= 0 || !finTitle.trim()) {
      alert('Kérjük adjon meg érvényes összeget és megnevezést!');
      return;
    }

    setIsSubmittingFin(true);
    try {
      const now = new Date().toISOString();
      await db.finances.add({
        type: finType,
        category: finCategory,
        amount: Math.round(Number(finAmount)),
        date: finDate,
        title: `${cat.nev} - ${finTitle.trim()}`,
        partnerName: finPartner.trim() || undefined,
        paymentMethod: finPaymentMethod,
        status: 'teljesult',
        invoiceNumber: finInvoiceNumber.trim() || undefined,
        catId: cat.id,
        sourceModule: 'manual',
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
        created_by_name: currentUser?.name || 'Munkatárs',
      });

      setShowAddFinanceModal(false);
      setFinAmount('');
      setFinTitle('');
      setFinPartner('');
      setFinInvoiceNumber('');
    } catch (err) {
      console.error('Hiba a pénzügyi tétel mentésekor:', err);
      alert('Hiba történt a tétel mentése során!');
    } finally {
      setIsSubmittingFin(false);
    }
  };

  const confirmDeleteCat = async () => {
    if (!cat) return;
    setIsDeleting(true);
    try {
      // Delete cat from Dexie
      await db.cats.delete(cat.id);
      // Delete associated events
      await db.events.where('catId').equals(cat.id).delete();
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Hiba a törlés során:', err);
      alert('Hiba történt a törlés során!');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!cat) return;
    try {
      await generateCatPdf(cat);
    } catch (err) {
      alert('PDF generálási hiba!');
    }
  };

  const handleAddSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cat || !supplyItem.trim() || !supplyQty || Number(supplyQty) <= 0) {
      alert('Kérjük adjon meg érvényes megnevezést és mennyiséget!');
      return;
    }

    setIsSavingSupply(true);
    try {
      const fosterIdToUse = cat.fosterId || 'menhely_kozponti';
      let newInventoryId: number | string | undefined = undefined;

      if (supplyDeductInventory && (supplyStatus === 'kiadva' || supplyStatus === 'teljesitve') && db.inventory) {
        let invCat: InventoryCategory = 'egyeb';
        if (supplyType === 'tap') invCat = 'szaraz_tap';
        else if (supplyType === 'alom') invCat = 'alom';
        else if (supplyType === 'gyogyszer') invCat = 'gyogyszer';
        else if (supplyType === 'felszereles') invCat = 'felszereles';

        newInventoryId = await db.inventory.add({
          direction: 'kimeno',
          itemType: invCat,
          brandOrName: supplyItem.trim(),
          quantity: Number(supplyQty),
          unit: (supplyUnit === 'tasak' || supplyUnit === 'pipetta' ? 'db' : supplyUnit) as any,
          date: supplyDate,
          sourceOrRecipient: `${cat.nev} (${cat.sorszam ? '#' + cat.sorszam : cat.id.slice(0, 4)})`,
          destination: cat.fosterId ? 'Ideiglenes befogadó' : 'Menhelyi gondozás',
          catId: cat.id,
          notes: supplyNotes ? `Cica ellátmány: ${supplyNotes}` : `Közvetlen ellátmány kiadás: ${cat.nev}`,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          created_by_name: currentUser?.name || 'Munkatárs',
        });
      }

      if (db.fosterSupplies) {
        await db.fosterSupplies.add({
          fosterId: fosterIdToUse,
          catId: cat.id,
          type: supplyType,
          item: supplyItem.trim(),
          quantity: Number(supplyQty),
          unit: (supplyUnit === 'pipetta' ? 'db' : supplyUnit) as any,
          date: supplyDate,
          status: supplyStatus,
          notes: supplyNotes.trim() || undefined,
          inventoryItemId: newInventoryId,
        });
      }

      setShowAddSupplyModal(false);
      setSupplyItem('');
      setSupplyQty(1);
      setSupplyNotes('');
    } catch (err) {
      console.error('Hiba a készletigény mentése során:', err);
      alert('Hiba történt a készletigény rögzítésekor!');
    } finally {
      setIsSavingSupply(false);
    }
  };

  const getSupplyPresetItems = () => {
    switch (supplyType) {
      case 'tap':
        return ['Junior kölyöktáp', 'Felnőtt sterilizált táp', 'Nedves konzerv / Alutasak', 'Gastrointestinal diétás táp', 'Renal vesevédő táp'];
      case 'alom':
        return ['Csomósodó bentonit alom', 'Szilikát alom', 'Fa / Növényi pellet alom'];
      case 'gyogyszer':
        return ['Bolha & Kullancs spot-on', 'Féregtelenítő tabletta / paszta', 'Szemcsepp', 'Fültisztító oldat', 'Probiotikum', 'Antibiotikum'];
      case 'felszereles':
        return ['Műanyag macskaszállító box', 'Alomtálca lapáttal', 'Karanténketrec', 'Itató- és etetőtál', 'Fekhely / Párna'];
      default:
        return ['Virucid fertőtlenítőszer', 'Egészségügyi gumikesztyű', 'Jutalomfalat', 'Kaparófa'];
    }
  };

  // 1. Related foster supplies for this cat
  const relatedFosterSupplies = useMemo(() => {
    if (!cat) return [];
    const catNameLower = (cat.nev || '').toLowerCase();
    const sorszamStr = cat.sorszam ? String(cat.sorszam) : '';
    return allFosterSupplies.filter((s) => {
      if (s.catId === cat.id) return true;
      if (cat.fosterId && s.fosterId === cat.fosterId) return true;
      if (s.notes) {
        const n = s.notes.toLowerCase();
        if (catNameLower && n.includes(catNameLower)) return true;
        if (sorszamStr && n.includes(sorszamStr)) return true;
      }
      return false;
    });
  }, [allFosterSupplies, cat?.id, cat?.nev, cat?.sorszam, cat?.fosterId]);

  // 2. Related inventory items for this cat
  const relatedInventoryItems = useMemo(() => {
    if (!cat) return [];
    const catNameLower = (cat.nev || '').toLowerCase();
    const sorszamStr = cat.sorszam ? String(cat.sorszam) : '';
    return allInventoryItems.filter((item) => {
      if (item.catId === cat.id) return true;
      const dest = (item.destination || '').toLowerCase();
      const src = (item.sourceOrRecipient || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      if (catNameLower && (dest.includes(catNameLower) || src.includes(catNameLower) || notes.includes(catNameLower))) return true;
      if (sorszamStr && (dest.includes(sorszamStr) || src.includes(sorszamStr) || notes.includes(sorszamStr))) return true;
      return false;
    });
  }, [allInventoryItems, cat?.id, cat?.nev, cat?.sorszam]);

  // 3. Consolidated Unified Timeline Feed
  const connectedTimelineItems = useMemo(() => {
    const list: {
      id: string;
      sourceType: 'event' | 'finance' | 'foster_expense' | 'supply' | 'inventory';
      date: string;
      title: string;
      subtitle?: string;
      badge: { label: string; color: string; icon: string };
      statusBadge?: { label: string; color: string };
      amountOrQty?: { text: string; isPositive?: boolean; isExpense?: boolean; isNeutral?: boolean };
      details?: { label: string; value: string }[];
      notes?: string;
      rawItem: any;
    }[] = [];

    // Add Events
    catEvents.forEach((ev: any) => {
      const isDone = ev.status === 'done';
      const isExpired = ev.status === 'expired';
      let subType = 'Általános esemény';
      if (ev.type === 'vet') subType = '🩺 Állatorvosi vizsgálat';
      else if (ev.type === 'treatment') subType = '💉 Kezelés';
      else if (ev.type === 'chip') subType = '🏷️ Chip beültetés';
      else if (ev.type === 'spay') subType = '✂️ Ivartalanítás';
      else if (ev.type === 'foster') subType = '🏠 Ideiglenes befogadás';
      else if (ev.type === 'vaccine') subType = '💉 Védőoltás';

      const details: { label: string; value: string }[] = [];
      if (ev.location) details.push({ label: 'Helyszín', value: ev.location });
      if (ev.performedBy) details.push({ label: 'Felelős / Orvos', value: ev.performedBy });

      list.push({
        id: `ev_${ev.id}`,
        sourceType: 'event',
        date: ev.date || (ev.createdAt ? ev.createdAt.split('T')[0] : ''),
        title: ev.title || 'Névtelen esemény',
        subtitle: subType,
        badge: { label: 'Esemény', color: 'bg-pink-100 text-pink-900 border-pink-200', icon: '📅' },
        statusBadge: {
          label: isDone ? 'Teljesítve' : isExpired ? 'Lejárt' : 'Esedékes',
          color: isDone ? 'bg-emerald-100 text-emerald-800' : isExpired ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800',
        },
        amountOrQty: ev.cost ? { text: `${Number(ev.cost).toLocaleString('hu-HU')} Ft`, isExpense: true } : undefined,
        details,
        notes: ev.description || ev.notes,
        rawItem: ev,
      });
    });

    // Add Finances
    catFinances.forEach((fin) => {
      const isBevetel = fin.type === 'bevetel';
      const isTeljesult = fin.status === 'teljesult';
      const details: { label: string; value: string }[] = [];
      if (fin.partnerName) details.push({ label: 'Partner', value: fin.partnerName });
      if (fin.paymentMethod) details.push({ label: 'Fizetés', value: fin.paymentMethod });
      if (fin.invoiceNumber) details.push({ label: 'Bizonylat', value: '#' + fin.invoiceNumber });

      list.push({
        id: `fin_${fin.id}`,
        sourceType: 'finance',
        date: fin.date,
        title: fin.title,
        subtitle: `Főkönyv: ${fin.category || 'Pénzügyi tétel'}`,
        badge: { label: 'Pénzügy', color: 'bg-emerald-100 text-emerald-900 border-emerald-200', icon: '💰' },
        statusBadge: {
          label: isTeljesult ? 'Teljesült' : fin.status === 'storno' ? 'Sztornó' : 'Függőben',
          color: isTeljesult ? 'bg-emerald-100 text-emerald-800' : fin.status === 'storno' ? 'bg-gray-100 text-gray-800' : 'bg-amber-100 text-amber-800',
        },
        amountOrQty: {
          text: `${isBevetel ? '+' : '-'}${Number(fin.amount).toLocaleString('hu-HU')} Ft`,
          isPositive: isBevetel,
          isExpense: !isBevetel,
        },
        details,
        notes: fin.notes,
        rawItem: fin,
      });
    });

    // Add Foster Expenses
    catFosterExpenses.forEach((fe) => {
      const details: { label: string; value: string }[] = [];
      if (fe.invoiceNo) details.push({ label: 'Számlaszám', value: fe.invoiceNo });

      list.push({
        id: `fexp_${fe.id}`,
        sourceType: 'foster_expense',
        date: fe.date,
        title: fe.description || 'Befogadói kiadás',
        subtitle: `Befogadói költség: ${fe.category}`,
        badge: { label: 'Befogadói Kiadás', color: 'bg-orange-100 text-orange-900 border-orange-200', icon: '💸' },
        amountOrQty: {
          text: `-${Number(fe.amount).toLocaleString('hu-HU')} Ft`,
          isExpense: true,
        },
        details,
        rawItem: fe,
      });
    });

    // Add Supplies
    relatedFosterSupplies.forEach((sup) => {
      let typeName = 'Ellátmány';
      if (sup.type === 'tap') typeName = '🍲 Táp';
      else if (sup.type === 'alom') typeName = '📦 Alom';
      else if (sup.type === 'gyogyszer') typeName = '💊 Gyógyszer';
      else if (sup.type === 'felszereles') typeName = '🧺 Felszerelés';

      list.push({
        id: `sup_${sup.id}`,
        sourceType: 'supply',
        date: sup.date,
        title: sup.item,
        subtitle: `${typeName} igény / kiadás`,
        badge: { label: 'Készletigény', color: 'bg-teal-100 text-teal-900 border-teal-200', icon: '📦' },
        statusBadge: {
          label: sup.status === 'teljesitve' ? 'Teljesítve' : sup.status === 'kiadva' ? 'Kiadva' : 'Igényelve',
          color: sup.status === 'teljesitve' ? 'bg-emerald-100 text-emerald-800' : sup.status === 'kiadva' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
        },
        amountOrQty: {
          text: `${sup.quantity} ${sup.unit}`,
          isNeutral: true,
        },
        notes: sup.notes,
        rawItem: sup,
      });
    });

    // Add Direct Inventory
    relatedInventoryItems.forEach((inv) => {
      if (inv.fosterSupplyId && list.some((x) => x.id === `sup_${inv.fosterSupplyId}`)) return;

      const isKimeno = inv.direction === 'kimeno';
      const details: { label: string; value: string }[] = [];
      if (inv.destination) details.push({ label: 'Célállomás', value: inv.destination });
      if (inv.sourceOrRecipient) details.push({ label: isKimeno ? 'Címzett' : 'Forrás', value: inv.sourceOrRecipient });
      if (inv.batchNumber) details.push({ label: 'Sarzs', value: inv.batchNumber });
      if (inv.expiryDate) details.push({ label: 'Szavatosság', value: inv.expiryDate });

      list.push({
        id: `inv_${inv.id}`,
        sourceType: 'inventory',
        date: inv.date,
        title: inv.brandOrName || 'Központi Raktárkészlet tétel',
        subtitle: `Raktárkészlet (${isKimeno ? '📤 Kiadás' : '📥 Bevételezés'}): ${inv.itemType}`,
        badge: { label: 'Raktár', color: 'bg-indigo-100 text-indigo-900 border-indigo-200', icon: '🏷️' },
        amountOrQty: {
          text: `${isKimeno ? '-' : '+'}${inv.quantity} ${inv.unit}`,
          isExpense: isKimeno,
          isPositive: !isKimeno,
        },
        details,
        notes: inv.notes,
        rawItem: inv,
      });
    });

    return list;
  }, [catEvents, catFinances, catFosterExpenses, relatedFosterSupplies, relatedInventoryItems]);

  // Counts for filters
  const eventsCount = useMemo(() => connectedTimelineItems.filter((i) => i.sourceType === 'event').length, [connectedTimelineItems]);
  const financesCount = useMemo(() => connectedTimelineItems.filter((i) => i.sourceType === 'finance' || i.sourceType === 'foster_expense').length, [connectedTimelineItems]);
  const suppliesCount = useMemo(() => connectedTimelineItems.filter((i) => i.sourceType === 'supply' || i.sourceType === 'inventory').length, [connectedTimelineItems]);

  // Filtered and Sorted Connected Items
  const filteredConnectedItems = useMemo(() => {
    return connectedTimelineItems
      .filter((item) => {
        if (connectedFilter === 'event' && item.sourceType !== 'event') return false;
        if (connectedFilter === 'finance' && item.sourceType !== 'finance' && item.sourceType !== 'foster_expense') return false;
        if (connectedFilter === 'supply' && item.sourceType !== 'supply' && item.sourceType !== 'inventory') return false;

        if (connectedSearch.trim()) {
          const q = connectedSearch.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchSub = (item.subtitle || '').toLowerCase().includes(q);
          const matchNotes = (item.notes || '').toLowerCase().includes(q);
          const matchDetails = item.details?.some((d) => d.value.toLowerCase().includes(q));
          return matchTitle || matchSub || matchNotes || matchDetails;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return connectedSort === 'date_asc' ? timeA - timeB : timeB - timeA;
      });
  }, [connectedTimelineItems, connectedFilter, connectedSearch, connectedSort]);

  if (!cat) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <CatDetailHeader
          cat={cat}
          onClose={onClose}
          onEditCat={onEditCat}
          onDeleteRequest={() => setShowDeleteConfirm(true)}
          activeSubTab={activeSubTab}
          setActiveSubTab={setActiveSubTab}
          eventsCount={catEvents.length}
          financesCount={catFinances.length}
          suppliesCount={catFosterSupplies.length}
        />

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-medium">
          {activeSubTab === 'profile' && (
            <CatDetailProfileTab
              cat={cat}
              onEditCat={onEditCat}
              vaxCost={vaxCost}
              medCost={medCost}
              testCost={testCost}
              eventCost={eventCost}
              fosterCost={fosterCost}
              totalCatCost={totalCatCost}
              totalFinanceIncome={totalFinanceIncome}
              totalMedicalDirect={totalMedicalDirect}
              netCatBalance={netCatBalance}
              setFinType={setFinType}
              setFinCategory={setFinCategory}
              setFinAmount={setFinAmount}
              setFinTitle={setFinTitle}
              setShowAddFinanceModal={setShowAddFinanceModal}
              setShowAddLogModal={setShowAddLogModal}
              setActiveSubTab={setActiveSubTab}
            />
          )}

          {activeSubTab === 'medical' && (
            <CatDetailMedicalTab
              cat={cat}
              setShowAddLogModal={setShowAddLogModal}
              vaxCost={vaxCost}
              medCost={medCost}
              testCost={testCost}
            />
          )}

          {activeSubTab === 'events' && (
            <CatDetailEventsTab
              cat={cat}
              catEvents={catEvents}
              onOpenAddEventForCat={onOpenAddEventForCat}
              eventCost={eventCost}
            />
          )}

          {activeSubTab === 'cost' && (
            <CatDetailCostTab
              cat={cat}
              totalCatCost={totalCatCost}
              catFinances={catFinances}
              totalFinanceExpense={totalFinanceExpense}
              totalFinanceIncome={totalFinanceIncome}
              netCatBalance={netCatBalance}
              vaxCost={vaxCost}
              medCost={medCost}
              testCost={testCost}
              eventCost={eventCost}
              fosterCost={fosterCost}
              setShowAddFinanceModal={setShowAddFinanceModal}
            />
          )}

          {/* Kapcsolódó Elemek Consolidated Overview Tab */}
          {activeSubTab === 'connected' && (
            <CatDetailConnectedTab
              cat={cat}
              catEvents={catEvents}
              catFinances={catFinances}
              catFosterSupplies={allFosterSupplies.filter(s => s.catId === cat.id)}
              connectedFilter={connectedFilter}
              setConnectedFilter={setConnectedFilter}
              connectedSearch={connectedSearch}
              setConnectedSearch={setConnectedSearch}
              connectedSort={connectedSort}
              setConnectedSort={setConnectedSort}
              isPatchingRelations={isPatchingRelations}
              handleRunConnectedPatch={handleRunConnectedPatch}
              patchFeedback={patchFeedback}
              setShowAddSupplyModal={setShowAddSupplyModal}
              setShowAddFinanceModal={setShowAddFinanceModal}
              setPatchFeedback={setPatchFeedback}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🗑️</span>
            <span>Törlés</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer"
            >
              📄 PDF Export
            </button>
            <button
              onClick={() => {
                onClose();
                onEditCat(cat as Cat);
              }}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              ✏️ Szerkesztés
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Cat Deletion */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4 animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto font-black shadow-inner">
              ⚠️
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                Biztosan törölni szeretnéd?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                A(z) <span className="font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{cat.nev}</span> nevű cica minden adata, beleértve az egészségügyi naplót, a kapott oltásokat és a hozzá kapcsolódó eseményeket, <span className="font-bold underline text-red-700">véglegesen törlődni fog</span> a nyilvántartásból!
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 font-semibold">
              <p className="flex items-center justify-center gap-1.5 font-bold">
                <span>⚡</span>
                <span>Ez a művelet nem vonható vissza!</span>
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition text-xs cursor-pointer border border-gray-300"
              >
                Mégse (Megtartom)
              </button>
              <button
                type="button"
                onClick={confirmDeleteCat}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>Törlés...</span>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Végleges törlés</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Medical Entry Modal */}
      <CatDetailMedicalLogModal
          showAddLogModal={showAddLogModal}
          setShowAddLogModal={setShowAddLogModal}
          logName={logName}
          setLogName={setLogName}
          logDate={logDate}
          setLogDate={setLogDate}
          logCost={logCost}
          setLogCost={setLogCost}
          logNotes={logNotes}
          setLogNotes={setLogNotes}
          syncMedicalToFinance={syncMedicalToFinance}
          setSyncMedicalToFinance={setSyncMedicalToFinance}
          handleAddMedicalLog={handleAddMedicalLog}
        />

      {/* Direct Finance Transaction Modal for this Cat */}
      <CatDetailFinanceModal
          cat={cat}
          showAddFinanceModal={showAddFinanceModal}
          setShowAddFinanceModal={setShowAddFinanceModal}
          finType={finType}
          setFinType={setFinType}
          finCategory={finCategory}
          setFinCategory={setFinCategory}
          finAmount={finAmount}
          setFinAmount={setFinAmount}
          finTitle={finTitle}
          setFinTitle={setFinTitle}
          finDate={finDate}
          setFinDate={setFinDate}
          finPartner={finPartner}
          setFinPartner={setFinPartner}
          finPaymentMethod={finPaymentMethod}
          setFinPaymentMethod={setFinPaymentMethod}
          finInvoiceNumber={finInvoiceNumber}
          setFinInvoiceNumber={setFinInvoiceNumber}
          isSubmittingFin={isSubmittingFin}
          handleAddFinance={handleAddFinance}
        />

      {/* Inline Supply / Need Modal for this Cat */}
      <CatDetailSupplyModal
          cat={cat}
          showAddSupplyModal={showAddSupplyModal}
          setShowAddSupplyModal={setShowAddSupplyModal}
          supplyType={supplyType}
          setSupplyType={setSupplyType}
          supplyItem={supplyItem}
          setSupplyItem={setSupplyItem}
          supplyQty={supplyQty}
          setSupplyQty={setSupplyQty}
          supplyUnit={supplyUnit}
          setSupplyUnit={setSupplyUnit}
          supplyDate={supplyDate}
          setSupplyDate={setSupplyDate}
          supplyStatus={supplyStatus}
          setSupplyStatus={setSupplyStatus}
          supplyNotes={supplyNotes}
          setSupplyNotes={setSupplyNotes}
          supplyDeductInventory={supplyDeductInventory}
          setSupplyDeductInventory={setSupplyDeductInventory}
          isSavingSupply={isSavingSupply}
          allInventoryItems={allInventoryItems}
          handleAddSupply={handleAddSupply}
        />
    </div>
  );
};
