import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  AlertCircle,
  Layers,
  Briefcase,
  CircleDollarSign,
  ArrowUpDown,
  ClipboardList,
  Zap,
  CalendarClock,
  Gauge,
  Clock4,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Users,
  Sliders,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  MetricCard,
  SectionHeader,
  RiskBadge,
  Currency,
  Percentage,
  InlineInfoTooltip,
} from '../ui/Card';
import ExportButton from '../ui/ExportButton';
import CollapseToggle from '../ui/CollapseToggle';
import {
  EntityLaborMetrics,
  Hotel,
  LaborMetrics,
  PropertyOrgBreakdown,
  RiskLevel,
} from '../../types';
import { buildPropertyEntityMetrics } from '../../data/propertyMockData';

const RISK_ACCENT: Record<RiskLevel, string> = {
  'on-track': 'text-emerald-600',
  caution: 'text-amber-600',
  'at-risk': 'text-red-600',
};

const DRIVER_LABEL: Record<EntityLaborMetrics['topDriver']['category'], string> = {
  overtime: 'Overtime',
  productivity: 'Productivity',
  demand: 'Demand-Driven',
  execution: 'Execution',
  'wage-rate': 'Wage Rate',
  forecast: 'Forecast Error',
  scheduling: 'Scheduling',
};

const fmtNum = (n: number) => Math.round(n).toLocaleString();
const fmtSignedHours = (n: number) =>
  `${n >= 0 ? '+' : '-'}${Math.round(Math.abs(n)).toLocaleString()} hrs`;
const fmtPct = (n: number, digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
const serviceQualityGapPct = (r: EntityLaborMetrics): number =>
  r.standardHours > 0 ? ((r.standardHours - r.actualHours) / r.standardHours) * 100 : 0;

type InsightsFocusLevel = 'division' | 'department' | 'job';
type TrendStatus = 'emerging' | 'worsening' | 'improving' | 'persistent';

const FOCUS_LABEL: Record<InsightsFocusLevel, string> = {
  division: 'Division',
  department: 'Department',
  job: 'Job',
};

const RISK_THRESHOLD_LABELS: Record<RiskLevel, string> = {
  'on-track': 'On Track (<2% variance)',
  caution: 'In Caution (2-4% variance)',
  'at-risk': 'At Risk (5%+ variance)',
};

const RISK_BADGE_LABELS: Record<RiskLevel, string> = {
  'on-track': 'On Track (<2%)',
  caution: 'Caution (2-4%)',
  'at-risk': 'At Risk (5%+)',
};

const SERVICE_RISK_PROPERTY_HELP = 'Service Risk Score summarizes service-delivery pressure for the selected division, department, or job focus. The score starts from 100 and is reduced when more entities fall over 5% below standard hours and when those standard-hour gaps are larger. Lower scores mean higher service-delivery risk.';

const RISK_DESCRIPTION: Record<RiskLevel, string> = {
  'at-risk': 'Labor variance exceeds tolerance and is not fully demand-supported. Requires intervention this period.',
  caution: 'Labor variance trending unfavorable. Monitor closely; corrective action may be needed.',
  'on-track': 'Labor performance within tolerance of plan.',
};

const hash01 = (input: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash ^ input.charCodeAt(i)) * 16777619;
    hash >>>= 0;
  }
  return (hash % 10000) / 10000;
};

const trendForEntity = (row: EntityLaborMetrics, serviceGapPct: number) => {
  const costVariancePct = row.budgetedCost > 0
    ? ((row.actualCost - row.budgetedCost) / row.budgetedCost) * 100
    : 0;
  const baseline = hash01(`${row.entityId}|trend`);
  const periodsActive = 1 + Math.round(baseline * 3);

  if (serviceGapPct > 5 || costVariancePct > 8) {
    return {
      status: 'worsening' as TrendStatus,
      periodsActive,
      changeVsPrior: Math.max(costVariancePct, serviceGapPct),
      note: 'Driver impact is increasing versus prior period and needs containment.',
    };
  }

  if (costVariancePct > 3) {
    return {
      status: 'persistent' as TrendStatus,
      periodsActive,
      changeVsPrior: costVariancePct,
      note: 'Variance has remained above threshold for consecutive periods.',
    };
  }

  if (costVariancePct > 0.5) {
    return {
      status: 'emerging' as TrendStatus,
      periodsActive: 1,
      changeVsPrior: costVariancePct,
      note: 'New signal this period; monitor to prevent escalation.',
    };
  }

  return {
    status: 'improving' as TrendStatus,
    periodsActive,
    changeVsPrior: Math.abs(costVariancePct),
    note: 'Variance is stabilizing relative to recent trend.',
  };
};

const TREND_VISUALS: Record<TrendStatus, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  emerging: {
    label: 'Emerging',
    icon: <Zap className="w-3 h-3 mr-1" />,
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  worsening: {
    label: 'Worsening',
    icon: <TrendingUp className="w-3 h-3 mr-1" />,
    badgeClass: 'bg-red-100 text-red-700',
  },
  improving: {
    label: 'Improving',
    icon: <TrendingDown className="w-3 h-3 mr-1" />,
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  persistent: {
    label: 'Persistent',
    icon: <Clock4 className="w-3 h-3 mr-1" />,
    badgeClass: 'bg-orange-100 text-orange-800',
  },
};

const periodsLabel = (n: number): string => `${n} ${n === 1 ? 'period' : 'periods'} active`;

interface PropertyViewProps {
  hotel: Hotel;
  hotelMetrics: LaborMetrics;
  activeModule: string;
  periodScale: number;
  periodLabel: string;
  driversSubtitle: string;
}

const riskCounts = (rows: EntityLaborMetrics[]) => {
  let onTrack = 0;
  let caution = 0;
  let atRisk = 0;
  for (const r of rows) {
    if (r.riskLevel === 'on-track') onTrack += 1;
    else if (r.riskLevel === 'caution') caution += 1;
    else atRisk += 1;
  }
  return { onTrack, caution, atRisk };
};

const overtimeExposure = (rows: EntityLaborMetrics[]): number => {
  return rows.reduce((s, r) => {
    const baseRate = r.actualHours > 0 ? r.actualCost / r.actualHours : 0;
    return s + r.actualOvertimeHours * baseRate * 1.5;
  }, 0);
};

const departmentOvertimeCost = (r: EntityLaborMetrics): number => {
  const baseRate = r.actualHours > 0 ? r.actualCost / r.actualHours : 0;
  return r.actualOvertimeHours * baseRate * 1.5;
};

// --- Hover popover wrappers for summary cards ---------------------------
interface DeptListPopoverCardProps {
  label: string;
  count: number;
  subtext: React.ReactNode;
  icon: React.ReactNode;
  accent: 'emerald' | 'amber' | 'red';
  infoTooltip?: React.ReactNode;
  departments: EntityLaborMetrics[];
  emptyMessage: string;
}

const ACCENT_TEXT: Record<'emerald' | 'amber' | 'red', string> = {
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
};
const ACCENT_DOT: Record<'emerald' | 'amber' | 'red', string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const DeptListPopoverCard: React.FC<DeptListPopoverCardProps> = ({
  label, count, subtext, icon, accent, infoTooltip, departments, emptyMessage,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const sorted = useMemo(
    () => [...departments].sort((a, b) =>
      Math.abs(b.actualCost - b.budgetedCost) - Math.abs(a.actualCost - a.budgetedCost),
    ),
    [departments],
  );

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
        <MetricCard
          label={label}
          value={
            <span className="underline decoration-dotted decoration-gray-300 underline-offset-4 cursor-pointer">
              {count}
            </span>
          }
          subtext={subtext}
          icon={icon}
          accent={accent}
          infoTooltip={infoTooltip}
        />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-[9999] mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
            <div className={`text-xs font-semibold ${ACCENT_TEXT[accent]}`}>{count} departments</div>
          </div>
          {sorted.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-auto">
              {sorted.map((d) => {
                const variance = d.actualCost - d.budgetedCost;
                return (
                  <li key={d.entityId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-gray-800 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ACCENT_DOT[accent]}`} />
                      <span className="truncate">{d.entityName}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">{d.divisionName}</span>
                    </span>
                    <Currency amount={variance} />
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

interface DeptContributionPopoverCardProps {
  label: string;
  value: React.ReactNode;
  subtext: React.ReactNode;
  icon: React.ReactNode;
  accent: 'teal' | 'orange';
  infoTooltip?: React.ReactNode;
  contributions: { entityId: string; entityName: string; divisionName: string; amount: number }[];
  popoverTitle: string;
  totalAmount: number;
  emptyMessage: string;
}

const DeptContributionPopoverCard: React.FC<DeptContributionPopoverCardProps> = ({
  label, value, subtext, icon, accent, infoTooltip, contributions, popoverTitle, totalAmount, emptyMessage,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const sorted = useMemo(
    () => [...contributions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 10),
    [contributions],
  );
  const maxAbs = sorted.reduce((m, c) => Math.max(m, Math.abs(c.amount)), 0);

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
        <MetricCard
          label={label}
          value={
            <span className="underline decoration-dotted decoration-gray-300 underline-offset-4 cursor-pointer">
              {value}
            </span>
          }
          subtext={subtext}
          icon={icon}
          accent={accent}
          infoTooltip={infoTooltip}
        />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-[9999] mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{popoverTitle}</div>
            <div className="text-xs font-semibold text-gray-700">
              <Currency amount={totalAmount} /> total
            </div>
          </div>
          {sorted.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto">
              {sorted.map((c) => {
                const pct = maxAbs > 0 ? (Math.abs(c.amount) / maxAbs) * 100 : 0;
                return (
                  <li key={c.entityId} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-800 min-w-0 truncate">
                        {c.entityName}
                        <span className="text-xs text-gray-500 ml-2">{c.divisionName}</span>
                      </span>
                      <Currency amount={c.amount} />
                    </div>
                    <div className="mt-1 h-1 bg-gray-100 rounded">
                      <div className="h-1 bg-orange rounded" style={{ width: `${pct}%` }} />
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

// -------------------------------------------------------------------------
// Overview tab
// -------------------------------------------------------------------------
const OverviewTab: React.FC<{ org: PropertyOrgBreakdown; periodLabel: string; driversSubtitle: string; collapsed: Record<string, boolean>; toggle: (k: string) => void }> = ({ org, periodLabel, driversSubtitle, collapsed, toggle }) => {
  const [insightsFocusLevel, setInsightsFocusLevel] = useState<InsightsFocusLevel>('department');
  const [insightsSortMode, setInsightsSortMode] = useState<'cost-impact' | 'customer-impact'>('cost-impact');
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState<RiskLevel | null>(null);
  const [topMetricPopoverOpen, setTopMetricPopoverOpen] = useState<'cost' | 'service' | 'ot' | null>(null);
  const focusRows = useMemo(() => {
    if (insightsFocusLevel === 'division') return org.divisions;
    if (insightsFocusLevel === 'job') return org.jobs;
    return org.departments;
  }, [insightsFocusLevel, org.departments, org.divisions, org.jobs]);

  const focusCounts = riskCounts(focusRows);
  const totalEntities = focusRows.length;
  const totalLaborVariance = focusRows.reduce(
    (s, d) => s + (d.actualCost - d.budgetedCost),
    0,
  );
  const totalBudget = focusRows.reduce((s, d) => s + d.budgetedCost, 0);
  const variancePct = totalBudget === 0 ? 0 : (totalLaborVariance / totalBudget) * 100;
  const otExposure = overtimeExposure(focusRows);

  const attention = useMemo(() => {
    const rows = [...focusRows]
      .map((d) => ({
        ...d,
        serviceGapPct: serviceQualityGapPct(d),
        displayRisk: d.riskLevel === 'on-track' && serviceQualityGapPct(d) > 5 ? 'caution' as RiskLevel : d.riskLevel,
        trend: trendForEntity(d, serviceQualityGapPct(d)),
      }))
      .filter((d) => d.riskLevel !== 'on-track' || d.serviceGapPct > 5)
      .sort((a, b) => {
        if (insightsSortMode === 'customer-impact') {
          const aFlag = a.serviceGapPct > 5;
          const bFlag = b.serviceGapPct > 5;
          if (aFlag !== bFlag) return bFlag ? 1 : -1;
          if (Math.abs(a.serviceGapPct - b.serviceGapPct) > 0.01) return b.serviceGapPct - a.serviceGapPct;
        }
        return (b.actualCost - b.budgetedCost) - (a.actualCost - a.budgetedCost);
      })
      .slice(0, 8);
    return rows;
  }, [focusRows, insightsSortMode]);

  const insightSummary = useMemo(() => {
    const flagged = attention.length;
    const atRisk = attention.filter((r) => r.displayRisk === 'at-risk').length;
    const caution = attention.filter((r) => r.displayRisk === 'caution').length;
    const driverCounts = attention.reduce<Record<string, number>>((acc, r) => {
      const key = DRIVER_LABEL[r.topDriver.category] ?? r.topDriver.category;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const topDrivers = Object.entries(driverCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([driver, count]) => `${count} ${driver}`)
      .join(' / ');

    return {
      flagged,
      atRisk,
      caution,
      topDrivers,
    };
  }, [attention]);

  const rowScopeLabel = (r: EntityLaborMetrics): string => {
    if (insightsFocusLevel === 'division') return 'Property-wide division view';
    if (insightsFocusLevel === 'department') return r.divisionName;
    return `${r.departmentName ?? 'Department'} · ${r.divisionName}`;
  };

  const onTrackPct = totalEntities > 0 ? (focusCounts.onTrack / totalEntities) * 100 : 0;
  const cautionPct = totalEntities > 0 ? (focusCounts.caution / totalEntities) * 100 : 0;
  const atRiskPct = totalEntities > 0 ? (focusCounts.atRisk / totalEntities) * 100 : 0;

  const totalActualOtHours = focusRows.reduce((sum, row) => sum + row.actualOvertimeHours, 0);
  const totalScheduledOtHours = focusRows.reduce((sum, row) => sum + row.scheduledOvertimeHours, 0);
  const totalUnscheduledOtHours = Math.max(totalActualOtHours - totalScheduledOtHours, 0);
  const totalScheduledOtCost = focusRows.reduce((sum, row) => {
    const baseRate = row.actualHours > 0 ? row.actualCost / row.actualHours : 0;
    return sum + (row.scheduledOvertimeHours * baseRate * 1.5);
  }, 0);
  const totalUnscheduledOtCost = focusRows.reduce((sum, row) => {
    const baseRate = row.actualHours > 0 ? row.actualCost / row.actualHours : 0;
    const unscheduledOtHours = Math.max(row.actualOvertimeHours - row.scheduledOvertimeHours, 0);
    return sum + (unscheduledOtHours * baseRate * 1.5);
  }, 0);
  const otThresholdPct = 2.0;
  const otAboveThresholdCount = focusRows.filter((row) => {
    const share = row.actualHours > 0 ? (row.actualOvertimeHours / row.actualHours) * 100 : 0;
    return share > otThresholdPct;
  }).length;

  const serviceRiskCount = focusRows.filter((row) => serviceQualityGapPct(row) > 5).length;
  const serviceRiskPct = totalEntities > 0 ? (serviceRiskCount / totalEntities) * 100 : 0;
  const avgServiceGap = serviceRiskCount > 0
    ? focusRows
        .map((row) => serviceQualityGapPct(row))
        .filter((gap) => gap > 5)
        .reduce((sum, gap) => sum + gap, 0) / serviceRiskCount
    : 0;
  const serviceRiskScore = Math.max(
    0,
    Math.min(100, Math.round(100 - (serviceRiskPct * 1.25) - (avgServiceGap * 3.5))),
  );

  const unfavorableCostVariance = Math.max(totalLaborVariance, 0);
  const unfavorableVariancePct = totalBudget > 0 ? (unfavorableCostVariance / totalBudget) * 100 : 0;

  const statusRows = [
    {
      key: 'on-track',
      label: RISK_THRESHOLD_LABELS['on-track'],
      count: focusCounts.onTrack,
      pct: onTrackPct,
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-600',
      iconClass: 'text-emerald-600',
      accentClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'caution',
      label: RISK_THRESHOLD_LABELS.caution,
      count: focusCounts.caution,
      pct: cautionPct,
      barClass: 'bg-amber-500',
      textClass: 'text-amber-600',
      iconClass: 'text-amber-600',
      accentClass: 'bg-amber-50 text-amber-600',
    },
    {
      key: 'at-risk',
      label: RISK_THRESHOLD_LABELS['at-risk'],
      count: focusCounts.atRisk,
      pct: atRiskPct,
      barClass: 'bg-red-500',
      textClass: 'text-red-600',
      iconClass: 'text-red-600',
      accentClass: 'bg-red-50 text-red-600',
    },
  ];

  const statusEntitiesByRisk = useMemo(() => {
    const grouped: Record<RiskLevel, EntityLaborMetrics[]> = {
      'on-track': [],
      caution: [],
      'at-risk': [],
    };
    for (const row of focusRows) {
      const gap = serviceQualityGapPct(row);
      const displayRisk: RiskLevel = row.riskLevel === 'on-track' && gap > 5 ? 'caution' : row.riskLevel;
      grouped[displayRisk].push(row);
    }
    return grouped;
  }, [focusRows]);

  const topVarianceContributors = useMemo(
    () => [...focusRows]
      .map((row) => ({
        entityId: row.entityId,
        entityName: row.entityName,
        divisionName: rowScopeLabel(row),
        amount: row.actualCost - row.budgetedCost,
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    [focusRows],
  );

  const serviceRiskContributors = useMemo(
    () => [...focusRows]
      .map((row) => ({
        entityId: row.entityId,
        entityName: row.entityName,
        divisionName: rowScopeLabel(row),
        gapPct: serviceQualityGapPct(row),
      }))
      .filter((row) => row.gapPct > 5)
      .sort((a, b) => b.gapPct - a.gapPct)
      .slice(0, 8),
    [focusRows],
  );

  const topOtContributors = useMemo(
    () => [...focusRows]
      .map((row) => ({
        entityId: row.entityId,
        entityName: row.entityName,
        divisionName: rowScopeLabel(row),
        amount: departmentOvertimeCost(row),
        otHours: row.actualOvertimeHours,
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    [focusRows],
  );

  return (
    <>
      <section className="bg-white border border-gray-200 rounded-2xl shadow-[0_2px_18px_rgba(15,23,42,0.06)] overflow-visible relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_1fr_1fr]">
          <div className="p-6 border-b xl:border-b-0 xl:border-r border-gray-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Property Status</div>
            <div className="text-sm text-gray-500 mt-1 mb-5">Actual vs Budget • {FOCUS_LABEL[insightsFocusLevel]} focus</div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[30px] leading-tight font-semibold text-slate-navy tabular-nums">{totalEntities}</div>
                <div className="text-sm text-gray-500">{FOCUS_LABEL[insightsFocusLevel].toLowerCase()}s monitored</div>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-4">
              {statusRows.map((row) => {
                const entities = statusEntitiesByRisk[row.key as RiskLevel] ?? [];
                return (
                <div
                  key={row.key}
                  className="relative"
                  onMouseEnter={() => setStatusPopoverOpen(row.key as RiskLevel)}
                  onMouseLeave={() => setStatusPopoverOpen((current) => (current === row.key ? null : current))}
                >
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2 text-slate-navy font-medium">
                      <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-xs ${row.accentClass}`}>
                        {row.key === 'on-track' ? <CheckCircle className="w-3 h-3" /> : row.key === 'caution' ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      </span>
                      <span>{row.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`tabular-nums font-semibold ${row.textClass}`}>{row.pct.toFixed(0)}%</span>
                      <span className="tabular-nums text-slate-navy text-xl leading-none font-semibold">{row.count}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${row.barClass} rounded-full`} style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} />
                  </div>

                  {statusPopoverOpen === row.key && (
                    <div role="tooltip" className="absolute z-[9999] mt-2 left-0 right-0 xl:left-auto xl:right-0 xl:w-[34rem] bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{row.label} {FOCUS_LABEL[insightsFocusLevel]}s</div>
                        <div className={`text-xs font-semibold ${row.textClass}`}>{entities.length} {FOCUS_LABEL[insightsFocusLevel].toLowerCase()}s</div>
                      </div>
                      {entities.length === 0 ? (
                        <div className="text-sm text-gray-500">No entities in this category.</div>
                      ) : (
                        <div className="overflow-y-auto max-h-64 border border-gray-100 rounded-md">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                              <tr>
                                <th className="text-left px-3 py-2">Entity</th>
                                <th className="text-right px-3 py-2">Actual Hours</th>
                                <th className="text-right px-3 py-2">Budget Hours</th>
                                <th className="text-right px-3 py-2">Variance %</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entities.map((entity) => {
                                const variancePct = entity.budgetedHours > 0
                                  ? ((entity.actualHours - entity.budgetedHours) / entity.budgetedHours) * 100
                                  : 0;
                                return (
                                  <tr key={entity.entityId} className="border-t border-gray-100">
                                    <td className="px-3 py-2 text-slate-navy">{entity.entityName}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{Math.round(entity.actualHours).toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{Math.round(entity.budgetedHours).toLocaleString()}</td>
                                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${variancePct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>

            <div className="mt-5 text-right">
              <button type="button" className="text-sm text-slate-navy underline underline-offset-2 hover:text-teal">View details</button>
            </div>
          </div>

          <div className="p-6 border-b xl:border-b-0 xl:border-r border-gray-200">
            <div className="flex items-start justify-between gap-3 relative" onMouseEnter={() => setTopMetricPopoverOpen('cost')} onMouseLeave={() => setTopMetricPopoverOpen((cur) => (cur === 'cost' ? null : cur))}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unfavorable Cost Variance</div>
                <div className="mt-2 text-[30px] leading-tight tabular-nums font-semibold text-red-600 underline decoration-dotted decoration-gray-300 underline-offset-4 cursor-pointer">
                  <Currency amount={unfavorableCostVariance} />
                </div>
                <div className="text-sm text-gray-500 mt-1">{unfavorableVariancePct.toFixed(1)}% of planned labor cost</div>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>

              {topMetricPopoverOpen === 'cost' && (
                <div role="tooltip" className="absolute z-[9999] top-full mt-2 right-0 w-[28rem] bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Top Variance Contributors</div>
                    <div className="text-xs font-semibold text-gray-700"><Currency amount={unfavorableCostVariance} /> total</div>
                  </div>
                  {topVarianceContributors.length === 0 ? (
                    <div className="text-sm text-gray-500">No over-plan variance contributors.</div>
                  ) : (
                    <ul className="space-y-1.5 max-h-60 overflow-auto">
                      {topVarianceContributors.map((row) => (
                        <li key={row.entityId} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-gray-800 min-w-0 truncate">{row.entityName}<span className="text-xs text-gray-500 ml-2">{row.divisionName}</span></span>
                          <span className="tabular-nums text-red-600 font-medium"><Currency amount={row.amount} /></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 text-right">
              <button type="button" className="text-sm text-slate-navy underline underline-offset-2 hover:text-teal">View details</button>
            </div>

            <div className="mt-5 pt-5 border-t border-gray-200">
              <div className="flex items-start justify-between gap-3 relative" onMouseEnter={() => setTopMetricPopoverOpen('service')} onMouseLeave={() => setTopMetricPopoverOpen((cur) => (cur === 'service' ? null : cur))}>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                    <span>Service Risk Score</span>
                    <InlineInfoTooltip content={SERVICE_RISK_PROPERTY_HELP} />
                  </div>
                  <div className="mt-2 text-[30px] leading-tight tabular-nums font-semibold text-indigo-600 underline decoration-dotted decoration-gray-300 underline-offset-4 cursor-pointer">{serviceRiskScore} / 100</div>
                  <div className="text-sm text-gray-500 mt-1">{serviceRiskCount} {FOCUS_LABEL[insightsFocusLevel].toLowerCase()}s high-risk</div>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600">
                  <ClipboardList className="w-5 h-5" />
                </div>

                {topMetricPopoverOpen === 'service' && (
                  <div role="tooltip" className="absolute z-[9999] top-full mt-2 right-0 w-[28rem] bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Service Risk Entities</div>
                      <div className="text-xs font-semibold text-indigo-600">Score {serviceRiskScore} / 100</div>
                    </div>
                    {serviceRiskContributors.length === 0 ? (
                      <div className="text-sm text-gray-500">No service quality risk entities flagged.</div>
                    ) : (
                      <ul className="space-y-1.5 max-h-60 overflow-auto">
                        {serviceRiskContributors.map((row) => (
                          <li key={row.entityId} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-800 min-w-0 truncate">{row.entityName}<span className="text-xs text-gray-500 ml-2">{row.divisionName}</span></span>
                            <span className="tabular-nums text-red-600 font-medium">{row.gapPct.toFixed(1)}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 text-right">
                <button type="button" className="text-sm text-slate-navy underline underline-offset-2 hover:text-teal">View details</button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-3 relative" onMouseEnter={() => setTopMetricPopoverOpen('ot')} onMouseLeave={() => setTopMetricPopoverOpen((cur) => (cur === 'ot' ? null : cur))}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">OT Exposure</div>
                <div className="mt-2 tabular-nums text-[30px] leading-tight font-semibold text-orange">{fmtNum(totalActualOtHours)} hrs</div>
                <div className="mt-2 text-sm leading-tight text-gray-600">{otAboveThresholdCount} {FOCUS_LABEL[insightsFocusLevel].toLowerCase()}s above {otThresholdPct.toFixed(1)}% OT share</div>
                <div className="mt-1 text-sm tabular-nums text-gray-700"><Currency amount={otExposure} /> total OT cost</div>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange/10 text-orange">
                <Clock className="w-5 h-5" />
              </div>

              {topMetricPopoverOpen === 'ot' && (
                <div role="tooltip" className="absolute z-[9999] top-full mt-2 right-0 w-[28rem] bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Top OT Contributors</div>
                    <div className="text-xs font-semibold text-orange"><Currency amount={otExposure} /> total</div>
                  </div>
                  {topOtContributors.length === 0 ? (
                    <div className="text-sm text-gray-500">No overtime contributors.</div>
                  ) : (
                    <ul className="space-y-1.5 max-h-60 overflow-auto">
                      {topOtContributors.map((row) => (
                        <li key={row.entityId} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-gray-800 min-w-0 truncate">{row.entityName}<span className="text-xs text-gray-500 ml-2">{row.divisionName}</span></span>
                          <span className="tabular-nums text-orange font-medium"><Currency amount={row.amount} /></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm tabular-nums">
              <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2">
                <div className="text-xs text-gray-500">Scheduled OT</div>
                <div className="mt-1 text-base font-semibold text-slate-navy">{fmtNum(totalScheduledOtHours)} hrs</div>
                <div className="mt-0.5 text-xs text-gray-500"><Currency amount={totalScheduledOtCost} /></div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2">
                <div className="text-xs text-gray-500">Unscheduled OT</div>
                <div className="mt-1 text-base font-semibold text-slate-navy">{fmtNum(totalUnscheduledOtHours)} hrs</div>
                <div className="mt-0.5 text-xs text-gray-500"><Currency amount={totalUnscheduledOtCost} /></div>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button type="button" className="text-sm text-slate-navy underline underline-offset-2 hover:text-teal">View details</button>
            </div>
          </div>
        </div>
      </section>

      <div>
        <SectionHeader
          title="Performance Insights"
          icon={<AlertTriangle className="w-5 h-5" />}
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Performance Insights" />
              <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-0.5" role="group" aria-label="Performance Insights focus level">
                {(['division', 'department', 'job'] as InsightsFocusLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setInsightsFocusLevel(level);
                      setExpandedInsightId(null);
                    }}
                    className={`px-2.5 py-1 text-xs rounded ${insightsFocusLevel === level ? 'bg-slate-100 text-slate-navy font-medium' : 'text-gray-600 hover:text-slate-navy'}`}
                  >
                    {FOCUS_LABEL[level]}
                  </button>
                ))}
              </div>
              <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-0.5" role="group" aria-label="Performance Insights sort mode">
                <button
                  type="button"
                  onClick={() => setInsightsSortMode('cost-impact')}
                  className={`px-2.5 py-1 text-xs rounded ${insightsSortMode === 'cost-impact' ? 'bg-slate-100 text-slate-navy font-medium' : 'text-gray-600 hover:text-slate-navy'}`}
                >
                  Cost impact
                </button>
                <button
                  type="button"
                  onClick={() => setInsightsSortMode('customer-impact')}
                  className={`px-2.5 py-1 text-xs rounded ${insightsSortMode === 'customer-impact' ? 'bg-slate-100 text-slate-navy font-medium' : 'text-gray-600 hover:text-slate-navy'}`}
                >
                  Customer impact
                </button>
              </div>
              <CollapseToggle
                collapsed={!!collapsed.deptAttention}
                onToggle={() => toggle('deptAttention')}
                sectionLabel="Performance Insights"
              />
            </div>
          }
        />
        {!collapsed.deptAttention && (
          <div className="metric-card">
            {attention.length === 0 ? (
              <div className="text-sm text-gray-500 py-3">All {FOCUS_LABEL[insightsFocusLevel].toLowerCase()}s running within tolerance.</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-6 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-2xl leading-none font-semibold text-slate-navy tabular-nums">{insightSummary.flagged}</div>
                          <div className="text-sm text-gray-600">Flagged {FOCUS_LABEL[insightsFocusLevel].toLowerCase()}s</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-2xl leading-none font-semibold text-slate-navy tabular-nums">{insightSummary.atRisk}</div>
                          <div className="text-sm text-gray-600">At Risk (5%+ variance)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-2xl leading-none font-semibold text-slate-navy tabular-nums">{insightSummary.caution}</div>
                          <div className="text-sm text-gray-600">Caution (2-4% variance)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total variance</div>
                      <div className="text-2xl leading-none font-semibold text-slate-navy tabular-nums">
                        {Math.round(totalLaborVariance).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                      <ArrowUpDown className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Driver split</div>
                      <div className="text-base font-semibold text-slate-navy leading-tight">{insightSummary.topDrivers || 'No driver data'}</div>
                    </div>
                  </div>
                </div>

                {attention.map((d, i) => {
                  const variance = d.actualCost - d.budgetedCost;
                  const serviceFlag = d.serviceGapPct > 5;
                  const displayRisk = d.displayRisk;
                  const costVariancePct = d.budgetedCost > 0 ? (variance / d.budgetedCost) * 100 : 0;
                  const hoursGap = d.actualHours - d.budgetedHours;
                  const otShare = d.actualHours > 0 ? (d.actualOvertimeHours / d.actualHours) * 100 : 0;
                  const isExpanded = expandedInsightId === d.entityId;
                  const trendVisual = TREND_VISUALS[d.trend.status];

                  return (
                    <article key={d.entityId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-4 grid grid-cols-1 xl:grid-cols-[1.05fr_0.9fr_1.2fr_1fr_0.55fr_44px] gap-3 items-start">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm tabular-nums">
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 leading-tight">{d.entityName}</div>
                            <div className="text-sm text-gray-500 mt-1">{rowScopeLabel(d)}</div>
                          </div>
                        </div>

                        <div className="xl:border-l xl:border-gray-200 xl:pl-4">
                          <RiskBadge level={displayRisk} text={RISK_BADGE_LABELS[displayRisk]} />
                          <div className="text-xs text-gray-500 mt-2 leading-snug">
                            {RISK_DESCRIPTION[displayRisk]}
                          </div>
                        </div>

                        <div className="xl:border-l xl:border-gray-200 xl:pl-4">
                          <div className="text-sm text-gray-500">Primary driver</div>
                          <div className="font-semibold text-slate-navy text-lg leading-tight mt-1">
                            {DRIVER_LABEL[d.topDriver.category]}
                            <span className="text-gray-500 font-normal ml-1">({d.topDriver.percentage}% of variance)</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">• {d.topDriver.description}</div>
                          <div className="text-sm text-gray-500 mt-1 italic">• {fmtSignedHours(hoursGap)} vs budget hours</div>
                          {serviceFlag && (
                            <div className="text-sm text-red-600 mt-1 font-medium">• Service quality risk flag: {d.serviceGapPct.toFixed(1)}% below standard hours</div>
                          )}
                        </div>

                        <div className="xl:border-l xl:border-gray-200 xl:pl-4">
                          <div className={`risk-badge ${trendVisual.badgeClass}`}>
                            {trendVisual.icon}
                            {trendVisual.label}
                          </div>
                          <div className="text-sm text-gray-600 mt-2">{periodsLabel(d.trend.periodsActive)}</div>
                          {d.trend.status !== 'emerging' && (
                            <div className="text-sm text-gray-600">{fmtPct(d.trend.changeVsPrior)} vs prior period</div>
                          )}
                          <div className="text-sm text-gray-500 mt-1 leading-snug">{d.trend.note}</div>
                        </div>

                        <div className="xl:border-l xl:border-gray-200 xl:pl-4 text-right">
                          <div className="text-sm text-gray-500">Labor variance</div>
                          <div className="text-3xl leading-none tabular-nums mt-1"><Currency amount={variance} /></div>
                          <div className="text-xs text-gray-500 tabular-nums mt-1">{fmtPct(costVariancePct)} vs budget</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedInsightId((cur) => (cur === d.entityId ? null : d.entityId))}
                          className="self-center justify-self-end w-9 h-9 rounded-md border border-gray-200 text-slate-navy hover:bg-gray-50"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Collapse ${d.entityName} details` : `Expand ${d.entityName} details`}
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5 mx-auto" /> : <ChevronRight className="w-5 h-5 mx-auto" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-200 px-4 py-4 bg-gray-50/50 grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-sm font-semibold uppercase tracking-wide text-slate-navy">Risk Determination Data</div>
                            <div className="text-xs text-gray-500 mt-1">Inputs used to classify this {FOCUS_LABEL[insightsFocusLevel].toLowerCase()} as {displayRisk.replace('-', ' ')}.</div>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between gap-3 mt-3"><span className="text-gray-600">Actual cost</span><span className="font-medium tabular-nums"><Currency amount={d.actualCost} /></span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">Budgeted cost</span><span className="font-medium tabular-nums"><Currency amount={d.budgetedCost} /></span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">Actual hours</span><span className="font-medium tabular-nums">{fmtNum(d.actualHours)} hrs</span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">Budgeted hours</span><span className="font-medium tabular-nums">{fmtNum(d.budgetedHours)} hrs</span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">Forecasted hours</span><span className="font-medium tabular-nums">{fmtNum(d.forecastedHours)} hrs</span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">Standard hours</span><span className="font-medium tabular-nums">{fmtNum(d.standardHours)} hrs</span></div>
                            </div>
                          </div>

                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-sm font-semibold uppercase tracking-wide text-slate-navy">Primary Driver Support Data</div>
                            <div className="text-xs text-gray-500 mt-1">Evidence supporting why {DRIVER_LABEL[d.topDriver.category]} is the top driver.</div>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between gap-3 mt-3"><span className="text-gray-600">Cost variance %</span><span className="font-medium tabular-nums">{fmtPct(costVariancePct)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">Hours gap</span><span className="font-medium tabular-nums">{fmtSignedHours(hoursGap)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">OT share</span><span className="font-medium tabular-nums">{otShare.toFixed(1)}%</span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">OT hours</span><span className="font-medium tabular-nums">{fmtNum(d.actualOvertimeHours)} hrs</span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">Service quality gap</span><span className={`font-medium tabular-nums ${serviceFlag ? 'text-red-600' : 'text-gray-900'}`}>{d.serviceGapPct.toFixed(1)}%</span></div>
                              <div className="flex justify-between gap-3"><span className="text-gray-600">Data used</span><span className="font-medium text-right">Actual vs budget/forecast/standard hours and cost, OT mix, and driver share.</span></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="Actual vs Targets — by Division"
          icon={<Layers className="w-5 h-5" />}
          subtitle="Compare actual hours and cost against budget, forecast, schedule, and standards. Expand a division to drill into departments."
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Actual vs Targets by Division" />
              <CollapseToggle
                collapsed={!!collapsed.divisionGrid}
                onToggle={() => toggle('divisionGrid')}
                sectionLabel="Actual vs Targets by Division"
              />
            </div>
          }
        />
        {!collapsed.divisionGrid && (
          <DivisionActualVsTargetsGrid org={org} />
        )}
      </div>
    </>
  );
};

const DivisionTargetsGrid: React.FC<{ org: PropertyOrgBreakdown }> = ({ org }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <div className="metric-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Division / Department</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Actual Hours</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Budget Hours</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ Hours</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Actual Cost</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Budget Cost</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ Cost</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {org.divisions.map((div) => {
            const open = !!expanded[div.entityId];
            const childRows = org.departments.filter((d) => d.parentId === div.entityId);
            return (
              <React.Fragment key={div.entityId}>
                <tr className="border-b border-gray-100 bg-gray-50/60 cursor-pointer" onClick={() => setExpanded((p) => ({ ...p, [div.entityId]: !open }))}>
                  <td className="py-3 px-3 font-semibold text-slate-navy flex items-center gap-1.5">
                    {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    {div.entityName}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">{fmtNum(div.actualHours)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{fmtNum(div.budgetedHours)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{fmtSignedHours(div.actualHours - div.budgetedHours)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">${fmtNum(div.actualCost)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">${fmtNum(div.budgetedCost)}</td>
                  <td className="py-3 px-3 text-right tabular-nums"><Currency amount={div.actualCost - div.budgetedCost} /></td>
                  <td className="py-3 px-3"><RiskBadge level={div.riskLevel} text={div.riskLevel.replace('-', ' ')} /></td>
                </tr>
                {open && childRows.map((d) => (
                  <tr key={d.entityId} className="border-b border-gray-100">
                    <td className="py-2.5 px-3 pl-10 text-gray-700">{d.entityName}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(d.actualHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(d.budgetedHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtSignedHours(d.actualHours - d.budgetedHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">${fmtNum(d.actualCost)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">${fmtNum(d.budgetedCost)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums"><Currency amount={d.actualCost - d.budgetedCost} /></td>
                    <td className="py-2.5 px-3"><RiskBadge level={d.riskLevel} text={d.riskLevel.replace('-', ' ')} /></td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// -------------------------------------------------------------------------
// Division Actual vs Targets grid — toggleable Budget/Forecast/Schedule/Standards
// -------------------------------------------------------------------------
type DivComparisonKey = 'budget' | 'forecast' | 'schedule' | 'standards';

interface DivComparisonDef {
  key: DivComparisonKey;
  label: string;
  accent: string;
}

const DIV_COMPARISONS: DivComparisonDef[] = [
  { key: 'budget', label: 'Budget', accent: 'bg-teal-dark text-white' },
  { key: 'forecast', label: 'Forecast', accent: 'bg-emerald-600 text-white' },
  { key: 'schedule', label: 'Schedule', accent: 'bg-blue-600 text-white' },
  { key: 'standards', label: 'Standards', accent: 'bg-indigo-600 text-white' },
];

const targetForRow = (
  row: EntityLaborMetrics,
  key: DivComparisonKey,
): { hours: number; cost: number } => {
  const baseRate = row.actualHours > 0 ? row.actualCost / row.actualHours : 0;
  switch (key) {
    case 'budget':
      return { hours: row.budgetedHours, cost: row.budgetedCost };
    case 'forecast':
      return { hours: row.forecastedHours, cost: row.forecastedCost };
    case 'schedule':
      return { hours: row.scheduledHours, cost: row.scheduledHours * baseRate };
    case 'standards':
      return { hours: row.standardHours, cost: row.standardHours * baseRate };
  }
};

const varianceTextClass = (delta: number): string => {
  if (delta > 0) return 'text-orange font-semibold';
  if (delta < 0) return 'text-emerald-600 font-semibold';
  return 'text-gray-500';
};

const fmtSignedCurrency = (n: number): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
  if (n > 0) return '+' + formatted;
  if (n < 0) return '-' + formatted;
  return formatted;
};

const DivisionActualVsTargetsGrid: React.FC<{
  org: PropertyOrgBreakdown;
  defaultComparisons?: DivComparisonKey[];
}> = ({ org, defaultComparisons }) => {
  const [enabled, setEnabled] = useState<DivComparisonKey[]>(
    defaultComparisons ?? ['budget', 'forecast'],
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const orderedComparisons = useMemo(
    () => DIV_COMPARISONS.filter((c) => enabled.includes(c.key)),
    [enabled],
  );

  const toggleComparison = (key: DivComparisonKey) => {
    setEnabled((curr) =>
      curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key],
    );
  };

  const totals = useMemo(() => {
    let actualHours = 0;
    let actualCost = 0;
    const targets: Record<DivComparisonKey, { hours: number; cost: number }> = {
      budget: { hours: 0, cost: 0 },
      forecast: { hours: 0, cost: 0 },
      schedule: { hours: 0, cost: 0 },
      standards: { hours: 0, cost: 0 },
    };
    for (const div of org.divisions) {
      actualHours += div.actualHours;
      actualCost += div.actualCost;
      (Object.keys(targets) as DivComparisonKey[]).forEach((k) => {
        const t = targetForRow(div, k);
        targets[k].hours += t.hours;
        targets[k].cost += t.cost;
      });
    }
    return { actualHours, actualCost, targets };
  }, [org.divisions]);

  return (
    <div className="metric-card !p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1">
          Compare against:
        </span>
        {DIV_COMPARISONS.map((c) => {
          const active = enabled.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleComparison(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? `${c.accent} border-transparent`
                  : 'bg-white text-gray-600 border-gray-300 hover:border-teal hover:text-teal-dark'
              } cursor-pointer`}
              title={active ? 'Click to remove' : 'Click to add'}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-200">
              <th
                rowSpan={2}
                className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider align-bottom border-r border-gray-200"
              >
                <span className="inline-block w-4" />
                Division / Department
              </th>
              <th
                colSpan={2}
                className="text-center py-2 px-2 font-semibold text-gray-700 text-xs uppercase tracking-wider border-r border-gray-200"
              >
                Actual
              </th>
              {orderedComparisons.map((c) => (
                <th
                  key={c.key}
                  colSpan={4}
                  className="text-center py-2 px-2 font-semibold text-xs uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                >
                  <span className={`inline-block px-2 py-0.5 rounded ${c.accent}`}>{c.label}</span>
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50/70 border-b border-gray-200">
              <th className="text-right py-2 px-2 font-medium text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">
                Hours
              </th>
              <th className="text-right py-2 px-2 font-medium text-gray-600 text-[11px] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">
                Cost
              </th>
              {orderedComparisons.map((c) => (
                <React.Fragment key={c.key}>
                  <th className="text-right py-2 px-2 font-medium text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">
                    Hours
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">
                    Hrs Var
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">
                    Cost
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600 text-[11px] uppercase tracking-wider border-r border-gray-200 last:border-r-0 whitespace-nowrap">
                    Cost Var
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {org.divisions.map((div) => {
              const isOpen = !!expanded[div.entityId];
              const childRows = org.departments.filter((d) => d.parentId === div.entityId);
              return (
                <React.Fragment key={div.entityId}>
                  <tr
                    className="border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setExpanded((p) => ({ ...p, [div.entityId]: !isOpen }))}
                  >
                    <td className="py-3 px-3 font-semibold text-slate-navy border-r border-gray-100">
                      <span className="inline-flex items-center gap-1.5">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        {div.entityName}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums text-gray-900 whitespace-nowrap">{fmtNum(div.actualHours)}</td>
                    <td className="py-3 px-2 text-right tabular-nums text-gray-900 border-r border-gray-100 whitespace-nowrap">
                      ${fmtNum(div.actualCost)}
                    </td>
                    {orderedComparisons.map((c) => {
                      const target = targetForRow(div, c.key);
                      const hoursVar = div.actualHours - target.hours;
                      const costVar = div.actualCost - target.cost;
                      return (
                        <React.Fragment key={c.key}>
                          <td className="py-3 px-2 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmtNum(target.hours)}</td>
                          <td className={`py-3 px-2 text-right tabular-nums whitespace-nowrap ${varianceTextClass(hoursVar)}`}>
                            {fmtSignedHours(hoursVar).replace(' hrs', '')}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums text-gray-700 whitespace-nowrap">${fmtNum(target.cost)}</td>
                          <td className={`py-3 px-2 text-right tabular-nums border-r border-gray-100 last:border-r-0 whitespace-nowrap ${varianceTextClass(costVar)}`}>
                            {fmtSignedCurrency(costVar)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                  {isOpen &&
                    childRows.map((d) => (
                      <tr key={d.entityId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 pl-10 text-gray-700 border-r border-gray-100">
                          {d.entityName}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmtNum(d.actualHours)}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-gray-700 border-r border-gray-100 whitespace-nowrap">
                          ${fmtNum(d.actualCost)}
                        </td>
                        {orderedComparisons.map((c) => {
                          const target = targetForRow(d, c.key);
                          const hoursVar = d.actualHours - target.hours;
                          const costVar = d.actualCost - target.cost;
                          return (
                            <React.Fragment key={c.key}>
                              <td className="py-2.5 px-2 text-right tabular-nums text-gray-600 text-xs whitespace-nowrap">{fmtNum(target.hours)}</td>
                              <td className={`py-2.5 px-2 text-right tabular-nums text-xs whitespace-nowrap ${varianceTextClass(hoursVar)}`}>
                                {fmtSignedHours(hoursVar).replace(' hrs', '')}
                              </td>
                              <td className="py-2.5 px-2 text-right tabular-nums text-gray-600 text-xs whitespace-nowrap">${fmtNum(target.cost)}</td>
                              <td className={`py-2.5 px-2 text-right tabular-nums text-xs border-r border-gray-100 last:border-r-0 whitespace-nowrap ${varianceTextClass(costVar)}`}>
                                {fmtSignedCurrency(costVar)}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
          {org.divisions.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                <td className="py-3 px-3 text-slate-navy border-r border-gray-200">
                  Totals
                  <div className="text-xs font-normal text-gray-500">{org.divisions.length} divisions</div>
                </td>
                <td className="py-3 px-2 text-right tabular-nums text-slate-navy whitespace-nowrap">{fmtNum(totals.actualHours)}</td>
                <td className="py-3 px-2 text-right tabular-nums text-slate-navy border-r border-gray-200 whitespace-nowrap">
                  ${fmtNum(totals.actualCost)}
                </td>
                {orderedComparisons.map((c) => {
                  const t = totals.targets[c.key];
                  const hoursVar = totals.actualHours - t.hours;
                  const costVar = totals.actualCost - t.cost;
                  return (
                    <React.Fragment key={c.key}>
                      <td className="py-3 px-2 text-right tabular-nums text-slate-navy whitespace-nowrap">{fmtNum(t.hours)}</td>
                      <td className={`py-3 px-2 text-right tabular-nums whitespace-nowrap ${varianceTextClass(hoursVar)}`}>
                        {fmtSignedHours(hoursVar).replace(' hrs', '')}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-slate-navy whitespace-nowrap">${fmtNum(t.cost)}</td>
                      <td className={`py-3 px-2 text-right tabular-nums border-r border-gray-200 last:border-r-0 whitespace-nowrap ${varianceTextClass(costVar)}`}>
                        {fmtSignedCurrency(costVar)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
        Positive variance = actual above target (unfavorable). Schedule and Standards cost is derived from each row's average labor rate.
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Budget Performance tab
// -------------------------------------------------------------------------
const BudgetPerformanceTab: React.FC<{ org: PropertyOrgBreakdown; collapsed: Record<string, boolean>; toggle: (k: string) => void }> = ({ org, collapsed, toggle }) => {
  const totals = useMemo(() => {
    const actualHours = org.departments.reduce((s, d) => s + d.actualHours, 0);
    const budgetHours = org.departments.reduce((s, d) => s + d.budgetedHours, 0);
    const actualCost = org.departments.reduce((s, d) => s + d.actualCost, 0);
    const budgetCost = org.departments.reduce((s, d) => s + d.budgetedCost, 0);
    return {
      actualHours,
      budgetHours,
      hoursVariance: actualHours - budgetHours,
      hoursVariancePct: budgetHours > 0 ? ((actualHours - budgetHours) / budgetHours) * 100 : 0,
      actualCost,
      budgetCost,
      costVariance: actualCost - budgetCost,
      costVariancePct: budgetCost > 0 ? ((actualCost - budgetCost) / budgetCost) * 100 : 0,
    };
  }, [org]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Actual Hours" value={fmtNum(totals.actualHours)} subtext="Hours" icon={<Clock className="w-8 h-8" />} accent="teal" />
        <MetricCard label="Budget Hours" value={fmtNum(totals.budgetHours)} subtext="Hours" icon={<ClipboardList className="w-8 h-8" />} accent="indigo" />
        <MetricCard
          label="Hours Variance"
          value={fmtSignedHours(totals.hoursVariance).replace(' hrs', '')}
          subtext={<Percentage value={totals.hoursVariancePct} />}
          icon={<ArrowUpDown className="w-8 h-8" />}
          accent={totals.hoursVariance > 0 ? 'orange' : 'emerald'}
        />
        <MetricCard label="Actual Labor Cost" value={<Currency amount={totals.actualCost} />} subtext="USD" icon={<CircleDollarSign className="w-8 h-8" />} accent="teal" />
        <MetricCard label="Budget Labor Cost" value={<Currency amount={totals.budgetCost} />} subtext="USD" icon={<DollarSign className="w-8 h-8" />} accent="indigo" />
        <MetricCard
          label="Cost Variance"
          value={<span>{totals.costVariance >= 0 ? '+' : ''}<Currency amount={totals.costVariance} /></span>}
          subtext={<Percentage value={totals.costVariancePct} />}
          icon={<ArrowUpDown className="w-8 h-8" />}
          accent={totals.costVariance > 0 ? 'orange' : 'emerald'}
        />
      </div>

      <div>
        <SectionHeader
          title="Budget Performance — Division & Department"
          icon={<Layers className="w-5 h-5" />}
          subtitle="Drill into divisions to see departmental contribution to variance"
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Budget Performance by Division" />
              <CollapseToggle
                collapsed={!!collapsed.budgetTable}
                onToggle={() => toggle('budgetTable')}
                sectionLabel="Budget Performance Table"
              />
            </div>
          }
        />
        {!collapsed.budgetTable && <DivisionTargetsGrid org={org} />}
      </div>

      <div>
        <SectionHeader
          title="Budget Performance — Job Detail"
          icon={<Briefcase className="w-5 h-5" />}
          subtitle="Bottom-up view of every job role's labor performance"
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Budget Performance by Job" />
              <CollapseToggle
                collapsed={!!collapsed.jobTable}
                onToggle={() => toggle('jobTable')}
                sectionLabel="Budget Performance Jobs"
              />
            </div>
          }
        />
        {!collapsed.jobTable && <JobBudgetTable org={org} />}
      </div>
    </>
  );
};

const JobBudgetTable: React.FC<{ org: PropertyOrgBreakdown }> = ({ org }) => {
  const rows = useMemo(
    () => [...org.jobs].sort((a, b) => (b.actualCost - b.budgetedCost) - (a.actualCost - a.budgetedCost)),
    [org.jobs],
  );
  return (
    <div className="metric-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Job</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Department</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Actual Hours</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Budget Hours</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ Hours</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ Cost</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((j) => (
            <tr key={j.entityId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2.5 px-3 font-medium text-gray-900">{j.entityName}</td>
              <td className="py-2.5 px-3 text-gray-600">{j.departmentName}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(j.actualHours)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(j.budgetedHours)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{fmtSignedHours(j.actualHours - j.budgetedHours)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums"><Currency amount={j.actualCost - j.budgetedCost} /></td>
              <td className="py-2.5 px-3"><RiskBadge level={j.riskLevel} text={j.riskLevel.replace('-', ' ')} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// -------------------------------------------------------------------------
// Mid-Month Forecast tab
// -------------------------------------------------------------------------
const MidMonthForecastTab: React.FC<{ org: PropertyOrgBreakdown; collapsed: Record<string, boolean>; toggle: (k: string) => void }> = ({ org, collapsed, toggle }) => {
  // Assume mid-month: MTD = 50% of period values, remaining = 50% of forecast/budget
  const rows = useMemo(() => {
    return org.departments.map((d) => {
      const mtdActual = d.actualHours * 0.5;
      const mtdBudget = d.budgetedHours * 0.5;
      const remainingForecast = d.forecastedHours * 0.5;
      const projectedHours = mtdActual + remainingForecast;
      const fullBudget = d.budgetedHours;
      const variance = projectedHours - fullBudget;
      const variancePct = fullBudget > 0 ? (variance / fullBudget) * 100 : 0;
      return {
        ...d,
        mtdActual,
        mtdBudget,
        remainingForecast,
        projectedHours,
        fullBudget,
        variance,
        variancePct,
      };
    }).sort((a, b) => b.variance - a.variance);
  }, [org.departments]);

  const totals = rows.reduce(
    (a, r) => ({
      mtdActual: a.mtdActual + r.mtdActual,
      mtdBudget: a.mtdBudget + r.mtdBudget,
      remainingForecast: a.remainingForecast + r.remainingForecast,
      projectedHours: a.projectedHours + r.projectedHours,
      fullBudget: a.fullBudget + r.fullBudget,
      variance: a.variance + r.variance,
    }),
    { mtdActual: 0, mtdBudget: 0, remainingForecast: 0, projectedHours: 0, fullBudget: 0, variance: 0 },
  );
  const totalVariancePct = totals.fullBudget > 0 ? (totals.variance / totals.fullBudget) * 100 : 0;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard label="MTD Actual" value={`${fmtNum(totals.mtdActual)} hrs`} subtext={`vs ${fmtNum(totals.mtdBudget)} MTD budget`} icon={<Clock className="w-8 h-8" />} accent="teal" />
        <MetricCard label="MTD Budget" value={`${fmtNum(totals.mtdBudget)} hrs`} subtext="To-date allocation" icon={<ClipboardList className="w-8 h-8" />} accent="indigo" />
        <MetricCard label="Remaining Forecast" value={`${fmtNum(totals.remainingForecast)} hrs`} subtext="Projected to month-end" icon={<CalendarClock className="w-8 h-8" />} accent="slate" />
        <MetricCard label="Projected Total" value={`${fmtNum(totals.projectedHours)} hrs`} subtext={`vs ${fmtNum(totals.fullBudget)} budget`} icon={<TrendingUp className="w-8 h-8" />} accent={totals.variance > 0 ? 'orange' : 'emerald'} />
        <MetricCard label="Projected Variance" value={fmtSignedHours(totals.variance).replace(' hrs', '')} subtext={<Percentage value={totalVariancePct} />} icon={<ArrowUpDown className="w-8 h-8" />} accent={totals.variance > 0 ? 'orange' : 'emerald'} />
      </div>

      <div>
        <SectionHeader
          title="Mid-Month Forecast — by Department"
          icon={<CalendarClock className="w-5 h-5" />}
          subtitle="MTD performance + remaining-month forecast projected to month-end"
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Mid-Month Forecast by Department" />
              <CollapseToggle
                collapsed={!!collapsed.midMonthTable}
                onToggle={() => toggle('midMonthTable')}
                sectionLabel="Mid-Month Forecast Table"
              />
            </div>
          }
        />
        {!collapsed.midMonthTable && (
          <div className="metric-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Department</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Division</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">MTD Actual</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">MTD Budget</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Remaining Forecast</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Projected</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ vs Budget</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.entityId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{r.entityName}</td>
                    <td className="py-2.5 px-3 text-gray-600">{r.divisionName}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.mtdActual)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.mtdBudget)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.remainingForecast)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.projectedHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtSignedHours(r.variance)}</td>
                    <td className="py-2.5 px-3"><RiskBadge level={r.riskLevel} text={r.riskLevel.replace('-', ' ')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

// -------------------------------------------------------------------------
// Plan & Standard Performance tab
// -------------------------------------------------------------------------
const PlanStandardTab: React.FC<{ org: PropertyOrgBreakdown; periodLabel: string; collapsed: Record<string, boolean>; toggle: (k: string) => void }> = ({ org, periodLabel, collapsed, toggle }) => {
  const rows = useMemo(() => {
    return org.departments.map((d) => {
      const actualVsStandard = d.actualHours - d.standardHours;
      const actualVsSchedule = d.actualHours - d.scheduledHours;
      const scheduleVsBudget = d.scheduledHours - d.budgetedHours;
      const pctOverStandard = d.standardHours > 0 ? (actualVsStandard / d.standardHours) * 100 : 0;
      return {
        ...d,
        actualVsStandard,
        actualVsSchedule,
        scheduleVsBudget,
        pctOverStandard,
      };
    }).sort((a, b) => b.actualVsStandard - a.actualVsStandard);
  }, [org.departments]);

  const totals = rows.reduce(
    (a, r) => ({
      actualHours: a.actualHours + r.actualHours,
      standardHours: a.standardHours + r.standardHours,
      scheduledHours: a.scheduledHours + r.scheduledHours,
      budgetedHours: a.budgetedHours + r.budgetedHours,
      actualVsStandard: a.actualVsStandard + r.actualVsStandard,
      actualVsSchedule: a.actualVsSchedule + r.actualVsSchedule,
      scheduleVsBudget: a.scheduleVsBudget + r.scheduleVsBudget,
    }),
    { actualHours: 0, standardHours: 0, scheduledHours: 0, budgetedHours: 0, actualVsStandard: 0, actualVsSchedule: 0, scheduleVsBudget: 0 },
  );
  const totalPctOverStandard = totals.standardHours > 0 ? (totals.actualVsStandard / totals.standardHours) * 100 : 0;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Actual vs Standard" value={fmtSignedHours(totals.actualVsStandard).replace(' hrs', '')} subtext={fmtPct(totalPctOverStandard) + ' over standard'} icon={<Gauge className="w-8 h-8" />} accent={totals.actualVsStandard > 0 ? 'orange' : 'emerald'} infoTooltip={`${periodLabel} — productivity vs labor standards`} />
        <MetricCard label="Actual vs Schedule" value={fmtSignedHours(totals.actualVsSchedule).replace(' hrs', '')} subtext="Execution discipline" icon={<Clock className="w-8 h-8" />} accent={totals.actualVsSchedule > 0 ? 'orange' : 'emerald'} />
        <MetricCard label="Schedule vs Budget" value={fmtSignedHours(totals.scheduleVsBudget).replace(' hrs', '')} subtext="Plan discipline" icon={<ClipboardList className="w-8 h-8" />} accent={totals.scheduleVsBudget > 0 ? 'orange' : 'emerald'} />
        <MetricCard label="Standard Hours" value={fmtNum(totals.standardHours)} subtext="Activity-based target" icon={<Layers className="w-8 h-8" />} accent="indigo" />
      </div>

      <div>
        <SectionHeader
          title="Plan & Standard Performance — by Department"
          icon={<Gauge className="w-5 h-5" />}
          subtitle="How actual hours track against standards, schedule, and budget"
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Plan and Standard Performance" />
              <CollapseToggle
                collapsed={!!collapsed.planTable}
                onToggle={() => toggle('planTable')}
                sectionLabel="Plan & Standard Table"
              />
            </div>
          }
        />
        {!collapsed.planTable && (
          <div className="metric-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Department</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Division</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Actual</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Standard</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ vs Std</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">% Over Std</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ vs Sched</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Sched Δ vs Budget</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.entityId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{r.entityName}</td>
                    <td className="py-2.5 px-3 text-gray-600">{r.divisionName}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.actualHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(r.standardHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtSignedHours(r.actualVsStandard)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums"><Percentage value={r.pctOverStandard} /></td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtSignedHours(r.actualVsSchedule)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtSignedHours(r.scheduleVsBudget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="Actual vs Targets — by Division"
          icon={<Layers className="w-5 h-5" />}
          subtitle="Toggle Budget, Forecast, Schedule, and Standards side-by-side. Expand a division to drill into departments."
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Actual vs Targets by Division" />
              <CollapseToggle
                collapsed={!!collapsed.planTargetsGrid}
                onToggle={() => toggle('planTargetsGrid')}
                sectionLabel="Actual vs Targets by Division"
              />
            </div>
          }
        />
        {!collapsed.planTargetsGrid && (
          <DivisionActualVsTargetsGrid org={org} defaultComparisons={['budget', 'forecast', 'schedule', 'standards']} />
        )}
      </div>
    </>
  );
};

// -------------------------------------------------------------------------
// Overtime Intelligence tab
// -------------------------------------------------------------------------
const OvertimeIntelligenceTab: React.FC<{ org: PropertyOrgBreakdown; collapsed: Record<string, boolean>; toggle: (k: string) => void }> = ({ org, collapsed, toggle }) => {
  const totalOtHours = org.departments.reduce((s, d) => s + d.actualOvertimeHours, 0);
  const totalScheduledOt = org.departments.reduce((s, d) => s + d.scheduledOvertimeHours, 0);
  const otExposure = overtimeExposure(org.departments);
  const totalActualHours = org.departments.reduce((s, d) => s + d.actualHours, 0);
  const otRate = totalActualHours > 0 ? (totalOtHours / totalActualHours) * 100 : 0;

  const deptRows = useMemo(
    () => [...org.departments]
      .map((d) => {
        const baseRate = d.actualHours > 0 ? d.actualCost / d.actualHours : 0;
        return {
          ...d,
          otCost: d.actualOvertimeHours * baseRate * 1.5,
          otShare: d.actualHours > 0 ? (d.actualOvertimeHours / d.actualHours) * 100 : 0,
          otOverSched: d.actualOvertimeHours - d.scheduledOvertimeHours,
        };
      })
      .sort((a, b) => b.actualOvertimeHours - a.actualOvertimeHours),
    [org.departments],
  );

  const topJobs = useMemo(
    () => [...org.jobs]
      .map((j) => {
        const baseRate = j.actualHours > 0 ? j.actualCost / j.actualHours : 0;
        return {
          ...j,
          otCost: j.actualOvertimeHours * baseRate * 1.5,
          otShare: j.actualHours > 0 ? (j.actualOvertimeHours / j.actualHours) * 100 : 0,
        };
      })
      .sort((a, b) => b.actualOvertimeHours - a.actualOvertimeHours)
      .slice(0, 10),
    [org.jobs],
  );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Actual OT Hours" value={fmtNum(totalOtHours)} subtext="Last 7 / Next 7 Days" icon={<Clock4 className="w-8 h-8" />} accent="orange" />
        <MetricCard label="Scheduled OT" value={fmtNum(totalScheduledOt)} subtext="Planned overtime" icon={<ClipboardList className="w-8 h-8" />} accent="indigo" />
        <MetricCard label="OT % of Hours" value={`${otRate.toFixed(1)}%`} subtext="Of total actual hours" icon={<Gauge className="w-8 h-8" />} accent={otRate > 5 ? 'red' : otRate > 3 ? 'amber' : 'emerald'} />
        <MetricCard label="OT Cost Exposure" value={<Currency amount={otExposure} />} subtext="Base rate × 1.5" icon={<DollarSign className="w-8 h-8" />} accent="orange" />
      </div>

      <div>
        <SectionHeader
          title="Overtime by Department"
          icon={<Clock4 className="w-5 h-5" />}
          subtitle="Where overtime hours are accumulating across the property"
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Overtime by Department" />
              <CollapseToggle
                collapsed={!!collapsed.otDept}
                onToggle={() => toggle('otDept')}
                sectionLabel="Overtime by Department"
              />
            </div>
          }
        />
        {!collapsed.otDept && (
          <div className="metric-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Department</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Division</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">OT Hours</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Scheduled OT</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">OT vs Sched</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">OT % of Hours</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Est. OT Cost</th>
                </tr>
              </thead>
              <tbody>
                {deptRows.map((d) => (
                  <tr key={d.entityId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{d.entityName}</td>
                    <td className="py-2.5 px-3 text-gray-600">{d.divisionName}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(d.actualOvertimeHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(d.scheduledOvertimeHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtSignedHours(d.otOverSched)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{d.otShare.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums"><Currency amount={d.otCost} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="Top Overtime Jobs"
          icon={<Briefcase className="w-5 h-5" />}
          subtitle="Job roles driving the most overtime hours"
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Top Overtime Jobs" />
              <CollapseToggle
                collapsed={!!collapsed.otJob}
                onToggle={() => toggle('otJob')}
                sectionLabel="Top Overtime Jobs"
              />
            </div>
          }
        />
        {!collapsed.otJob && (
          <div className="metric-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Job</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Department</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">OT Hours</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">OT % of Hours</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Est. OT Cost</th>
                </tr>
              </thead>
              <tbody>
                {topJobs.map((j) => (
                  <tr key={j.entityId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{j.entityName}</td>
                    <td className="py-2.5 px-3 text-gray-600">{j.departmentName}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(j.actualOvertimeHours)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{j.otShare.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums"><Currency amount={j.otCost} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

// -------------------------------------------------------------------------
// Scenario Lab tab
// -------------------------------------------------------------------------
interface ScenarioInputs {
  productivity: number; // % delta (negative = improvement to actual hours)
  overtimeReduction: number; // % (negative reduces OT)
  wageInflation: number; // %
}

const DEFAULT_SCENARIO: ScenarioInputs = {
  productivity: 0,
  overtimeReduction: 0,
  wageInflation: 0,
};

const ScenarioLabTab: React.FC<{ org: PropertyOrgBreakdown; collapsed: Record<string, boolean>; toggle: (k: string) => void }> = ({ org, collapsed, toggle }) => {
  const [inputs, setInputs] = useState<ScenarioInputs>(DEFAULT_SCENARIO);
  const [scopeDept, setScopeDept] = useState<string>('all');

  const scopedDepts = useMemo(() => {
    if (scopeDept === 'all') return org.departments;
    return org.departments.filter((d) => d.entityId === scopeDept);
  }, [org.departments, scopeDept]);

  const baseline = useMemo(() => {
    const actualHours = scopedDepts.reduce((s, d) => s + d.actualHours, 0);
    const actualCost = scopedDepts.reduce((s, d) => s + d.actualCost, 0);
    const otHours = scopedDepts.reduce((s, d) => s + d.actualOvertimeHours, 0);
    return { actualHours, actualCost, otHours };
  }, [scopedDepts]);

  const scenario = useMemo(() => {
    const baseRate = baseline.actualHours > 0 ? baseline.actualCost / baseline.actualHours : 0;
    // Productivity: +X% productivity => -X% hours required for same output
    const productivityFactor = 1 - inputs.productivity / 100;
    const projectedHours = baseline.actualHours * productivityFactor;

    // OT reduction: reduce OT hours by |overtimeReduction|% (negative input)
    const otFactor = 1 + inputs.overtimeReduction / 100;
    const projectedOtHours = Math.max(0, baseline.otHours * otFactor);
    const otSavedHours = baseline.otHours - projectedOtHours;
    const otSavedCost = otSavedHours * baseRate * 1.5; // OT at 1.5x

    // Wage inflation applies to non-OT hours
    const wageFactor = 1 + inputs.wageInflation / 100;
    const nonOtHours = projectedHours - projectedOtHours;
    const projectedNonOtCost = nonOtHours * baseRate * wageFactor;
    const projectedOtCost = projectedOtHours * baseRate * 1.5 * wageFactor;
    const projectedCost = projectedNonOtCost + projectedOtCost;

    return {
      projectedHours,
      projectedOtHours,
      projectedCost,
      hoursDelta: projectedHours - baseline.actualHours,
      costDelta: projectedCost - baseline.actualCost,
      otSavedCost,
    };
  }, [inputs, baseline]);

  const setI = (k: keyof ScenarioInputs, v: number) => setInputs((prev) => ({ ...prev, [k]: v }));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Baseline Hours" value={fmtNum(baseline.actualHours)} subtext="Current actual" icon={<Clock className="w-8 h-8" />} accent="slate" />
        <MetricCard label="Projected Hours" value={fmtNum(scenario.projectedHours)} subtext={fmtSignedHours(scenario.hoursDelta).replace(' hrs', '') + ' vs baseline'} icon={<Users className="w-8 h-8" />} accent={scenario.hoursDelta > 0 ? 'orange' : 'emerald'} />
        <MetricCard label="Projected Cost" value={<Currency amount={scenario.projectedCost} />} subtext={<span>{scenario.costDelta >= 0 ? '+' : ''}<Currency amount={scenario.costDelta} /> vs baseline</span>} icon={<DollarSign className="w-8 h-8" />} accent={scenario.costDelta > 0 ? 'orange' : 'emerald'} />
        <MetricCard label="OT Savings (vs baseline)" value={<Currency amount={Math.max(0, scenario.otSavedCost)} />} subtext={`${fmtNum(baseline.otHours - scenario.projectedOtHours)} OT hrs avoided`} icon={<TrendingDown className="w-8 h-8" />} accent="emerald" />
      </div>

      <div>
        <SectionHeader
          title="Scenario Inputs"
          icon={<FlaskConical className="w-5 h-5" />}
          subtitle="Model productivity, overtime, and wage adjustments at the department level"
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInputs(DEFAULT_SCENARIO)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-slate-navy border border-gray-200 rounded-md hover:border-gray-300"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              <CollapseToggle
                collapsed={!!collapsed.scenarioInputs}
                onToggle={() => toggle('scenarioInputs')}
                sectionLabel="Scenario Inputs"
              />
            </div>
          }
        />
        {!collapsed.scenarioInputs && (
          <div className="metric-card space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5" /> Scope</label>
              <select
                value={scopeDept}
                onChange={(e) => setScopeDept(e.target.value)}
                className="mt-2 w-full max-w-md px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal"
              >
                <option value="all">All departments</option>
                {org.departments.map((d) => (
                  <option key={d.entityId} value={d.entityId}>{d.divisionName} — {d.entityName}</option>
                ))}
              </select>
            </div>
            <ScenarioSlider label="Productivity Improvement" value={inputs.productivity} min={-10} max={15} step={0.5} unit="%" onChange={(v) => setI('productivity', v)} hint="Higher productivity reduces hours required for same output" />
            <ScenarioSlider label="Overtime Reduction" value={inputs.overtimeReduction} min={-50} max={10} step={1} unit="%" onChange={(v) => setI('overtimeReduction', v)} hint="Negative values cut overtime (e.g. -20% removes 20% of OT hours)" />
            <ScenarioSlider label="Wage Inflation" value={inputs.wageInflation} min={-2} max={10} step={0.25} unit="%" onChange={(v) => setI('wageInflation', v)} hint="Applied to projected wage cost" />
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="Scenario Impact — by Department"
          icon={<Layers className="w-5 h-5" />}
          subtitle="Modeled hour and cost change applied proportionally to each department in scope"
          action={
            <div className="flex items-center gap-2">
              <ExportButton sectionLabel="Scenario Impact by Department" />
              <CollapseToggle
                collapsed={!!collapsed.scenarioTable}
                onToggle={() => toggle('scenarioTable')}
                sectionLabel="Scenario Impact Table"
              />
            </div>
          }
        />
        {!collapsed.scenarioTable && (
          <div className="metric-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Department</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Baseline Hrs</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Scenario Hrs</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ Hrs</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Baseline Cost</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Scenario Cost</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Δ Cost</th>
                </tr>
              </thead>
              <tbody>
                {org.departments.map((d) => {
                  const inScope = scopeDept === 'all' || scopeDept === d.entityId;
                  const productivityFactor = inScope ? 1 - inputs.productivity / 100 : 1;
                  const otFactor = inScope ? 1 + inputs.overtimeReduction / 100 : 1;
                  const wageFactor = inScope ? 1 + inputs.wageInflation / 100 : 1;
                  const baseRate = d.actualHours > 0 ? d.actualCost / d.actualHours : 0;
                  const newOt = Math.max(0, d.actualOvertimeHours * otFactor);
                  const newHours = d.actualHours * productivityFactor;
                  const newNonOt = newHours - newOt;
                  const newCost = (newNonOt * baseRate + newOt * baseRate * 1.5) * wageFactor;
                  return (
                    <tr key={d.entityId} className={`border-b border-gray-100 ${inScope ? '' : 'opacity-60'}`}>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{d.entityName} <span className="text-xs text-gray-500 ml-1">({d.divisionName})</span></td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(d.actualHours)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{fmtNum(newHours)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{fmtSignedHours(newHours - d.actualHours)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">${fmtNum(d.actualCost)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">${fmtNum(newCost)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums"><Currency amount={newCost - d.actualCost} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

const ScenarioSlider: React.FC<{ label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; hint?: string }> = ({ label, value, min, max, step, unit, onChange, hint }) => (
  <div>
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-slate-navy">{label}</label>
      <span className="text-sm font-semibold text-teal-dark tabular-nums">{value > 0 ? '+' : ''}{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full mt-2 accent-teal-dark"
    />
    {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
  </div>
);

// -------------------------------------------------------------------------
// Main PropertyView component
// -------------------------------------------------------------------------
const PropertyView: React.FC<PropertyViewProps> = ({
  hotel,
  hotelMetrics,
  activeModule,
  periodScale,
  periodLabel,
  driversSubtitle,
}) => {
  const org = useMemo(
    () => buildPropertyEntityMetrics(hotelMetrics, periodScale),
    [hotelMetrics, periodScale],
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));

  return (
    <>
      {activeModule === 'overview' && (
        <OverviewTab org={org} periodLabel={periodLabel} driversSubtitle={driversSubtitle} collapsed={collapsed} toggle={toggle} />
      )}
      {activeModule === 'budget-performance' && (
        <BudgetPerformanceTab org={org} collapsed={collapsed} toggle={toggle} />
      )}
      {activeModule === 'mid-month-forecast' && (
        <MidMonthForecastTab org={org} collapsed={collapsed} toggle={toggle} />
      )}
      {activeModule === 'plan-standard-performance' && (
        <PlanStandardTab org={org} periodLabel={periodLabel} collapsed={collapsed} toggle={toggle} />
      )}
      {activeModule === 'overtime-intelligence' && (
        <OvertimeIntelligenceTab org={org} collapsed={collapsed} toggle={toggle} />
      )}
      {activeModule === 'scenario-lab' && (
        <ScenarioLabTab org={org} collapsed={collapsed} toggle={toggle} />
      )}
    </>
  );
};

export default PropertyView;
