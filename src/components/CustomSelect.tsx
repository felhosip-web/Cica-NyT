import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string | React.ReactNode;
  description?: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  id?: string;
  value?: string | number;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  colorScheme?: 'purple' | 'pink' | 'emerald' | 'blue' | 'indigo' | 'amber' | 'slate';
  searchable?: boolean;
  required?: boolean;
}

const colorSchemeStyles = {
  purple: {
    focusRing: 'focus:ring-2 focus:ring-purple-500',
    selectedBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700',
    selectedText: 'text-purple-900 dark:text-purple-200 font-extrabold',
    radioActive: 'border-purple-600 bg-purple-600',
    radioDot: 'bg-white',
    badgeActive: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  },
  pink: {
    focusRing: 'focus:ring-2 focus:ring-pink-500',
    selectedBg: 'bg-pink-50 dark:bg-pink-950/60 border-pink-300 dark:border-pink-700',
    selectedText: 'text-pink-900 dark:text-pink-200 font-extrabold',
    radioActive: 'border-pink-600 bg-pink-600',
    radioDot: 'bg-white',
    badgeActive: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
  },
  emerald: {
    focusRing: 'focus:ring-2 focus:ring-emerald-500',
    selectedBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700',
    selectedText: 'text-emerald-900 dark:text-emerald-200 font-extrabold',
    radioActive: 'border-emerald-600 bg-emerald-600',
    radioDot: 'bg-white',
    badgeActive: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
  },
  blue: {
    focusRing: 'focus:ring-2 focus:ring-blue-500',
    selectedBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700',
    selectedText: 'text-blue-900 dark:text-blue-200 font-extrabold',
    radioActive: 'border-blue-600 bg-blue-600',
    radioDot: 'bg-white',
    badgeActive: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  },
  indigo: {
    focusRing: 'focus:ring-2 focus:ring-indigo-500',
    selectedBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700',
    selectedText: 'text-indigo-900 dark:text-indigo-200 font-extrabold',
    radioActive: 'border-indigo-600 bg-indigo-600',
    radioDot: 'bg-white',
    badgeActive: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
  },
  amber: {
    focusRing: 'focus:ring-2 focus:ring-amber-500',
    selectedBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700',
    selectedText: 'text-amber-900 dark:text-amber-200 font-extrabold',
    radioActive: 'border-amber-600 bg-amber-600',
    radioDot: 'bg-white',
    badgeActive: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  },
  slate: {
    focusRing: 'focus:ring-2 focus:ring-slate-500',
    selectedBg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
    selectedText: 'text-slate-900 dark:text-slate-100 font-extrabold',
    radioActive: 'border-slate-700 bg-slate-700 dark:border-slate-400 dark:bg-slate-400',
    radioDot: 'bg-white dark:bg-slate-900',
    badgeActive: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
  },
};

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Válassz egy lehetőséget...',
  title = 'Választási Lehetőségek',
  disabled = false,
  className = '',
  buttonClassName = '',
  colorScheme = 'purple',
  searchable,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options array to uniform SelectOption objects
  const normalizedOptions = useMemo<SelectOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const strValue = value !== undefined && value !== null ? String(value) : '';
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === strValue);
  }, [normalizedOptions, strValue]);

  // Determine if search should be enabled (auto-enable if >= 6 items unless explicitly overridden)
  const isSearchable = searchable !== undefined ? searchable : normalizedOptions.length >= 6;

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string, optDisabled?: boolean) => {
    if (optDisabled) return;
    onChange(val);
    setIsOpen(false);
  };

  const scheme = colorSchemeStyles[colorScheme] || colorSchemeStyles.purple;

  return (
    <div className={`relative inline-block w-full ${className}`}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={strValue}
          onChange={() => {}}
          required
          tabIndex={-1}
          className="sr-only"
        />
      )}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full flex items-center justify-between text-left transition-all duration-150 rounded-xl px-3.5 py-2.5 font-bold text-xs sm:text-sm border shadow-2xs cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-slate-900 border-gray-300 dark:border-slate-800 text-gray-400'
            : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white hover:border-purple-400 dark:hover:border-purple-500'
        } ${scheme.focusRing} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedOption?.icon && (
            <span className="shrink-0 text-base leading-none">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate ${
              selectedOption
                ? 'text-gray-900 dark:text-white font-bold'
                : 'text-gray-400 dark:text-slate-400 font-medium'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={`shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                selectedOption.badgeColor || scheme.badgeActive
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1 text-gray-400 dark:text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-600' : ''}`} />
        </div>
      </button>

      {/* IN-APP MODAL / DIALOG SELECTOR */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
            {/* Backdrop click */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10 flex flex-col max-h-[85vh] my-auto"
            >
              {/* Header */}
              <div className="p-4 sm:p-4.5 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between border-b border-purple-800/40">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">✨</span>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                      {title}
                    </h3>
                    <p className="text-[11px] text-purple-200/90 font-medium">
                      {normalizedOptions.length} elérhető választási lehetőség
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer border border-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar (if enabled) */}
              {isSearchable && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Keresés a lehetőségek között..."
                      className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Options List */}
              <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/40">
                {filteredOptions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400 space-y-1">
                    <span className="text-2xl block">🔍</span>
                    <p className="text-xs font-bold">Nincs találat a keresésre.</p>
                    <p className="text-[11px]">Próbálj más keresőszót megadni!</p>
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === strValue;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => handleSelect(opt.value, opt.disabled)}
                        className={`w-full min-h-[44px] flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                          opt.disabled
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400'
                            : isSelected
                            ? `${scheme.selectedBg} shadow-xs`
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 pr-2 flex-1">
                          {/* Option Icon / Emoji */}
                          {opt.icon && (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-200 dark:border-slate-700">
                              {opt.icon}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs sm:text-sm tracking-tight ${
                                  isSelected
                                    ? scheme.selectedText
                                    : 'font-bold text-slate-800 dark:text-slate-100'
                                }`}
                              >
                                {opt.label}
                              </span>

                              {opt.badge && (
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                                    opt.badgeColor || scheme.badgeActive
                                  }`}
                                >
                                  {opt.badge}
                                </span>
                              )}
                            </div>

                            {opt.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 line-clamp-2">
                                {opt.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Radio / Checkmark indicator */}
                        <div className="shrink-0 pl-2">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? scheme.radioActive
                                : 'border-slate-300 dark:border-slate-600 bg-transparent'
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer / Cancel button */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
                  Kattints a kiválasztáshoz
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Mégse
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
