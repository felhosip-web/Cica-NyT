export const PRESET_TAGS = [
  'karanténban',
  'kezelés alatt',
  'gazdihoz vár',
  'örökbefogadható',
  'félős / szocializálandó',
  'elkülönítve',
  'orvosi megfigyelés',
  'diétás étrend',
  'műtétre vár',
];

export interface TagBadgeConfig {
  bg: string;
  text: string;
  border: string;
  icon: string;
}

export const getTagStyle = (tag: string): string => {
  const t = tag.toLowerCase().trim();
  if (t.includes('karantén')) {
    return 'bg-red-100 text-red-900 border-red-300';
  }
  if (t.includes('kezelés') || t.includes('terápia')) {
    return 'bg-purple-100 text-purple-900 border-purple-300';
  }
  if (t.includes('gazdihoz') || t.includes('örökbefogadható') || t.includes('gazdit keres')) {
    return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  }
  if (t.includes('félős') || t.includes('szocializálandó') || t.includes('félénk')) {
    return 'bg-amber-100 text-amber-900 border-amber-300';
  }
  if (t.includes('elkülönítve') || t.includes('izolált')) {
    return 'bg-rose-100 text-rose-900 border-rose-300';
  }
  if (t.includes('diéta') || t.includes('étrend') || t.includes('speciális')) {
    return 'bg-sky-100 text-sky-900 border-sky-300';
  }
  if (t.includes('műtét') || t.includes('ivartalanításra')) {
    return 'bg-indigo-100 text-indigo-900 border-indigo-300';
  }
  if (t.includes('megfigyelés') || t.includes('kontroll')) {
    return 'bg-yellow-100 text-yellow-950 border-yellow-300';
  }
  if (t.includes('ideiglenes')) {
    return 'bg-blue-100 text-blue-900 border-blue-300';
  }
  return 'bg-slate-100 text-slate-800 border-slate-300';
};

export const getTagIcon = (tag: string): string => {
  const t = tag.toLowerCase().trim();
  if (t.includes('karantén')) return '🔴';
  if (t.includes('kezelés')) return '🟣';
  if (t.includes('gazdihoz') || t.includes('örökbefogadható')) return '🟢';
  if (t.includes('félős') || t.includes('szocializálandó')) return '🟠';
  if (t.includes('elkülönítve')) return '🛑';
  if (t.includes('diéta') || t.includes('étrend')) return '🥣';
  if (t.includes('műtét')) return '✂️';
  if (t.includes('megfigyelés')) return '🟡';
  if (t.includes('ideiglenes')) return '🏡';
  return '🏷️';
};
