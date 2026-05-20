import React, { useMemo, useState } from 'react';
import {
  Clock,
  ClipboardCheck,
  ArrowRight,
  Target,
  AlertTriangle,
  ShieldCheck,
  Gauge,
  CalendarClock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { LaborMetrics } from '../../types';
import { MetricCard } from '../ui/Card';

interface MidMonthForecastProps {
  metrics: LaborMetrics[];
  hotelNameById?: Map<string, string>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtNum = (n: number) => Math.round(n).toLocaleString();
const fmtSignedParen = (n: number) => (n < 0 ? `(${fmtNum(Math.abs(n))})` : fmtNum(n));
const fmtPct = (n: number, digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
const fmtCurrencyK = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const confidenceLabel = (pct: number): string => {
  if (pct >= 85) return 'High';
  if (pct >= 70) return 'Medium-High';
  if (pct >= 55) return 'Medium';
  if (pct >= 40) return 'Low-Medium';
  return 'Low';
};

interface PropertyForecast {
  hotelId: string;
  hotelName: string;
  mtdBudget: number;
  mtdActual: number;
  remainingBudget: number;
  remainingForecast: number;
  projected: number;
  budget: number;
  variance: number;
  variancePct: number;
  blendedRate: number;
}

type KpiMetricKey = 'mtdActual' | 'mtdBudget' | 'remainingForecast' | 'projected' | 'variance' | 'confidence';

interface PropertyRow {
  hotelId: string;
  hotelName: string;
  primary: string;
  secondary?: string;
  bad?: boolean;
}

const buildPropertyRows = (key: KpiMetricKey, items: PropertyForecast[]): PropertyRow[] => {
  switch (key) {
    case 'mtdActual':
      return items.map((p) => ({
        hotelId: p.hotelId,
        hotelName: p.hotelName,
        primary: `${fmtNum(p.mtdActual)} hrs`,
        secondary: `vs ${fmtNum(p.mtdBudget)} MTD budget`,
      }));
    case 'mtdBudget':
      return items.map((p) => ({
        hotelId: p.hotelId,
        hotelName: p.hotelName,
        primary: `${fmtNum(p.mtdBudget)} hrs`,
        secondary: `${fmtNum(p.budget)} full-month`,
      }));
    case 'remainingForecast':
      return items.map((p) => ({
        hotelId: p.hotelId,
        hotelName: p.hotelName,
        primary: `${fmtNum(p.remainingForecast)} hrs`,
        secondary: `vs ${fmtNum(p.remainingBudget)} remaining budget`,
      }));
    case 'projected':
      return items.map((p) => ({
        hotelId: p.hotelId,
        hotelName: p.hotelName,
        primary: `${fmtNum(p.projected)} hrs`,
        secondary: `vs ${fmtNum(p.budget)} budget`,
      }));
    case 'variance':
      return items
        .slice()
        .sort((a, b) => a.variance - b.variance)
        .map((p) => ({
          hotelId: p.hotelId,
          hotelName: p.hotelName,
          primary: `${fmtSignedParen(p.variance)} hrs`,
          secondary: `${fmtPct(p.variancePct)} vs budget`,
          bad: p.variance < 0,
        }));
    case 'confidence': {
      // Mock per-property confidence: derive from |variance%| — smaller deviation = higher confidence
      return items.map((p) => {
        const conf = Math.max(40, Math.min(95, 92 - Math.abs(p.variancePct) * 1.2));
        return {
          hotelId: p.hotelId,
          hotelName: p.hotelName,
          primary: `${Math.round(conf)}%`,
          secondary: confidenceLabel(conf),
        };
      });
    }
  }
};

interface KpiHoverCardProps {
  metricKey: KpiMetricKey;
  popoverTitle: string;
  rows: PropertyRow[];
  children: React.ReactNode;
}
const KpiHoverCard: React.FC<KpiHoverCardProps> = ({ popoverTitle, rows, children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && rows.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[260px] max-h-80 overflow-auto">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
            {popoverTitle}
          </div>
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li
                key={r.hotelId}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
                <span className="text-slate-navy truncate flex-1 min-w-0" title={r.hotelName}>
                  {r.hotelName}
                </span>
                <span className="flex-shrink-0 text-right">
                  <span className={`font-semibold tabular-nums ${r.bad ? 'text-orange' : 'text-slate-navy'}`}>
                    {r.primary}
                  </span>
                  {r.secondary && (
                    <span className="block text-[10px] text-gray-500 mt-0.5">{r.secondary}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const MidMonthForecast: React.FC<MidMonthForecastProps> = ({ metrics, hotelNameById }) => {
  const now = new Date();
  const monthIdx = now.getMonth();
  const year = now.getFullYear();
  const monthName = MONTH_NAMES[monthIdx];
  const monthAbbr = MONTH_ABBR[monthIdx];
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const mtdFraction = dayOfMonth / daysInMonth;
  const tomorrow = Math.min(dayOfMonth + 1, daysInMonth);

  const MTD_EFFICIENCY = 0.877;
  const REMAINING_EFFICIENCY = 0.914;

  const perProperty = useMemo<PropertyForecast[]>(() => {
    return metrics.map((m) => {
      const mtdBudget = m.budgetedHours * mtdFraction;
      const mtdActual = mtdBudget * MTD_EFFICIENCY;
      const remainingBudget = m.budgetedHours * (1 - mtdFraction);
      const remainingForecast = remainingBudget * REMAINING_EFFICIENCY;
      const projected = mtdActual + remainingForecast;
      const variance = projected - m.budgetedHours;
      const variancePct = m.budgetedHours > 0 ? (variance / m.budgetedHours) * 100 : 0;
      const blendedRate = m.actualHours > 0 ? m.actualCost / m.actualHours : 0;
      return {
        hotelId: m.hotelId,
        hotelName: hotelNameById?.get(m.hotelId) ?? m.hotelId,
        mtdBudget,
        mtdActual,
        remainingBudget,
        remainingForecast,
        projected,
        budget: m.budgetedHours,
        variance,
        variancePct,
        blendedRate,
      };
    });
  }, [metrics, mtdFraction, hotelNameById]);

  const data = useMemo(() => {
    const monthlyBudgetHours = perProperty.reduce((s, p) => s + p.budget, 0);
    const monthlyActualBaseline = metrics.reduce((s, m) => s + m.actualHours, 0);
    const totalActualCost = metrics.reduce((s, m) => s + m.actualCost, 0);
    const blendedRate = monthlyActualBaseline > 0 ? totalActualCost / monthlyActualBaseline : 0;

    const mtdBudgetHours = perProperty.reduce((s, p) => s + p.mtdBudget, 0);
    const mtdActualHours = perProperty.reduce((s, p) => s + p.mtdActual, 0);
    const remainingBudgetHours = perProperty.reduce((s, p) => s + p.remainingBudget, 0);
    const remainingForecastHours = perProperty.reduce((s, p) => s + p.remainingForecast, 0);
    const projectedMonthEnd = mtdActualHours + remainingForecastHours;
    const projectedVariance = projectedMonthEnd - monthlyBudgetHours;
    const projectedVariancePct = monthlyBudgetHours > 0 ? (projectedVariance / monthlyBudgetHours) * 100 : 0;
    const recoveryGapHours = Math.max(0, -projectedVariance);
    const recoveryGapDollars = recoveryGapHours * blendedRate;
    const forecastConfidence = 78;

    const mtdPctOfMonth = Math.round(mtdFraction * 100);
    const remainingPctOfMonth = 100 - mtdPctOfMonth;

    return {
      monthlyBudgetHours,
      mtdBudgetHours,
      mtdActualHours,
      remainingBudgetHours,
      remainingForecastHours,
      projectedMonthEnd,
      projectedVariance,
      projectedVariancePct,
      recoveryGapHours,
      recoveryGapDollars,
      forecastConfidence,
      blendedRate,
      mtdPctOfMonth,
      remainingPctOfMonth,
    };
  }, [metrics, perProperty, mtdFraction]);

  const asOfLabel = `as of ${monthAbbr} ${dayOfMonth}`;
  const remainingLabel = `${monthAbbr} ${tomorrow} – ${monthAbbr} ${daysInMonth}`;
  const monthRangeLabel = `${monthAbbr} 1 – ${monthAbbr} ${daysInMonth}`;
  const varianceIsUnfavorable = data.projectedVariance < 0;
  const varianceColorClass = varianceIsUnfavorable ? 'text-orange' : 'text-emerald-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-navy">Mid-Month Forecast</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Projecting where {monthName} {year} will land based on month-to-date performance.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full bg-teal-dark/5 text-teal-dark px-3 py-1.5 text-xs font-medium">
          <CalendarClock className="w-3.5 h-3.5" />
          <span>{monthRangeLabel}</span>
          <span className="text-teal-dark/40">•</span>
          <span>Day {dayOfMonth} of {daysInMonth}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiHoverCard
          metricKey="mtdActual"
          popoverTitle="MTD Actual Hours by property"
          rows={buildPropertyRows('mtdActual', perProperty)}
        >
          <MetricCard
            label="MTD Actual Hours"
            value={fmtNum(data.mtdActualHours)}
            subtext={asOfLabel}
            icon={<Clock className="w-8 h-8" />}
            accent="teal"
          />
        </KpiHoverCard>
        <KpiHoverCard
          metricKey="mtdBudget"
          popoverTitle="MTD Budget Hours by property"
          rows={buildPropertyRows('mtdBudget', perProperty)}
        >
          <MetricCard
            label="MTD Budget Hours"
            value={fmtNum(data.mtdBudgetHours)}
            subtext={asOfLabel}
            icon={<ClipboardCheck className="w-8 h-8" />}
            accent="indigo"
          />
        </KpiHoverCard>
        <KpiHoverCard
          metricKey="remainingForecast"
          popoverTitle="Remaining Forecast Hours by property"
          rows={buildPropertyRows('remainingForecast', perProperty)}
        >
          <MetricCard
            label="Remaining Forecast Hours"
            value={fmtNum(data.remainingForecastHours)}
            subtext={remainingLabel}
            icon={<ArrowRight className="w-8 h-8" />}
            accent="teal"
          />
        </KpiHoverCard>
        <KpiHoverCard
          metricKey="projected"
          popoverTitle="Projected Month-End Hours by property"
          rows={buildPropertyRows('projected', perProperty)}
        >
          <MetricCard
            label="Projected Month-End Hours"
            value={fmtNum(data.projectedMonthEnd)}
            subtext={`vs ${fmtNum(data.monthlyBudgetHours)} budget`}
            icon={<Target className="w-8 h-8" />}
            accent="indigo"
          />
        </KpiHoverCard>
        <KpiHoverCard
          metricKey="variance"
          popoverTitle="Projected Variance by property (worst first)"
          rows={buildPropertyRows('variance', perProperty)}
        >
          <MetricCard
            label="Projected Variance"
            value={
              <span className={varianceColorClass}>
                {fmtSignedParen(data.projectedVariance)}
              </span>
            }
            subtext={
              <span className={varianceColorClass}>
                {fmtPct(data.projectedVariancePct)} vs Budget
              </span>
            }
            icon={<AlertTriangle className="w-8 h-8" />}
            accent="orange"
          />
        </KpiHoverCard>
        <KpiHoverCard
          metricKey="confidence"
          popoverTitle="Forecast Confidence by property"
          rows={buildPropertyRows('confidence', perProperty)}
        >
          <MetricCard
            label="Forecast Confidence"
            value={`${data.forecastConfidence}%`}
            subtext={confidenceLabel(data.forecastConfidence)}
            icon={<ShieldCheck className="w-8 h-8" />}
            accent="emerald"
          />
        </KpiHoverCard>
      </div>

      {/* Forecast Build-Up: full width */}
      <div className="metric-card">
        <div className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-3">
          Forecast Build-Up
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-stretch gap-2">
          <StepCard
            num={1}
            title="Month-to-Date Actuals"
            primary={`${fmtNum(data.mtdActualHours)} hrs`}
            secondary={`${data.mtdPctOfMonth}% of month complete`}
            tone="teal"
          />
          <StepArrow />
          <StepCard
            num={2}
            title="Remaining Forecast"
            primary={`${fmtNum(data.remainingForecastHours)} hrs`}
            secondary={`${data.remainingPctOfMonth}% of month remaining`}
            tone="indigo"
          />
          <StepArrow />
          <StepCard
            num={3}
            title="Projected Month-End"
            primary={`${fmtNum(data.projectedMonthEnd)} hrs`}
            secondary={
              <span className={`${varianceColorClass} font-semibold`}>
                {fmtSignedParen(data.projectedVariance)} vs budget ({fmtPct(data.projectedVariancePct)})
              </span>
            }
            tone="orange"
          />
        </div>
      </div>

      {/* Chart + Recovery Gap row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-9 metric-card">
          <ForecastTrendChart
            daysInMonth={daysInMonth}
            today={dayOfMonth}
            monthAbbr={monthAbbr}
            monthlyBudgetHours={data.monthlyBudgetHours}
            mtdActualHours={data.mtdActualHours}
            projectedMonthEnd={data.projectedMonthEnd}
          />
        </div>

        {/* Recovery Gap aligned to chart height */}
        <div className="lg:col-span-3 flex">
          <div className="metric-card flex flex-col w-full">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange/10 text-orange flex-shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-slate-navy">Recovery Gap</div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-5 py-4">
              <div className="text-center">
                <div className="text-4xl font-semibold text-slate-navy tabular-nums leading-none">
                  {fmtNum(data.recoveryGapHours)}
                </div>
                <div className="text-xs text-gray-500 mt-1.5">hours to recover plan</div>
              </div>

              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-400">
                <span className="flex-1 h-px bg-gray-200" />
                <span>or</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="text-center">
                <div className="text-4xl font-semibold text-orange tabular-nums leading-none">
                  {fmtCurrencyK(data.recoveryGapDollars)}
                </div>
                <div className="text-xs text-gray-500 mt-1.5">at blended labor rate</div>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 text-center border-t border-gray-100 pt-3">
              Effort required to close the projected month-end gap
            </div>
          </div>
        </div>
      </div>

      {/* Daily breakdown table */}
      <div className="metric-card">
        <DailyBreakdownTable
          perProperty={perProperty}
          daysInMonth={daysInMonth}
          today={dayOfMonth}
          monthAbbr={monthAbbr}
          mtdEfficiency={MTD_EFFICIENCY}
          remainingEfficiency={REMAINING_EFFICIENCY}
        />
      </div>
    </div>
  );
};

interface StepCardProps {
  num: number;
  title: string;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  tone: 'teal' | 'indigo' | 'orange';
}
const TONE_CLASSES: Record<StepCardProps['tone'], { badge: string; border: string }> = {
  teal: { badge: 'bg-teal-dark text-white', border: 'border-teal-dark/20' },
  indigo: { badge: 'bg-indigo-600 text-white', border: 'border-indigo-200' },
  orange: { badge: 'bg-orange text-white', border: 'border-orange/30' },
};
const StepCard: React.FC<StepCardProps> = ({ num, title, primary, secondary, tone }) => {
  const t = TONE_CLASSES[tone];
  return (
    <div className={`flex-1 min-w-0 rounded-lg border ${t.border} bg-white p-4`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${t.badge}`}>
          {num}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate">
          {title}
        </div>
      </div>
      <div className="mt-2.5 text-xl font-semibold text-slate-navy tabular-nums">{primary}</div>
      <div className="text-xs text-gray-500 mt-1">{secondary}</div>
    </div>
  );
};

const StepArrow: React.FC = () => (
  <div className="hidden md:flex items-center justify-center text-gray-300 flex-shrink-0 px-1">
    <ArrowRight className="w-5 h-5" />
  </div>
);

interface ForecastTrendChartProps {
  daysInMonth: number;
  today: number;
  monthAbbr: string;
  monthlyBudgetHours: number;
  mtdActualHours: number;
  projectedMonthEnd: number;
}

const ForecastTrendChart: React.FC<ForecastTrendChartProps> = ({
  daysInMonth,
  today,
  monthAbbr,
  monthlyBudgetHours,
  mtdActualHours,
  projectedMonthEnd,
}) => {
  const width = 720;
  const height = 260;
  const pad = { top: 28, right: 24, bottom: 30, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const yMax = Math.ceil((Math.max(monthlyBudgetHours, projectedMonthEnd) * 1.1) / 5000) * 5000;
  const yMaxSafe = yMax > 0 ? yMax : 20000;

  const xAt = (day: number) => pad.left + ((day - 1) / (daysInMonth - 1)) * innerW;
  const yAt = (val: number) => pad.top + innerH - (val / yMaxSafe) * innerH;

  const budgetPath = `M ${xAt(1)} ${yAt(0)} L ${xAt(daysInMonth)} ${yAt(monthlyBudgetHours)}`;
  const actualSolidPath = `M ${xAt(1)} ${yAt(0)} L ${xAt(today)} ${yAt(mtdActualHours)}`;
  const actualDashedPath = `M ${xAt(today)} ${yAt(mtdActualHours)} L ${xAt(daysInMonth)} ${yAt(projectedMonthEnd)}`;

  const yTicks = [0, yMaxSafe * 0.25, yMaxSafe * 0.5, yMaxSafe * 0.75, yMaxSafe];
  const fmtTick = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v)));

  // Build x-axis ticks: 1, 8, 15, 22, last — drop any tick that would collide with the Today marker
  const baseTicks = [1, 8, 15, 22, daysInMonth];
  const xLabelDays = baseTicks.filter((d) => d === 1 || d === daysInMonth || Math.abs(d - today) > 2);

  return (
    <div>
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-navy">Projected Trend: Actual vs Budget</div>
        <div className="flex items-center gap-4 text-xs mt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-indigo-600" />
            <span className="text-gray-600">Budget (Cumulative)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-teal" />
            <span className="text-gray-600">Projected Actual (Cumulative)</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Projected trend chart">
        {/* Y gridlines + labels */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={yAt(v)}
              y2={yAt(v)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={pad.left - 8}
              y={yAt(v) + 4}
              textAnchor="end"
              className="fill-gray-500"
              style={{ fontSize: 11 }}
            >
              {fmtTick(v)}
            </text>
          </g>
        ))}
        <text
          x={12}
          y={pad.top + innerH / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${pad.top + innerH / 2})`}
          className="fill-gray-500"
          style={{ fontSize: 11 }}
        >
          Hours
        </text>

        {/* X axis labels */}
        {xLabelDays.map((d) => (
          <text
            key={d}
            x={xAt(d)}
            y={pad.top + innerH + 18}
            textAnchor="middle"
            className="fill-gray-500"
            style={{ fontSize: 11 }}
          >
            {monthAbbr} {d}
          </text>
        ))}

        {/* Today vertical marker */}
        <line
          x1={xAt(today)}
          x2={xAt(today)}
          y1={pad.top}
          y2={pad.top + innerH}
          stroke="#9ca3af"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <rect
          x={xAt(today) - 22}
          y={pad.top - 18}
          width={44}
          height={16}
          rx={8}
          fill="#475569"
        />
        <text
          x={xAt(today)}
          y={pad.top - 6}
          textAnchor="middle"
          className="fill-white"
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          Today
        </text>

        {/* Budget line (solid indigo) */}
        <path d={budgetPath} fill="none" stroke="#4f46e5" strokeWidth={2.5} />

        {/* Actual cumulative: solid up to today, dashed after */}
        <path d={actualSolidPath} fill="none" stroke="#0D9488" strokeWidth={2.5} />
        <path d={actualDashedPath} fill="none" stroke="#0D9488" strokeWidth={2.5} strokeDasharray="6 4" />

        {/* End-of-month dots */}
        <circle cx={xAt(daysInMonth)} cy={yAt(monthlyBudgetHours)} r={4} fill="#4f46e5" />
        <circle cx={xAt(daysInMonth)} cy={yAt(projectedMonthEnd)} r={4} fill="#0D9488" />

        {/* Today actual dot */}
        <circle cx={xAt(today)} cy={yAt(mtdActualHours)} r={3.5} fill="#0D9488" />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Daily Breakdown Table
// ---------------------------------------------------------------------------

interface DeptShare {
  name: string;
  share: number; // share of property total
}
interface DivisionStruct {
  name: string;
  departments: DeptShare[];
}

// Department shares within the property (sum across all = 1.0)
const DAILY_DIVISIONS: DivisionStruct[] = [
  { name: 'Rooms', departments: [
    { name: 'Front Office', share: 0.10 },
    { name: 'Housekeeping', share: 0.30 },
    { name: 'Reservations', share: 0.03 },
  ]},
  { name: 'Food & Beverage', departments: [
    { name: 'Restaurants', share: 0.10 },
    { name: 'Banquets', share: 0.08 },
    { name: 'Bars & Lounges', share: 0.04 },
  ]},
  { name: 'Kitchen & Stewarding', departments: [
    { name: 'Main Kitchen', share: 0.12 },
    { name: 'Stewarding', share: 0.04 },
  ]},
  { name: 'Administrative & General', departments: [
    { name: 'Executive Office', share: 0.02 },
    { name: 'Accounting', share: 0.02 },
    { name: 'Human Resources', share: 0.01 },
  ]},
  { name: 'Sales & Marketing', departments: [
    { name: 'Sales & Marketing', share: 0.04 },
  ]},
  { name: 'Engineering', departments: [
    { name: 'Maintenance', share: 0.08 },
    { name: 'Grounds', share: 0.02 },
  ]},
];

// Renormalize so all department shares sum to exactly 1.0
const NORMALIZED_DIVISIONS: DivisionStruct[] = (() => {
  const total = DAILY_DIVISIONS.reduce(
    (s, d) => s + d.departments.reduce((ss, dd) => ss + dd.share, 0),
    0
  );
  return DAILY_DIVISIONS.map((d) => ({
    name: d.name,
    departments: d.departments.map((dd) => ({ name: dd.name, share: dd.share / total })),
  }));
})();

// Deterministic per-(seed) jitter in 0.85..1.15
function dailyJitter(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  const v = ((h >>> 0) % 1000) / 1000;
  return 0.85 + v * 0.30;
}

interface DailyBreakdownTableProps {
  perProperty: PropertyForecast[];
  daysInMonth: number;
  today: number;
  monthAbbr: string;
  mtdEfficiency: number;
  remainingEfficiency: number;
}

const DailyBreakdownTable: React.FC<DailyBreakdownTableProps> = ({
  perProperty,
  daysInMonth,
  today,
  monthAbbr,
  mtdEfficiency,
  remainingEfficiency,
}) => {
  const [expandedProps, setExpandedProps] = useState<Set<string>>(new Set());
  const [expandedDivs, setExpandedDivs] = useState<Set<string>>(new Set());

  const toggleProp = (id: string) =>
    setExpandedProps((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleDiv = (key: string) =>
    setExpandedDivs((curr) => {
      const next = new Set(curr);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Per-property daily hours array (length = daysInMonth), scaled so that
  // sum(d=1..today) === p.mtdActual and sum(d=today+1..N) === p.remainingForecast
  const propertyDaily = useMemo(() => {
    return perProperty.map((p) => {
      const dB = p.budget / daysInMonth;
      const raw: number[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const eff = d <= today ? mtdEfficiency : remainingEfficiency;
        raw.push(dB * eff * dailyJitter(`${p.hotelId}:${d}`));
      }
      // Rescale actual and forecast segments to match property totals
      const sumActual = raw.slice(0, today).reduce((s, v) => s + v, 0);
      const sumForecast = raw.slice(today).reduce((s, v) => s + v, 0);
      const aK = sumActual > 0 ? p.mtdActual / sumActual : 0;
      const fK = sumForecast > 0 ? p.remainingForecast / sumForecast : 0;
      const scaled = raw.map((v, i) => (i < today ? v * aK : v * fK));
      const dailyBudget = Array.from({ length: daysInMonth }, () => dB);
      return {
        hotelId: p.hotelId,
        hotelName: p.hotelName,
        daily: scaled,
        dailyBudget,
        total: p.projected,
        budgetTotal: p.budget,
      };
    });
  }, [perProperty, daysInMonth, today, mtdEfficiency, remainingEfficiency]);

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Build week blocks: [1-7], [8-14], [15-21], [22-28], [29-N]
  const weeks = useMemo(() => {
    const out: { label: string; startDay: number; endDay: number }[] = [];
    let start = 1;
    while (start <= daysInMonth) {
      const end = Math.min(start + 6, daysInMonth);
      out.push({ label: `${start}–${end}`, startDay: start, endDay: end });
      start = end + 1;
    }
    return out;
  }, [daysInMonth]);

  // Default to the week containing today
  const initialWeekIdx = weeks.findIndex((w) => today >= w.startDay && today <= w.endDay);
  const [activeWeek, setActiveWeek] = useState<number>(initialWeekIdx >= 0 ? initialWeekIdx : 0);
  const safeActive = Math.min(activeWeek, weeks.length - 1);
  const currentWeek = weeks[safeActive];
  const visibleDays = useMemo(
    () => days.filter((d) => d >= currentWeek.startDay && d <= currentWeek.endDay),
    [days, currentWeek]
  );

  const fmtCell = (n: number) => Math.round(n).toLocaleString();

  // Color rules:
  //   day <= today  -> Actual  (green)
  //   day >  today  -> Forecast/Projected (yellow)
  //   budget        -> blue
  const actualColor = (day: number) => (day <= today ? 'text-emerald-600' : 'text-amber-500 italic');
  const BUDGET_COLOR = 'text-blue-600';

  const renderPair = (actual: number, budget: number, day: number, isToday: boolean, padY: string) => (
    <td
      key={day}
      className={`${padY} text-right tabular-nums whitespace-nowrap ${
        isToday ? 'bg-teal-dark/5 border-x border-teal-dark/20' : ''
      }`}
    >
      <div className="flex items-baseline justify-end gap-2 leading-tight">
        <span className={`font-semibold ${actualColor(day)}`}>{fmtCell(actual)}</span>
        <span className={`${BUDGET_COLOR} font-normal`}>{fmtCell(budget)}</span>
      </div>
    </td>
  );

  const renderTotalPair = (actual: number, budget: number, padY: string, allActual: boolean) => (
    <td
      className={`${padY} text-right tabular-nums whitespace-nowrap bg-gray-50 border-l border-gray-200`}
    >
      <div className="flex items-baseline justify-end gap-2 leading-tight">
        <span className={`font-semibold ${allActual ? 'text-emerald-600' : 'text-amber-500'}`}>
          {fmtCell(actual)}
        </span>
        <span className={`${BUDGET_COLOR} font-normal`}>{fmtCell(budget)}</span>
      </div>
    </td>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-navy">Daily Hours Breakdown</div>
          <div className="flex items-center gap-3 text-[11px] mt-1">
            <span className="font-semibold text-emerald-600">Actuals</span>
            <span className="text-gray-300">·</span>
            <span className="font-semibold text-amber-500">Projected Actuals</span>
            <span className="text-gray-300">·</span>
            <span className="font-semibold text-blue-600">Budget</span>
          </div>
        </div>
      </div>

      {/* Week tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {weeks.map((w, i) => {
          const isActive = i === safeActive;
          const containsToday = today >= w.startDay && today <= w.endDay;
          return (
            <button
              key={w.label}
              onClick={() => setActiveWeek(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-teal-dark text-white border-teal-dark'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>
                {monthAbbr} {w.startDay}–{w.endDay}
              </span>
              {containsToday && (
                <span
                  className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-white' : 'bg-teal-dark'
                  }`}
                  aria-label="contains today"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '260px' }} />
            {visibleDays.map((d) => (
              <col key={d} />
            ))}
            <col style={{ width: '120px' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left font-semibold text-gray-600 px-3 py-2 border-r border-gray-200">
                Property / Division / Department
              </th>
              {visibleDays.map((d) => (
                <th
                  key={d}
                  className={`text-right font-semibold px-2 py-2 whitespace-nowrap ${
                    d === today
                      ? 'bg-teal-dark/5 text-teal-dark border-x border-teal-dark/20'
                      : d <= today
                      ? 'text-gray-600'
                      : 'text-gray-400'
                  }`}
                >
                  {monthAbbr} {d}
                </th>
              ))}
              <th className="text-right font-semibold text-gray-700 px-3 py-2 whitespace-nowrap bg-gray-100 border-l border-gray-200">
                Month Total
              </th>
            </tr>
          </thead>
          <tbody>
            {propertyDaily.map((p) => {
              const propOpen = expandedProps.has(p.hotelId);
              const allActual = today >= daysInMonth;
              return (
                <React.Fragment key={p.hotelId}>
                  {/* Property row */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50/60">
                    <td className="bg-white px-3 py-2 border-r border-gray-200">
                      <button
                        onClick={() => toggleProp(p.hotelId)}
                        className="flex items-center gap-1.5 text-left w-full font-semibold text-slate-navy"
                      >
                        {propOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="truncate">{p.hotelName}</span>
                      </button>
                    </td>
                    {visibleDays.map((d) =>
                      renderPair(p.daily[d - 1], p.dailyBudget[d - 1], d, d === today, 'px-2 py-2')
                    )}
                    {renderTotalPair(p.total, p.budgetTotal, 'px-3 py-2', allActual)}
                  </tr>

                  {/* Divisions */}
                  {propOpen &&
                    NORMALIZED_DIVISIONS.map((div) => {
                      const divKey = `${p.hotelId}::${div.name}`;
                      const divOpen = expandedDivs.has(divKey);
                      const divShare = div.departments.reduce((s, d) => s + d.share, 0);
                      const divDaily = p.daily.map((v) => v * divShare);
                      const divDailyBudget = p.dailyBudget.map((v) => v * divShare);
                      const divTotal = p.total * divShare;
                      const divBudgetTotal = p.budgetTotal * divShare;
                      return (
                        <React.Fragment key={divKey}>
                          <tr className="border-b border-gray-100 bg-gray-50/40">
                            <td className="bg-gray-50/60 px-3 py-1.5 pl-8 border-r border-gray-200">
                              <button
                                onClick={() => toggleDiv(divKey)}
                                className="flex items-center gap-1.5 text-left w-full text-slate-navy"
                              >
                                {divOpen ? (
                                  <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                )}
                                <span className="truncate">{div.name}</span>
                              </button>
                            </td>
                            {visibleDays.map((d) =>
                              renderPair(divDaily[d - 1], divDailyBudget[d - 1], d, d === today, 'px-2 py-1.5')
                            )}
                            {renderTotalPair(divTotal, divBudgetTotal, 'px-3 py-1.5', allActual)}
                          </tr>

                          {/* Departments */}
                          {divOpen &&
                            div.departments.map((dept) => {
                              const dKey = `${divKey}::${dept.name}`;
                              const dDaily = p.daily.map((v) => v * dept.share);
                              const dDailyBudget = p.dailyBudget.map((v) => v * dept.share);
                              const dTotal = p.total * dept.share;
                              const dBudgetTotal = p.budgetTotal * dept.share;
                              return (
                                <tr key={dKey} className="border-b border-gray-100">
                                  <td className="bg-white px-3 py-1.5 pl-14 border-r border-gray-200 text-gray-600">
                                    {dept.name}
                                  </td>
                                  {visibleDays.map((d) =>
                                    renderPair(dDaily[d - 1], dDailyBudget[d - 1], d, d === today, 'px-2 py-1.5')
                                  )}
                                  {renderTotalPair(dTotal, dBudgetTotal, 'px-3 py-1.5', allActual)}
                                </tr>
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
  );
};

export default MidMonthForecast;
