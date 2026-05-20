import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  AlertTriangle,
  Clock,
  DollarSign,
  AlertCircle,
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  ArrowUpDown,
  CircleDollarSign,
  CalendarClock,
  Clock4,
  Gauge,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { MetricCard, SectionHeader, FilterButton, Currency, Percentage } from '../components/ui/Card';
import type { AccentTone } from '../components/ui/Card';
import PropertyFilter from '../components/ui/PropertyFilter';
import HotelGroupsManager from '../components/ui/HotelGroupsManager';
import BudgetDatasetSettings, { DEFAULT_BUDGET_DATASET_ID } from '../components/ui/BudgetDatasetSettings';
import AIInsightsPanel from '../components/ui/AIInsightsPanel';
import { HotelGroup } from '../types';
import HotelsRequiringAttention from '../components/portfolio/HotelsRequiringAttention';
import TopVarianceDrivers from '../components/portfolio/TopVarianceDrivers';
import LaborQuickStats from '../components/portfolio/LaborQuickStats';
import ActualVsTargetsGrid from '../components/portfolio/ActualVsTargetsGrid';
import MidMonthForecast from '../components/portfolio/MidMonthForecast';
import PlanStandardPerformance from '../components/portfolio/PlanStandardPerformance';
import OvertimeIntelligence from '../components/portfolio/OvertimeIntelligence';
import ScenarioLab from '../components/portfolio/ScenarioLab';
import { RiskLevel } from '../types';
import {
  MOCK_HOTELS_REQUIRING_ATTENTION,
  MOCK_TOP_VARIANCE_DRIVERS,
  MOCK_HOTELS,
  MOCK_QUICK_STATS_BY_HOTEL,
  MOCK_RISK_DISTRIBUTION,
  MOCK_LABOR_METRICS,
} from '../data/mockData';

interface HotelContribution {
  hotelId: string;
  hotelName: string;
  amount: number;
}

interface ContributionPopoverCardProps {
  label: string;
  value: React.ReactNode;
  subtext: React.ReactNode;
  icon: React.ReactNode;
  contributions: HotelContribution[];
  popoverTitle: string;
  totalAmount: number;
  emptyMessage: string;
  infoTooltip?: React.ReactNode;
  accent?: AccentTone;
  formatAmount?: (n: number) => React.ReactNode;
  totalLabelSuffix?: string;
}

const ContributionPopoverCard: React.FC<ContributionPopoverCardProps> = ({
  label,
  value,
  subtext,
  icon,
  contributions,
  popoverTitle,
  totalAmount,
  emptyMessage,
  infoTooltip,
  accent,
  formatAmount,
  totalLabelSuffix = 'total',
}) => {
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

  const wrappedValue = (
    <span className="underline decoration-dotted decoration-gray-300 underline-offset-4 cursor-pointer">
      {value}
    </span>
  );

  const maxAbs = contributions.reduce((m, c) => Math.max(m, Math.abs(c.amount)), 0);

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
        <MetricCard label={label} value={wrappedValue} subtext={subtext} icon={icon} infoTooltip={infoTooltip} accent={accent} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {popoverTitle}
            </div>
            <div className="text-xs font-semibold text-gray-700">
              {formatAmount ? formatAmount(totalAmount) : <Currency amount={totalAmount} />} {totalLabelSuffix}
            </div>
          </div>
          {contributions.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto">
              {contributions.map((c) => {
                const pct = maxAbs > 0 ? (Math.abs(c.amount) / maxAbs) * 100 : 0;
                return (
                  <li key={c.hotelId} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">{c.hotelName}</span>
                      {formatAmount ? formatAmount(c.amount) : <Currency amount={c.amount} />}
                    </div>
                    <div className="mt-1 h-1 bg-gray-100 rounded">
                      <div
                        className="h-1 bg-orange rounded"
                        style={{ width: `${pct}%` }}
                      />
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

interface RiskHotelsPopoverCardProps {
  label: string;
  count: number;
  subtext: string;
  icon: React.ReactNode;
  hotels: { hotelId: string; hotelName: string }[];
  accentClass: string;
  emptyMessage: string;
  infoTooltip?: React.ReactNode;
  accent?: AccentTone;
}

const RiskHotelsPopoverCard: React.FC<RiskHotelsPopoverCardProps> = ({
  label,
  count,
  subtext,
  icon,
  hotels,
  accentClass,
  emptyMessage,
  infoTooltip,
  accent,
}) => {
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
          infoTooltip={infoTooltip}
          accent={accent}
        />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {label}
            </div>
            <div className={`text-xs font-semibold ${accentClass}`}>{count} hotels</div>
          </div>
          {hotels.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-auto">
              {hotels.map((h) => (
                <li key={h.hotelId} className="flex items-center gap-2 text-sm text-gray-800">
                  <span className={`w-1.5 h-1.5 rounded-full ${accentClass.replace('text-', 'bg-')}`} />
                  {h.hotelName}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const RISK_ACCENT: Record<RiskLevel, string> = {
  'on-track': 'text-emerald-600',
  caution: 'text-amber-600',
  'at-risk': 'text-red-600',
};

type PeriodFilter = 'previous-month' | 'current-month' | 'ytd';

interface PeriodView {
  additiveScale: number;
  overtimeWindowLabel: string;
  driversSubtitle: string;
}

const PERIOD_VIEWS: Record<PeriodFilter, PeriodView> = {
  'previous-month': {
    additiveScale: 0.25,
    overtimeWindowLabel: 'Prior Month',
    driversSubtitle: '% of prior-month labor variance',
  },
  'current-month': {
    additiveScale: 0.15,
    overtimeWindowLabel: 'Month-to-Date',
    driversSubtitle: '% of current-month labor variance',
  },
  'ytd': {
    additiveScale: 1,
    overtimeWindowLabel: 'Year-to-Date',
    driversSubtitle: '% of year-to-date labor variance',
  },
};

export const PortfolioOverview: React.FC = () => {
  const [period, setPeriod] = useState<PeriodFilter>('previous-month');
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>(MOCK_HOTELS.map((h) => h.id));
  const [activeModule, setActiveModule] = useState<string>('overview');

  // Scenario Lab can only run against current month or later — bump previous-month / YTD forward.
  useEffect(() => {
    if (activeModule === 'scenario-lab' && period !== 'current-month') {
      setPeriod('current-month');
    }
  }, [activeModule, period]);
  const [hotelGroups, setHotelGroups] = useState<HotelGroup[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('labor-intel.hotelGroups');
      return raw ? (JSON.parse(raw) as HotelGroup[]) : [];
    } catch {
      return [];
    }
  });
  const [groupsManagerOpen, setGroupsManagerOpen] = useState(false);

  const [budgetDatasetAssignments, setBudgetDatasetAssignments] = useState<Record<string, string>>(
    () => {
      const defaults: Record<string, string> = {};
      for (const h of MOCK_HOTELS) defaults[h.id] = DEFAULT_BUDGET_DATASET_ID;
      if (typeof window === 'undefined') return defaults;
      try {
        const raw = window.localStorage.getItem('labor-intel.budgetDatasetAssignments');
        if (!raw) return defaults;
        const parsed = JSON.parse(raw) as Record<string, string>;
        return { ...defaults, ...parsed };
      } catch {
        return defaults;
      }
    }
  );
  const [budgetDatasetsOpen, setBudgetDatasetsOpen] = useState(false);
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'labor-intel.budgetDatasetAssignments',
        JSON.stringify(budgetDatasetAssignments)
      );
    } catch {
      /* ignore quota errors */
    }
  }, [budgetDatasetAssignments]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('labor-intel.hotelGroups', JSON.stringify(hotelGroups));
    } catch {
      /* ignore quota errors */
    }
  }, [hotelGroups]);
  const view = PERIOD_VIEWS[period];

  const selectedIdSet = useMemo(() => new Set(selectedHotelIds), [selectedHotelIds]);
  const filteredMetrics = useMemo(
    () => MOCK_LABOR_METRICS.filter((m) => selectedIdSet.has(m.hotelId)),
    [selectedIdSet]
  );
  const filteredRiskDistribution = useMemo(
    () => MOCK_RISK_DISTRIBUTION.filter((r) => selectedIdSet.has(r.hotelId)),
    [selectedIdSet]
  );
  const filteredAttention = useMemo(
    () => MOCK_HOTELS_REQUIRING_ATTENTION.filter((h) => selectedIdSet.has(h.hotel.id)),
    [selectedIdSet]
  );

  const portfolioCounts = useMemo(() => {
    const totalHotels = selectedHotelIds.length;
    let hotelsOnTrack = 0;
    let hotelsInCaution = 0;
    let hotelsAtRisk = 0;
    for (const r of filteredRiskDistribution) {
      if (r.riskLevel === 'on-track') hotelsOnTrack += 1;
      else if (r.riskLevel === 'caution') hotelsInCaution += 1;
      else if (r.riskLevel === 'at-risk') hotelsAtRisk += 1;
    }
    return { totalHotels, hotelsOnTrack, hotelsInCaution, hotelsAtRisk };
  }, [filteredRiskDistribution, selectedHotelIds.length]);

  const metrics = useMemo(() => {
    const totalLaborVariance = filteredMetrics.reduce(
      (s, m) => s + (m.actualCost - m.budgetedCost),
      0
    ) * view.additiveScale;
    const totalBudgeted = filteredMetrics.reduce((s, m) => s + m.budgetedCost, 0) * view.additiveScale;
    const totalLaborVariancePercent = totalBudgeted === 0 ? 0 : (totalLaborVariance / totalBudgeted) * 100;
    const overtimeExposure = filteredMetrics.reduce((s, m) => {
      const baseRate = m.actualHours > 0 ? m.actualCost / m.actualHours : 0;
      return s + m.actualOvertimeHours * baseRate * 1.5;
    }, 0) * view.additiveScale;
    return {
      ...portfolioCounts,
      totalLaborVariance,
      totalLaborVariancePercent,
      overtimeExposure,
    };
  }, [filteredMetrics, view, portfolioCounts]);

  const attentionHotels = useMemo(
    () => filteredAttention.map((h) => ({
      ...h,
      variance: h.variance * view.additiveScale,
      topVarianceDriver: {
        ...h.topVarianceDriver,
        impact: h.topVarianceDriver.impact * view.additiveScale,
      },
    })),
    [view, filteredAttention]
  );

  const drivers = useMemo(
    () => MOCK_TOP_VARIANCE_DRIVERS.map((d) => ({
      ...d,
      impact: d.impact * view.additiveScale,
    })),
    [view]
  );

  const hotelsByRisk = useMemo(() => {
    const groups: Record<RiskLevel, { hotelId: string; hotelName: string }[]> = {
      'on-track': [],
      caution: [],
      'at-risk': [],
    };
    for (const r of filteredRiskDistribution) {
      groups[r.riskLevel].push({ hotelId: r.hotelId, hotelName: r.hotelName });
    }
    for (const key of Object.keys(groups) as RiskLevel[]) {
      groups[key].sort((a, b) => a.hotelName.localeCompare(b.hotelName));
    }
    return groups;
  }, [filteredRiskDistribution]);

  const hotelNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of MOCK_HOTELS) map.set(h.id, h.name);
    return map;
  }, []);

  const varianceContributions = useMemo<HotelContribution[]>(() => {
    return filteredMetrics
      .map((m) => ({
        hotelId: m.hotelId,
        hotelName: hotelNameById.get(m.hotelId) ?? m.hotelId,
        amount: (m.actualCost - m.budgetedCost) * view.additiveScale,
      }))
      .filter((c) => Math.abs(c.amount) > 0.5)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }, [view, hotelNameById, filteredMetrics]);

  const overtimeContributions = useMemo<HotelContribution[]>(() => {
    return filteredMetrics
      .map((m) => {
        const baseRate = m.actualHours > 0 ? m.actualCost / m.actualHours : 0;
        const otCost = m.actualOvertimeHours * baseRate * 1.5;
        return {
          hotelId: m.hotelId,
          hotelName: hotelNameById.get(m.hotelId) ?? m.hotelId,
          amount: otCost * view.additiveScale,
        };
      })
      .filter((c) => Math.abs(c.amount) > 0.5)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }, [view, hotelNameById, filteredMetrics]);

  const budgetTotals = useMemo(() => {
    const scale = view.additiveScale;
    const actualHours = filteredMetrics.reduce((s, m) => s + m.actualHours, 0) * scale;
    const budgetHours = filteredMetrics.reduce((s, m) => s + m.budgetedHours, 0) * scale;
    const actualCost = filteredMetrics.reduce((s, m) => s + m.actualCost, 0) * scale;
    const budgetCost = filteredMetrics.reduce((s, m) => s + m.budgetedCost, 0) * scale;
    const hoursVariance = actualHours - budgetHours;
    const hoursVariancePct = budgetHours > 0 ? (hoursVariance / budgetHours) * 100 : 0;
    const costVariance = actualCost - budgetCost;
    const costVariancePct = budgetCost > 0 ? (costVariance / budgetCost) * 100 : 0;
    return { actualHours, budgetHours, hoursVariance, hoursVariancePct, actualCost, budgetCost, costVariance, costVariancePct };
  }, [filteredMetrics, view]);

  const budgetPerProperty = useMemo(() => {
    const scale = view.additiveScale;
    return filteredMetrics.map((m) => {
      const actualHours = m.actualHours * scale;
      const budgetHours = m.budgetedHours * scale;
      const actualCost = m.actualCost * scale;
      const budgetCost = m.budgetedCost * scale;
      return {
        hotelId: m.hotelId,
        hotelName: hotelNameById.get(m.hotelId) ?? m.hotelId,
        actualHours,
        budgetHours,
        hoursVariance: actualHours - budgetHours,
        actualCost,
        budgetCost,
        costVariance: actualCost - budgetCost,
      };
    });
  }, [filteredMetrics, view, hotelNameById]);

  const sortContribDesc = (rows: { hotelId: string; hotelName: string; amount: number }[]) =>
    [...rows].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  const fmtHours = (n: number) => (
    <span className="tabular-nums">{`${n >= 0 ? '' : '-'}${Math.round(Math.abs(n)).toLocaleString()} hrs`}</span>
  );
  const fmtSignedHours = (n: number) => (
    <span className="tabular-nums">{`${n >= 0 ? '+' : '-'}${Math.round(Math.abs(n)).toLocaleString()} hrs`}</span>
  );
  const fmtSignedCurrency = (n: number) => (
    <span className="tabular-nums">{n >= 0 ? '+' : '-'}<Currency amount={Math.abs(n)} /></span>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header: filters + module tabs */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8">
          {/* Period + Property Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex gap-2">
              <FilterButton
                label="Previous Month"
                isActive={period === 'previous-month'}
                onClick={() => setPeriod('previous-month')}
                disabled={activeModule === 'mid-month-forecast' || activeModule === 'overtime-intelligence' || activeModule === 'scenario-lab'}
                disabledHint={
                  activeModule === 'overtime-intelligence'
                    ? 'Overtime Intelligence always reflects the Last 7 / Next 7 Days'
                    : activeModule === 'scenario-lab'
                    ? 'Scenario Lab only models the current month forward'
                    : 'Mid-Month Forecast always reflects the current month'
                }
              />
              <FilterButton
                label="Current Month"
                isActive={period === 'current-month'}
                onClick={() => setPeriod('current-month')}
                disabled={activeModule === 'mid-month-forecast' || activeModule === 'overtime-intelligence'}
                disabledHint={
                  activeModule === 'overtime-intelligence'
                    ? 'Overtime Intelligence always reflects the Last 7 / Next 7 Days'
                    : 'Mid-Month Forecast always reflects the current month'
                }
              />
              <FilterButton
                label="Year to Date"
                isActive={period === 'ytd'}
                onClick={() => setPeriod('ytd')}
                disabled={activeModule === 'mid-month-forecast' || activeModule === 'overtime-intelligence' || activeModule === 'scenario-lab'}
                disabledHint={
                  activeModule === 'overtime-intelligence'
                    ? 'Overtime Intelligence always reflects the Last 7 / Next 7 Days'
                    : activeModule === 'scenario-lab'
                    ? 'Scenario Lab only models the current month forward'
                    : 'Mid-Month Forecast always reflects the current month'
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <PropertyFilter
                hotels={MOCK_HOTELS}
                selectedIds={selectedHotelIds}
                onChange={setSelectedHotelIds}
                groups={hotelGroups}
                onManageGroups={() => setGroupsManagerOpen(true)}
                onManageBudgetDatasets={() => setBudgetDatasetsOpen(true)}
              />
              <button
                type="button"
                onClick={() => setAiInsightsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-teal-dark to-teal rounded-md hover:opacity-90 shadow-sm"
                title="Open AI Insights"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Insights</span>
              </button>
            </div>
          </div>

          {/* Module tabs */}
          <div className="flex items-center gap-1 -mb-px">
            {[
              { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'budget-performance', label: 'Budget Performance', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'mid-month-forecast', label: 'Mid-Month Forecast', icon: <CalendarClock className="w-4 h-4" /> },
              { id: 'plan-standard-performance', label: 'Plan & Standard Performance', icon: <Gauge className="w-4 h-4" /> },
              { id: 'overtime-intelligence', label: 'Overtime Intelligence', icon: <Clock4 className="w-4 h-4" /> },
              { id: 'scenario-lab', label: 'Scenario Lab', icon: <FlaskConical className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = activeModule === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModule(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-teal-dark text-teal-dark'
                      : 'border-transparent text-gray-500 hover:text-slate-navy'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {activeModule === 'overview' && (
            <>
              {/* Key Metrics - Executive Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <RiskHotelsPopoverCard
              label="Hotels On Track"
              count={metrics.hotelsOnTrack}
              subtext={`${((metrics.hotelsOnTrack / metrics.totalHotels) * 100).toFixed(0)}% of Portfolio`}
              icon={<Building2 className="w-8 h-8" />}
              hotels={hotelsByRisk['on-track']}
              accentClass={RISK_ACCENT['on-track']}
              emptyMessage="No hotels currently on track."
              infoTooltip="Properties whose actual labor cost is within ±2% of budget and have no critical labor alerts in the selected period."
              accent="emerald"
            />
            <RiskHotelsPopoverCard
              label="Hotels in Caution"
              count={metrics.hotelsInCaution}
              subtext={`${((metrics.hotelsInCaution / metrics.totalHotels) * 100).toFixed(0)}% of Portfolio`}
              icon={<AlertCircle className="w-8 h-8" />}
              hotels={hotelsByRisk.caution}
              accentClass={RISK_ACCENT.caution}
              emptyMessage="No hotels in caution."
              infoTooltip="Properties running 2–5% over budget on labor, or showing rising overtime trends that warrant attention but aren't yet critical."
              accent="amber"
            />
            <RiskHotelsPopoverCard
              label="Hotels at Risk"
              count={metrics.hotelsAtRisk}
              subtext={`${((metrics.hotelsAtRisk / metrics.totalHotels) * 100).toFixed(0)}% of Portfolio`}
              icon={<AlertTriangle className="w-8 h-8" />}
              hotels={hotelsByRisk['at-risk']}
              accentClass={RISK_ACCENT['at-risk']}
              emptyMessage="No hotels currently at risk."
              infoTooltip="Properties running more than 5% over budget on labor, or with sustained overtime, productivity, or schedule-variance breaches."
              accent="red"
            />
            <ContributionPopoverCard
              label="Labor Variance (Actual vs Budget)"
              value={
                <span className="flex items-center gap-2">
                  <Currency amount={metrics.totalLaborVariance} />
                </span>
              }
              subtext={<Percentage value={metrics.totalLaborVariancePercent} />}
              icon={<DollarSign className="w-8 h-8" />}
              contributions={varianceContributions}
              popoverTitle="Top Contributing Hotels"
              totalAmount={metrics.totalLaborVariance}
              emptyMessage="No hotels contributing to variance."
              infoTooltip="Sum across selected properties of (actual labor cost − budgeted labor cost) for the selected period. Positive values are unfavorable."
              accent="teal"
            />
            <ContributionPopoverCard
              label="Overtime Exposure"
              value={<Currency amount={metrics.overtimeExposure} />}
              subtext={view.overtimeWindowLabel}
              icon={<Clock className="w-8 h-8" />}
              contributions={overtimeContributions}
              popoverTitle="Top Overtime Contributors"
              totalAmount={metrics.overtimeExposure}
              emptyMessage="No overtime exposure this period."
              infoTooltip="Estimated overtime cost = overtime hours × base hourly rate × 1.5, summed across selected properties for the selected period."
              accent="orange"
            />
          </div>

          {/* Hotels Requiring Attention - full width */}
          <div>
            <SectionHeader
              title="Hotels Requiring Attention"
              icon={<AlertTriangle className="w-5 h-5" />}
            />
            <HotelsRequiringAttention hotels={attentionHotels} />
          </div>

          {/* Top Variance Drivers - full width */}
          <div>
            <SectionHeader
              title="Top Variance Drivers"
              icon={<Zap className="w-5 h-5" />}
              subtitle={view.driversSubtitle}
            />
            <TopVarianceDrivers
              drivers={drivers}
              metrics={filteredMetrics}
              hotelNameById={hotelNameById}
              additiveScale={view.additiveScale}
            />
          </div>

          {/* Labor Performance Quick Stats */}

              {/* Actual vs Targets grid */}
              <ActualVsTargetsGrid
                hotels={MOCK_HOTELS}
                metrics={MOCK_LABOR_METRICS}
                additiveScale={view.additiveScale}
                periodLabel={view.overtimeWindowLabel}
                selectedIds={selectedHotelIds}
              />
            </>
          )}

          {activeModule === 'budget-performance' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <ContributionPopoverCard
                  label="Actual Hours"
                  value={Math.round(budgetTotals.actualHours).toLocaleString()}
                  subtext="Hours"
                  icon={<Clock className="w-8 h-8" />}
                  accent="teal"
                  popoverTitle="Actual hours by property"
                  contributions={sortContribDesc(budgetPerProperty.map((p) => ({ hotelId: p.hotelId, hotelName: p.hotelName, amount: p.actualHours })))}
                  totalAmount={budgetTotals.actualHours}
                  emptyMessage="No property data available."
                  formatAmount={fmtHours}
                />
                <ContributionPopoverCard
                  label="Budget Hours"
                  value={Math.round(budgetTotals.budgetHours).toLocaleString()}
                  subtext="Hours"
                  icon={<ClipboardList className="w-8 h-8" />}
                  accent="indigo"
                  popoverTitle="Budget hours by property"
                  contributions={sortContribDesc(budgetPerProperty.map((p) => ({ hotelId: p.hotelId, hotelName: p.hotelName, amount: p.budgetHours })))}
                  totalAmount={budgetTotals.budgetHours}
                  emptyMessage="No property data available."
                  formatAmount={fmtHours}
                />
                <ContributionPopoverCard
                  label="Hours Variance"
                  value={`${budgetTotals.hoursVariance >= 0 ? '+' : ''}${Math.round(budgetTotals.hoursVariance).toLocaleString()}`}
                  subtext={<Percentage value={budgetTotals.hoursVariancePct} />}
                  icon={<ArrowUpDown className="w-8 h-8" />}
                  accent={budgetTotals.hoursVariance > 0 ? 'orange' : 'emerald'}
                  popoverTitle="Hours variance by property"
                  contributions={sortContribDesc(budgetPerProperty.map((p) => ({ hotelId: p.hotelId, hotelName: p.hotelName, amount: p.hoursVariance })))}
                  totalAmount={budgetTotals.hoursVariance}
                  emptyMessage="No property data available."
                  formatAmount={fmtSignedHours}
                />
                <ContributionPopoverCard
                  label="Actual Labor Cost"
                  value={<Currency amount={budgetTotals.actualCost} />}
                  subtext="USD"
                  icon={<CircleDollarSign className="w-8 h-8" />}
                  accent="teal"
                  popoverTitle="Actual labor cost by property"
                  contributions={sortContribDesc(budgetPerProperty.map((p) => ({ hotelId: p.hotelId, hotelName: p.hotelName, amount: p.actualCost })))}
                  totalAmount={budgetTotals.actualCost}
                  emptyMessage="No property data available."
                />
                <ContributionPopoverCard
                  label="Budget Labor Cost"
                  value={<Currency amount={budgetTotals.budgetCost} />}
                  subtext="USD"
                  icon={<DollarSign className="w-8 h-8" />}
                  accent="indigo"
                  popoverTitle="Budget labor cost by property"
                  contributions={sortContribDesc(budgetPerProperty.map((p) => ({ hotelId: p.hotelId, hotelName: p.hotelName, amount: p.budgetCost })))}
                  totalAmount={budgetTotals.budgetCost}
                  emptyMessage="No property data available."
                />
                <ContributionPopoverCard
                  label="Cost Variance"
                  value={
                    <span>
                      {budgetTotals.costVariance >= 0 ? '+' : ''}
                      <Currency amount={budgetTotals.costVariance} />
                    </span>
                  }
                  subtext={<Percentage value={budgetTotals.costVariancePct} />}
                  icon={<ArrowUpDown className="w-8 h-8" />}
                  accent={budgetTotals.costVariance > 0 ? 'orange' : 'emerald'}
                  popoverTitle="Cost variance by property"
                  contributions={sortContribDesc(budgetPerProperty.map((p) => ({ hotelId: p.hotelId, hotelName: p.hotelName, amount: p.costVariance })))}
                  totalAmount={budgetTotals.costVariance}
                  emptyMessage="No property data available."
                  formatAmount={fmtSignedCurrency}
                />
              </div>

              <LaborQuickStats hotels={MOCK_HOTELS} statsByHotel={MOCK_QUICK_STATS_BY_HOTEL} period={period} selectedIds={selectedHotelIds} />
            </>
          )}

          {activeModule === 'mid-month-forecast' && (
            <MidMonthForecast metrics={filteredMetrics} hotelNameById={hotelNameById} />
          )}

          {activeModule === 'plan-standard-performance' && (
            <PlanStandardPerformance
              metrics={filteredMetrics}
              hotelNameById={hotelNameById}
              periodLabel={view.overtimeWindowLabel}
              periodScale={view.additiveScale}
            />
          )}

          {activeModule === 'overtime-intelligence' && (
            <OvertimeIntelligence metrics={filteredMetrics} hotelNameById={hotelNameById} />
          )}

          {activeModule === 'scenario-lab' && (
            <ScenarioLab metrics={filteredMetrics} />
          )}
        </div>
      </div>

      <HotelGroupsManager
        open={groupsManagerOpen}
        onClose={() => setGroupsManagerOpen(false)}
        hotels={MOCK_HOTELS}
        groups={hotelGroups}
        onGroupsChange={setHotelGroups}
        onApplyGroup={(g) => setSelectedHotelIds(g.hotelIds)}
      />

      <BudgetDatasetSettings
        open={budgetDatasetsOpen}
        onClose={() => setBudgetDatasetsOpen(false)}
        hotels={MOCK_HOTELS}
        assignments={budgetDatasetAssignments}
        onAssignmentsChange={setBudgetDatasetAssignments}
      />

      <AIInsightsPanel
        open={aiInsightsOpen}
        onClose={() => setAiInsightsOpen(false)}
        context={{
          activeModule,
          moduleLabel:
            ({
              overview: 'Portfolio Overview',
              'budget-performance': 'Budget Performance',
              'mid-month-forecast': 'Mid-Month Forecast',
              'plan-standard-performance': 'Plan & Standard Performance',
              'overtime-intelligence': 'Overtime Intelligence',
              'scenario-lab': 'Scenario Lab',
            } as Record<string, string>)[activeModule] ?? 'Dashboard',
          periodLabel:
            activeModule === 'overtime-intelligence'
              ? 'Last 7 / Next 7 Days'
              : activeModule === 'mid-month-forecast'
              ? 'Current Month (MTD)'
              : activeModule === 'scenario-lab'
              ? 'Current Month Forward'
              : period === 'previous-month'
              ? 'Previous Month'
              : period === 'current-month'
              ? 'Current Month'
              : 'Year to Date',
          periodScale: view.additiveScale,
          hotels: MOCK_HOTELS,
          selectedHotels: MOCK_HOTELS.filter((h) => selectedIdSet.has(h.id)),
          metrics: filteredMetrics,
          riskCounts: {
            onTrack: portfolioCounts.hotelsOnTrack,
            caution: portfolioCounts.hotelsInCaution,
            atRisk: portfolioCounts.hotelsAtRisk,
          },
        }}
      />
    </div>
  );
};

// Import Zap icon
import { Zap } from 'lucide-react';

export default PortfolioOverview;
