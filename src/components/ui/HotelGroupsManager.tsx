import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { Hotel, HotelGroup } from '../../types';

interface HotelGroupsManagerProps {
  open: boolean;
  onClose: () => void;
  hotels: Hotel[];
  groups: HotelGroup[];
  onGroupsChange: (groups: HotelGroup[]) => void;
  onApplyGroup?: (group: HotelGroup) => void;
}

const newId = () => `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const HotelGroupsManager: React.FC<HotelGroupsManagerProps> = ({
  open,
  onClose,
  hotels,
  groups,
  onGroupsChange,
  onApplyGroup,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groups[0]?.id ?? null);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    if (!open) return;
    if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id);
    if (selectedGroupId && !groups.find((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(groups[0]?.id ?? null);
    }
  }, [open, groups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  useEffect(() => {
    setDraftName(selectedGroup?.name ?? '');
  }, [selectedGroup?.id, selectedGroup?.name]);

  if (!open) return null;

  const createGroup = () => {
    const g: HotelGroup = { id: newId(), name: 'New Group', hotelIds: [] };
    onGroupsChange([...groups, g]);
    setSelectedGroupId(g.id);
  };

  const deleteGroup = (id: string) => {
    const next = groups.filter((g) => g.id !== id);
    onGroupsChange(next);
    if (selectedGroupId === id) setSelectedGroupId(next[0]?.id ?? null);
  };

  const updateSelected = (patch: Partial<HotelGroup>) => {
    if (!selectedGroup) return;
    onGroupsChange(
      groups.map((g) => (g.id === selectedGroup.id ? { ...g, ...patch } : g))
    );
  };

  const toggleHotel = (hotelId: string) => {
    if (!selectedGroup) return;
    const has = selectedGroup.hotelIds.includes(hotelId);
    updateSelected({
      hotelIds: has
        ? selectedGroup.hotelIds.filter((id) => id !== hotelId)
        : [...selectedGroup.hotelIds, hotelId],
    });
  };

  const selectAll = () => {
    if (!selectedGroup) return;
    const allIds = hotels.map((h) => h.id);
    const allSelected = selectedGroup.hotelIds.length === allIds.length;
    updateSelected({ hotelIds: allSelected ? [] : allIds });
  };

  const commitName = () => {
    if (!selectedGroup) return;
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== selectedGroup.name) {
      updateSelected({ name: trimmed });
    } else {
      setDraftName(selectedGroup.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-navy">Manage Property Groups</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Create custom groupings to quickly filter the dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex">
          {/* Groups list */}
          <div className="w-56 border-r border-gray-200 flex flex-col">
            <button
              type="button"
              onClick={createGroup}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-teal-dark hover:bg-gray-50 border-b border-gray-100"
            >
              <Plus className="w-4 h-4" /> New group
            </button>
            <div className="flex-1 overflow-auto">
              {groups.length === 0 && (
                <p className="px-4 py-3 text-xs text-gray-500">No groups yet.</p>
              )}
              {groups.map((g) => {
                const isSel = g.id === selectedGroupId;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm border-l-2 ${
                      isSel
                        ? 'border-teal bg-teal/5 text-slate-navy'
                        : 'border-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium truncate">{g.name}</div>
                    <div className="text-xs text-gray-500">
                      {g.hotelIds.length} {g.hotelIds.length === 1 ? 'property' : 'properties'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 min-w-0 flex flex-col">
            {selectedGroup ? (
              <>
                <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="Group name"
                  />
                  <button
                    type="button"
                    onClick={() => deleteGroup(selectedGroup.id)}
                    className="p-2 text-gray-400 hover:text-orange"
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Properties
                  </span>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-medium text-teal-dark hover:underline"
                  >
                    {selectedGroup.hotelIds.length === hotels.length
                      ? 'Clear all'
                      : 'Select all'}
                  </button>
                </div>

                <div className="flex-1 overflow-auto">
                  {hotels.map((h) => {
                    const checked = selectedGroup.hotelIds.includes(h.id);
                    return (
                      <label
                        key={h.id}
                        className="flex items-center gap-3 px-5 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleHotel(h.id)}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">{h.name}</div>
                          <div className="text-xs text-gray-500">{h.region}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {onApplyGroup && (
                  <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onApplyGroup(selectedGroup);
                        onClose();
                      }}
                      disabled={selectedGroup.hotelIds.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-teal-dark text-white rounded-md hover:bg-teal disabled:bg-gray-300"
                    >
                      <Check className="w-4 h-4" /> Apply group
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                Create a group to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelGroupsManager;
