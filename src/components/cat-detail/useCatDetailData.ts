import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { FinancialTransaction, FosterExpense, FosterSupply, InventoryItem, FosterParent } from '../../types';

export function useCatDetailData(catId: string) {
  const cat = useLiveQuery(() => db.cats.get(catId), [catId]);
  const catEvents = useLiveQuery(() => db.events.where('catId').equals(catId).toArray(), [catId]) || [];
  const catFinances = (useLiveQuery(() => db.finances ? db.finances.where('catId').equals(catId).toArray() : [], [catId]) || []) as FinancialTransaction[];
  const catFosterExpenses = (useLiveQuery(() => db.fosterExpenses ? db.fosterExpenses.where('catId').equals(catId).toArray() : [], [catId]) || []) as FosterExpense[];
  const allFosterSupplies = (useLiveQuery(() => db.fosterSupplies ? db.fosterSupplies.toArray() : [], []) || []) as FosterSupply[];
  const allInventoryItems = (useLiveQuery(() => db.inventory ? db.inventory.toArray() : [], []) || []) as InventoryItem[];
  const fosterParents = (useLiveQuery(() => db.fosterParents ? db.fosterParents.toArray() : [], []) || []) as FosterParent[];

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
