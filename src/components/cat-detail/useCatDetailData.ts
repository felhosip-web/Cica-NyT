import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { FinancialTransaction, FosterExpense, FosterSupply, InventoryItem, FosterParent } from '../../types';

/**
 * Custom hook that fetches all data related to a specific cat from IndexedDB, filtering out tombstones.
 * @param catId - The ID of the cat to fetch data for
 * @returns Object containing cat details, events, finances, expenses, supplies, inventory, and foster parents
 */
export function useCatDetailData(catId: string) {
  const catRaw = useLiveQuery(() => db.cats.get(catId), [catId]);
  const cat = catRaw && !catRaw.deletedAt ? catRaw : null;

  const catEvents = (useLiveQuery(() => db.events.where('catId').equals(catId).toArray(), [catId]) || []).filter((e: any) => !e.deletedAt);

  const catFinances = ((useLiveQuery(() => db.finances ? db.finances.where('catId').equals(catId).toArray() : [], [catId]) || []) as FinancialTransaction[]).filter((f: any) => !f.deletedAt);

  const catFosterExpenses = ((useLiveQuery(() => db.fosterExpenses ? db.fosterExpenses.where('catId').equals(catId).toArray() : [], [catId]) || []) as FosterExpense[]).filter((fe: any) => !fe.deletedAt);

  const allFosterSupplies = ((useLiveQuery(() => db.fosterSupplies ? db.fosterSupplies.toArray() : [], []) || []) as FosterSupply[]).filter((fs: any) => !fs.deletedAt);

  const allInventoryItems = ((useLiveQuery(() => db.inventory ? db.inventory.toArray() : [], []) || []) as InventoryItem[]).filter((inv: any) => !inv.deletedAt);

  const fosterParents = ((useLiveQuery(() => db.fosterParents ? db.fosterParents.toArray() : [], []) || []) as FosterParent[]).filter((fp: any) => !fp.deletedAt);

  return {
    cat,
    catEvents,
    catFinances,
    catFosterExpenses,
    allFosterSupplies,
    allInventoryItems,
    fosterParents,
  };
}
