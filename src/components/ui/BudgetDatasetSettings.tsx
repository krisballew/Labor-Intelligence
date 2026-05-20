import React, { useMemo, useState } from 'react';
import { X, Database, Search } from 'lucide-react';
import { Hotel } from '../../types';

export interface BudgetDatasetOption {
  id: string;
  name: string;
  description: string;
}

export const BUDGET_DATASETS: BudgetDatasetOption[] = [
  {
    id: 'approved-2026',
    name: 'FY2026 Approved Budget',
    description: 'Board-approved annual operating budget locked in Dec 2025.',
  },
  {
    id: 'reforecast-q1-2026',
    name: 'Q1 2026 Reforecast',
    description: 'Mid-cycle reforecast incorporating Q1 actuals and updated demand.',
  },
  {
    id: 'conservative-plan',
    name: 'Conservative Plan',
    description: 'Downside scenario assuming softer demand and tighter labor supply.',
  },
  {
    id: 'stretch-plan',
    name: 'Stretch Plan',
    description: 'Upside scenario with aggressive productivity and rate targets.',
  },
  {
    id: 'prior-year-actuals',
    name: 'Prior Year Actuals',
    description: 'FY2025 actuals used as the comparative baseline.',
  },
];

export const DEFAULT_BUDGET_DATASET_ID = 'approved-2026';

interface BudgetDatasetSettingsProps {
  open: boolean;
  onClose: () => void;
  hotels: Hotel[];
  assignments: Record<string, string>;
  onAssignmentsChange: (next: Record<string, string>) => void;
}

export const BudgetDatasetSettings: React.FC<BudgetDatasetSettingsProps> = ({
  open,
  onClose,
  hotels,
  assignments,
  onAssignmentsChange,
}) => {
  const [query, setQuery] = useState('');
  const [bulkValue, setBulkValue] = useState<string>('');

  const filteredHotels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(
      (h) => h.name.toLowerCase().includes(q) || h.region.toLowerCase().includes(q)
    );
  }, [hotels, query]);

  if (!open) return null;

  const setForHotel = (hotelId: string, datasetId: string) => {
    onAssignmentsChange({ ...assignments, [hotelId]: datasetId });
  };

  const applyToAllFiltered = () => {
    if (!bulkValue) return;
    const next = { ...assignments };
    for (const h of filteredHotels) next[h.id] = bulkValue;
    onAssignmentsChange(next);
  };

  const resetAll = () => {
    const next: Record<string, string> = {};
    for (const h of hotels) next[h.id] = DEFAULT_BUDGET_DATASET_ID;
    onAssignmentsChange(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 rounded-md bg-teal/10 text-teal-dark">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-navy">Budget Dataset Configuration</h2>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
                Choose which budget dataset powers analytics for each property. Variance, forecast,
                and scenario calculations will reference the selected dataset.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bulk + search controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 px-5 py-3 border-b border-gray-200">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search properties…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
            >
              <option value="">Apply dataset to filtered…</option>
              {BUDGET_DATASETS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyToAllFiltered}
              disabled={!bulkValue}
              className="px-3 py-1.5 text-sm font-medium text-white bg-teal-dark rounded-md hover:bg-teal disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Per-property assignment table */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Budget Dataset
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHotels.map((h) => {
                const current = assignments[h.id] ?? DEFAULT_BUDGET_DATASET_ID;
                return (
                  <tr key={h.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-2 text-sm text-gray-900">{h.name}</td>
                    <td className="px-5 py-2 text-xs text-gray-500">{h.region}</td>
                    <td className="px-5 py-2">
                      <select
                        value={current}
                        onChange={(e) => setForHotel(h.id, e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                      >
                        {BUDGET_DATASETS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {filteredHotels.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-sm text-gray-500">
                    No properties match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            Changes save automatically and persist in your browser.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-white bg-teal-dark rounded-md hover:bg-teal"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetDatasetSettings;
