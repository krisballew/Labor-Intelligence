import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  CalendarDays,
  DollarSign,
  PieChart,
  Target,
  BarChart3,
  CalendarRange,
  MapPin,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { LaborMetrics } from '../../types';
import ExportButton from '../ui/ExportButton';
import CollapseToggle from '../ui/CollapseToggle';
import { HotelLink } from '../ui/HotelSelectionContext';

interface OvertimeIntelligenceProps {
  metrics: LaborMetrics[];
  hotelNameById?: Map<string, string>;
}

interface DeptRow {
  name: string;
  share: number;
}

// Static department shares to drive the breakdown bar charts. These mirror
// the OT Hotspots / department mix shown in the design.
const DEPT_ACTUAL: DeptRow[] = [
  { name: 'Housekeeping', share: 0.41 },
  { name: 'Front Office', share: 0.215 },
  { name: 'Night Audit', share: 0.125 },
  { name: 'Engineering', share: 0.114 },
  { name: 'F&B', share: 0.078 },
  { name: 'Other', share: 0.058 },
];

const DEPT_SCHEDULED: DeptRow[] = [
  { name: 'Housekeeping', share: 0.412 },
  { name: 'Front Office', share: 0.243 },
  { name: 'Night Audit', share: 0.148 },
  { name: 'Engineering', share: 0.100 },
  { name: 'F&B', share: 0.063 },
  { name: 'Other', share: 0.034 },
];

// Hierarchical structure: division → department (matches chart buckets) → jobs.
// Job shares sum to 1.0 within a department.
interface JobDef {
  name: string;
  share: number;
}
interface DeptHier {
  name: string; // matches DEPT_ACTUAL/SCHEDULED name
  jobs: JobDef[];
}
interface DivHier {
  name: string;
  departments: DeptHier[];
}

const OT_HIERARCHY: DivHier[] = [
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

const fmtNum = (n: number) => Math.round(n).toLocaleString();
const fmtCurrency0 = (n: number) =>
  `$${Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

interface PropContribution {
  hotelId: string;
  hotelName: string;
  amount: number;
  display: string;
}

interface KpiProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  accent: 'teal' | 'blue' | 'orange';
  popoverTitle: string;
  contributions: PropContribution[];
  totalLabel: string;
}

const KpiCard: React.FC<KpiProps> = ({
  label,
  value,
  subtext,
  icon,
  accent,
  popoverTitle,
  contributions,
  totalLabel,
}) => {
  const accentMap = {
    teal: 'text-teal-dark',
    blue: 'text-blue-600',
    orange: 'text-orange',
  } as const;
  const barMap = {
    teal: 'bg-teal-dark',
    blue: 'bg-blue-600',
    orange: 'bg-orange',
  } as const;

  const [open, setOpen] = useState(false);
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

  const maxAbs = contributions.reduce((m, c) => Math.max(m, Math.abs(c.amount)), 0);
  const sorted = [...contributions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return (
    <div
      ref={containerRef}
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
            <div className={`${accentMap[accent]} flex-shrink-0`}>{icon}</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-navy">{label}</div>
              <div
                className={`text-2xl font-bold mt-1 tabular-nums ${accentMap[accent]} underline decoration-dotted decoration-gray-300 underline-offset-4`}
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
                      <span className="font-medium text-slate-navy tabular-nums flex-shrink-0">
                        {c.display}
                      </span>
                    </div>
                    <div className="mt-1 h-1 bg-gray-100 rounded">
                      <div className={`h-1 rounded ${barMap[accent]}`} style={{ width: `${pct}%` }} />
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

interface BarChartProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: { name: string; value: number }[];
  barColor: string;
  onViewDetails?: () => void;
}

const DeptBarChart: React.FC<BarChartProps> = ({ title, subtitle, icon, data, barColor, onViewDetails }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  // Round max up to a nice tick value
  const niceMax = Math.ceil(max / 100) * 100;
  const ticks = 5;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((niceMax * (ticks - i)) / ticks),
  );

  const width = 560;
  const height = 220;
  const padLeft = 44;
  const padBottom = 32;
  const padTop = 16;
  const padRight = 12;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const barGap = 18;
  const barW = (chartW - barGap * (data.length - 1)) / data.length;

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-3">
          <div className="text-teal-dark flex-shrink-0">{icon}</div>
          <div>
            <div className="text-sm font-semibold text-slate-navy">{title}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
        </div>
        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="text-xs font-semibold text-teal-dark hover:underline flex-shrink-0"
          >
            View details
          </button>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <text x={4} y={padTop - 4} className="fill-gray-400" fontSize={9}>
          OT Hours
        </text>
        {tickValues.map((tv, i) => {
          const y = padTop + (chartH * i) / ticks;
          return (
            <g key={tv + '-' + i}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize={9} className="fill-gray-400">
                {tv}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padLeft + i * (barW + barGap);
          const h = (d.value / niceMax) * chartH;
          const y = padTop + chartH - h;
          return (
            <g key={d.name}>
              <rect x={x} y={y} width={barW} height={h} fill={barColor} rx={2} />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                className="fill-slate-700"
              >
                {Math.round(d.value)}
              </text>
              <text
                x={x + barW / 2}
                y={padTop + chartH + 14}
                textAnchor="middle"
                fontSize={10}
                className="fill-gray-600"
              >
                {d.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface PropertyOTRow {
  hotelId: string;
  hotelName: string;
  total: number;
}

interface OTBreakdownModalProps {
  title: string;
  subtitle: string;
  accentColor: string;
  properties: PropertyOTRow[];
  onClose: () => void;
}

const OTBreakdownModal: React.FC<OTBreakdownModalProps> = ({
  title,
  subtitle,
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

  const togglePropKey = (k: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setter(n);
  };

  // Division share within a property = sum of (its dept shares × dept's chart share)
  // We use DEPT_ACTUAL shares as the dept chart weights (same for scheduled; only totals differ).
  const deptChartShare = (deptName: string) =>
    DEPT_ACTUAL.find((d) => d.name === deptName)?.share ?? 0;

  const sorted = [...properties].sort((a, b) => b.total - a.total);
  const grandTotal = sorted.reduce((s, p) => s + p.total, 0);

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
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                Total
              </div>
              <div className="text-lg font-bold tabular-nums" style={{ color: accentColor }}>
                {fmtNum(grandTotal)} hrs
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
                <th className="py-2 font-semibold text-right w-28">OT Hours</th>
                <th className="py-2 font-semibold text-right w-20">% Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const propOpen = openProps.has(p.hotelId);
                const propPct = grandTotal > 0 ? (p.total / grandTotal) * 100 : 0;
                return (
                  <React.Fragment key={p.hotelId}>
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => togglePropKey(p.hotelId, openProps, setOpenProps)}
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
                        {fmtNum(p.total)}
                      </td>
                      <td className="py-2.5 text-right text-gray-600 tabular-nums">
                        {propPct.toFixed(1)}%
                      </td>
                    </tr>
                    {propOpen &&
                      OT_HIERARCHY.map((div) => {
                        const divShare = div.departments.reduce(
                          (s, d) => s + deptChartShare(d.name),
                          0,
                        );
                        const divHours = p.total * divShare;
                        if (divHours < 0.5) return null;
                        const divKey = `${p.hotelId}::${div.name}`;
                        const divOpen = openDivs.has(divKey);
                        const divPct = grandTotal > 0 ? (divHours / grandTotal) * 100 : 0;
                        return (
                          <React.Fragment key={divKey}>
                            <tr
                              className="border-b border-gray-100 bg-gray-50/40 hover:bg-gray-50 cursor-pointer"
                              onClick={() =>
                                togglePropKey(divKey, openDivs, setOpenDivs)
                              }
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
                                {fmtNum(divHours)}
                              </td>
                              <td className="py-2 text-right text-gray-600 tabular-nums">
                                {divPct.toFixed(1)}%
                              </td>
                            </tr>
                            {divOpen &&
                              div.departments.map((dept) => {
                                const deptShare = deptChartShare(dept.name);
                                const deptHours = p.total * deptShare;
                                if (deptHours < 0.5) return null;
                                const deptPct =
                                  grandTotal > 0 ? (deptHours / grandTotal) * 100 : 0;
                                return (
                                  <React.Fragment key={`${divKey}::${dept.name}`}>
                                    <tr className="border-b border-gray-100">
                                      <td className="py-2 pr-2 pl-14">
                                        <span className="text-slate-navy">{dept.name}</span>
                                      </td>
                                      <td className="py-2 text-right text-slate-navy tabular-nums">
                                        {fmtNum(deptHours)}
                                      </td>
                                      <td className="py-2 text-right text-gray-600 tabular-nums">
                                        {deptPct.toFixed(1)}%
                                      </td>
                                    </tr>
                                    {dept.jobs.map((job) => {
                                      const jobHours = deptHours * job.share;
                                      const jobPct =
                                        grandTotal > 0 ? (jobHours / grandTotal) * 100 : 0;
                                      return (
                                        <tr
                                          key={`${divKey}::${dept.name}::${job.name}`}
                                          className="border-b border-gray-50"
                                        >
                                          <td className="py-1.5 pr-2 pl-20 text-gray-600">
                                            {job.name}
                                          </td>
                                          <td className="py-1.5 text-right text-gray-700 tabular-nums">
                                            {fmtNum(jobHours)}
                                          </td>
                                          <td className="py-1.5 text-right text-gray-500 tabular-nums">
                                            {jobPct.toFixed(1)}%
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

export const OvertimeIntelligence: React.FC<OvertimeIntelligenceProps> = ({ metrics, hotelNameById }) => {
  const [detailsView, setDetailsView] = useState<'actual' | 'scheduled' | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const perProperty = useMemo(() => {
    return metrics.map((m) => {
      const blendedRate = m.actualHours > 0 ? m.actualCost / m.actualHours : 0;
      const last7Actual = m.actualOvertimeHours * (7 / 30);
      const next7Scheduled = m.scheduledOvertimeHours * (7 / 30);
      const last7Hours = m.actualHours * (7 / 30);
      const last7Cost = last7Actual * blendedRate * 1.5;
      const otPct = last7Hours > 0 ? (last7Actual / last7Hours) * 100 : 0;
      const preventable = next7Scheduled * blendedRate * 1.5 * 0.6;
      return {
        hotelId: m.hotelId,
        hotelName: hotelNameById?.get(m.hotelId) ?? m.hotelId,
        last7Actual,
        next7Scheduled,
        last7Cost,
        otPct,
        preventable,
      };
    });
  }, [metrics, hotelNameById]);

  const totals = useMemo(() => {
    const actualHours = metrics.reduce((s, m) => s + m.actualHours, 0);
    const actualOT = metrics.reduce((s, m) => s + m.actualOvertimeHours, 0);
    const scheduledOT = metrics.reduce((s, m) => s + m.scheduledOvertimeHours, 0);
    const blendedRate =
      actualHours > 0
        ? metrics.reduce((s, m) => s + m.actualCost, 0) / actualHours
        : 0;

    const last7Actual = actualOT * (7 / 30);
    const next7Scheduled = scheduledOT * (7 / 30);
    const last7Hours = actualHours * (7 / 30);
    const last7Cost = last7Actual * blendedRate * 1.5;
    const otPct = last7Hours > 0 ? (last7Actual / last7Hours) * 100 : 0;
    const preventable = next7Scheduled * blendedRate * 1.5 * 0.6;

    return {
      last7Actual,
      next7Scheduled,
      last7Cost,
      otPct,
      preventable,
    };
  }, [metrics]);

  const contribActualHours: PropContribution[] = perProperty.map((p) => ({
    hotelId: p.hotelId,
    hotelName: p.hotelName,
    amount: p.last7Actual,
    display: `${fmtNum(p.last7Actual)} hrs`,
  }));
  const contribScheduledHours: PropContribution[] = perProperty.map((p) => ({
    hotelId: p.hotelId,
    hotelName: p.hotelName,
    amount: p.next7Scheduled,
    display: `${fmtNum(p.next7Scheduled)} hrs`,
  }));
  const contribOTCost: PropContribution[] = perProperty.map((p) => ({
    hotelId: p.hotelId,
    hotelName: p.hotelName,
    amount: p.last7Cost,
    display: fmtCurrency0(p.last7Cost),
  }));
  const contribOTPct: PropContribution[] = perProperty.map((p) => ({
    hotelId: p.hotelId,
    hotelName: p.hotelName,
    amount: p.otPct,
    display: `${p.otPct.toFixed(1)}%`,
  }));
  const contribPreventable: PropContribution[] = perProperty.map((p) => ({
    hotelId: p.hotelId,
    hotelName: p.hotelName,
    amount: p.preventable,
    display: fmtCurrency0(p.preventable),
  }));

  const actualByDept = useMemo(
    () => DEPT_ACTUAL.map((d) => ({ name: d.name, value: totals.last7Actual * d.share })),
    [totals.last7Actual],
  );
  const scheduledByDept = useMemo(
    () => DEPT_SCHEDULED.map((d) => ({ name: d.name, value: totals.next7Scheduled * d.share })),
    [totals.next7Scheduled],
  );

  const hotspots = useMemo(() => {
    const top = [...actualByDept].sort((a, b) => b.value - a.value).slice(0, 3);
    return top.map((row, i) => {
      const hours = Math.round(row.value);
      let level: 'High' | 'Medium' | 'Low';
      if (i === 0) level = 'High';
      else if (i === 1) level = 'High';
      else level = 'Medium';
      return { rank: i + 1, name: row.name, hours, level };
    });
  }, [actualByDept]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-navy">Overtime Intelligence</h2>
          <p className="text-sm text-gray-500 mt-1">
            Look-back on incurred overtime and look-ahead on scheduled exposure for the portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-dark/5 text-teal-dark text-xs font-semibold">
            <CalendarRange className="w-4 h-4" />
            Last 7 / Next 7 Days
          </div>
          <ExportButton sectionLabel="Overtime Intelligence" />
          <CollapseToggle
            collapsed={collapsed}
            onToggle={() => setCollapsed((v) => !v)}
            sectionLabel="Overtime Intelligence"
          />
        </div>
      </div>

      {!collapsed && (
        <>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Actual OT Hours"
          value={fmtNum(totals.last7Actual)}
          subtext="Last 7 Days"
          icon={<Clock className="w-7 h-7" />}
          accent="teal"
          popoverTitle="Actual OT by property"
          contributions={contribActualHours}
          totalLabel={`${fmtNum(totals.last7Actual)} hrs total`}
        />
        <KpiCard
          label="Scheduled OT Hours"
          value={fmtNum(totals.next7Scheduled)}
          subtext="Next 7 Days"
          icon={<CalendarDays className="w-7 h-7" />}
          accent="blue"
          popoverTitle="Scheduled OT by property"
          contributions={contribScheduledHours}
          totalLabel={`${fmtNum(totals.next7Scheduled)} hrs total`}
        />
        <KpiCard
          label="OT Cost"
          value={fmtCurrency0(totals.last7Cost)}
          subtext="Last 7 Days"
          icon={<DollarSign className="w-7 h-7" />}
          accent="teal"
          popoverTitle="OT cost by property"
          contributions={contribOTCost}
          totalLabel={`${fmtCurrency0(totals.last7Cost)} total`}
        />
        <KpiCard
          label="OT %"
          value={`${totals.otPct.toFixed(1)}%`}
          subtext="Last 7 Days"
          icon={<PieChart className="w-7 h-7" />}
          accent="teal"
          popoverTitle="OT % by property"
          contributions={contribOTPct}
          totalLabel={`${totals.otPct.toFixed(1)}% portfolio`}
        />
        <KpiCard
          label="Preventable OT Opportunity"
          value={fmtCurrency0(totals.preventable)}
          subtext="Next 7 Days"
          icon={<Target className="w-7 h-7" />}
          accent="orange"
          popoverTitle="Preventable OT by property"
          contributions={contribPreventable}
          totalLabel={`${fmtCurrency0(totals.preventable)} total`}
        />
      </div>

      {/* Bar charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeptBarChart
          title="Actual OT"
          subtitle="Overtime already incurred by department (Last 7 Days)"
          icon={<BarChart3 className="w-5 h-5" />}
          data={actualByDept}
          barColor="#0D3B66"
          onViewDetails={() => setDetailsView('actual')}
        />
        <DeptBarChart
          title="Scheduled OT"
          subtitle="Overtime exposure in upcoming schedule (Next 7 Days)"
          icon={<CalendarRange className="w-5 h-5" />}
          data={scheduledByDept}
          barColor="#2F80ED"
          onViewDetails={() => setDetailsView('scheduled')}
        />
      </div>

      {/* Hotspots */}
      <div className="grid grid-cols-1 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-teal-dark">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-navy">OT Hotspots</div>
          </div>
          <ul className="space-y-3">
            {hotspots.map((h) => {
              const levelClass =
                h.level === 'High'
                  ? 'bg-orange text-white'
                  : h.level === 'Medium'
                  ? 'bg-amber-400 text-white'
                  : 'bg-emerald-500 text-white';
              return (
                <li key={h.name} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-dark text-white text-xs font-bold flex-shrink-0">
                    {h.rank}
                  </div>
                  <div className="flex-1 text-sm font-semibold text-slate-navy">{h.name}</div>
                  <div className="text-sm text-gray-600 tabular-nums">
                    {h.hours.toLocaleString()} OT Hours
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${levelClass}`}>
                    {h.level}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {detailsView && (
        <OTBreakdownModal
          title={detailsView === 'actual' ? 'Actual OT Breakdown' : 'Scheduled OT Breakdown'}
          subtitle={
            detailsView === 'actual'
              ? 'Property > Division > Department > Job (Last 7 Days)'
              : 'Property > Division > Department > Job (Next 7 Days)'
          }
          accentColor={detailsView === 'actual' ? '#0D3B66' : '#2F80ED'}
          properties={perProperty.map((p) => ({
            hotelId: p.hotelId,
            hotelName: p.hotelName,
            total: detailsView === 'actual' ? p.last7Actual : p.next7Scheduled,
          }))}
          onClose={() => setDetailsView(null)}
        />
      )}
        </>
      )}
    </div>
  );
};

export default OvertimeIntelligence;
