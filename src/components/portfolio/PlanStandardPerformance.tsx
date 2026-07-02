import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  Clock,
  ArrowUpCircle,
  Wrench,
  Timer,
  Award,
  DollarSign,
  ShieldAlert,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { LaborMetrics } from '../../types';
import ExportButton from '../ui/ExportButton';
import CollapseToggle from '../ui/CollapseToggle';
import { HotelLink } from '../ui/HotelSelectionContext';

interface PlanStandardPerformanceProps {
  metrics: LaborMetrics[];
  hotelNameById?: Map<string, string>;
  periodLabel: string;
  /** Period scaling applied to summed metrics (e.g. 0.25 for previous month). Defaults to 1. */
  periodScale?: number;
}

const fmtNum = (n: number) => Math.round(n).toLocaleString();
const fmtSigned = (n: number) => `${n >= 0 ? '+' : ''}${fmtNum(n)}`;
const fmtPct = (n: number, digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
const fmtCurrency0 = (n: number) =>
  `${n < 0 ? '-' : '+'}$${Math.abs(Math.round(n)).toLocaleString()}`;

type AccentTone = 'teal' | 'blue' | 'orange' | 'slate';
const TONE_TEXT: Record<AccentTone, string> = {
  teal: 'text-teal-dark',
  blue: 'text-blue-600',
  orange: 'text-orange',
  slate: 'text-slate-navy',
};
const TONE_BAR: Record<AccentTone, string> = {
  teal: 'bg-teal-dark',
  blue: 'bg-blue-600',
  orange: 'bg-orange',
  slate: 'bg-slate-navy',
};

interface PropRow {
  hotelId: string;
  hotelName: string;
  amount: number;
  display: string;
  secondaryDisplay?: string;
}

interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  tone: AccentTone;
  popoverTitle: string;
  contributions: PropRow[];
  totalLabel: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon,
  tone,
  popoverTitle,
  contributions,
  totalLabel,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const maxAbs = contributions.reduce((m, c) => Math.max(m, Math.abs(c.amount)), 0);
  const sorted = [...contributions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return (
    <div
      ref={ref}
      className="relative h-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-teal rounded-xl"
      >
        <div className="metric-card h-full">
          <div className="flex items-start gap-3">
            <div className={`${TONE_TEXT[tone]} flex-shrink-0`}>{icon}</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-navy">{label}</div>
              <div
                className={`text-2xl font-bold mt-1 tabular-nums ${TONE_TEXT[tone]} underline decoration-dotted decoration-gray-300 underline-offset-4`}
              >
                {value}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">{subtext}</div>
            </div>
          </div>
        </div>
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 mt-2 left-0 right-0 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {popoverTitle}
            </div>
            <div className="text-xs font-semibold text-gray-700 tabular-nums flex-shrink-0">
              {totalLabel}
            </div>
          </div>
          {sorted.length === 0 ? (
            <div className="text-sm text-gray-500">No property data available.</div>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto">
              {sorted.map((c) => {
                const pct = maxAbs > 0 ? (Math.abs(c.amount) / maxAbs) * 100 : 0;
                return (
                  <li key={c.hotelId} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <HotelLink hotelId={c.hotelId} className="text-gray-800 truncate">{c.hotelName}</HotelLink>
                      <div className="text-right flex-shrink-0">
                        <div className="font-medium text-slate-navy tabular-nums">
                          {c.display}
                        </div>
                        {c.secondaryDisplay && (
                          <div className="text-[11px] text-gray-500 tabular-nums">
                            {c.secondaryDisplay}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 h-1 bg-gray-100 rounded">
                      <div className={`h-1 rounded ${TONE_BAR[tone]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

interface AdherenceChartProps {
  baseLabel: string;
  baseValue: number;
  actualLabel: string;
  actualValue: number;
  variance: number;
  variancePct: number;
  color: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onViewDetails?: () => void;
}

const AdherenceChart: React.FC<AdherenceChartProps> = ({
  baseLabel,
  baseValue,
  actualLabel,
  actualValue,
  variance,
  variancePct,
  color,
  title,
  subtitle,
  icon,
  onViewDetails,
}) => {
  const max = Math.max(baseValue, actualValue);
  // nice axis max - round up to nearest 2000
  const niceMax = Math.ceil(max / 2000) * 2000 || 2000;
  const width = 560;
  const height = 220;
  const padTop = 28;
  const padBottom = 36;
  const padLeft = 110;
  const padRight = 70;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const barH = 28;
  const rowGap = 22;

  const ticks = 6;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((niceMax * i) / ticks),
  );

  const baseY = padTop + (chartH - barH * 2 - rowGap) / 2;
  const actualY = baseY + barH + rowGap;
  const baseW = (baseValue / niceMax) * chartW;
  const actualW = (actualValue / niceMax) * chartW;

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-3">
          <div style={{ color }} className="flex-shrink-0">
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-navy">{title}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="px-2.5 py-1 rounded-md border text-xs font-semibold tabular-nums leading-none"
            style={{ borderColor: color, color }}
            title="Variance vs base"
          >
            {fmtSigned(variance)} hrs ({fmtPct(variancePct)})
          </div>
          {onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              className="text-xs font-semibold hover:underline"
              style={{ color }}
            >
              View details
            </button>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* grid lines */}
          {tickVals.map((tv, i) => {
            const x = padLeft + (chartW * i) / ticks;
            return (
              <g key={tv + '-' + i}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + chartH}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={padTop + chartH + 14}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-gray-500"
                >
                  {tv.toLocaleString()}
                </text>
              </g>
            );
          })}
          <text
            x={padLeft + chartW / 2}
            y={height - 4}
            textAnchor="middle"
            fontSize={10}
            className="fill-gray-500"
          >
            Hours
          </text>
          {/* base bar */}
          <text
            x={padLeft - 8}
            y={baseY + barH / 2 + 3}
            textAnchor="end"
            fontSize={10}
            className="fill-slate-navy"
            fontWeight={600}
          >
            {baseLabel}
          </text>
          <rect x={padLeft} y={baseY} width={baseW} height={barH} fill={color} rx={2} />
          <text
            x={padLeft + baseW + 6}
            y={baseY + barH / 2 + 3}
            fontSize={10}
            fontWeight={700}
            className="fill-slate-navy"
          >
            {baseValue.toLocaleString()}
          </text>
          {/* actual bar */}
          <text
            x={padLeft - 8}
            y={actualY + barH / 2 + 3}
            textAnchor="end"
            fontSize={10}
            className="fill-slate-navy"
            fontWeight={600}
          >
            {actualLabel}
          </text>
          <rect
            x={padLeft}
            y={actualY}
            width={Math.min(actualW, baseW)}
            height={barH}
            fill={color}
            rx={2}
          />
          {actualW > baseW && (
            <rect
              x={padLeft + baseW}
              y={actualY}
              width={actualW - baseW}
              height={barH}
              fill={color}
              opacity={0.55}
              rx={2}
            />
          )}
          {/* dashed line at base */}
          <line
            x1={padLeft + baseW}
            y1={baseY - 2}
            x2={padLeft + baseW}
            y2={actualY + barH + 2}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={padLeft + actualW + 6}
            y={actualY + barH / 2 + 3}
            fontSize={10}
            fontWeight={700}
            className="fill-slate-navy"
          >
            {actualValue.toLocaleString()}
          </text>
      </svg>
    </div>
  );
};

// Department weights used to split a property's hours across departments
// (matches the Overtime Intelligence breakdown chart shares).
interface DeptRow {
  name: string;
  share: number;
}
const DEPT_SHARES: DeptRow[] = [
  { name: 'Housekeeping', share: 0.412 },
  { name: 'Front Office', share: 0.232 },
  { name: 'Night Audit', share: 0.135 },
  { name: 'Engineering', share: 0.108 },
  { name: 'F&B', share: 0.072 },
  { name: 'Other', share: 0.041 },
];

interface JobDef {
  name: string;
  share: number;
}
interface DeptHier {
  name: string;
  jobs: JobDef[];
}
interface DivHier {
  name: string;
  departments: DeptHier[];
}

const HIERARCHY: DivHier[] = [
  {
    name: 'Rooms',
    departments: [
      {
        name: 'Housekeeping',
        jobs: [
          { name: 'Room Attendant', share: 0.62 },
          { name: 'Houseperson', share: 0.18 },
          { name: 'Inspector', share: 0.12 },
          { name: 'Laundry Attendant', share: 0.08 },
        ],
      },
      {
        name: 'Front Office',
        jobs: [
          { name: 'Front Desk Agent', share: 0.55 },
          { name: 'Bell Attendant', share: 0.25 },
          { name: 'Concierge', share: 0.20 },
        ],
      },
      {
        name: 'Night Audit',
        jobs: [
          { name: 'Night Auditor', share: 0.70 },
          { name: 'Overnight Front Desk', share: 0.30 },
        ],
      },
    ],
  },
  {
    name: 'Engineering',
    departments: [
      {
        name: 'Engineering',
        jobs: [
          { name: 'Maintenance Engineer', share: 0.60 },
          { name: 'Maintenance Tech', share: 0.30 },
          { name: 'Grounds', share: 0.10 },
        ],
      },
    ],
  },
  {
    name: 'Food & Beverage',
    departments: [
      {
        name: 'F&B',
        jobs: [
          { name: 'Server', share: 0.40 },
          { name: 'Cook', share: 0.30 },
          { name: 'Bartender', share: 0.18 },
          { name: 'Steward', share: 0.12 },
        ],
      },
    ],
  },
  {
    name: 'Administrative & Other',
    departments: [
      {
        name: 'Other',
        jobs: [
          { name: 'Sales Coordinator', share: 0.35 },
          { name: 'Accounting Clerk', share: 0.35 },
          { name: 'HR Coordinator', share: 0.30 },
        ],
      },
    ],
  },
];

interface PropertyHoursRow {
  hotelId: string;
  hotelName: string;
  baseHours: number;
  actualHours: number;
}

interface AdherenceBreakdownModalProps {
  title: string;
  subtitle: string;
  baseLabel: string;
  actualLabel: string;
  accentColor: string;
  properties: PropertyHoursRow[];
  onClose: () => void;
}

const AdherenceBreakdownModal: React.FC<AdherenceBreakdownModalProps> = ({
  title,
  subtitle,
  baseLabel,
  actualLabel,
  accentColor,
  properties,
  onClose,
}) => {
  const [openProps, setOpenProps] = useState<Set<string>>(new Set());
  const [openDivs, setOpenDivs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  const toggle = (k: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setter(n);
  };

  const deptChartShare = (deptName: string) =>
    DEPT_SHARES.find((d) => d.name === deptName)?.share ?? 0;

  const sorted = [...properties].sort(
    (a, b) => Math.abs(b.actualHours - b.baseHours) - Math.abs(a.actualHours - a.baseHours),
  );
  const grandBase = sorted.reduce((s, p) => s + p.baseHours, 0);
  const grandActual = sorted.reduce((s, p) => s + p.actualHours, 0);
  const grandVar = grandActual - grandBase;

  const varColor = (v: number) =>
    v > 0 ? 'text-orange' : v < 0 ? 'text-emerald-600' : 'text-gray-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200">
          <div>
            <div className="text-lg font-bold text-slate-navy">{title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                {baseLabel}
              </div>
              <div className="text-base font-bold tabular-nums text-slate-navy">
                {fmtNum(grandBase)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                {actualLabel}
              </div>
              <div className="text-base font-bold tabular-nums" style={{ color: accentColor }}>
                {fmtNum(grandActual)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                Variance
              </div>
              <div className={`text-base font-bold tabular-nums ${varColor(grandVar)}`}>
                {fmtSigned(grandVar)}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1 px-6 py-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="py-2 font-semibold">Property / Division / Department / Job</th>
                <th className="py-2 font-semibold text-right w-28">{baseLabel}</th>
                <th className="py-2 font-semibold text-right w-28">{actualLabel}</th>
                <th className="py-2 font-semibold text-right w-28">Variance</th>
                <th className="py-2 font-semibold text-right w-20">Var %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const propOpen = openProps.has(p.hotelId);
                const propVar = p.actualHours - p.baseHours;
                const propPct = p.baseHours > 0 ? (propVar / p.baseHours) * 100 : 0;
                return (
                  <React.Fragment key={p.hotelId}>
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggle(p.hotelId, openProps, setOpenProps)}
                    >
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          {propOpen ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <HotelLink hotelId={p.hotelId} className="font-semibold text-slate-navy" stopPropagation>
                            {p.hotelName}
                          </HotelLink>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-navy tabular-nums">
                        {fmtNum(p.baseHours)}
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums" style={{ color: accentColor }}>
                        {fmtNum(p.actualHours)}
                      </td>
                      <td className={`py-2.5 text-right font-semibold tabular-nums ${varColor(propVar)}`}>
                        {fmtSigned(propVar)}
                      </td>
                      <td className={`py-2.5 text-right tabular-nums ${varColor(propVar)}`}>
                        {fmtPct(propPct)}
                      </td>
                    </tr>
                    {propOpen &&
                      HIERARCHY.map((div) => {
                        const divShare = div.departments.reduce(
                          (s, d) => s + deptChartShare(d.name),
                          0,
                        );
                        if (divShare <= 0) return null;
                        const divBase = p.baseHours * divShare;
                        const divActual = p.actualHours * divShare;
                        const divVar = divActual - divBase;
                        const divPct = divBase > 0 ? (divVar / divBase) * 100 : 0;
                        const divKey = `${p.hotelId}::${div.name}`;
                        const divOpen = openDivs.has(divKey);
                        return (
                          <React.Fragment key={divKey}>
                            <tr
                              className="border-b border-gray-100 bg-gray-50/40 hover:bg-gray-50 cursor-pointer"
                              onClick={() => toggle(divKey, openDivs, setOpenDivs)}
                            >
                              <td className="py-2 pr-2 pl-8">
                                <div className="flex items-center gap-2">
                                  {divOpen ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                  <span className="font-medium text-slate-navy">{div.name}</span>
                                </div>
                              </td>
                              <td className="py-2 text-right font-medium text-slate-navy tabular-nums">
                                {fmtNum(divBase)}
                              </td>
                              <td className="py-2 text-right font-medium tabular-nums" style={{ color: accentColor }}>
                                {fmtNum(divActual)}
                              </td>
                              <td className={`py-2 text-right font-medium tabular-nums ${varColor(divVar)}`}>
                                {fmtSigned(divVar)}
                              </td>
                              <td className={`py-2 text-right tabular-nums ${varColor(divVar)}`}>
                                {fmtPct(divPct)}
                              </td>
                            </tr>
                            {divOpen &&
                              div.departments.map((dept) => {
                                const deptShare = deptChartShare(dept.name);
                                const deptBase = p.baseHours * deptShare;
                                const deptActual = p.actualHours * deptShare;
                                const deptVar = deptActual - deptBase;
                                const deptPct = deptBase > 0 ? (deptVar / deptBase) * 100 : 0;
                                return (
                                  <React.Fragment key={`${divKey}::${dept.name}`}>
                                    <tr className="border-b border-gray-100">
                                      <td className="py-2 pr-2 pl-14">
                                        <span className="text-slate-navy">{dept.name}</span>
                                      </td>
                                      <td className="py-2 text-right text-slate-navy tabular-nums">
                                        {fmtNum(deptBase)}
                                      </td>
                                      <td className="py-2 text-right tabular-nums" style={{ color: accentColor }}>
                                        {fmtNum(deptActual)}
                                      </td>
                                      <td className={`py-2 text-right tabular-nums ${varColor(deptVar)}`}>
                                        {fmtSigned(deptVar)}
                                      </td>
                                      <td className={`py-2 text-right tabular-nums ${varColor(deptVar)}`}>
                                        {fmtPct(deptPct)}
                                      </td>
                                    </tr>
                                    {dept.jobs.map((job) => {
                                      const jobBase = deptBase * job.share;
                                      const jobActual = deptActual * job.share;
                                      const jobVar = jobActual - jobBase;
                                      const jobPct = jobBase > 0 ? (jobVar / jobBase) * 100 : 0;
                                      return (
                                        <tr
                                          key={`${divKey}::${dept.name}::${job.name}`}
                                          className="border-b border-gray-50"
                                        >
                                          <td className="py-1.5 pr-2 pl-20 text-gray-600">
                                            {job.name}
                                          </td>
                                          <td className="py-1.5 text-right text-gray-700 tabular-nums">
                                            {fmtNum(jobBase)}
                                          </td>
                                          <td className="py-1.5 text-right tabular-nums" style={{ color: accentColor }}>
                                            {fmtNum(jobActual)}
                                          </td>
                                          <td className={`py-1.5 text-right tabular-nums ${varColor(jobVar)}`}>
                                            {fmtSigned(jobVar)}
                                          </td>
                                          <td className={`py-1.5 text-right tabular-nums ${varColor(jobVar)}`}>
                                            {fmtPct(jobPct)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const PlanStandardPerformance: React.FC<PlanStandardPerformanceProps> = ({
  metrics,
  hotelNameById,
  periodLabel,
  periodScale = 1,
}) => {
  const [detailsView, setDetailsView] = useState<'schedule' | 'standard' | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Static splits for derived buckets (unscheduled vs over-clocked split of positive variance)
  const UNSCHEDULED_SHARE = 0.66;
  const OVERCLOCKED_SHARE = 0.34;

  const totals = useMemo(() => {
    const actualHours = metrics.reduce((s, m) => s + m.actualHours, 0) * periodScale;
    const scheduledHours = metrics.reduce((s, m) => s + m.scheduledHours, 0) * periodScale;
    const standardHours = metrics.reduce((s, m) => s + m.standardHours, 0) * periodScale;
    const forecastedHours = metrics.reduce((s, m) => s + m.forecastedHours, 0) * periodScale;
    const actualCost = metrics.reduce((s, m) => s + m.actualCost, 0) * periodScale;
    const blendedRate = actualHours > 0 ? actualCost / actualHours : 0;
    const standardCost = standardHours * blendedRate;

    const schedVariance = actualHours - scheduledHours;
    const schedVariancePct = scheduledHours > 0 ? (schedVariance / scheduledHours) * 100 : 0;
    const unscheduled = Math.max(0, schedVariance) * UNSCHEDULED_SHARE;
    const overclocked = Math.max(0, schedVariance) * OVERCLOCKED_SHARE;

    const stdVariance = actualHours - standardHours;
    const stdVariancePct = standardHours > 0 ? (stdVariance / standardHours) * 100 : 0;
    const costRisk = actualCost - standardCost;
    const costRiskPct = standardCost > 0 ? (costRisk / standardCost) * 100 : 0;
    // Quality risk if actual is meaningfully under standard
    const qualityRiskLevel: 'High' | 'Medium' | 'Low' =
      stdVariancePct < -5 ? 'High' : stdVariancePct < -2 ? 'Medium' : 'Low';

    return {
      actualHours,
      scheduledHours,
      standardHours,
      forecastedHours,
      schedVariance,
      schedVariancePct,
      unscheduled,
      overclocked,
      stdVariance,
      stdVariancePct,
      costRisk,
      costRiskPct,
      qualityRiskLevel,
    };
  }, [metrics, periodScale]);

  // Per-property contributions (scaled to the selected period)
  const perProperty = useMemo(() => {
    return metrics.map((m) => {
      const actualHours = m.actualHours * periodScale;
      const scheduledHours = m.scheduledHours * periodScale;
      const standardHours = m.standardHours * periodScale;
      const actualCost = m.actualCost * periodScale;
      const blendedRate = actualHours > 0 ? actualCost / actualHours : 0;
      const standardCost = standardHours * blendedRate;
      const schedVar = actualHours - scheduledHours;
      const stdVar = actualHours - standardHours;
      return {
        hotelId: m.hotelId,
        hotelName: hotelNameById?.get(m.hotelId) ?? m.hotelId,
        scheduled: scheduledHours,
        actual: actualHours,
        schedVar,
        unscheduled: Math.max(0, schedVar) * UNSCHEDULED_SHARE,
        overclocked: Math.max(0, schedVar) * OVERCLOCKED_SHARE,
        standard: standardHours,
        stdVar,
        costRisk: actualCost - standardCost,
        forecast: m.forecastedHours * periodScale,
      };
    });
  }, [metrics, hotelNameById, periodScale]);

  const toProp = (
    key: keyof (typeof perProperty)[number],
    fmt: (n: number) => string,
  ): PropRow[] =>
    perProperty.map((p) => ({
      hotelId: p.hotelId,
      hotelName: p.hotelName,
      amount: p[key] as number,
      display: fmt(p[key] as number),
    }));

  const toPropWithForecast = (
    key: keyof (typeof perProperty)[number],
    fmt: (n: number) => string,
  ): PropRow[] =>
    perProperty.map((p) => ({
      hotelId: p.hotelId,
      hotelName: p.hotelName,
      amount: p[key] as number,
      display: fmt(p[key] as number),
      secondaryDisplay: `Forecast: ${fmtNum(p.forecast)} hrs`,
    }));

  const hrs = (n: number) => `${fmtNum(n)} hrs`;
  const signedHrs = (n: number) => `${fmtSigned(n)} hrs`;
  const dollars = (n: number) => fmtCurrency0(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-end gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-dark/5 text-teal-dark text-xs font-semibold">
          <CalendarRange className="w-4 h-4" />
          {periodLabel}
        </div>
        <ExportButton sectionLabel="Plan & Standard Performance" />
        <CollapseToggle
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          sectionLabel="Plan & Standard Performance"
        />
      </div>

      {!collapsed && (
        <>
      {/* Section: Actual vs Schedule */}
      <div className="flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-teal-dark" />
        <h3 className="text-base font-bold text-slate-navy">Actual vs Schedule</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Scheduled Hours"
            value={fmtNum(totals.scheduledHours)}
            subtext={`Forecast: ${fmtNum(totals.forecastedHours)} hrs`}
            icon={<CalendarClock className="w-7 h-7" />}
            tone="teal"
            popoverTitle="Scheduled hours by property"
            contributions={toPropWithForecast('scheduled', hrs)}
            totalLabel={`${hrs(totals.scheduledHours)} total`}
          />
          <KpiCard
            label="Actual Hours"
            value={fmtNum(totals.actualHours)}
            subtext={`Forecast: ${fmtNum(totals.forecastedHours)} hrs`}
            icon={<Clock className="w-7 h-7" />}
            tone="teal"
            popoverTitle="Actual hours by property"
            contributions={toPropWithForecast('actual', hrs)}
            totalLabel={`${hrs(totals.actualHours)} total`}
          />
          <KpiCard
            label="Actual vs Scheduled Variance"
            value={fmtSigned(totals.schedVariance)}
            subtext={fmtPct(totals.schedVariancePct)}
            icon={<ArrowUpCircle className="w-7 h-7" />}
            tone="teal"
            popoverTitle="Scheduled variance by property"
            contributions={toProp('schedVar', signedHrs)}
            totalLabel={signedHrs(totals.schedVariance)}
          />
          <KpiCard
            label="Unscheduled Work"
            value={fmtNum(totals.unscheduled)}
            subtext="Worked but not on schedule"
            icon={<Wrench className="w-7 h-7" />}
            tone="teal"
            popoverTitle="Unscheduled work by property"
            contributions={toProp('unscheduled', hrs)}
            totalLabel={`${hrs(totals.unscheduled)} total`}
          />
          <KpiCard
            label="Over-Clocked Hours"
            value={fmtNum(totals.overclocked)}
            subtext="Clocked beyond schedule"
            icon={<Timer className="w-7 h-7" />}
            tone="teal"
            popoverTitle="Over-clocked hours by property"
            contributions={toProp('overclocked', hrs)}
            totalLabel={`${hrs(totals.overclocked)} total`}
          />
        </div>

      {/* Section: Actual vs Standards */}
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-bold text-slate-navy">Actual vs Standards</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Standard Hours"
            value={fmtNum(totals.standardHours)}
            subtext={`Forecast: ${fmtNum(totals.forecastedHours)} hrs`}
            icon={<Award className="w-7 h-7" />}
            tone="blue"
            popoverTitle="Standard hours by property"
            contributions={toPropWithForecast('standard', hrs)}
            totalLabel={`${hrs(totals.standardHours)} total`}
          />
          <KpiCard
            label="Actual Hours"
            value={fmtNum(totals.actualHours)}
            subtext={`Forecast: ${fmtNum(totals.forecastedHours)} hrs`}
            icon={<Clock className="w-7 h-7" />}
            tone="blue"
            popoverTitle="Actual hours by property"
            contributions={toPropWithForecast('actual', hrs)}
            totalLabel={`${hrs(totals.actualHours)} total`}
          />
          <KpiCard
            label="Actual vs Standard Variance"
            value={fmtSigned(totals.stdVariance)}
            subtext={fmtPct(totals.stdVariancePct)}
            icon={<ArrowUpCircle className="w-7 h-7" />}
            tone="blue"
            popoverTitle="Standard variance by property"
            contributions={toProp('stdVar', signedHrs)}
            totalLabel={signedHrs(totals.stdVariance)}
          />
          <KpiCard
            label="Cost Risk (Over Std.)"
            value={dollars(totals.costRisk)}
            subtext={fmtPct(totals.costRiskPct)}
            icon={<DollarSign className="w-7 h-7" />}
            tone="orange"
            popoverTitle="Cost risk by property"
            contributions={toProp('costRisk', dollars)}
            totalLabel={dollars(totals.costRisk)}
          />
          <KpiCard
            label="Quality Risk (Under Std.)"
            value={totals.qualityRiskLevel}
            subtext="Service / outcome exposure"
            icon={<ShieldAlert className="w-7 h-7" />}
            tone="orange"
            popoverTitle="Std. variance % by property"
            contributions={perProperty.map((p) => {
              const pct = p.standard > 0 ? (p.stdVar / p.standard) * 100 : 0;
              return {
                hotelId: p.hotelId,
                hotelName: p.hotelName,
                amount: -pct,
                display: fmtPct(pct),
              };
            })}
            totalLabel={fmtPct(totals.stdVariancePct)}
          />
        </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdherenceChart
          title="Schedule Adherence"
          subtitle="Actual vs scheduled hours across the portfolio"
          icon={<CalendarClock className="w-5 h-5" />}
          baseLabel="Scheduled Hours"
          baseValue={Math.round(totals.scheduledHours)}
          actualLabel="Actual Hours"
          actualValue={Math.round(totals.actualHours)}
          variance={Math.round(totals.schedVariance)}
          variancePct={totals.schedVariancePct}
          color="#0F766E"
          onViewDetails={() => setDetailsView('schedule')}
        />
        <AdherenceChart
          title="Actual vs Standard Hours"
          subtitle="Actual vs productivity-standard hours across the portfolio"
          icon={<Award className="w-5 h-5" />}
          baseLabel="Standard Hours"
          baseValue={Math.round(totals.standardHours)}
          actualLabel="Actual Hours"
          actualValue={Math.round(totals.actualHours)}
          variance={Math.round(totals.stdVariance)}
          variancePct={totals.stdVariancePct}
          color="#2563EB"
          onViewDetails={() => setDetailsView('standard')}
        />
      </div>

      {detailsView === 'schedule' && (
        <AdherenceBreakdownModal
          title="Schedule Adherence — Property Breakdown"
          subtitle="Scheduled vs Actual hours by Property / Division / Department / Job"
          baseLabel="Scheduled"
          actualLabel="Actual"
          accentColor="#0F766E"
          properties={perProperty.map((p) => ({
            hotelId: p.hotelId,
            hotelName: p.hotelName,
            baseHours: p.scheduled,
            actualHours: p.actual,
          }))}
          onClose={() => setDetailsView(null)}
        />
      )}

      {detailsView === 'standard' && (
        <AdherenceBreakdownModal
          title="Actual vs Standard Hours — Property Breakdown"
          subtitle="Standard vs Actual hours by Property / Division / Department / Job"
          baseLabel="Standard"
          actualLabel="Actual"
          accentColor="#2563EB"
          properties={perProperty.map((p) => ({
            hotelId: p.hotelId,
            hotelName: p.hotelName,
            baseHours: p.standard,
            actualHours: p.actual,
          }))}
          onClose={() => setDetailsView(null)}
        />
      )}
        </>
      )}
    </div>
  );
};

export default PlanStandardPerformance;
