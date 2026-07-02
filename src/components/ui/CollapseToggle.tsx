import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapseToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Used for accessibility/title text — typically the section name */
  sectionLabel: string;
  size?: 'sm' | 'md';
}

/**
 * A chevron icon button that toggles a section's collapsed state. Pair with
 * local `useState` in the host component to control visibility of section
 * content.
 */
const CollapseToggle: React.FC<CollapseToggleProps> = ({
  collapsed,
  onToggle,
  sectionLabel,
  size = 'sm',
}) => {
  const sizing = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      title={collapsed ? `Expand ${sectionLabel}` : `Collapse ${sectionLabel}`}
      className={`inline-flex items-center justify-center ${sizing} rounded-md border border-gray-200 bg-white text-slate-navy hover:bg-gray-50 hover:border-gray-300 transition-colors`}
    >
      <ChevronDown
        className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : 'rotate-0'}`}
      />
    </button>
  );
};

export default CollapseToggle;
