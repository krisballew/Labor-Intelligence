import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { Hotel, HotelGroup } from '../../types';

interface PropertyFilterProps {
  hotels: Hotel[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  groups?: HotelGroup[];
  onManageGroups?: () => void;
}

const arraysEqualAsSets = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
};

export const PropertyFilter: React.FC<PropertyFilterProps> = ({
  hotels,
  selectedIds,
  onChange,
  groups = [],
  onManageGroups,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const allSelected = selectedIds.length === hotels.length;
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };
  const toggleAll = () => onChange(allSelected ? [] : hotels.map((h) => h.id));

  const activeGroup = groups.find((g) => arraysEqualAsSets(g.hotelIds, selectedIds));

  const buttonLabel = activeGroup
    ? activeGroup.name
    : selectedIds.length === 0
    ? 'No properties'
    : allSelected
    ? `All ${hotels.length} properties`
    : selectedIds.length === 1
    ? hotels.find((h) => h.id === selectedIds[0])?.name ?? '1 property'
    : `${selectedIds.length} properties`;

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          <span>{buttonLabel}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-96 overflow-auto">
            {groups.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                  Groups
                </div>
                {groups.map((g) => {
                  const isActive = activeGroup?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        onChange(g.hotelIds);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                        isActive ? 'bg-teal/5 text-teal-dark font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className="truncate">{g.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{g.hotelIds.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <label className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Select all</span>
            </label>
            {hotels.map((h) => (
              <label
                key={h.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(h.id)}
                  onChange={() => toggle(h.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-gray-900">{h.name}</span>
                  <span className="text-xs text-gray-500">{h.region}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
      {onManageGroups && (
        <button
          type="button"
          onClick={onManageGroups}
          className="p-1.5 text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-slate-navy"
          title="Manage property groups"
          aria-label="Manage property groups"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default PropertyFilter;
