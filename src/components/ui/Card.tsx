import React from 'react';
import { Building2, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { RiskLevel } from '../../types';

export type AccentTone = 'emerald' | 'amber' | 'red' | 'teal' | 'orange' | 'indigo' | 'slate';

const ACCENT_STYLES: Record<AccentTone, { bar: string; iconBg: string; iconText: string }> = {
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  red: { bar: 'bg-red-500', iconBg: 'bg-red-50', iconText: 'text-red-600' },
  teal: { bar: 'bg-teal', iconBg: 'bg-teal/10', iconText: 'text-teal-dark' },
  orange: { bar: 'bg-orange', iconBg: 'bg-orange/10', iconText: 'text-orange' },
  indigo: { bar: 'bg-indigo-500', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  slate: { bar: 'bg-slate-400', iconBg: 'bg-slate-100', iconText: 'text-slate-600' },
};

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  infoTooltip?: React.ReactNode;
  accent?: AccentTone;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  className = '',
  infoTooltip,
  accent,
}) => {
  const accentStyle = accent ? ACCENT_STYLES[accent] : null;
  return (
    <div className={`metric-card overflow-hidden flex flex-col h-full ${className}`}>
      {accentStyle && (
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${accentStyle.bar}`} aria-hidden />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="metric-label flex items-start gap-1.5 min-h-[2.25rem] leading-snug">
          <span>{label}</span>
          {infoTooltip && (
            <span className="relative inline-flex items-center group">
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 z-30 hidden group-hover:block bg-slate-800 text-white text-xs font-normal normal-case tracking-normal leading-snug rounded-md px-3 py-2 shadow-lg"
              >
                {infoTooltip}
              </span>
            </span>
          )}
        </div>
        {icon && (
          <div
            className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${
              accentStyle ? `${accentStyle.iconBg} ${accentStyle.iconText}` : 'bg-gray-50 text-gray-400'
            }`}
          >
            <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex-1 flex flex-col justify-end">
        <div className="metric-value !mt-0">{value}</div>
        <div className="metric-subtext min-h-[1rem]">{subtext}</div>
      </div>
    </div>
  );
};

interface RiskBadgeProps {
  level: RiskLevel;
  text: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, text }) => {
  const baseClass = 'risk-badge';
  const levelClass = {
    'on-track': 'risk-on-track',
    caution: 'risk-caution',
    'at-risk': 'risk-at-risk',
  }[level];

  const icon = {
    'on-track': <CheckCircle className="w-3 h-3 mr-1" />,
    caution: <AlertCircle className="w-3 h-3 mr-1" />,
    'at-risk': <AlertTriangle className="w-3 h-3 mr-1" />,
  }[level];

  return (
    <div className={`${baseClass} ${levelClass}`}>
      {icon}
      {text}
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, subtitle }) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon && (
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal/10 text-teal-dark">
          <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-navy tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ label, isActive, onClick, disabled = false, disabledHint }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      aria-disabled={disabled}
      className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
        disabled
          ? 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
          : isActive
          ? 'bg-teal-dark text-white shadow-sm'
          : 'bg-white text-gray-600 border border-gray-200 hover:text-slate-navy hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
};

interface CurrencyProps {
  amount: number;
  showCents?: boolean;
}

export const Currency: React.FC<CurrencyProps> = ({ amount, showCents = false }) => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);

  const isNegative = amount < 0;

  return (
    <span className={isNegative ? 'text-emerald-600 font-semibold' : 'text-orange font-semibold'}>
      {formatted}
    </span>
  );
};

interface PercentageProps {
  value: number;
  showSign?: boolean;
  isGood?: boolean;
}

export const Percentage: React.FC<PercentageProps> = ({ value, showSign = true, isGood }) => {
  const isPositive = value > 0;
  const color = isGood !== undefined ? (isGood ? 'text-emerald-600' : 'text-orange') : isPositive ? 'text-orange' : 'text-emerald-600';
  const sign = showSign && isPositive ? '+' : '';

  return (
    <span className={`font-semibold ${color}`}>
      {sign}
      {value.toFixed(1)}%
    </span>
  );
};
