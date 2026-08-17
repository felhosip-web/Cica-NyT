import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Cat } from './CatCard';
import { calculateAge } from '../utils/age';
import { generateCatPdf } from '../utils/pdf-export';
import { formatAuditDate } from '../utils/audit';
import { getTagStyle, getTagIcon } from '../utils/tagUtils';
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
} from '../types';
import { useAppStore } from '../store/useAppStore';
import { runPatchConnectedElements } from '../services/patchUpgradeService';
import { CustomSelect } from './CustomSelect';

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

  const cat = useLiveQuery(() => db.cats.get(catId), [catId]);
  const catEvents = useLiveQuery(() => db.events.where('catId').equals(catId).toArray(), [catId]) || [];
  const catFinances = (useLiveQuery(() => db.finances ? db.finances.where('catId').equals(catId).toArray() : [], [catId]) || []) as FinancialTransaction[];
  const catFosterExpenses = (useLiveQuery(() => db.fosterExpenses ? db.fosterExpenses.where('catId').equals(catId).toArray() : [], [catId]) || []) as FosterExpense[];
  const allFosterSupplies = (useLiveQuery(() => db.fosterSupplies ? db.fosterSupplies.toArray() : [], []) || []) as FosterSupply[];
  const allInventoryItems = (useLiveQuery(() => db.inventory ? db.inventory.toArray() : [], []) || []) as InventoryItem[];
  const fosterParents = (useLiveQuery(() => db.fosterParents ? db.fosterParents.toArray() : [], []) || []) as FosterParent[];

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

  const handleAddDirectFinance = async (e: React.FormEvent) => {
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

  const handleAddCatSupply = async (e: React.FormEvent) => {
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
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-pink-500 to-orange-400 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl font-black">
              🐾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-md font-bold">
                  #{cat.sorszam || cat.id.slice(0, 4)}
                </span>
                <h2 className="text-xl font-black">{cat.nev}</h2>
              </div>
              <p className="text-xs text-white/90 font-medium">
                {cat.ivar === 'bak' ? '♂️ Kandúr (Bak)' : '♀️ Nőstény'} • {ageStr} • {cat.szin || 'Szín nincs'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white font-bold text-xl">
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-600 px-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'profile' ? 'border-pink-600 text-pink-600 bg-white' : 'hover:text-gray-900'
            }`}
          >
            📘 Adatlap & Kiskönyv
          </button>
          <button
            onClick={() => setActiveSubTab('medical')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'medical' ? 'border-pink-600 text-pink-600 bg-white' : 'hover:text-gray-900'
            }`}
          >
            💉 Oltások & Kezelések
          </button>
          <button
            onClick={() => setActiveSubTab('events')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'events' ? 'border-pink-600 text-pink-600 bg-white' : 'hover:text-gray-900'
            }`}
          >
            📅 Események ({catEvents.length})
          </button>
          <button
            onClick={() => setActiveSubTab('cost')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeSubTab === 'cost' ? 'border-pink-600 text-pink-600 bg-white font-black' : 'hover:text-gray-900'
            }`}
          >
            💰 Költségösszesítő
          </button>
          <button
            onClick={() => setActiveSubTab('connected')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'connected' ? 'border-pink-600 text-pink-600 bg-white font-black' : 'hover:text-gray-900'
            }`}
          >
            <span>🔗 Kapcsolódó Elemek</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'connected' ? 'bg-pink-100 text-pink-700' : 'bg-gray-200 text-gray-700'
            }`}>
              {connectedTimelineItems.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-medium">
          {activeSubTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Gondozási Státusz</span>
                  <p className="font-extrabold text-sm text-gray-900">{cat.status || 'Gondozásban'}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Bekerülés Típusa</span>
                  <p className="font-extrabold text-sm text-gray-900">
                    {cat.intakeType === 'befogott'
                      ? 'Befogott kóbor'
                      : cat.intakeType === 'leadott'
                      ? 'Gazda által leadott'
                      : cat.intakeType === 'elkobzott'
                      ? 'Elkobzott állat'
                      : cat.intakeType === 'sajat'
                      ? 'Saját mentés'
                      : (cat.intakeType || 'Saját gondozás')}
                  </p>
                </div>
              </div>

              {/* 💰 Cica Összköltség Kimutatás (Total Cost Summary & Breakdown Widget) */}
              <div className="p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-500/30 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-900/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-200">
                      Cica Összköltség Kimutatás & Mérleg
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('cost')}
                    className="text-[10px] font-bold text-pink-300 hover:text-pink-100 bg-pink-950/60 hover:bg-pink-900 border border-pink-700/50 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Részletes Költségkarton</span>
                    <span>➔</span>
                  </button>
                </div>

                {/* 3 Main KPIs */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-900/50">
                    <span className="text-[9px] uppercase font-bold text-rose-300 block">💸 Összes Kiadás</span>
                    <span className="text-xs sm:text-sm font-black text-rose-100">
                      {totalCatCost.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-900/50">
                    <span className="text-[9px] uppercase font-bold text-emerald-300 block">💖 Célzott Bevételek</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-100">
                      {totalFinanceIncome.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    netCatBalance >= 0
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200'
                      : 'bg-amber-950/60 border-amber-700/60 text-amber-200'
                  }`}>
                    <span className="text-[9px] uppercase font-bold block">⚖️ Nettó Egyenleg</span>
                    <span className="text-xs sm:text-sm font-black">
                      {netCatBalance >= 0 ? `+${netCatBalance.toLocaleString('hu-HU')}` : netCatBalance.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                </div>

                {/* Cost Distribution Progress Bar (if totalCatCost > 0) */}
                {totalCatCost > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-300 font-sans font-medium">
                      <span>Költségmegoszlás aránya:</span>
                      <span className="font-mono text-indigo-300">
                        Orvosi: {Math.round((totalMedicalDirect / (totalCatCost || 1)) * 100)}% • Egyéb/Ellátás: {100 - Math.round((totalMedicalDirect / (totalCatCost || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700">
                      {vaxCost > 0 && (
                        <div
                          style={{ width: `${(vaxCost / totalCatCost) * 100}%` }}
                          className="bg-purple-500 h-full"
                          title={`Oltások: ${vaxCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                      {medCost > 0 && (
                        <div
                          style={{ width: `${(medCost / totalCatCost) * 100}%` }}
                          className="bg-teal-500 h-full"
                          title={`Kezelések: ${medCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                      {testCost > 0 && (
                        <div
                          style={{ width: `${(testCost / totalCatCost) * 100}%` }}
                          className="bg-amber-500 h-full"
                          title={`Tesztek: ${testCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                      {eventCost > 0 && (
                        <div
                          style={{ width: `${(eventCost / totalCatCost) * 100}%` }}
                          className="bg-sky-500 h-full"
                          title={`Események: ${eventCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                      {fosterCost > 0 && (
                        <div
                          style={{ width: `${(fosterCost / totalCatCost) * 100}%` }}
                          className="bg-rose-500 h-full"
                          title={`Befogadói ellátás: ${fosterCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Subcategory Pill Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono pt-0.5">
                  <div className="bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex justify-between items-center text-purple-200">
                    <span>💉 Oltások:</span>
                    <span className="font-bold">{vaxCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                  <div className="bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex justify-between items-center text-teal-200">
                    <span>🩺 Kezelések:</span>
                    <span className="font-bold">{medCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                  <div className="bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex justify-between items-center text-amber-200">
                    <span>🔬 Tesztek:</span>
                    <span className="font-bold">{testCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                  <div className="bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex justify-between items-center text-sky-200">
                    <span>📅 Események:</span>
                    <span className="font-bold">{eventCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                </div>

                {/* Quick Add Expense Action */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFinType('kiadas');
                      setFinCategory('orvosi');
                      setFinAmount('');
                      setFinTitle('');
                      setShowAddFinanceModal(true);
                    }}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg text-[11px] transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>➕ Pénzügyi Tétel Rögzítése</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddLogModal('kezeles')}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                  >
                    <span>🩺 + Kezelés Költséggel</span>
                  </button>
                </div>
              </div>

              {/* 🏷️ Egyedi Címkék (Tags / Állapotok) */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider">🏷️ Egyedi Címkék & Állapotok</span>
                  <button
                    onClick={() => onEditCat(cat as Cat)}
                    className="text-[10px] text-purple-700 hover:text-purple-900 font-bold bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded transition"
                  >
                    ✏️ Címkék Módosítása
                  </button>
                </div>
                {cat.tags && cat.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {cat.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1 ${getTagStyle(tag)}`}
                      >
                        <span>{getTagIcon(tag)}</span>
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-purple-800 italic">Nincsenek egyedi címkék hozzárendelve.</p>
                )}
              </div>

              {/* Microchip */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-700">🏷️ Mikrochip Adatok</span>
                <p className="font-extrabold text-sm text-emerald-900">
                  {cat.chipNumber ? `Chip No: ${cat.chipNumber}` : '⚠️ Nincs mikrochip behelyezve'}
                </p>
                {cat.chipDate && <p className="text-[11px] text-emerald-700">Behelyezés ideje: {cat.chipDate}</p>}
                {(cat as any).chipLocation && <p className="text-[11px] text-emerald-700">Rendelő / hely: {(cat as any).chipLocation}</p>}
              </div>

              {/* Spay / Neuter */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-700">✂️ Ivartalanítás</span>
                <p className="font-extrabold text-sm text-teal-900">
                  {cat.isSpayed ? '✅ Ivartalanítva' : '❌ Még nincs ivartalanítva'}
                </p>
                {(cat as any).spayedDate && <p className="text-[11px] text-teal-700">Dátum: {(cat as any).spayedDate}</p>}
                {(cat as any).spayedLocation && <p className="text-[11px] text-teal-700">Rendelő: {(cat as any).spayedLocation}</p>}
              </div>

              {/* Kiskönyv */}
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-pink-700">📘 Oltási Kiskönyv</span>
                  <p className="font-bold text-gray-900">
                    {cat.hasKiskonyv
                      ? `Van oltási kiskönyve${(cat as any).kiskonyvSzam ? ` (#${(cat as any).kiskonyvSzam})` : ''}`
                      : 'Nincs oltási kiskönyv'}
                  </p>
                  {(cat as any).kiskonyvDate && (
                    <p className="text-[11px] text-pink-700">Kiállítás ideje: {(cat as any).kiskonyvDate}</p>
                  )}
                </div>
                <span className="text-xl">{cat.hasKiskonyv ? '📘' : '📑'}</span>
              </div>

              {/* Audit Info Card */}
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-2 col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">
                    <span>🛡️</span>
                    <span>Audit & Bejegyzési Információk</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">ID: {cat.id}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Létrehozta</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>👤</span>
                      <span>{(cat as any).created_by_name || 'Rendszer'}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {formatAuditDate((cat as any).created_at || (cat as any).created)}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Utoljára Módosította</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>✏️</span>
                      <span>{(cat as any).updated_by_name || (cat as any).created_by_name || 'Rendszer'}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {formatAuditDate((cat as any).updated_at || (cat as any).updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'medical' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-gray-800">💉 Egészségügyi Napló</h4>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowAddLogModal('oltas')}
                    className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-lg text-[11px]"
                  >
                    + Oltás
                  </button>
                  <button
                    onClick={() => setShowAddLogModal('kezeles')}
                    className="px-2.5 py-1 bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold rounded-lg text-[11px]"
                  >
                    + Kezelés
                  </button>
                  <button
                    onClick={() => setShowAddLogModal('teszt')}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px]"
                  >
                    + Teszt
                  </button>
                </div>
              </div>

              {/* Vaccinations */}
              <div>
                <h5 className="font-bold text-purple-900 text-xs mb-1.5 flex items-center gap-1">
                  💉 Kapott Védőoltások ({cat.oltasok?.length || 0})
                </h5>
                {!cat.oltasok || cat.oltasok.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">Nincs még rögzített védőoltás.</p>
                ) : (
                  <div className="space-y-1">
                    {cat.oltasok.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-purple-950">{item.nev}</span>
                          <span className="text-[10px] text-purple-700 ml-2">({item.datum})</span>
                        </div>
                        {item.koltseg ? (
                          <span className="font-mono font-bold text-purple-800">{item.koltseg} Ft</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Treatments */}
              <div>
                <h5 className="font-bold text-teal-900 text-xs mb-1.5 flex items-center gap-1">
                  🩺 Orvosi Kezelések ({cat.kezelesek?.length || 0})
                </h5>
                {!cat.kezelesek || cat.kezelesek.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">Nincs még rögzített kezelés.</p>
                ) : (
                  <div className="space-y-1">
                    {cat.kezelesek.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="p-2 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-teal-950">{item.nev}</span>
                          <span className="text-[10px] text-teal-700 ml-2">({item.datum})</span>
                        </div>
                        {item.koltseg ? (
                          <span className="font-mono font-bold text-teal-800">{item.koltseg} Ft</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'events' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-gray-800">📅 Események & Emlékeztetők</h4>
                <button
                  onClick={() => onOpenAddEventForCat(cat.id)}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  ➕ Új Esemény
                </button>
              </div>

              {catEvents.length === 0 ? (
                <p className="text-gray-400 italic text-xs py-4 text-center">Nincs rögzített esemény a cicához.</p>
              ) : (
                <div className="space-y-2">
                  {catEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{ev.title}</p>
                        <p className="text-[11px] text-gray-500">{ev.date}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800">
                        {ev.status === 'done' ? '✅ Teljesítve' : ev.status === 'expired' ? '⚠️ Lejárt' : '⏳ Esedékes'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'cost' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-800">💰 Integrált Költség- és Pénzügyi Karton</h4>
                  <p className="text-[11px] text-gray-500">Kezelések, ellátási költségek és célzott támogatások mérlege</p>
                </div>
                <button
                  onClick={() => {
                    setFinType('kiadas');
                    setFinCategory('orvosi');
                    setFinAmount('');
                    setFinTitle('');
                    setShowAddFinanceModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <span>➕ Új Pénzügyi Tétel</span>
                </button>
              </div>

              {/* Financial Balance Summary Card */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-red-700 block">💸 Összes Kiadás</span>
                  <span className="text-sm sm:text-base font-black font-mono text-red-900">
                    {totalCatCost.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-black text-emerald-700 block">💖 Célzott Bevételek</span>
                  <span className="text-sm sm:text-base font-black font-mono text-emerald-900">
                    {totalFinanceIncome.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                <div className={`p-3 rounded-2xl border ${
                  netCatBalance >= 0
                    ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-[10px] uppercase font-black block">⚖️ Nettó Mérleg</span>
                  <span className="text-sm sm:text-base font-black font-mono">
                    {netCatBalance >= 0 ? `+${netCatBalance.toLocaleString('hu-HU')}` : netCatBalance.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
              </div>

              {/* Breakdown of internal medical and foster logs */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5 text-xs">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  Egészségügyi és Ellátási Költségek Részletezése
                </span>
                <div className="flex justify-between text-gray-700">
                  <span>💉 Védőoltások:</span>
                  <span className="font-bold font-mono">{vaxCost.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>🩺 Kezelések és műtétek:</span>
                  <span className="font-bold font-mono">{medCost.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>🔬 Szűrések & Tesztek:</span>
                  <span className="font-bold font-mono">{testCost.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>📅 Események & Vizsgálatok:</span>
                  <span className="font-bold font-mono">{eventCost.toLocaleString('hu-HU')} Ft</span>
                </div>
                {fosterCost > 0 && (
                  <div className="flex justify-between text-gray-700 border-t border-gray-200 pt-1">
                    <span>📦 Befogadói közvetlen költségek:</span>
                    <span className="font-bold font-mono text-indigo-700">{fosterCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                )}
              </div>

              {/* Linked Financial Transactions List */}
              <div className="space-y-2">
                <h5 className="font-bold text-gray-800 text-xs flex items-center justify-between">
                  <span>📜 Csatolt Pénzügyi Tranzakciók ({catFinances.length})</span>
                  <span className="text-[10px] text-gray-500 font-normal">Főkönyvi tételek</span>
                </h5>

                {catFinances.length === 0 ? (
                  <p className="text-gray-400 italic text-xs py-3 text-center bg-gray-50 rounded-xl border border-gray-100">
                    Nincs még a főkönyvbe kapcsolt közvetlen pénzügyi tétel.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {catFinances.map((t) => (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          t.type === 'bevetel'
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-rose-50/70 border-rose-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900">{t.title}</span>
                            {t.invoiceNumber && (
                              <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border border-gray-200">
                                #{t.invoiceNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span>📅 {t.date}</span>
                            {t.partnerName && <span>• {t.partnerName}</span>}
                            <span>• {t.paymentMethod}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-mono font-black text-xs ${
                            t.type === 'bevetel' ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {t.type === 'bevetel' ? '+' : '-'}{t.amount.toLocaleString('hu-HU')} Ft
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kapcsolódó Elemek Consolidated Overview Tab */}
          {activeSubTab === 'connected' && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-pink-700">📅 Események</span>
                    <span className="text-xs font-black text-pink-900 font-mono">{eventsCount} db</span>
                  </div>
                  <p className="text-[11px] text-pink-950 font-medium leading-tight">
                    Orvosi vizsgálatok, kezelések, oltások és gondozási feljegyzések
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">💰 Pénzügyi Tételek</span>
                    <span className="text-xs font-black text-emerald-900 font-mono">{financesCount} db</span>
                  </div>
                  <p className="text-[11px] text-emerald-950 font-medium leading-tight">
                    Kiadások: <span className="font-bold text-rose-700 font-mono">{totalCatCost.toLocaleString('hu-HU')} Ft</span> • Bevételek: <span className="font-bold text-emerald-700 font-mono">{totalFinanceIncome.toLocaleString('hu-HU')} Ft</span>
                  </p>
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-teal-700">📦 Készlet & Ellátmány</span>
                    <span className="text-xs font-black text-teal-900 font-mono">{suppliesCount} db</span>
                  </div>
                  <p className="text-[11px] text-teal-950 font-medium leading-tight">
                    Tápok, alom, gyógyszerek, felszerelések és raktári kiadások
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Gyors Műveletek a cicához:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenAddEventForCat(cat.id)}
                    className="px-2.5 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-900 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>📅</span>
                    <span>+ Új Esemény</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddFinanceModal(true)}
                    className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>💰</span>
                    <span>+ Pénzügyi Tétel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplyModal(true)}
                    className="px-2.5 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>📦</span>
                    <span>+ Készletigény / Ellátmány</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPatchingRelations}
                    onClick={handleRunConnectedPatch}
                    className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    title="Kapcsolódó elemek relációs indexelésének és adatstruktúrájának frissítése"
                  >
                    {isPatchingRelations ? (
                      <>
                        <span className="animate-spin text-xs">⏳</span>
                        <span>Indexelés...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Relációk Patch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {patchFeedback && (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 flex items-center justify-between">
                  <span>{patchFeedback}</span>
                  <button onClick={() => setPatchFeedback(null)} className="text-purple-600 text-xs px-1">✕</button>
                </div>
              )}

              {/* Search & Filter Bar */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={connectedSearch}
                      onChange={(e) => setConnectedSearch(e.target.value)}
                      placeholder="Keresés kapcsolódó elemek között (cím, partner, megjegyzés)..."
                      className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-pink-500"
                    />
                    <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
                    {connectedSearch && (
                      <button
                        type="button"
                        onClick={() => setConnectedSearch('')}
                        className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 min-w-[160px]">
                    <CustomSelect
                      value={connectedSort}
                      onChange={(val) => setConnectedSort(val as any)}
                      options={[
                        { value: 'date_desc', label: 'Legújabb elöl', icon: '📅' },
                        { value: 'date_asc', label: 'Legrégebbi elöl', icon: '📅' },
                      ]}
                      title="Időrendi Rendezés"
                      colorScheme="slate"
                      buttonClassName="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setConnectedFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      connectedFilter === 'all'
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span>Összes Elem</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white">
                      {connectedTimelineItems.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectedFilter('event')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      connectedFilter === 'event'
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200'
                    }`}
                  >
                    <span>📅 Események</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white">
                      {eventsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectedFilter('finance')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      connectedFilter === 'finance'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <span>💰 Pénzügy</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white">
                      {financesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectedFilter('supply')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      connectedFilter === 'supply'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                    }`}
                  >
                    <span>📦 Készlet & Ellátmány</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 text-white">
                      {suppliesCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Items Feed List */}
              <div className="space-y-2">
                {filteredConnectedItems.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-2xl space-y-3">
                    <div className="text-3xl">🐾</div>
                    <div className="space-y-1">
                      <p className="font-extrabold text-sm text-gray-800">Nincs megjeleníthető kapcsolódó elem</p>
                      <p className="text-xs text-gray-500">
                        {connectedSearch
                          ? 'A megadott keresési feltételeknek nem felelt meg egyetlen elem sem.'
                          : 'Ehhez a cicához még nincsenek rögzítve események, pénzügyi tételek vagy készletigények.'}
                      </p>
                    </div>
                    <div className="flex justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenAddEventForCat(cat.id)}
                        className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs transition"
                      >
                        📅 Esemény Rögzítése
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSupplyModal(true)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition"
                      >
                        📦 Készletigény Rögzítése
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredConnectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white border border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-xs transition space-y-1.5"
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${item.badge.color}`}>
                                {item.badge.icon} {item.badge.label}
                              </span>

                              {item.statusBadge && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.statusBadge.color}`}>
                                  {item.statusBadge.label}
                                </span>
                              )}

                              <span className="text-[11px] font-mono text-gray-400">
                                📅 {item.date || 'Dátum nélkül'}
                              </span>
                            </div>

                            <h5 className="font-extrabold text-sm text-gray-900 truncate">
                              {item.title}
                            </h5>

                            {item.subtitle && (
                              <p className="text-[11px] text-gray-500 font-medium">
                                {item.subtitle}
                              </p>
                            )}
                          </div>

                          {/* Right Amount / Qty */}
                          {item.amountOrQty && (
                            <div className="text-right shrink-0">
                              <span
                                className={`font-mono font-black text-xs px-2 py-1 rounded-lg ${
                                  item.amountOrQty.isPositive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : item.amountOrQty.isExpense
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {item.amountOrQty.text}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Details chips */}
                        {item.details && item.details.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600 bg-gray-50/80 p-1.5 rounded-lg border border-gray-100">
                            {item.details.map((d, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="text-gray-400 font-medium">{d.label}:</span>
                                <span className="font-bold text-gray-800">{d.value}</span>
                                {idx < item.details!.length - 1 && <span className="text-gray-300">•</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <p className="text-[11px] text-gray-600 bg-amber-50/50 border border-amber-100 p-1.5 rounded-lg italic">
                            💬 {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
      {showAddLogModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3">
            <h4 className="font-black text-sm text-gray-900">
              ➕ Új {showAddLogModal === 'oltas' ? 'Védőoltás' : showAddLogModal === 'kezeles' ? 'Kezelés' : 'Teszt'} Rögzítése
            </h4>

            <form onSubmit={handleAddMedicalLog} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Megnevezés:</label>
                <input
                  type="text"
                  required
                  value={logName}
                  onChange={(e) => setLogName(e.target.value)}
                  placeholder="pl. Kombinált oltás..."
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Dátum:</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Költség (Ft):</label>
                <input
                  type="number"
                  value={logCost}
                  onChange={(e) => setLogCost(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              {Number(logCost) > 0 && (
                <div className="p-2.5 bg-pink-50 border border-pink-200 rounded-xl">
                  <label className="text-[11px] font-bold text-pink-950 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncMedicalToFinance}
                      onChange={(e) => setSyncMedicalToFinance(e.target.checked)}
                      className="w-3.5 h-3.5 text-pink-600 rounded"
                    />
                    <span>💳 Automatikus rögzítés a Pénzügyi Mérlegben is</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 font-bold rounded-lg"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-pink-600 text-white font-bold rounded-lg shadow-xs"
                >
                  Hozzáadás
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Finance Transaction Modal for this Cat */}
      {showAddFinanceModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                <span>💰</span>
                <span>Pénzügyi Tétel Rögzítése - {cat.nev}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddFinanceModal(false)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDirectFinance} className="space-y-3 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFinType('kiadas');
                    setFinCategory('orvosi');
                  }}
                  className={`py-2 rounded-xl font-bold border transition ${
                    finType === 'kiadas'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  💸 Kiadás (Költség)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFinType('bevetel');
                    setFinCategory('adomany');
                  }}
                  className={`py-2 rounded-xl font-bold border transition ${
                    finType === 'bevetel'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  💖 Célzott Adomány / Bevétel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kategória:</label>
                  <CustomSelect
                    value={finCategory}
                    onChange={(val) => setFinCategory(val as any)}
                    options={
                      finType === 'kiadas'
                        ? [
                            { value: 'orvosi', label: 'Orvosi számla', icon: '🩺' },
                            { value: 'tap_alom', label: 'Táp & Alom', icon: '🍲' },
                            { value: 'felszereles', label: 'Felszerelés', icon: '📦' },
                            { value: 'szallitas', label: 'Szállítás', icon: '🚗' },
                            { value: 'egyeb', label: 'Egyéb kiadás', icon: '📝' },
                          ]
                        : [
                            { value: 'adomany', label: 'Célzott adomány', icon: '💖' },
                            { value: 'orokbefogadas', label: 'Örökbefogadási díj', icon: '🏠' },
                            { value: 'egyeb', label: 'Egyéb bevétel', icon: '📝' },
                          ]
                    }
                    title="Pénzügyi Kategória Kiválasztása"
                    colorScheme={finType === 'kiadas' ? 'rose' : 'emerald'}
                    buttonClassName="p-2 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Összeg (Ft) *:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={finAmount}
                    onChange={(e) => setFinAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="pl. 15000"
                    className="w-full p-2 bg-gray-50 border rounded-xl font-black font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Megnevezés / Leírás *:</label>
                <input
                  type="text"
                  required
                  value={finTitle}
                  onChange={(e) => setFinTitle(e.target.value)}
                  placeholder={finType === 'kiadas' ? 'pl. Vérvétel és infúzió' : 'pl. Kovács Anna célzott támogatása'}
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Dátum:</label>
                  <input
                    type="date"
                    required
                    value={finDate}
                    onChange={(e) => setFinDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Fizetési Mód:</label>
                  <CustomSelect
                    value={finPaymentMethod}
                    onChange={(val) => setFinPaymentMethod(val as any)}
                    options={[
                      { value: 'bankkartya', label: 'Bankkártya', icon: '💳' },
                      { value: 'keszpenz', label: 'Készpénz', icon: '💵' },
                      { value: 'banki_atutalas', label: 'Átutalás', icon: '🏦' },
                      { value: 'paypal', label: 'Online/PayPal', icon: '🌐' },
                    ]}
                    title="Fizetési Mód Kiválasztása"
                    colorScheme="indigo"
                    buttonClassName="p-2 bg-gray-50 border rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Partner / Támogató neve:</label>
                  <input
                    type="text"
                    value={finPartner}
                    onChange={(e) => setFinPartner(e.target.value)}
                    placeholder="pl. Alpha-Vet vagy Adományozó"
                    className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Bizonylatszám:</label>
                  <input
                    type="text"
                    value={finInvoiceNumber}
                    onChange={(e) => setFinInvoiceNumber(e.target.value)}
                    placeholder="pl. SZ-2026/102"
                    className="w-full p-2 bg-gray-50 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddFinanceModal(false)}
                  className="px-3.5 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFin}
                  className={`px-4 py-2 text-white font-extrabold rounded-xl shadow-xs transition ${
                    finType === 'bevetel' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingFin ? 'Mentés...' : 'Tétel Mentése 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Supply / Need Modal for this Cat */}
      {showAddSupplyModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                <span>📦</span>
                <span>Készletigény / Ellátmány Rögzítése - {cat.nev}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddSupplyModal(false)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCatSupply} className="space-y-3 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Ellátmány Típusa:</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 text-[11px]">
                  {(['tap', 'alom', 'gyogyszer', 'felszereles', 'egyeb'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSupplyType(t);
                        setSupplyItem('');
                      }}
                      className={`p-1.5 rounded-lg font-bold border text-center transition capitalize ${
                        supplyType === t
                          ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {t === 'tap' ? '🍲 Táp' : t === 'alom' ? '📦 Alom' : t === 'gyogyszer' ? '💊 Gyógyszer' : t === 'felszereles' ? '🧺 Felszerelés' : '🧩 Egyéb'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Chips */}
              <div>
                <label className="block font-bold text-gray-500 text-[10px] mb-1">Gyakori Sablonok (Kattints a beíráshoz):</label>
                <div className="flex flex-wrap gap-1">
                  {getSupplyPresetItems().map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSupplyItem(preset)}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 text-gray-700 border border-gray-200 rounded text-[10px] font-medium transition cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tétel Megnevezése / Márkája *</label>
                <input
                  type="text"
                  required
                  value={supplyItem}
                  onChange={(e) => setSupplyItem(e.target.value)}
                  placeholder="pl. Royal Canin Kitten / Milprazon..."
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium focus:bg-white focus:outline-teal-500"
                />
              </div>

              {/* Qty & Unit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mennyiség *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={supplyQty}
                    onChange={(e) => setSupplyQty(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 bg-gray-50 border rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mértékegység *</label>
                  <CustomSelect
                    value={supplyUnit}
                    onChange={(val) => setSupplyUnit(val as any)}
                    options={[
                      { value: 'db', label: 'db (Darab)', icon: '🔢' },
                      { value: 'kg', label: 'kg (Kilogramm)', icon: '⚖️' },
                      { value: 'tasak', label: 'tasak / alutasak', icon: '🍲' },
                      { value: 'doboz', label: 'doboz / konzerv', icon: '🥫' },
                      { value: 'zsak', label: 'zsák', icon: '📦' },
                      { value: 'pipetta', label: 'pipetta / ampulla', icon: '💧' },
                    ]}
                    title="Mértékegység Kiválasztása"
                    colorScheme="emerald"
                    buttonClassName="p-2 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Dátum *</label>
                  <input
                    type="date"
                    required
                    value={supplyDate}
                    onChange={(e) => setSupplyDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Státusz *</label>
                  <CustomSelect
                    value={supplyStatus}
                    onChange={(val) => setSupplyStatus(val as any)}
                    options={[
                      { value: 'kiadva', label: 'Kiadva (Átadva)', icon: '📦' },
                      { value: 'igenyelve', label: 'Igényelve (Függőben)', icon: '⏳' },
                      { value: 'teljesitve', label: 'Teljesítve', icon: '✅' },
                    ]}
                    title="Adag Státusz Kiválasztása"
                    colorScheme="emerald"
                    buttonClassName="p-2 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Deduct from Inventory Checkbox */}
              <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl">
                <label className="text-[11px] font-bold text-teal-950 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supplyDeductInventory}
                    onChange={(e) => setSupplyDeductInventory(e.target.checked)}
                    className="w-3.5 h-3.5 text-teal-600 rounded"
                  />
                  <span>📦 Levonás a Központi Raktárkészletből (Kimenő raktári tétel)</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Megjegyzés / Részletek:</label>
                <textarea
                  rows={2}
                  value={supplyNotes}
                  onChange={(e) => setSupplyNotes(e.target.value)}
                  placeholder="pl. 2 heti adag az ideiglenes befogadónak / napi 1 tabletta..."
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddSupplyModal(false)}
                  className="px-3.5 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupply}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-xs transition"
                >
                  {isSavingSupply ? 'Mentés...' : 'Készletigény Mentése 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
