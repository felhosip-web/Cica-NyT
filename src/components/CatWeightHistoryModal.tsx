import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { CatWeightRecord } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface CatWeightHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CatWeightHistoryModal: React.FC<CatWeightHistoryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  const cats = useLiveQuery(() => db.cats.toArray(), []) || [];
  const weights = useLiveQuery(
    () => {
      if (!selectedCatId) return [];
      return db.table('cat_weights').where('catId').equals(selectedCatId).sortBy('date');
    },
    [selectedCatId]
  ) || [];

  const chartData = weights.map(w => ({
    date: w.date,
    weight: w.weight
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[90]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col"
      >
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-gray-800 dark:text-white">
            <span>⚖️</span> Egy Cica Súly Útja
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-xl transition cursor-pointer bg-white dark:bg-slate-700 shadow-sm border border-gray-200 dark:border-slate-600"
          >
            ❌
          </button>
        </div>

        <div className="p-6 flex-1">
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Válaszd ki a cicát:
            </label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl shadow-sm text-sm"
            >
              <option value="">-- Válassz egy cicát --</option>
              {cats.map(c => (
                <option key={c.id} value={c.id}>
                  #{c.sorszam} - {c.nev || 'Névtelen'}
                </option>
              ))}
            </select>
          </div>

          {!selectedCatId ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-10 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
              Válassz ki egy cicát a fenti listából a súlytörténet megtekintéséhez.
            </div>
          ) : weights.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-10 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
              Ehhez a cicához még nem rögzítettek súlyadatot.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" />
                    <YAxis domain={['auto', 'auto']} unit=" kg" />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value} kg`, 'Súly']}
                      labelFormatter={(label) => `Dátum: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                      name="Mért súly (kg)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Dátum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Súly (kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {weights.map((w: any) => (
                      <tr key={w.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {w.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          {w.weight} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
