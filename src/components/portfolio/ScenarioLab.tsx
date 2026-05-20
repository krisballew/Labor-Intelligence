import React, { useMemo, useState } from 'react';
import {
  Users,
  DollarSign,
  BarChart3,
  Clock,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  Clock4,
  RotateCcw,
  Wallet,
  CalendarClock,
  Award,
} from 'lucide-react';
import { LaborMetrics } from '../../types';

interface ScenarioLabProps {
  metrics: LaborMetrics[];
}

type Tone = 'teal' | 'orange';

interface InputDef {
  key: keyof Inputs;
  label: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  step: number;
  tone: Tone;
  format: (v: number) => string;
}

interface Inputs {
  occupancy: number;        // absolute % (e.g., 92)
  wageInflation: number;    // % (e.g., 3.5)
  productivity: number;     // % delta (e.g., +2.0 = 2% better)
  overtimeReduction: number; // % (negative = reduction, e.g., -15)
  agencyLabor: number;      // % of hours covered by agency
  groupDemand: number;      // % change in demand
}

const BASELINE_OCCUPANCY = 80; // baseline occupancy assumption

const DEFAULTS: Inputs = {
  occupancy: 92,
  wageInflation: 3.5,
  productivity: 2.0,
  overtimeReduction: -15,
  agencyLabor: 8,
  groupDemand: 5,
};

const fmtPctSigned = (n: number, digits = 1) =>
  `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
const fmtHours = (n: number) => Math.round(n).toLocaleString();
const fmtCurrencyM = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
};
const INPUT_DEFS: InputDef[] = [
  {
    key: 'occupancy',
    label: 'Occupancy',
    icon: <Users className="w-5 h-5" />,
    min: 40,
    max: 100,
    step: 1,
    tone: 'teal',
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: 'wageInflation',
    label: 'Wage Inflation',
    icon: <DollarSign className="w-5 h-5" />,
    min: 0,
    max: 15,
    step: 0.1,
    tone: 'teal',
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'productivity',
    label: 'Productivity',
    icon: <BarChart3 className="w-5 h-5" />,
    min: -10,
    max: 15,
    step: 0.5,
    tone: 'teal',
    format: (v) => fmtPctSigned(v, 1),
  },
  {
    key: 'overtimeReduction',
    label: 'Overtime Reduction',
    icon: <Clock className="w-5 h-5" />,
    min: -50,
    max: 25,
    step: 1,
    tone: 'orange',
    format: (v) => `${v > 0 ? '+' : ''}${Math.round(v)}%`,
  },
  {
    key: 'agencyLabor',
    label: 'Agency Labor',
    icon: <Briefcase className="w-5 h-5" />,
    min: 0,
    max: 40,
    step: 1,
    tone: 'teal',
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: 'groupDemand',
    label: 'Group Demand',
    icon: <TrendingUp className="w-5 h-5" />,
    min: -25,
    max: 30,
    step: 1,
    tone: 'teal',
    format: (v) => fmtPctSigned(v, 0),
  },
];

const TONE_ACCENT: Record<Tone, string> = {
  teal: 'accent-teal-dark',
  orange: 'accent-orange',
};
const TONE_ICON: Record<Tone, string> = {
  teal: 'text-teal-dark',
  orange: 'text-orange',
};

interface VarianceCellProps {
  baseline: number;
  projected: number;
  format: (n: number) => string;
  /** When true, projected > baseline is unfavorable (cost, hours). */
  higherIsWorse?: boolean;
}

const VarianceCell: React.FC<VarianceCellProps> = ({
  baseline,
  projected,
  format,
  higherIsWorse = true,
}) => {
  const delta = projected - baseline;
  const pct = baseline !== 0 ? (delta / baseline) * 100 : 0;
  const favorable = higherIsWorse ? delta <= 0 : delta >= 0;
  const color = favorable ? 'text-emerald-600' : 'text-orange';
  const arrow = delta === 0 ? '→' : delta > 0 ? '↑' : '↓';
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="text-sm font-bold text-slate-navy tabular-nums">{format(projected)}</div>
      <div className={`text-xs font-semibold tabular-nums ${color}`}>
        {arrow} {format(Math.abs(delta))} ({pct >= 0 ? '+' : ''}
        {pct.toFixed(1)}%)
      </div>
    </div>
  );
};

interface ImpactTableProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  rows: { label: string; icon: React.ReactNode; baseline: number; projected: number }[];
  format: (n: number) => string;
  /** Column header for the baseline + projected pair (e.g., "Hours" or "Cost"). */
  metricLabel: string;
}

const ImpactTable: React.FC<ImpactTableProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  rows,
  format,
  metricLabel,
}) => (
  <div className="metric-card">
    <div className="flex items-start gap-3 mb-3">
      <div style={{ color: iconColor }} className="flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-navy">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200 pb-2 mb-1">
      <div>Baseline</div>
      <div className="text-right">{metricLabel}</div>
      <div className="text-right">Projected vs Baseline</div>
    </div>
    <div className="divide-y divide-gray-100">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center py-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-gray-400 flex-shrink-0">{r.icon}</div>
            <div className="text-sm font-medium text-slate-navy truncate">{r.label}</div>
          </div>
          <div className="text-sm text-gray-600 tabular-nums text-right">
            {format(r.baseline)}
          </div>
          <VarianceCell baseline={r.baseline} projected={r.projected} format={format} />
        </div>
      ))}
    </div>
  </div>
);

interface RiskCardProps {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  valueColor: string;
  subtext: string;
  subtextColor: string;
}

const RiskCard: React.FC<RiskCardProps> = ({
  icon,
  iconColor,
  label,
  value,
  valueColor,
  subtext,
  subtextColor,
}) => (
  <div className="metric-card h-full">
    <div className="flex items-start gap-3">
      <div style={{ color: iconColor }} className="flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-navy">{label}</div>
        <div className={`text-2xl font-bold mt-1 tabular-nums ${valueColor}`}>{value}</div>
        <div className={`text-[11px] mt-0.5 tabular-nums ${subtextColor}`}>{subtext}</div>
      </div>
    </div>
  </div>
);

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY_INDEX = 4; // May — index of "today" within the 12-month horizon

interface ProjectionChartProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  budget: number[];      // length 12
  forecast: number[];    // length 12
  actual: number[];      // length TODAY_INDEX + 1 (history through today)
  scenario: number[];    // length 12 - TODAY_INDEX (today through end), scenario projection
  format: (n: number) => string;
}

const ProjectionChart: React.FC<ProjectionChartProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  budget,
  forecast,
  actual,
  scenario,
  format,
}) => {
  const W = 560;
  const H = 240;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = 12;

  const allValues = [...budget, ...forecast, ...actual, ...scenario];
  const rawMax = Math.max(...allValues);
  const rawMin = Math.min(...allValues);
  const span = rawMax - rawMin || 1;
  const yMax = rawMax + span * 0.1;
  const yMin = Math.max(0, rawMin - span * 0.1);

  const x = (i: number) => padL + (i / (n - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const buildPath = (values: number[], startIdx = 0) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(startIdx + i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(' ');

  const budgetPath = buildPath(budget);
  const forecastPath = buildPath(forecast);
  const actualPath = buildPath(actual);
  const scenarioPath = buildPath(scenario, TODAY_INDEX);

  // Y-axis ticks (4 lines)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + t * (yMax - yMin));

  return (
    <div className="metric-card">
      <div className="flex items-start gap-3 mb-2">
        <div style={{ color: iconColor }} className="flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-navy">{title}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Y grid + labels */}
        {ticks.map((tv, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(tv)}
              y2={y(tv)}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={y(tv) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#6B7280"
              className="tabular-nums"
            >
              {format(tv)}
            </text>
          </g>
        ))}

        {/* Today vertical marker */}
        <line
          x1={x(TODAY_INDEX)}
          x2={x(TODAY_INDEX)}
          y1={padT}
          y2={padT + innerH}
          stroke="#94A3B8"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={x(TODAY_INDEX) + 4}
          y={padT + 10}
          fontSize={10}
          fill="#64748B"
          fontWeight={600}
        >
          Today
        </text>

        {/* Budget */}
        <path d={budgetPath} fill="none" stroke="#0D5463" strokeWidth={2} strokeDasharray="5 4" />
        {/* Forecast */}
        <path d={forecastPath} fill="none" stroke="#E85D1F" strokeWidth={2} strokeDasharray="2 3" />
        {/* Actual (history) */}
        <path d={actualPath} fill="none" stroke="#2563EB" strokeWidth={2.5} />
        {/* Scenario (forward) */}
        <path d={scenarioPath} fill="none" stroke="#0D5463" strokeWidth={2.5} />

        {/* Actual end dot */}
        <circle cx={x(TODAY_INDEX)} cy={y(actual[actual.length - 1])} r={3.5} fill="#2563EB" />

        {/* X labels */}
        {MONTH_LABELS.map((m, i) => (
          <text
            key={m}
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            fontSize={10}
            fill="#6B7280"
          >
            {m}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-blue-600" />
          Actual
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-teal-dark" />
          Scenario Projection
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="16" height="4">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#0D5463" strokeWidth="2" strokeDasharray="5 4" />
          </svg>
          Budget
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="16" height="4">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#E85D1F" strokeWidth="2" strokeDasharray="2 3" />
          </svg>
          Forecast
        </div>
      </div>
    </div>
  );
};

const ScenarioLab: React.FC<ScenarioLabProps> = ({ metrics }) => {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);

  // Baseline from metrics (sum across selected properties)
  const baseline = useMemo(() => {
    const actualHours = metrics.reduce((s, m) => s + m.actualHours, 0);
    const actualCost = metrics.reduce((s, m) => s + m.actualCost, 0);
    const budgetedHours = metrics.reduce((s, m) => s + m.budgetedHours, 0);
    const budgetedCost = metrics.reduce((s, m) => s + m.budgetedCost, 0);
    const forecastedHours = metrics.reduce((s, m) => s + m.forecastedHours, 0);
    const forecastedCost = metrics.reduce((s, m) => s + m.forecastedCost, 0);
    const scheduledHours = metrics.reduce((s, m) => s + m.scheduledHours, 0);
    const standardHours = metrics.reduce((s, m) => s + m.standardHours, 0);
    const otHours = metrics.reduce((s, m) => s + m.actualOvertimeHours, 0);
    const blendedRate = actualHours > 0 ? actualCost / actualHours : 35;
    const otPct = actualHours > 0 ? (otHours / actualHours) * 100 : 0;
    const safe = (n: number, fallback: number) => (n > 0 ? n : fallback);
    const ah = safe(actualHours, 134_500);
    const ac = safe(actualCost, 6_490_000);
    return {
      actualHours: ah,
      actualCost: ac,
      budgetedHours: safe(budgetedHours, 132_000),
      budgetedCost: safe(budgetedCost, 6_360_000),
      forecastedHours: safe(forecastedHours, 133_500),
      forecastedCost: safe(forecastedCost, 6_420_000),
      scheduledHours: safe(scheduledHours, 131_800),
      scheduledCost: safe(scheduledHours, 131_800) * (blendedRate || 35),
      standardHours: safe(standardHours, 128_000),
      standardCost: safe(standardHours, 128_000) * (blendedRate || 35),
      otHours: safe(otHours, 7_800),
      blendedRate: blendedRate || 35,
      otPct: otPct || 5.8,
    };
  }, [metrics]);

  // Projected results
  const projected = useMemo(() => {
    const occFactor = inputs.occupancy / BASELINE_OCCUPANCY; // 1.0 at baseline
    const demandFactor = 1 + inputs.groupDemand / 100;
    const prodFactor = 1 + inputs.productivity / 100; // higher productivity → fewer hours
    const otFactor = 1 + inputs.overtimeReduction / 100; // negative = reduction
    const wageFactor = 1 + inputs.wageInflation / 100;
    const agencyPremium = 0.30; // agency labor 30% more expensive per hour
    const agencyShare = inputs.agencyLabor / 100;
    const agencyCostFactor = 1 + agencyShare * agencyPremium;

    const projHours = baseline.actualHours * occFactor * demandFactor / prodFactor;
    const projOtHours = baseline.otHours * otFactor * occFactor;
    const projOtPct = projHours > 0 ? (projOtHours / projHours) * 100 : 0;

    // Cost: hours * rate * wage * agencyPremium, OT reduction also lowers OT-rate cost
    const otSavingsHours = baseline.otHours - projOtHours; // positive if reduced
    const otSavings = otSavingsHours * baseline.blendedRate * 0.5; // OT premium ~0.5x
    const projCost =
      projHours * baseline.blendedRate * wageFactor * agencyCostFactor - otSavings;

    const hoursDeltaPct = ((projHours - baseline.actualHours) / baseline.actualHours) * 100;
    const costDeltaPct = ((projCost - baseline.actualCost) / baseline.actualCost) * 100;
    const budgetVariance = baseline.budgetedCost - projCost; // positive = under budget = favorable
    const budgetVariancePct = (budgetVariance / baseline.budgetedCost) * 100;
    const otDeltaPP = projOtPct - baseline.otPct;

    // Quality risk: degrades if productivity pushed too high or OT cut too aggressively
    const qualityScore =
      (inputs.productivity > 5 ? inputs.productivity - 5 : 0) * 1.5 +
      (inputs.overtimeReduction < -25 ? -25 - inputs.overtimeReduction : 0) * 0.8 +
      (inputs.agencyLabor > 15 ? inputs.agencyLabor - 15 : 0) * 0.5;
    let qualityRisk: 'Low' | 'Medium' | 'High' = 'Low';
    if (qualityScore >= 20) qualityRisk = 'High';
    else if (qualityScore >= 8) qualityRisk = 'Medium';
    const qualityTrend = qualityScore < 5 ? 'Improved' : qualityScore < 15 ? 'Stable' : 'Worsened';

    // Recovery probability: better when budget favorable, OT down, productivity up, quality holds
    const recovery =
      55 +
      Math.max(-15, Math.min(20, budgetVariancePct * 4)) +
      Math.max(-10, Math.min(10, -otDeltaPP * 2)) +
      Math.max(-10, Math.min(10, inputs.productivity)) -
      Math.max(0, qualityScore - 5);
    const recoveryPct = Math.max(5, Math.min(99, recovery));
    const recoveryDeltaPP = recoveryPct - 69; // baseline recovery ~69%

    return {
      projHours,
      projCost,
      budgetVariance,
      budgetVariancePct,
      projOtPct,
      otDeltaPP,
      hoursDeltaPct,
      costDeltaPct,
      qualityRisk,
      qualityTrend,
      recoveryPct,
      recoveryDeltaPP,
    };
  }, [inputs, baseline]);

  const update = (key: keyof Inputs, value: number) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const reset = () => setInputs(DEFAULTS);

  const hoursRows = [
    { label: 'Budget', icon: <Wallet className="w-4 h-4" />, baseline: baseline.budgetedHours, projected: projected.projHours },
    { label: 'Forecast', icon: <TrendingUp className="w-4 h-4" />, baseline: baseline.forecastedHours, projected: projected.projHours },
    { label: 'Schedule', icon: <CalendarClock className="w-4 h-4" />, baseline: baseline.scheduledHours, projected: projected.projHours },
    { label: 'Standards', icon: <Award className="w-4 h-4" />, baseline: baseline.standardHours, projected: projected.projHours },
  ];
  const costRows = [
    { label: 'Budget', icon: <Wallet className="w-4 h-4" />, baseline: baseline.budgetedCost, projected: projected.projCost },
    { label: 'Forecast', icon: <TrendingUp className="w-4 h-4" />, baseline: baseline.forecastedCost, projected: projected.projCost },
    { label: 'Schedule', icon: <CalendarClock className="w-4 h-4" />, baseline: baseline.scheduledCost, projected: projected.projCost },
    { label: 'Standards', icon: <Award className="w-4 h-4" />, baseline: baseline.standardCost, projected: projected.projCost },
  ];

  // Risk metrics
  const agencyPremium = projected.projHours * baseline.blendedRate * (inputs.agencyLabor / 100) * 0.30;

  // ---- 12-month projection time series (current YTD actuals → scenario projection forward) ----
  // Seasonal-ish weights summing to 1 across the year
  const SEASON = [0.07, 0.07, 0.08, 0.08, 0.09, 0.09, 0.10, 0.10, 0.09, 0.08, 0.08, 0.07];
  const seasonSum = SEASON.reduce((s, w) => s + w, 0);
  const histPastSum = SEASON.slice(0, TODAY_INDEX + 1).reduce((s, w) => s + w, 0);
  const futureSum = SEASON.slice(TODAY_INDEX).reduce((s, w) => s + w, 0); // includes today bridge point

  const distribute = (total: number, slice: number[], denom: number) =>
    slice.map((w) => total * (w / denom));

  const series = useMemo(() => {
    // Budget & Forecast distributed across full 12 months
    const budgetHours = distribute(baseline.budgetedHours, SEASON, seasonSum);
    const budgetCost = distribute(baseline.budgetedCost, SEASON, seasonSum);
    const forecastHours = distribute(baseline.forecastedHours, SEASON, seasonSum);
    const forecastCost = distribute(baseline.forecastedCost, SEASON, seasonSum);

    // Actuals: distribute YTD actual across past months (incl. today)
    const actualHoursSeries = distribute(
      baseline.actualHours,
      SEASON.slice(0, TODAY_INDEX + 1),
      histPastSum
    );
    const actualCostSeries = distribute(
      baseline.actualCost,
      SEASON.slice(0, TODAY_INDEX + 1),
      histPastSum
    );

    // Scenario forward run-rate from "today" through year-end.
    // Use scenario factors applied to the seasonal remainder.
    // projHours represents an annualized scenario figure — apportion the remaining-year
    // weight back to it (relative to full season) for the forward run-rate.
    const scenarioRemainHours = projected.projHours * (futureSum / seasonSum);
    const scenarioRemainCost = projected.projCost * (futureSum / seasonSum);
    const futureWeights = SEASON.slice(TODAY_INDEX);
    const futureDenom = futureWeights.reduce((s, w) => s + w, 0);
    const scenarioHoursForward = distribute(scenarioRemainHours, futureWeights, futureDenom);
    const scenarioCostForward = distribute(scenarioRemainCost, futureWeights, futureDenom);

    // Bridge the scenario series so it starts at the actual "today" value (continuous line)
    scenarioHoursForward[0] = actualHoursSeries[actualHoursSeries.length - 1];
    scenarioCostForward[0] = actualCostSeries[actualCostSeries.length - 1];

    return {
      budgetHours,
      budgetCost,
      forecastHours,
      forecastCost,
      actualHoursSeries,
      actualCostSeries,
      scenarioHoursForward,
      scenarioCostForward,
    };
  }, [baseline, projected]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-navy">Scenario Lab</h2>
          <p className="text-sm text-gray-500 mt-1">
            Model labor outcomes by adjusting demand, productivity, and cost levers. Projected
            results update live across budget, forecast, schedule, and standards baselines.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-dark/5 text-teal-dark text-xs font-semibold hover:bg-teal-dark/10"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to baseline
        </button>
      </div>

      {/* Scenario Inputs */}
      <div className="metric-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-teal-dark">
            <Sliders className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-slate-navy">Scenario Inputs</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
          {INPUT_DEFS.map((def) => {
            const value = inputs[def.key];
            return (
              <div key={def.key} className="grid grid-cols-[28px_150px_1fr_70px] items-center gap-3">
                <div className={`${TONE_ICON[def.tone]} flex-shrink-0`}>{def.icon}</div>
                <div className="text-sm font-medium text-slate-navy">{def.label}</div>
                <input
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={value}
                  onChange={(e) => update(def.key, Number(e.target.value))}
                  className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${TONE_ACCENT[def.tone]}`}
                />
                <div className="text-sm font-semibold text-slate-navy tabular-nums text-right">
                  {def.format(value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Projection Over Time */}
      <div className="flex items-center gap-3 pt-2">
        <div className="text-teal-dark">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-navy">Projection Over Time</h3>
          <p className="text-xs text-gray-500">
            Actuals through today, with the scenario projection extending against budget and forecast.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProjectionChart
          title="Labor Hours"
          subtitle="Monthly run-rate"
          icon={<Clock4 className="w-5 h-5" />}
          iconColor="#0D5463"
          budget={series.budgetHours}
          forecast={series.forecastHours}
          actual={series.actualHoursSeries}
          scenario={series.scenarioHoursForward}
          format={fmtHours}
        />
        <ProjectionChart
          title="Labor Cost"
          subtitle="Monthly run-rate"
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="#E85D1F"
          budget={series.budgetCost}
          forecast={series.forecastCost}
          actual={series.actualCostSeries}
          scenario={series.scenarioCostForward}
          format={fmtCurrencyM}
        />
      </div>

      {/* Projected Results header */}
      <div className="flex items-center gap-3">
        <div className="text-blue-600">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-navy">Projected Results</h3>
          <p className="text-xs text-gray-500">
            Scenario projection compared against each operational baseline.
          </p>
        </div>
      </div>

      {/* Hours + Cost impact matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ImpactTable
          title="Hours Impact"
          subtitle={`Projected labor hours: ${fmtHours(projected.projHours)}`}
          icon={<Clock4 className="w-5 h-5" />}
          iconColor="#0D5463"
          rows={hoursRows}
          format={fmtHours}
          metricLabel="Hours"
        />
        <ImpactTable
          title="Cost Impact"
          subtitle={`Projected labor cost: ${fmtCurrencyM(projected.projCost)}`}
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="#E85D1F"
          rows={costRows}
          format={fmtCurrencyM}
          metricLabel="Cost"
        />
      </div>

      {/* Impact Risks header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="text-orange">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-navy">Impact Risks</h3>
          <p className="text-xs text-gray-500">
            Operational and financial risks introduced by this scenario.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskCard
          icon={
            projected.qualityRisk === 'Low' ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )
          }
          iconColor={
            projected.qualityRisk === 'Low'
              ? '#059669'
              : projected.qualityRisk === 'Medium'
              ? '#E85D1F'
              : '#DC2626'
          }
          label="Quality Risk"
          value={projected.qualityRisk}
          valueColor={
            projected.qualityRisk === 'Low'
              ? 'text-emerald-600'
              : projected.qualityRisk === 'Medium'
              ? 'text-orange'
              : 'text-red-600'
          }
          subtext={`Trend: ${projected.qualityTrend}`}
          subtextColor={
            projected.qualityTrend === 'Improved'
              ? 'text-emerald-600'
              : projected.qualityTrend === 'Stable'
              ? 'text-gray-500'
              : 'text-orange'
          }
        />
        <RiskCard
          icon={<Clock className="w-6 h-6" />}
          iconColor={projected.projOtPct <= baseline.otPct ? '#059669' : '#E85D1F'}
          label="OT Exposure"
          value={fmtPct(projected.projOtPct)}
          valueColor={projected.projOtPct <= baseline.otPct ? 'text-emerald-600' : 'text-orange'}
          subtext={`${projected.otDeltaPP <= 0 ? '↓' : '↑'} ${fmtPctSigned(projected.otDeltaPP)} pp vs baseline`}
          subtextColor={projected.otDeltaPP <= 0 ? 'text-emerald-600' : 'text-orange'}
        />
        <RiskCard
          icon={<CheckCircle2 className="w-6 h-6" />}
          iconColor={projected.recoveryPct >= 60 ? '#059669' : '#E85D1F'}
          label="Recovery Probability"
          value={`${Math.round(projected.recoveryPct)}%`}
          valueColor={projected.recoveryPct >= 60 ? 'text-emerald-600' : 'text-orange'}
          subtext={`${projected.recoveryDeltaPP >= 0 ? '↑' : '↓'} ${fmtPctSigned(projected.recoveryDeltaPP, 0)} pp vs prior`}
          subtextColor={projected.recoveryDeltaPP >= 0 ? 'text-emerald-600' : 'text-orange'}
        />
        <RiskCard
          icon={<Briefcase className="w-6 h-6" />}
          iconColor={inputs.agencyLabor <= 5 ? '#059669' : inputs.agencyLabor <= 12 ? '#E85D1F' : '#DC2626'}
          label="Agency Cost Premium"
          value={fmtCurrencyM(agencyPremium)}
          valueColor={inputs.agencyLabor <= 5 ? 'text-emerald-600' : 'text-orange'}
          subtext={`${inputs.agencyLabor.toFixed(0)}% agency mix · 30% premium`}
          subtextColor="text-gray-500"
        />
      </div>
    </div>
  );
};

export default ScenarioLab;
