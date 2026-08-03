export const THEMES = {
  original: {
    id: 'original',
    name: 'Eredeti Cica-NyT',
    description: 'Rózsaszín és narancs színvilág (az eredeti stílus)',
    colors: {
      primary: '#ec4899',
      'brand-pink': '#ec4899',
      'brand-orange': '#f97316',
      'pink-50': '#fdf2f8',
      'pink-100': '#fce7f3',
      'pink-200': '#fbcfe8',
      'pink-300': '#f9a8d4',
      'pink-400': '#f472b6',
      'pink-500': '#ec4899',
      'pink-600': '#db2777',
      'pink-700': '#be185d',
      'pink-800': '#9d174d',
      'pink-900': '#831843',
      'pink-950': '#500724',
      'blue-50': '#f0f9ff',
      'blue-100': '#e0f2fe',
      'blue-200': '#bae6fd',
      'blue-300': '#7dd3fc',
      'blue-400': '#38bdf8',
      'blue-500': '#0ea5e9',
      'blue-600': '#0284c7',
      'blue-700': '#0369a1',
      'blue-800': '#075985',
      'blue-900': '#0c4a6e',
      'blue-950': '#082f49',
      'gray-50': '#fafafa',
      'gray-100': '#f5f5f5',
      'gray-200': '#e5e7eb',
      'gray-300': '#d1d5db',
      'gray-400': '#9ca3af',
      'gray-500': '#6b7280',
      'gray-600': '#4b5563',
      'gray-700': '#374151',
      'gray-800': '#1f2937',
      'gray-900': '#111827',
      'gray-950': '#030712'
    }
  },
  olive: {
    id: 'olive',
    name: 'Modern Olíva',
    description: 'Nyugtató zöld és homoksárga színvilág',
    colors: {
      primary: '#8A9A5B',
      'brand-pink': '#8A9A5B',
      'brand-orange': '#D2B48C',
      'pink-50': '#F4F6F0',
      'pink-100': '#E9ECE0',
      'pink-200': '#D3DBC3',
      'pink-300': '#BDC9A7',
      'pink-400': '#A7B88A',
      'pink-500': '#8A9A5B',
      'pink-600': '#73834C',
      'pink-700': '#5C6A3C',
      'pink-800': '#464F2D',
      'pink-900': '#2F351E',
      'pink-950': '#171B0F',
      'blue-50': '#F7F6F2',
      'blue-100': '#ECE9DF',
      'blue-200': '#D5CFC0',
      'blue-300': '#BEB4A1',
      'blue-400': '#A69A82',
      'blue-500': '#8E7F63',
      'blue-600': '#756851',
      'blue-700': '#5C523F',
      'blue-800': '#433C2E',
      'blue-900': '#2A261C',
      'blue-950': '#110F0B',
      'gray-50': '#FDFCF9',
      'gray-100': '#F5F3ED',
      'gray-200': '#EAE6DB',
      'gray-300': '#DCD6C9',
      'gray-400': '#C5BCAE',
      'gray-500': '#A89F90',
      'gray-600': '#8C8274',
      'gray-700': '#6E6559',
      'gray-800': '#4A443F',
      'gray-900': '#322E2B',
      'gray-950': '#1D1B19'
    }
  },
  lavender: {
    id: 'lavender',
    name: 'Lágy Levendula',
    description: 'Elegáns lila és türkiz színvilág',
    colors: {
      primary: '#8B5CF6',
      'brand-pink': '#8B5CF6',
      'brand-orange': '#EC4899',
      'pink-50': '#f5f3ff',
      'pink-100': '#ede9fe',
      'pink-200': '#ddd6fe',
      'pink-300': '#c4b5fd',
      'pink-400': '#a78bfa',
      'pink-500': '#8b5cf6',
      'pink-600': '#7c3aed',
      'pink-700': '#6d28d9',
      'pink-800': '#5b21b6',
      'pink-900': '#4c1d95',
      'pink-950': '#2e1065',
      'blue-50': '#f0fdfa',
      'blue-100': '#ccfbf1',
      'blue-200': '#99f6e4',
      'blue-300': '#5eead4',
      'blue-400': '#2dd4bf',
      'blue-500': '#14b8a6',
      'blue-600': '#0d9488',
      'blue-700': '#0f766e',
      'blue-800': '#115e59',
      'blue-900': '#134e4a',
      'blue-950': '#042f2e',
      'gray-50': '#fafafa',
      'gray-100': '#f4f4f5',
      'gray-200': '#e4e4e7',
      'gray-300': '#d4d4d8',
      'gray-400': '#a1a1aa',
      'gray-500': '#71717a',
      'gray-600': '#52525b',
      'gray-700': '#3f3f46',
      'gray-800': '#27272a',
      'gray-900': '#18181b',
      'gray-950': '#09090b'
    }
  }
};

export const DEFAULT_THEME = 'original';

export function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;

  // Set the theme id attribute for styling or tracking
  root.setAttribute('data-theme', theme.id);

  // Apply each color mapping as a CSS custom property on :root
  Object.entries(theme.colors).forEach(([key, val]) => {
    root.style.setProperty(`--color-${key}`, val);
  });

  // Also set the theme-color meta tag for PWA/mobile browser support
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme.colors['brand-pink']);
  }
}

export function getCurrentThemeId() {
  return localStorage.getItem('cica-nyt-theme') || DEFAULT_THEME;
}

export function saveTheme(themeId) {
  if (THEMES[themeId]) {
    localStorage.setItem('cica-nyt-theme', themeId);
    applyTheme(themeId);
    return true;
  }
  return false;
}
