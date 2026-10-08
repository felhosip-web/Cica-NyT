import { InventorySourceType } from '../types';

export interface InventorySourceLabelInfo {
  label: string;
  icon: string;
  badgeClass: string;
}

export function getInventorySourceLabel(sourceType?: InventorySourceType): InventorySourceLabelInfo {
  switch (sourceType) {
    case 'adomany_gyujtott':
      return {
        label: 'Gyűjtött adomány',
        icon: '📦',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50',
      };
    case 'sajat_kor':
      return {
        label: 'Vásárolt',
        icon: '🛒',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50',
      };
    case 'egyeb':
      return {
        label: 'Egyéb',
        icon: '🔄',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
      };
    case 'adomany_hozott':
    case 'adomany':
    default:
      return {
        label: 'Behozott adomány',
        icon: '🎁',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50',
      };
  }
}
