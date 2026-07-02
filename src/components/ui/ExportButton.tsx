import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

interface ExportOption {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const DEFAULT_OPTIONS: ExportOption[] = [
  { key: 'csv', label: 'Download as CSV', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { key: 'xlsx', label: 'Download as Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { key: 'pdf', label: 'Download as PDF', icon: <FileText className="w-4 h-4" /> },
  { key: 'png', label: 'Download as Image (PNG)', icon: <ImageIcon className="w-4 h-4" /> },
];

interface ExportButtonProps {
  /** Label shown in the export dropdown header — typically the section name */
  sectionLabel: string;
  /** Visual size variant. `sm` is meant for inline section headers. */
  size?: 'sm' | 'md';
  /** Override the set of export options. Defaults to CSV/Excel/PDF/PNG. */
  options?: ExportOption[];
}

/**
 * Prototype export button. Renders a dropdown of export formats and shows a
 * transient confirmation toast on selection — no file is actually generated.
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  sectionLabel,
  size = 'sm',
  options = DEFAULT_OPTIONS,
}) => {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useEffect(() => {
    if (!confirmed) return;
    const id = window.setTimeout(() => setConfirmed(null), 2400);
    return () => window.clearTimeout(id);
  }, [confirmed]);

  const handleSelect = (opt: ExportOption) => {
    setOpen(false);
    setConfirmed(opt.label);
  };

  const sizing =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs'
      : 'px-3 py-2 text-sm';

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-2">
      {confirmed && (
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
          <Check className="w-3.5 h-3.5" />
          {confirmed} (demo)
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Export ${sectionLabel}`}
        className={`inline-flex items-center gap-1.5 ${sizing} rounded-md border border-gray-200 bg-white text-slate-navy font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors`}
      >
        <Download className="w-3.5 h-3.5" />
        Export
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-30 w-60 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
              Export
            </div>
            <div className="text-xs font-semibold text-slate-navy truncate">{sectionLabel}</div>
          </div>
          <ul className="py-1">
            {options.map((opt) => (
              <li key={opt.key}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(opt)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-navy hover:bg-teal-dark/5 text-left"
                >
                  <span className="text-teal-dark">{opt.icon}</span>
                  <span className="flex-1">{opt.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 border-t border-gray-100 text-[11px] text-gray-400 italic">
            Prototype — no file is generated.
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
