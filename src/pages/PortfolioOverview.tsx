import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle,
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
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { MetricCard, SectionPanel, FilterButton, Currency, Percentage, InlineInfoTooltip } from '../components/ui/Card';
import type { AccentTone } from '../components/ui/Card';
import PropertyFilter from '../components/ui/PropertyFilter';
import HotelGroupsManager from '../components/ui/HotelGroupsManager';
import BudgetDatasetSettings, { DEFAULT_BUDGET_DATASET_ID } from '../components/ui/BudgetDatasetSettings';
import AIInsightsPanel from '../components/ui/AIInsightsPanel';
import ExportButton from '../components/ui/ExportButton';
import CollapseToggle from '../components/ui/CollapseToggle';
import { ThemeToggle } from '../components/ui/ThemeContext';
import { HotelGroup } from '../types';
import HotelsRequiringAttention from '../components/portfolio/HotelsRequiringAttention';
import LaborQuickStats from '../components/portfolio/LaborQuickStats';
import ActualVsTargetsGrid from '../components/portfolio/ActualVsTargetsGrid';
import MidMonthForecast from '../components/portfolio/MidMonthForecast';
import PlanStandardPerformance from '../components/portfolio/PlanStandardPerformance';
import OvertimeIntelligence from '../components/portfolio/OvertimeIntelligence';
import ScenarioLab from '../components/portfolio/ScenarioLab';
import PaceAndPerformance from '../components/portfolio/PaceAndPerformance';
import PropertyView from '../components/property/PropertyView';
import { HotelSelectionProvider, HotelLink } from '../components/ui/HotelSelectionContext';
import { RiskLevel } from '../types';
import { EntityLaborMetrics } from '../types';
import {
  MOCK_HOTELS_REQUIRING_ATTENTION,
  MOCK_HOTELS,
  MOCK_QUICK_STATS_BY_HOTEL,
  MOCK_LABOR_METRICS,
} from '../data/mockData';
import { buildPropertyEntityMetrics } from '../data/propertyMockData';

interface HotelContribution {
  hotelId: string;
  hotelName: string;
  amount: number;
}

interface RiskCostContribution extends HotelContribution {
  riskLevel: Extract<RiskLevel, 'caution' | 'at-risk'>;
  trend: 'up' | 'down' | 'flat';
  trailing3Months: [number, number, number];
}

interface ServiceDeliveryContribution extends HotelContribution {
  roomCount: number;
  riskScore: number;
  riskTier: 'low' | 'watch' | 'high' | 'critical';
  serviceGapHours: number;
  underDemandStandardPercent: number;
  underDemandForecastPercent: number;
  capacityCoveragePercent: number;
  outcomePressurePoints: number;
  forecastOccupancy: number;
  actualOccupancy: number;
  forecastRooms: number;
  actualRooms: number;
}

interface OvertimeExposureJobDetail {
  entityId: string;
  entityName: string;
  departmentName: string;
  actualHours: number;
  actualOvertimeHours: number;
  scheduledOvertimeHours: number;
  unscheduledOvertimeHours: number;
  otShare: number;
  otCost: number;
}

interface OvertimeExposureDepartmentDetail {
  entityId: string;
  entityName: string;
  divisionName: string;
  actualHours: number;
  actualOvertimeHours: number;
  scheduledOvertimeHours: number;
  unscheduledOvertimeHours: number;
  otShare: number;
  otCost: number;
  jobs: OvertimeExposureJobDetail[];
}

interface OvertimeExposureHotelDetail {
  hotelId: string;
  hotelName: string;
  actualHours: number;
  actualOvertimeHours: number;
  scheduledOvertimeHours: number;
  unscheduledOvertimeHours: number;
  otShare: number;
  scheduledOtCost: number;
  unscheduledOtCost: number;
  otCost: number;
  departments: OvertimeExposureDepartmentDetail[];
}

interface OvertimeExposureSummary {
  thresholdPercent: number;
  qualifyingHotelCount: number;
  totalOtHours: number;
  totalScheduledOtHours: number;
  totalUnscheduledOtHours: number;
  totalScheduledOtCost: number;
  totalUnscheduledOtCost: number;
  totalOtCost: number;
  hotels: OvertimeExposureHotelDetail[];
}

interface RiskHotelPerformance {
  hotelId: string;
  hotelName: string;
  variancePercent: number;
  actualHours: number;
  budgetHours: number;
  actualValue: number;
  budgetValue: number;
  comparisonValue: number;
}

type ComparisonBasis = 'budget' | 'forecast' | 'schedule' | 'standard';

const COMPARISON_LABEL: Record<ComparisonBasis, string> = {
  budget: 'Budget',
  forecast: 'Forecast',
  schedule: 'Schedule',
  standard: 'Standard',
};

const COMPARISON_OPTIONS: ComparisonBasis[] = ['budget', 'standard', 'forecast', 'schedule'];

const RISK_THRESHOLD_LABELS: Record<RiskLevel, string> = {
  'on-track': 'On Track (<2% variance)',
  caution: 'In Caution (2-4% variance)',
  'at-risk': 'At Risk (5%+ variance)',
};

const SERVICE_RISK_PORTFOLIO_HELP = 'Service Risk Score estimates guest-service pressure from labor undercoverage. The portfolio index is room-weighted and is driven by hours below demand-adjusted standard hours, hours below demand-adjusted forecast hours, and occupancy pressure points. Higher scores mean higher service-delivery risk.';

function getComparableCost(metric: {
  actualHours: number;
  actualCost: number;
  budgetedHours: number;
  budgetedCost: number;
  forecastedCost: number;
  scheduledHours: number;
  standardHours: number;
}, basis: ComparisonBasis): number {
  if (basis === 'budget') return metric.budgetedCost;
  if (basis === 'forecast') return metric.forecastedCost;

  const fallbackRate = metric.budgetedHours > 0 ? metric.budgetedCost / metric.budgetedHours : 0;
  const baseRate = metric.actualHours > 0 ? metric.actualCost / metric.actualHours : fallbackRate;
  if (basis === 'schedule') return metric.scheduledHours * baseRate;
  return metric.standardHours * baseRate;
}

function getComparableHours(metric: {
  budgetedHours: number;
  forecastedHours: number;
  scheduledHours: number;
  standardHours: number;
}, basis: ComparisonBasis): number {
  if (basis === 'budget') return metric.budgetedHours;
  if (basis === 'forecast') return metric.forecastedHours;
  if (basis === 'schedule') return metric.scheduledHours;
  return metric.standardHours;
}

function classifyRiskByVariance(variancePercent: number): RiskLevel {
  if (variancePercent > 5) return 'at-risk';
  if (variancePercent > 2) return 'caution';
  return 'on-track';
}

function hash01(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash ^ input.charCodeAt(i)) * 16777619;
    hash >>>= 0;
  }
  return (hash % 10000) / 10000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function estimateOtCost(actualOvertimeHours: number, actualCost: number, actualHours: number, multiplier: number = 1.5): number {
  const baseRate = actualHours > 0 ? actualCost / actualHours : 0;
  return actualOvertimeHours * baseRate * multiplier;
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
                      <HotelLink hotelId={c.hotelId} className="text-gray-800">{c.hotelName}</HotelLink>
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

interface RiskCostPopoverCardProps {
  label: string;
  value: React.ReactNode;
  subtext: React.ReactNode;
  icon: React.ReactNode;
  contributions: RiskCostContribution[];
  totalAmount: number;
  emptyMessage: string;
  infoTooltip?: React.ReactNode;
  accent?: AccentTone;
  onViewDetails?: () => void;
}

const RiskCostPopoverCard: React.FC<RiskCostPopoverCardProps> = ({
  label,
  value,
  subtext,
  icon,
  contributions,
  totalAmount,
  emptyMessage,
  infoTooltip,
  accent,
  onViewDetails,
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

  const cardSubtext = onViewDetails ? (
    <span className="flex items-center justify-between gap-2">
      <span>{subtext}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
          onViewDetails();
        }}
        className="text-xs font-medium text-teal-dark hover:text-teal underline underline-offset-2"
      >
        View details
      </button>
    </span>
  ) : subtext;

  return (
    <div
      ref={containerRef}
      className="relative h-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-teal rounded-xl"
      >
        <MetricCard label={label} value={wrappedValue} subtext={cardSubtext} icon={icon} infoTooltip={infoTooltip} accent={accent} />
      </div>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Risk Cost by Property
            </div>
            <div className="text-xs font-semibold text-gray-700">
              <Currency amount={totalAmount} /> risk cost
            </div>
          </div>
          {contributions.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-auto">
              {contributions.map((c) => {
                const trendDelta = c.trailing3Months[2] - c.trailing3Months[0];
                const trendAbs = Math.abs(trendDelta);
                return (
                  <li key={c.hotelId} className="text-sm border border-gray-100 rounded-md p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <HotelLink hotelId={c.hotelId} className="text-gray-800 font-medium">{c.hotelName}</HotelLink>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              c.riskLevel === 'at-risk'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {c.riskLevel === 'at-risk' ? 'At Risk' : 'Caution'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                            {c.trend === 'up' ? (
                              <>
                                <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                                <span className="text-red-600 font-medium">Trending up</span>
                              </>
                            ) : c.trend === 'down' ? (
                              <>
                                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">Trending down</span>
                              </>
                            ) : (
                              <>
                                <Minus className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-gray-600 font-medium">Stable</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div><Currency amount={c.amount} /></div>
                        <div className="text-[11px] text-gray-500 tabular-nums">
                          3mo: {trendDelta >= 0 ? '+' : '-'}${trendAbs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
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

interface PerformanceRiskValuePopoverProps {
  value: React.ReactNode;
  totalAmount: number;
  contributions: RiskCostContribution[];
  emptyMessage: string;
}

const PerformanceRiskValuePopover: React.FC<PerformanceRiskValuePopoverProps> = ({
  value,
  totalAmount,
  contributions,
  emptyMessage,
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
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="focus:outline-none"
      >
        <span className="underline decoration-dotted decoration-gray-300 underline-offset-4 cursor-pointer">
          {value}
        </span>
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute z-30 mt-2 left-0 sm:left-auto sm:right-0 w-[28rem] bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Unfavorable Cost Variance by Property
            </div>
            <div className="text-xs font-semibold text-gray-700 tabular-nums">
              <Currency amount={totalAmount} />
            </div>
          </div>
          {contributions.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-auto">
              {contributions.map((c) => (
                <li key={c.hotelId} className="text-sm border border-gray-100 rounded-md p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <HotelLink hotelId={c.hotelId} className="text-gray-800 font-medium">{c.hotelName}</HotelLink>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${c.riskLevel === 'at-risk' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.riskLevel === 'at-risk' ? 'At Risk' : 'Caution'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <Currency amount={c.amount} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

interface ServiceRiskValuePopoverProps {
  value: React.ReactNode;
  riskIndex: number;
  highRiskCount: number;
  contributions: ServiceDeliveryContribution[];
  emptyMessage: string;
}

const ServiceRiskValuePopover: React.FC<ServiceRiskValuePopoverProps> = ({
  value,
  riskIndex,
  highRiskCount,
  contributions,
  emptyMessage,
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
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="focus:outline-none"
      >
        <span className="underline decoration-dotted decoration-gray-300 underline-offset-4 cursor-pointer">
          {value}
        </span>
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute z-30 mt-2 left-0 sm:left-auto sm:right-0 w-[36rem] bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Service Risk Score by Property
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Portfolio index: {riskIndex.toFixed(0)}/100 • {highRiskCount} high-risk hotels</div>
            </div>
          </div>
          {contributions.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <div className="overflow-y-auto max-h-80 border border-gray-100 rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">Property</th>
                    <th className="text-right px-3 py-2">Risk Score</th>
                    <th className="text-right px-3 py-2">Coverage %</th>
                    <th className="text-right px-3 py-2">Std Gap %</th>
                    <th className="text-right px-3 py-2">Fcst Gap %</th>
                    <th className="text-right px-3 py-2">Occ Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.hotelId} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-navy"><HotelLink hotelId={c.hotelId}>{c.hotelName}</HotelLink></div>
                        <div className="mt-1 text-[11px] text-gray-500">Rooms {c.actualRooms.toLocaleString()} actual vs {c.forecastRooms.toLocaleString()} forecast</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-indigo-600">{c.riskScore.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.capacityCoveragePercent.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.underDemandStandardPercent.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.underDemandForecastPercent.toFixed(1)}%</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${(c.actualOccupancy - c.forecastOccupancy) >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {(c.actualOccupancy - c.forecastOccupancy) >= 0 ? '+' : ''}{(c.actualOccupancy - c.forecastOccupancy).toFixed(1)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface OTExposurePopoverCardProps {
  summary: OvertimeExposureSummary;
  onViewDetails: () => void;
}

const OTExposurePopoverCard: React.FC<OTExposurePopoverCardProps> = ({ summary, onViewDetails }) => {
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

  const thresholdLabel = `${summary.thresholdPercent.toFixed(1)}%`;

  return (
    <div
      ref={containerRef}
      className="relative h-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-orange rounded-xl cursor-pointer"
      >
        <div className="metric-card border-0 shadow-none h-full p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">OT Exposure</div>
              <div className="mt-2 tabular-nums text-[30px] leading-tight font-semibold text-orange">
                {Math.round(summary.totalOtHours).toLocaleString()} hrs
              </div>
              <div className="mt-2 text-sm leading-tight text-gray-600">
                {summary.qualifyingHotelCount} hotels above {thresholdLabel} OT share
              </div>
              <div className="mt-1 text-sm tabular-nums text-gray-700">
                <Currency amount={summary.totalOtCost} /> total OT cost
              </div>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange/10 text-orange">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm tabular-nums">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2">
              <div className="text-xs text-gray-500">Scheduled OT</div>
              <div className="mt-1 text-base font-semibold text-slate-navy">{Math.round(summary.totalScheduledOtHours).toLocaleString()} hrs</div>
              <div className="mt-0.5 text-xs text-gray-500"><Currency amount={summary.totalScheduledOtCost} /></div>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2">
              <div className="text-xs text-gray-500">Unscheduled OT</div>
              <div className="mt-1 text-base font-semibold text-slate-navy">{Math.round(summary.totalUnscheduledOtHours).toLocaleString()} hrs</div>
              <div className="mt-0.5 text-xs text-gray-500"><Currency amount={summary.totalUnscheduledOtCost} /></div>
            </div>
          </div>

          <div className="mt-auto pt-4 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onViewDetails();
              }}
              className="text-sm font-medium text-slate-navy hover:text-teal underline underline-offset-2"
            >
              View details
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-[28rem] bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Hotels Above {thresholdLabel} OT Share
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Actual OT as a percent of actual hours</div>
            </div>
            <div className="text-right text-xs font-semibold text-orange">
              <div className="tabular-nums">{Math.round(summary.totalOtHours).toLocaleString()} hrs</div>
              <div className="tabular-nums"><Currency amount={summary.totalOtCost} /></div>
            </div>
          </div>
          {summary.hotels.length === 0 ? (
            <div className="text-sm text-gray-500">No hotels currently exceed the OT exposure threshold.</div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-auto">
              {summary.hotels.map((hotel) => (
                <li key={hotel.hotelId} className="text-sm border border-gray-100 rounded-md p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <HotelLink hotelId={hotel.hotelId} className="text-gray-800 font-medium">{hotel.hotelName}</HotelLink>
                      <div className="mt-1 text-[11px] text-gray-600 tabular-nums">
                        OT share {hotel.otShare.toFixed(1)}% of {Math.round(hotel.actualHours).toLocaleString()} actual hrs
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500 tabular-nums">
                        Scheduled OT {Math.round(hotel.scheduledOvertimeHours).toLocaleString()} hrs • Unscheduled OT {Math.round(hotel.unscheduledOvertimeHours).toLocaleString()} hrs
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-orange tabular-nums">
                      <div className="font-semibold">{Math.round(hotel.actualOvertimeHours).toLocaleString()} hrs</div>
                      <div><Currency amount={hotel.otCost} /></div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

interface ServiceDeliveryRiskPopoverCardProps {
  label: string;
  value: React.ReactNode;
  subtext: React.ReactNode;
  icon: React.ReactNode;
  contributions: ServiceDeliveryContribution[];
  riskIndex: number;
  highRiskCount: number;
  emptyMessage: string;
  infoTooltip?: React.ReactNode;
  accent?: AccentTone;
}

const ServiceDeliveryRiskPopoverCard: React.FC<ServiceDeliveryRiskPopoverCardProps> = ({
  label,
  value,
  subtext,
  icon,
  contributions,
  riskIndex,
  highRiskCount,
  emptyMessage,
  infoTooltip,
  accent,
}) => {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'capacity' | 'occupancy'>('capacity');
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
        className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-xl"
      >
        <MetricCard label={label} value={wrappedValue} subtext={subtext} icon={icon} infoTooltip={infoTooltip} accent={accent} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-[28rem] bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Service Delivery Risk
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Portfolio index: {riskIndex.toFixed(0)}/100 • {highRiskCount} high-risk hotels</div>
            </div>
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('capacity')}
                className={`px-2 py-1 text-[11px] rounded ${viewMode === 'capacity' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-medium' : 'text-gray-600 hover:text-indigo-700'}`}
              >
                Demand-Adjusted Staffing
              </button>
              <button
                type="button"
                onClick={() => setViewMode('occupancy')}
                className={`px-2 py-1 text-[11px] rounded ${viewMode === 'occupancy' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-medium' : 'text-gray-600 hover:text-indigo-700'}`}
              >
                Occupancy
              </button>
            </div>
          </div>
          {contributions.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-auto">
              {contributions.map((c) => {
                const occDelta = c.actualOccupancy - c.forecastOccupancy;
                const tierTone =
                  c.riskTier === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : c.riskTier === 'high'
                    ? 'bg-orange-100 text-orange-700'
                    : c.riskTier === 'watch'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700';
                return (
                  <li key={c.hotelId} className="text-sm border border-gray-100 rounded-md p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <HotelLink hotelId={c.hotelId} className="text-gray-800 font-medium">{c.hotelName}</HotelLink>
                        {viewMode === 'capacity' ? (
                          <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${tierTone}`}>
                              {c.riskTier === 'critical' ? 'Critical' : c.riskTier === 'high' ? 'High' : c.riskTier === 'watch' ? 'Watch' : 'Low'}
                            </span>
                            <span className="tabular-nums">Demand-adjusted coverage: {c.capacityCoveragePercent.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-gray-600 tabular-nums">
                            Forecast: {c.forecastOccupancy.toFixed(1)}% ({c.forecastRooms.toLocaleString()} room nights)
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {viewMode === 'capacity' ? (
                          <>
                            <div className="tabular-nums text-gray-800 font-semibold">{c.riskScore.toFixed(0)}/100</div>
                            <div className="text-[11px] text-gray-600 tabular-nums">Demand-adjusted standard gap {c.underDemandStandardPercent.toFixed(1)}%</div>
                            <div className="text-[11px] text-gray-600 tabular-nums">Demand-adjusted forecast gap {c.underDemandForecastPercent.toFixed(1)}%</div>
                          </>
                        ) : (
                          <>
                            <div className="tabular-nums text-indigo-700">Actual: {c.actualOccupancy.toFixed(1)}%</div>
                            <div className={`text-[11px] tabular-nums ${occDelta >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {occDelta >= 0 ? '+' : ''}{occDelta.toFixed(1)} pts
                            </div>
                            <div className="text-[11px] text-gray-500 tabular-nums">{c.actualRooms.toLocaleString()} room nights</div>
                          </>
                        )}
                      </div>
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
  subtext: React.ReactNode;
  icon: React.ReactNode;
  hotels: { hotelId: string; hotelName: string }[];
  accentClass: string;
  emptyMessage: string;
  infoTooltip?: React.ReactNode;
  accent?: AccentTone;
  comparisonLabel?: string;
  hotelPerformance?: RiskHotelPerformance[];
  onViewDetails?: () => void;
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
  comparisonLabel,
  hotelPerformance,
  onViewDetails,
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

  const cardSubtext = onViewDetails ? (
    <span className="flex items-center justify-between gap-2">
      <span>{subtext}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
          onViewDetails();
        }}
        className="text-xs font-medium text-teal-dark hover:text-teal underline underline-offset-2"
      >
        View details
      </button>
    </span>
  ) : subtext;

  return (
    <div
      ref={containerRef}
      className="relative h-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-teal rounded-xl cursor-pointer"
      >
        <MetricCard
          label={label}
          value={
            <span className="underline decoration-dotted decoration-gray-300 underline-offset-4 cursor-pointer">
              {count}
            </span>
          }
          subtext={cardSubtext}
          icon={icon}
          infoTooltip={infoTooltip}
          accent={accent}
        />
      </div>
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
          ) : hotelPerformance && hotelPerformance.length > 0 ? (
            <div className="space-y-2">
              <ul className="space-y-2 max-h-64 overflow-auto">
                {hotelPerformance.map((h) => (
                  <li key={h.hotelId} className="text-sm border border-gray-100 rounded-md p-2">
                    <div className="flex items-center justify-between gap-2">
                      <HotelLink hotelId={h.hotelId} className="text-gray-800 font-medium">{h.hotelName}</HotelLink>
                      <span className={`font-semibold tabular-nums ${h.variancePercent <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {h.variancePercent >= 0 ? '+' : ''}{h.variancePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 grid grid-cols-2 gap-x-3 gap-y-1">
                      <span className="text-gray-500">Actual</span>
                      <span className="text-right tabular-nums"><Currency amount={h.actualValue} /></span>
                      <span className="text-gray-500">{comparisonLabel ?? 'Budget'}</span>
                      <span className="text-right tabular-nums"><Currency amount={h.comparisonValue} /></span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-auto">
              {hotels.map((h) => (
                <li key={h.hotelId} className="flex items-center gap-2 text-sm text-gray-800">
                  <span className={`w-1.5 h-1.5 rounded-full ${accentClass.replace('text-', 'bg-')}`} />
                  <HotelLink hotelId={h.hotelId}>{h.hotelName}</HotelLink>
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

interface RiskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  comparisonBasis: ComparisonBasis;
  comparisonLabel: string;
  title: string;
  emptyMessage: string;
  hotels: (RiskHotelPerformance & { departments: EntityLaborMetrics[] })[];
}

interface PerformanceRiskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  hotels: (RiskCostContribution & {
    actualValue: number;
    budgetValue: number;
    actualHours: number;
    budgetHours: number;
    divisions: EntityLaborMetrics[];
    departments: EntityLaborMetrics[];
    jobs: EntityLaborMetrics[];
  })[];
}

interface ServiceRiskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  contributions: ServiceDeliveryContribution[];
  riskIndex: number;
  highRiskCount: number;
  emptyMessage: string;
}

const PerformanceRiskDetailsModal: React.FC<PerformanceRiskDetailsModalProps> = ({
  open,
  onClose,
  hotels,
}) => {
  const [detailLevel, setDetailLevel] = useState<'division' | 'department' | 'job'>('department');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-6xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-navy">Unfavorable Cost Variance: Driver Details</h3>
            <p className="text-xs text-gray-500 mt-1">Hotels in Caution and At Risk with positive over-plan labor cost (Actual vs Budget).</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
              {([
                { key: 'division', label: 'Division' },
                { key: 'department', label: 'Department' },
                { key: 'job', label: 'Job' },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setDetailLevel(option.key)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium ${
                    detailLevel === option.key ? 'bg-slate-100 text-slate-navy' : 'text-gray-600 hover:text-slate-navy'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(85vh-72px)] p-6 space-y-6">
          {hotels.length === 0 ? (
            <div className="text-sm text-gray-500">No unfavorable cost variance drivers for the current selection.</div>
          ) : (
            hotels.map((hotel) => {
              const sourceRows =
                detailLevel === 'division'
                  ? hotel.divisions
                  : detailLevel === 'department'
                  ? hotel.departments
                  : hotel.jobs;

              const driverEntities = [...sourceRows]
                .map((row) => {
                  const hoursVariance = row.actualHours - row.budgetedHours;
                  const overPlanCost = row.actualCost - row.budgetedCost;
                  return {
                    ...row,
                    hoursVariance,
                    overPlanCost,
                  };
                })
                .filter((row) => row.overPlanCost > 0.5)
                .sort((a, b) => b.overPlanCost - a.overPlanCost);

              return (
                <section key={hotel.hotelId} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-navy">{hotel.hotelName}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                            hotel.riskLevel === 'at-risk'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {hotel.riskLevel === 'at-risk' ? 'At Risk' : 'Caution'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                          {hotel.trend === 'up' ? (
                            <>
                              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-red-600 font-medium">Trending up</span>
                            </>
                          ) : hotel.trend === 'down' ? (
                            <>
                              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Trending down</span>
                            </>
                          ) : (
                            <>
                              <Minus className="w-3.5 h-3.5 text-gray-500" />
                              <span className="text-gray-600 font-medium">Stable</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-3">
                      <span className="tabular-nums">Actual hrs: {Math.round(hotel.actualHours).toLocaleString()}</span>
                      <span className="tabular-nums">Actual: <Currency amount={hotel.actualValue} /></span>
                      <span className="tabular-nums">Budget hrs: {Math.round(hotel.budgetHours).toLocaleString()}</span>
                      <span className="tabular-nums">Budget: <Currency amount={hotel.budgetValue} /></span>
                      <span className={`font-semibold tabular-nums ${hotel.actualHours - hotel.budgetHours > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        Hours variance: {hotel.actualHours - hotel.budgetHours >= 0 ? '+' : '-'}{Math.round(Math.abs(hotel.actualHours - hotel.budgetHours)).toLocaleString()} ({hotel.budgetHours > 0 ? `${hotel.actualHours - hotel.budgetHours >= 0 ? '+' : ''}${(((hotel.actualHours - hotel.budgetHours) / hotel.budgetHours) * 100).toFixed(1)}%` : '0.0%'})
                      </span>
                      <span className={`font-semibold tabular-nums ${hotel.amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        Cost variance: <Currency amount={hotel.amount} />
                      </span>
                    </div>
                  </div>

                  {driverEntities.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No {detailLevel}-level positive over-plan drivers.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-white text-gray-500 uppercase tracking-wide text-[11px]">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">{detailLevel === 'division' ? 'Division' : detailLevel === 'department' ? 'Department' : 'Job'}</th>
                          <th className="text-right px-4 py-2 font-medium">Actual Hours</th>
                          <th className="text-right px-4 py-2 font-medium">Actual</th>
                          <th className="text-right px-4 py-2 font-medium">Budget Hours</th>
                          <th className="text-right px-4 py-2 font-medium">Budget</th>
                          <th className="text-right px-4 py-2 font-medium">Hours Variance</th>
                          <th className="text-right px-4 py-2 font-medium">Cost Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driverEntities.map((row) => (
                          <tr key={row.entityId} className="border-t border-gray-100 align-top">
                            <td className="px-4 py-2 text-gray-800">
                              <div className="font-medium text-slate-navy">{row.entityName}</div>
                              {detailLevel === 'department' && (
                                <div className="text-[11px] text-gray-500 mt-0.5">{row.divisionName}</div>
                              )}
                              {detailLevel === 'job' && (
                                <div className="text-[11px] text-gray-500 mt-0.5">{row.divisionName} · {row.departmentName ?? 'Department'}</div>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{Math.round(row.actualHours).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right tabular-nums"><Currency amount={row.actualCost} /></td>
                            <td className="px-4 py-2 text-right tabular-nums">{Math.round(row.budgetedHours).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right tabular-nums"><Currency amount={row.budgetedCost} /></td>
                            <td className={`px-4 py-2 text-right tabular-nums font-medium ${row.hoursVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {row.hoursVariance >= 0 ? '+' : '-'}{Math.round(Math.abs(row.hoursVariance)).toLocaleString()} ({row.budgetedHours > 0 ? `${row.hoursVariance >= 0 ? '+' : ''}${((row.hoursVariance / row.budgetedHours) * 100).toFixed(1)}%` : '0.0%'})
                            </td>
                            <td className={`px-4 py-2 text-right tabular-nums font-medium ${row.overPlanCost > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              <Currency amount={row.overPlanCost} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const ServiceRiskDetailsModal: React.FC<ServiceRiskDetailsModalProps> = ({
  open,
  onClose,
  contributions,
  riskIndex,
  highRiskCount,
  emptyMessage,
}) => {
  const [viewMode, setViewMode] = useState<'capacity' | 'occupancy'>('capacity');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close service risk score details"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-6xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-navy">Service Risk Score: Hotel Details</h3>
            <p className="text-xs text-gray-500 mt-1">Portfolio index: {riskIndex.toFixed(0)}/100 • {highRiskCount} high-risk hotels.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(85vh-72px)] p-6 space-y-4">
          <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('capacity')}
              className={`px-2 py-1 text-[11px] rounded ${viewMode === 'capacity' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-medium' : 'text-gray-600 hover:text-indigo-700'}`}
            >
              Demand-Adjusted Staffing
            </button>
            <button
              type="button"
              onClick={() => setViewMode('occupancy')}
              className={`px-2 py-1 text-[11px] rounded ${viewMode === 'occupancy' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-medium' : 'text-gray-600 hover:text-indigo-700'}`}
            >
              Occupancy
            </button>
          </div>

          {contributions.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm min-w-[980px]">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">Hotel</th>
                    {viewMode === 'capacity' ? (
                      <>
                        <th className="text-right px-3 py-2">Risk Score</th>
                        <th className="text-right px-3 py-2">Coverage %</th>
                        <th className="text-right px-3 py-2">Demand Std Gap %</th>
                        <th className="text-right px-3 py-2">Demand Fcst Gap %</th>
                        <th className="text-left px-3 py-2">Risk Tier</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right px-3 py-2">Forecast Occ %</th>
                        <th className="text-right px-3 py-2">Actual Occ %</th>
                        <th className="text-right px-3 py-2">Delta Pts</th>
                        <th className="text-right px-3 py-2">Forecast Rooms</th>
                        <th className="text-right px-3 py-2">Actual Rooms</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => {
                    const occDelta = c.actualOccupancy - c.forecastOccupancy;
                    const tierTone =
                      c.riskTier === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : c.riskTier === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : c.riskTier === 'watch'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700';
                    return (
                      <tr key={c.hotelId} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-slate-navy"><HotelLink hotelId={c.hotelId}>{c.hotelName}</HotelLink></td>
                        {viewMode === 'capacity' ? (
                          <>
                            <td className="px-3 py-2 text-right tabular-nums">{c.riskScore.toFixed(0)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.capacityCoveragePercent.toFixed(1)}%</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.underDemandStandardPercent.toFixed(1)}%</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.underDemandForecastPercent.toFixed(1)}%</td>
                            <td className="px-3 py-2"><span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${tierTone}`}>{c.riskTier}</span></td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-right tabular-nums">{c.forecastOccupancy.toFixed(1)}%</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.actualOccupancy.toFixed(1)}%</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${occDelta >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{occDelta >= 0 ? '+' : ''}{occDelta.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.forecastRooms.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.actualRooms.toLocaleString()}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface OTExposureDetailsModalProps {
  open: boolean;
  onClose: () => void;
  summary: OvertimeExposureSummary;
}

const OTExposureDetailsModal: React.FC<OTExposureDetailsModalProps> = ({ open, onClose, summary }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close OT exposure details"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-7xl max-h-[88vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-navy">OT Exposure: Hotel, Department, and Job Detail</h3>
            <p className="text-xs text-gray-500 mt-1">Showing only hotels where actual overtime exceeds {summary.thresholdPercent.toFixed(1)}% of actual hours.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(88vh-72px)] p-6 space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Hotels Above Threshold</div>
              <div className="mt-1 text-lg font-semibold text-slate-navy tabular-nums">{summary.qualifyingHotelCount}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Total OT Hours</div>
              <div className="mt-1 text-lg font-semibold text-slate-navy tabular-nums">{Math.round(summary.totalOtHours).toLocaleString()} hrs</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Scheduled OT Cost</div>
              <div className="mt-1 text-lg font-semibold text-slate-navy tabular-nums"><Currency amount={summary.totalScheduledOtCost} /></div>
              <div className="mt-0.5 text-xs text-gray-500 tabular-nums">{Math.round(summary.totalScheduledOtHours).toLocaleString()} hrs</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Unscheduled OT Cost</div>
              <div className="mt-1 text-lg font-semibold text-slate-navy tabular-nums"><Currency amount={summary.totalUnscheduledOtCost} /></div>
              <div className="mt-0.5 text-xs text-gray-500 tabular-nums">{Math.round(summary.totalUnscheduledOtHours).toLocaleString()} hrs</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Total OT Cost</div>
              <div className="mt-1 text-lg font-semibold text-slate-navy tabular-nums"><Currency amount={summary.totalOtCost} /></div>
            </div>
          </section>

          {summary.hotels.length === 0 ? (
            <div className="text-sm text-gray-500">No hotels currently exceed the OT exposure threshold.</div>
          ) : (
            summary.hotels.map((hotel) => (
              <section key={hotel.hotelId} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-navy"><HotelLink hotelId={hotel.hotelId}>{hotel.hotelName}</HotelLink></div>
                    <div className="mt-1 text-xs text-gray-600 tabular-nums">OT share {hotel.otShare.toFixed(1)}% of {Math.round(hotel.actualHours).toLocaleString()} actual hrs</div>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-3">
                    <span className="tabular-nums">OT hrs: {Math.round(hotel.actualOvertimeHours).toLocaleString()}</span>
                    <span className="tabular-nums">Scheduled OT: {Math.round(hotel.scheduledOvertimeHours).toLocaleString()}</span>
                    <span className="tabular-nums">Unscheduled OT: {Math.round(hotel.unscheduledOvertimeHours).toLocaleString()}</span>
                    <span className="tabular-nums">OT cost: <Currency amount={hotel.otCost} /></span>
                  </div>
                </div>

                {hotel.departments.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No department-level OT detail available.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-white text-gray-500 uppercase tracking-wide text-[11px]">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Department / Job</th>
                        <th className="text-left px-4 py-2 font-medium">Division</th>
                        <th className="text-right px-4 py-2 font-medium">OT Hours</th>
                        <th className="text-right px-4 py-2 font-medium">Scheduled OT</th>
                        <th className="text-right px-4 py-2 font-medium">Unscheduled OT</th>
                        <th className="text-right px-4 py-2 font-medium">OT % of Hours</th>
                        <th className="text-right px-4 py-2 font-medium">OT Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotel.departments.map((department) => (
                        <React.Fragment key={department.entityId}>
                          <tr className="border-t border-gray-100 bg-orange-50/40">
                            <td className="px-4 py-2 font-medium text-gray-900">{department.entityName}</td>
                            <td className="px-4 py-2 text-gray-600">{department.divisionName}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{Math.round(department.actualOvertimeHours).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{Math.round(department.scheduledOvertimeHours).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{Math.round(department.unscheduledOvertimeHours).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{department.otShare.toFixed(1)}%</td>
                            <td className="px-4 py-2 text-right tabular-nums"><Currency amount={department.otCost} /></td>
                          </tr>
                          {department.jobs.map((job) => (
                            <tr key={job.entityId} className="border-t border-gray-100">
                              <td className="px-4 py-2 pl-10 text-gray-700">{job.entityName}</td>
                              <td className="px-4 py-2 text-gray-500">{department.entityName}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{Math.round(job.actualOvertimeHours).toLocaleString()}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{Math.round(job.scheduledOvertimeHours).toLocaleString()}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{Math.round(job.unscheduledOvertimeHours).toLocaleString()}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{job.otShare.toFixed(1)}%</td>
                              <td className="px-4 py-2 text-right tabular-nums"><Currency amount={job.otCost} /></td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const RiskDetailsModal: React.FC<RiskDetailsModalProps> = ({
  open,
  onClose,
  comparisonBasis,
  comparisonLabel,
  title,
  emptyMessage,
  hotels,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-6xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-navy">{title}</h3>
            <p className="text-xs text-gray-500 mt-1">Performance measure: Actual vs {comparisonLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(85vh-72px)] p-6 space-y-6">
          {hotels.length === 0 ? (
            <div className="text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            hotels.map((hotel) => (
              <section key={hotel.hotelId} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-slate-navy">{hotel.hotelName}</div>
                  <div className="text-xs text-gray-600 flex items-center gap-3">
                    <span className="tabular-nums">Actual hrs: {Math.round(hotel.actualHours).toLocaleString()}</span>
                    <span className="tabular-nums">Actual: <Currency amount={hotel.actualValue} /></span>
                    <span className="tabular-nums">Budget hrs: {Math.round(hotel.budgetHours).toLocaleString()}</span>
                    <span className="tabular-nums">Budget: <Currency amount={hotel.budgetValue} /></span>
                    <span className={`font-semibold tabular-nums ${hotel.actualHours - hotel.budgetHours > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      Hours variance: {hotel.actualHours - hotel.budgetHours >= 0 ? '+' : '-'}{Math.round(Math.abs(hotel.actualHours - hotel.budgetHours)).toLocaleString()} ({hotel.budgetHours > 0 ? `${hotel.actualHours - hotel.budgetHours >= 0 ? '+' : ''}${(((hotel.actualHours - hotel.budgetHours) / hotel.budgetHours) * 100).toFixed(1)}%` : '0.0%'})
                    </span>
                    <span className={`font-semibold tabular-nums ${hotel.actualValue - hotel.budgetValue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      Cost variance: <Currency amount={hotel.actualValue - hotel.budgetValue} />
                    </span>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-white text-gray-500 uppercase tracking-wide text-[11px]">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Department</th>
                      <th className="text-right px-4 py-2 font-medium">Actual Hours</th>
                      <th className="text-right px-4 py-2 font-medium">Actual</th>
                      <th className="text-right px-4 py-2 font-medium">Budget Hours</th>
                      <th className="text-right px-4 py-2 font-medium">Budget</th>
                      <th className="text-right px-4 py-2 font-medium">Hours Variance</th>
                      <th className="text-right px-4 py-2 font-medium">Cost Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...hotel.departments]
                      .sort((a, b) => Math.abs((b.actualCost - b.budgetedCost)) - Math.abs((a.actualCost - a.budgetedCost)))
                      .map((d) => {
                        const hoursVariance = d.actualHours - d.budgetedHours;
                        const costVariance = d.actualCost - d.budgetedCost;
                        return (
                          <tr key={d.entityId} className="border-t border-gray-100">
                            <td className="px-4 py-2 text-gray-800">{d.entityName}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{Math.round(d.actualHours).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right tabular-nums"><Currency amount={d.actualCost} /></td>
                            <td className="px-4 py-2 text-right tabular-nums">{Math.round(d.budgetedHours).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right tabular-nums"><Currency amount={d.budgetedCost} /></td>
                            <td className={`px-4 py-2 text-right tabular-nums font-medium ${hoursVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {hoursVariance >= 0 ? '+' : '-'}{Math.round(Math.abs(hoursVariance)).toLocaleString()} ({d.budgetedHours > 0 ? `${hoursVariance >= 0 ? '+' : ''}${((hoursVariance / d.budgetedHours) * 100).toFixed(1)}%` : '0.0%'})
                            </td>
                            <td className={`px-4 py-2 text-right tabular-nums font-medium ${costVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              <Currency amount={costVariance} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

type PeriodFilter = 'previous-month' | 'current-month' | 'ytd';
type PerformanceInsightsSortMode = 'cost-impact' | 'customer-impact';

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

const MODULE_TITLES: Record<string, string> = {
  'overview': 'Portfolio Overview',
  'pace-performance': 'Pace & Performance',
  'budget-performance': 'Budget Performance',
  'mid-month-forecast': 'Mid-Month Forecast',
  'plan-standard-performance': 'Plan & Standard Performance',
  'overtime-intelligence': 'Overtime Intelligence',
  'scenario-lab': 'Scenario Lab',
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  'overview': 'Executive snapshot of portfolio labor health, variance drivers, and properties needing attention.',
  'pace-performance': 'Demand forecast + scheduled labor + actual labor + productivity + cost variance + action items to keep service and cost in balance.',
  'budget-performance': 'Compare actual hours and cost against budget across hours, dollars, and variance bands.',
  'mid-month-forecast': 'Track month-to-date actuals against the latest full-month projection for the current month.',
  'plan-standard-performance': 'Measure execution against the operating plan and engineered labor standards.',
  'overtime-intelligence': 'Last 7 / Next 7-day view of overtime exposure, root causes, and trending properties.',
  'scenario-lab': 'Model scenarios from the current month forward — adjust drivers and preview the labor impact.',
};

export const PortfolioOverview: React.FC = () => {
  const [period, setPeriod] = useState<PeriodFilter>('previous-month');
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>(MOCK_HOTELS.map((h) => h.id));
  const [activeModule, setActiveModule] = useState<string>('overview');
  const [comparisonBasis, setComparisonBasis] = useState<ComparisonBasis>('budget');
  const [onTrackDetailsOpen, setOnTrackDetailsOpen] = useState(false);
  const [cautionDetailsOpen, setCautionDetailsOpen] = useState(false);
  const [atRiskDetailsOpen, setAtRiskDetailsOpen] = useState(false);
  const [performanceRiskDetailsOpen, setPerformanceRiskDetailsOpen] = useState(false);
  const [serviceRiskDetailsOpen, setServiceRiskDetailsOpen] = useState(false);
  const [otExposureDetailsOpen, setOtExposureDetailsOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState<RiskLevel | null>(null);

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
  const [performanceInsightsSortMode, setPerformanceInsightsSortMode] = useState<PerformanceInsightsSortMode>('cost-impact');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

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
  const comparisonLabel = COMPARISON_LABEL[comparisonBasis];

  const selectedIdSet = useMemo(() => new Set(selectedHotelIds), [selectedHotelIds]);
  const isSinglePropertyMode = selectedHotelIds.length === 1;
  const singleHotel = useMemo(
    () => (isSinglePropertyMode ? MOCK_HOTELS.find((h) => h.id === selectedHotelIds[0]) : undefined),
    [isSinglePropertyMode, selectedHotelIds],
  );

  useEffect(() => {
    if (!isSinglePropertyMode && activeModule === 'pace-performance') {
      setActiveModule('overview');
    }
  }, [isSinglePropertyMode, activeModule]);

  const singleHotelMetrics = useMemo(
    () => (isSinglePropertyMode ? MOCK_LABOR_METRICS.find((m) => m.hotelId === selectedHotelIds[0]) : undefined),
    [isSinglePropertyMode, selectedHotelIds],
  );
  const filteredMetrics = useMemo(
    () => MOCK_LABOR_METRICS.filter((m) => selectedIdSet.has(m.hotelId)),
    [selectedIdSet]
  );
  const attentionSeedByHotelId = useMemo(
    () => new Map(MOCK_HOTELS_REQUIRING_ATTENTION.map((h) => [h.hotel.id, h])),
    []
  );

  const riskDistributionByComparison = useMemo(() => {
    return filteredMetrics.map((m) => {
      const comparableCost = getComparableCost(m, comparisonBasis);
      const actualValue = m.actualCost;
      const variancePercent = comparableCost === 0 ? 0 : ((actualValue - comparableCost) / comparableCost) * 100;
      return {
        hotelId: m.hotelId,
        hotelName: MOCK_HOTELS.find((h) => h.id === m.hotelId)?.name ?? m.hotelId,
        variancePercent,
        riskLevel: classifyRiskByVariance(variancePercent),
      };
    });
  }, [filteredMetrics, comparisonBasis]);

  const portfolioCounts = useMemo(() => {
    const totalHotels = selectedHotelIds.length;
    let hotelsOnTrack = 0;
    let hotelsInCaution = 0;
    let hotelsAtRisk = 0;
    for (const r of riskDistributionByComparison) {
      if (r.riskLevel === 'on-track') hotelsOnTrack += 1;
      else if (r.riskLevel === 'caution') hotelsInCaution += 1;
      else if (r.riskLevel === 'at-risk') hotelsAtRisk += 1;
    }
    return { totalHotels, hotelsOnTrack, hotelsInCaution, hotelsAtRisk };
  }, [riskDistributionByComparison, selectedHotelIds.length]);

  const metrics = useMemo(() => {
    return {
      ...portfolioCounts,
    };
  }, [filteredMetrics, view, portfolioCounts]);

  const attentionHotels = useMemo(() => {
    const derived = filteredMetrics
      .map((metric) => {
        const risk = riskDistributionByComparison.find((r) => r.hotelId === metric.hotelId);
        const baseRiskLevel = risk?.riskLevel ?? classifyRiskByVariance(metric.costVariance);

        const hotel = MOCK_HOTELS.find((h) => h.id === metric.hotelId);
        if (!hotel) return null;

        const comparableCost = getComparableCost(metric, comparisonBasis);
        const varianceAmount = (metric.actualCost - comparableCost) * view.additiveScale;
        const variancePercent = comparableCost === 0 ? 0 : ((metric.actualCost - comparableCost) / comparableCost) * 100;
        const standardGapPct = metric.standardHours > 0
          ? ((metric.standardHours - metric.actualHours) / metric.standardHours) * 100
          : 0;
        const hasServiceQualityRisk = standardGapPct > 5;

        const serviceQualityDriver = hasServiceQualityRisk
          ? {
              category: 'service-quality' as const,
              impact: 0,
              percentage: 0,
              description: `Actual hours are ${standardGapPct.toFixed(1)}% below standard; service quality delivery risk is elevated.`,
            }
          : null;

        const varianceDrivers = serviceQualityDriver
          ? [serviceQualityDriver, ...metric.varianceDrivers]
          : metric.varianceDrivers;

        const riskLevel: RiskLevel = hasServiceQualityRisk && baseRiskLevel === 'on-track'
          ? 'caution'
          : baseRiskLevel;
        if (riskLevel === 'on-track' && !hasServiceQualityRisk) return null;

        const topVarianceDriver = [...metric.varianceDrivers]
          .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))[0] ?? {
            category: 'execution',
            impact: 0,
            percentage: 0,
            description: `Actual is aligned with ${comparisonLabel.toLowerCase()}.`,
          };

        const seed = attentionSeedByHotelId.get(metric.hotelId);
        const trend = seed?.trend ?? {
          status: variancePercent > 8 ? 'worsening' : variancePercent > 4 ? 'persistent' : 'emerging',
          periodsActive: Math.max(1, Math.round(Math.abs(variancePercent) / 2)),
          changeVsPriorPeriod: variancePercent,
          note:
            variancePercent > 0
              ? `Actual is ${variancePercent.toFixed(1)}% above ${comparisonLabel.toLowerCase()}.`
              : `Actual is ${Math.abs(variancePercent).toFixed(1)}% below ${comparisonLabel.toLowerCase()}.`,
        };

        const keyInsight =
          seed?.keyInsight ??
          `${topVarianceDriver.description} Actual remains ${variancePercent >= 0 ? 'above' : 'below'} ${comparisonLabel.toLowerCase()} by ${Math.abs(variancePercent).toFixed(1)}%.${hasServiceQualityRisk ? ` Service quality risk flag triggered at ${standardGapPct.toFixed(1)}% below standard hours.` : ''}`;

        return {
          hotel,
          metrics: {
            ...metric,
            riskLevel,
            varianceDrivers,
          },
          variance: varianceAmount,
          riskLevel,
          serviceQualityRiskFlag: hasServiceQualityRisk,
          standardGapPct,
          topVarianceDriver: {
            ...topVarianceDriver,
            impact: topVarianceDriver.impact * view.additiveScale,
          },
          keyInsight,
          trend,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        if (performanceInsightsSortMode === 'customer-impact') {
          if (a.serviceQualityRiskFlag !== b.serviceQualityRiskFlag) {
            return a.serviceQualityRiskFlag ? -1 : 1;
          }
          if (Math.abs(a.standardGapPct - b.standardGapPct) > 0.01) {
            return b.standardGapPct - a.standardGapPct;
          }
        }
        return b.variance - a.variance;
      });

    return derived.slice(0, 5);
  }, [
    filteredMetrics,
    riskDistributionByComparison,
    comparisonBasis,
    comparisonLabel,
    attentionSeedByHotelId,
    performanceInsightsSortMode,
    view.additiveScale,
  ]);

  const hotelsByRisk = useMemo(() => {
    const groups: Record<RiskLevel, { hotelId: string; hotelName: string }[]> = {
      'on-track': [],
      caution: [],
      'at-risk': [],
    };
    for (const r of riskDistributionByComparison) {
      groups[r.riskLevel].push({ hotelId: r.hotelId, hotelName: r.hotelName });
    }
    for (const key of Object.keys(groups) as RiskLevel[]) {
      groups[key].sort((a, b) => a.hotelName.localeCompare(b.hotelName));
    }
    return groups;
  }, [riskDistributionByComparison]);

  const hotelPerformanceByRisk = useMemo(() => {
    const byHotel = new Map(filteredMetrics.map((m) => [m.hotelId, m]));
    const build = (risk: RiskLevel): RiskHotelPerformance[] =>
      hotelsByRisk[risk]
        .map((h) => {
          const metric = byHotel.get(h.hotelId);
          if (!metric) return null;
          const actualHours = metric.actualHours * view.additiveScale;
          const budgetHours = metric.budgetedHours * view.additiveScale;
          const actualValue = metric.actualCost * view.additiveScale;
          const budgetValue = metric.budgetedCost * view.additiveScale;
          const comparisonValue = getComparableCost(metric, comparisonBasis) * view.additiveScale;
          const variancePercent = comparisonValue === 0 ? 0 : ((actualValue - comparisonValue) / comparisonValue) * 100;
          return {
            hotelId: h.hotelId,
            hotelName: h.hotelName,
            variancePercent,
            actualHours,
            budgetHours,
            actualValue,
            budgetValue,
            comparisonValue,
          };
        })
        .filter((h): h is NonNullable<typeof h> => h !== null)
        .sort((a, b) => Math.abs(a.variancePercent) - Math.abs(b.variancePercent));

    return {
      'on-track': build('on-track'),
      caution: build('caution'),
      'at-risk': build('at-risk'),
    };
  }, [hotelsByRisk, filteredMetrics, view.additiveScale, comparisonBasis]);

  const departmentPerformanceByRisk = useMemo(() => {
    const withDepartments = (rows: RiskHotelPerformance[]) => rows.map((hotel) => {
      const source = filteredMetrics.find((m) => m.hotelId === hotel.hotelId);
      const departments = source
        ? buildPropertyEntityMetrics(source, view.additiveScale).departments
        : [];
      return {
        ...hotel,
        departments,
      };
    });

    return {
      'on-track': withDepartments(hotelPerformanceByRisk['on-track']),
      caution: withDepartments(hotelPerformanceByRisk.caution),
      'at-risk': withDepartments(hotelPerformanceByRisk['at-risk']),
    };
  }, [hotelPerformanceByRisk, filteredMetrics, view.additiveScale]);

  const hotelNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of MOCK_HOTELS) map.set(h.id, h.name);
    return map;
  }, []);

  const statusHoursByRisk = useMemo(() => {
    const byRisk: Record<RiskLevel, { hotelId: string; hotelName: string; actualHours: number; comparisonHours: number }[]> = {
      'on-track': [],
      caution: [],
      'at-risk': [],
    };

    const riskByHotel = new Map(riskDistributionByComparison.map((r) => [r.hotelId, r.riskLevel]));
    for (const metric of filteredMetrics) {
      const risk = riskByHotel.get(metric.hotelId);
      if (!risk) continue;
      byRisk[risk].push({
        hotelId: metric.hotelId,
        hotelName: hotelNameById.get(metric.hotelId) ?? metric.hotelId,
        actualHours: metric.actualHours * view.additiveScale,
        comparisonHours: getComparableHours(metric, comparisonBasis) * view.additiveScale,
      });
    }

    for (const risk of Object.keys(byRisk) as RiskLevel[]) {
      byRisk[risk].sort((a, b) => b.actualHours - a.actualHours);
    }
    return byRisk;
  }, [filteredMetrics, hotelNameById, riskDistributionByComparison, view.additiveScale, comparisonBasis]);

  const riskCostSummary = useMemo(() => {
    const riskLevelByHotel = new Map(riskDistributionByComparison.map((r) => [r.hotelId, r.riskLevel]));
    const totalPlannedCost = filteredMetrics.reduce((s, m) => s + m.budgetedCost, 0) * view.additiveScale;
    const contributions = filteredMetrics
      .map((m) => {
        const riskLevel = riskLevelByHotel.get(m.hotelId);
        const overPlanCost = (m.actualCost - m.budgetedCost) * view.additiveScale;
        const amount = riskLevel && riskLevel !== 'on-track' ? Math.max(overPlanCost, 0) : 0;

        if (!riskLevel || riskLevel === 'on-track' || amount <= 0.5) {
          return null;
        }

        const direction = hash01(`${m.hotelId}|trend-direction`) >= 0.5 ? 1 : -1;
        const amplitude = 0.08 + hash01(`${m.hotelId}|trend-amplitude`) * 0.22;
        const month1 = amount * (1 - direction * amplitude);
        const month2 = amount * (1 - direction * amplitude * 0.45);
        const month3 = amount;
        const delta = month3 - month1;
        const trendThreshold = Math.max(amount * 0.04, 250);
        const trend: RiskCostContribution['trend'] =
          delta > trendThreshold ? 'up' : delta < -trendThreshold ? 'down' : 'flat';

        return {
          hotelId: m.hotelId,
          hotelName: hotelNameById.get(m.hotelId) ?? m.hotelId,
          amount,
          riskLevel,
          trend,
          trailing3Months: [month1, month2, month3] as [number, number, number],
        };
      })
      .filter((c): c is RiskCostContribution => c !== null)
      .sort((a, b) => b.amount - a.amount);
    const totalRiskCost = contributions.reduce((s, c) => s + c.amount, 0);
    const percentOfPlan = totalPlannedCost > 0 ? (totalRiskCost / totalPlannedCost) * 100 : 0;
    return {
      totalPlannedCost,
      totalRiskCost,
      percentOfPlan,
      contributions,
    };
  }, [filteredMetrics, hotelNameById, riskDistributionByComparison, view.additiveScale]);

  const performanceRiskDetails = useMemo(() => {
    const byHotelMetric = new Map(filteredMetrics.map((m) => [m.hotelId, m]));
    return riskCostSummary.contributions
      .map((c) => {
        const metric = byHotelMetric.get(c.hotelId);
        if (!metric) return null;
        return {
          ...c,
          actualValue: metric.actualCost * view.additiveScale,
          budgetValue: metric.budgetedCost * view.additiveScale,
          actualHours: metric.actualHours * view.additiveScale,
          budgetHours: metric.budgetedHours * view.additiveScale,
          divisions: buildPropertyEntityMetrics(metric, view.additiveScale).divisions,
          departments: buildPropertyEntityMetrics(metric, view.additiveScale).departments,
          jobs: buildPropertyEntityMetrics(metric, view.additiveScale).jobs,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null);
  }, [filteredMetrics, riskCostSummary.contributions, view.additiveScale]);

  const serviceDeliveryRiskSummary = useMemo(() => {
    const roomNightsScale =
      period === 'previous-month'
        ? 30
        : period === 'current-month'
        ? 15
        : 365;

    const contributions = filteredMetrics
      .map((m) => {
        const hotel = MOCK_HOTELS.find((h) => h.id === m.hotelId);
        const roomCount = hotel?.roomCount ?? 120;
        const forecastOcc = clamp(58 + hash01(`${m.hotelId}|occ-forecast`) * 32, 45, 96);
        const varianceAnchor = (m.actualHours - m.forecastedHours) / Math.max(m.forecastedHours, 1);
        const actualOcc = clamp(forecastOcc + varianceAnchor * 20 + (hash01(`${m.hotelId}|occ-noise`) - 0.5) * 6, 40, 98);
        const demandRatio = forecastOcc > 0 ? actualOcc / forecastOcc : 1;
        const demandAdjustedStandardHours = m.standardHours * demandRatio;
        const demandAdjustedForecastHours = m.forecastedHours * demandRatio;
        const serviceGapHoursRaw = Math.max(demandAdjustedStandardHours - m.actualHours, 0) * view.additiveScale;
        const underDemandStandardPercent = demandAdjustedStandardHours > 0
          ? (Math.max(demandAdjustedStandardHours - m.actualHours, 0) / demandAdjustedStandardHours) * 100
          : 0;
        const underDemandForecastPercent = demandAdjustedForecastHours > 0
          ? (Math.max(demandAdjustedForecastHours - m.actualHours, 0) / demandAdjustedForecastHours) * 100
          : 0;

        if (serviceGapHoursRaw <= 1 || (underDemandStandardPercent < 2 && underDemandForecastPercent < 2)) return null;

        const outcomePressurePoints = Math.max(actualOcc - forecastOcc, 0);
        const capacityCoveragePercent = demandAdjustedStandardHours > 0 ? (m.actualHours / demandAdjustedStandardHours) * 100 : 100;
        const riskScore = clamp((underDemandStandardPercent * 2.8) + (underDemandForecastPercent * 1.2) + (outcomePressurePoints * 2.2), 0, 100);
        const riskTier: ServiceDeliveryContribution['riskTier'] =
          riskScore >= 75 ? 'critical' : riskScore >= 55 ? 'high' : riskScore >= 35 ? 'watch' : 'low';
        const forecastRooms = Math.round(roomCount * roomNightsScale * (forecastOcc / 100));
        const actualRooms = Math.round(roomCount * roomNightsScale * (actualOcc / 100));

        return {
          hotelId: m.hotelId,
          hotelName: hotelNameById.get(m.hotelId) ?? m.hotelId,
          amount: riskScore,
          roomCount,
          riskScore,
          riskTier,
          serviceGapHours: serviceGapHoursRaw,
          underDemandStandardPercent,
          underDemandForecastPercent,
          capacityCoveragePercent,
          outcomePressurePoints,
          forecastOccupancy: forecastOcc,
          actualOccupancy: actualOcc,
          forecastRooms,
          actualRooms,
        };
      })
      .filter((c): c is ServiceDeliveryContribution => c !== null)
      .sort((a, b) => b.riskScore - a.riskScore);

    const totalWeightedRisk = contributions.reduce((s, c) => s + (c.riskScore * c.roomCount), 0);
    const totalRooms = contributions.reduce((s, c) => s + c.roomCount, 0);
    const riskIndex = totalRooms > 0 ? totalWeightedRisk / totalRooms : 0;
    const highRiskCount = contributions.filter((c) => c.riskTier === 'high' || c.riskTier === 'critical').length;

    return {
      riskIndex,
      highRiskCount,
      contributions,
    };
  }, [filteredMetrics, hotelNameById, period, view.additiveScale]);

  const otExposureSummary = useMemo<OvertimeExposureSummary>(() => {
    const thresholdPercent = 2;

    const hotels = filteredMetrics
      .map((metric) => {
        const actualHours = metric.actualHours * view.additiveScale;
        const actualOvertimeHours = metric.actualOvertimeHours * view.additiveScale;
        const scheduledOvertimeHours = metric.scheduledOvertimeHours * view.additiveScale;
        const unscheduledOvertimeHours = Math.max(actualOvertimeHours - scheduledOvertimeHours, 0);
        const scaledActualCost = metric.actualCost * view.additiveScale;
        const baseRate = actualHours > 0 ? scaledActualCost / actualHours : 0;
        const otShare = actualHours > 0 ? (actualOvertimeHours / actualHours) * 100 : 0;

        if (otShare <= thresholdPercent) return null;

        const org = buildPropertyEntityMetrics(metric, view.additiveScale);
        const departments = org.departments
          .map((department) => {
            const departmentOtShare = department.actualHours > 0
              ? (department.actualOvertimeHours / department.actualHours) * 100
              : 0;
            const jobs = org.jobs
              .filter((job) => job.parentId === department.entityId)
              .map((job) => ({
                entityId: job.entityId,
                entityName: job.entityName,
                departmentName: job.departmentName ?? department.entityName,
                actualHours: job.actualHours,
                actualOvertimeHours: job.actualOvertimeHours,
                scheduledOvertimeHours: job.scheduledOvertimeHours,
                unscheduledOvertimeHours: Math.max(job.actualOvertimeHours - job.scheduledOvertimeHours, 0),
                otShare: job.actualHours > 0 ? (job.actualOvertimeHours / job.actualHours) * 100 : 0,
                otCost: estimateOtCost(job.actualOvertimeHours, job.actualCost, job.actualHours),
              }))
              .sort((a, b) => b.actualOvertimeHours - a.actualOvertimeHours);

            return {
              entityId: department.entityId,
              entityName: department.entityName,
              divisionName: department.divisionName,
              actualHours: department.actualHours,
              actualOvertimeHours: department.actualOvertimeHours,
              scheduledOvertimeHours: department.scheduledOvertimeHours,
              unscheduledOvertimeHours: Math.max(department.actualOvertimeHours - department.scheduledOvertimeHours, 0),
              otShare: departmentOtShare,
              otCost: estimateOtCost(department.actualOvertimeHours, department.actualCost, department.actualHours),
              jobs,
            };
          })
          .sort((a, b) => b.actualOvertimeHours - a.actualOvertimeHours);

        return {
          hotelId: metric.hotelId,
          hotelName: hotelNameById.get(metric.hotelId) ?? metric.hotelId,
          actualHours,
          actualOvertimeHours,
          scheduledOvertimeHours,
          unscheduledOvertimeHours,
          otShare,
          scheduledOtCost: scheduledOvertimeHours * baseRate * 1.5,
          unscheduledOtCost: unscheduledOvertimeHours * baseRate * 1.5,
          otCost: estimateOtCost(actualOvertimeHours, scaledActualCost, actualHours),
          departments,
        };
      })
      .filter((hotel): hotel is OvertimeExposureHotelDetail => hotel !== null)
      .sort((a, b) => b.actualOvertimeHours - a.actualOvertimeHours);

    return {
      thresholdPercent,
      qualifyingHotelCount: hotels.length,
      totalOtHours: hotels.reduce((sum, hotel) => sum + hotel.actualOvertimeHours, 0),
      totalScheduledOtHours: hotels.reduce((sum, hotel) => sum + hotel.scheduledOvertimeHours, 0),
      totalUnscheduledOtHours: hotels.reduce((sum, hotel) => sum + hotel.unscheduledOvertimeHours, 0),
      totalScheduledOtCost: hotels.reduce((sum, hotel) => sum + hotel.scheduledOtCost, 0),
      totalUnscheduledOtCost: hotels.reduce((sum, hotel) => sum + hotel.unscheduledOtCost, 0),
      totalOtCost: hotels.reduce((sum, hotel) => sum + hotel.otCost, 0),
      hotels,
    };
  }, [filteredMetrics, hotelNameById, view.additiveScale]);

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

  const portfolioStatusRows = [
    {
      key: 'on-track' as const,
      label: RISK_THRESHOLD_LABELS['on-track'],
      count: metrics.hotelsOnTrack,
      barClass: 'bg-emerald-500',
      icon: CheckCircle,
      iconClass: 'text-emerald-600',
      textClass: 'text-emerald-600',
      onViewDetails: () => setOnTrackDetailsOpen(true),
    },
    {
      key: 'caution' as const,
      label: RISK_THRESHOLD_LABELS.caution,
      count: metrics.hotelsInCaution,
      barClass: 'bg-amber-500',
      icon: AlertCircle,
      iconClass: 'text-amber-600',
      textClass: 'text-amber-600',
      onViewDetails: () => setCautionDetailsOpen(true),
    },
    {
      key: 'at-risk' as const,
      label: RISK_THRESHOLD_LABELS['at-risk'],
      count: metrics.hotelsAtRisk,
      barClass: 'bg-red-500',
      icon: AlertTriangle,
      iconClass: 'text-red-600',
      textClass: 'text-red-600',
      onViewDetails: () => setAtRiskDetailsOpen(true),
    },
  ];

  const openStatusDetails = () => {
    if (metrics.hotelsAtRisk > 0) {
      setAtRiskDetailsOpen(true);
      return;
    }
    if (metrics.hotelsInCaution > 0) {
      setCautionDetailsOpen(true);
      return;
    }
    setOnTrackDetailsOpen(true);
  };

  const selectHotel = (hotelId: string) => {
    setSelectedHotelIds([hotelId]);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <HotelSelectionProvider selectHotel={selectHotel}>
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header: brand + filters + module tabs */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-8">
          {/* Top row: brand + period + global controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3.5">
            <div className="flex items-center gap-3">
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
              <div className="hidden md:block h-8 w-px bg-gray-200" />
              <div className="inline-flex items-center gap-2 text-sm text-gray-600" role="group" aria-label="Actual versus comparison selector">
                <span className="font-medium text-slate-navy">Actual vs</span>
                <div className="inline-flex items-center gap-2">
                  {COMPARISON_OPTIONS.map((option) => {
                    const isActive = comparisonBasis === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setComparisonBasis(option)}
                        aria-pressed={isActive}
                        className={`inline-flex items-center justify-center h-8 px-3 rounded-md text-sm leading-none font-medium transition-all ${
                          isActive
                            ? 'bg-teal-dark text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:text-slate-navy hover:border-gray-300'
                        }`}
                      >
                        {COMPARISON_LABEL[option]}
                      </button>
                    );
                  })}
                </div>
              </div>
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
              <ThemeToggle />
            </div>
          </div>

          {/* Module tabs */}
          <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
              ...(isSinglePropertyMode
                ? [{ id: 'pace-performance', label: 'Pace & Performance', icon: <Activity className="w-4 h-4" /> }]
                : []),
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
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
      <div className="px-8 pt-8 pb-12">
        <div className="max-w-[1400px] mx-auto space-y-10">

          {/* Module context strip */}
          {!isSinglePropertyMode && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-slate-navy tracking-tight">
                  {MODULE_TITLES[activeModule] ?? 'Overview'}
                </h1>
                <p className="text-sm text-gray-500 mt-1 max-w-3xl">
                  {MODULE_DESCRIPTIONS[activeModule] ?? ''}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                  <CalendarClock className="w-3.5 h-3.5 text-gray-400" />
                  {view.overtimeWindowLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  {selectedHotelIds.length} of {MOCK_HOTELS.length} properties
                </span>
              </div>
            </div>
          )}

          {isSinglePropertyMode && singleHotel && singleHotelMetrics && activeModule !== 'pace-performance' ? (
            <PropertyView
              hotel={singleHotel}
              hotelMetrics={singleHotelMetrics}
              activeModule={activeModule}
              periodScale={view.additiveScale}
              periodLabel={view.overtimeWindowLabel}
              driversSubtitle={view.driversSubtitle}
            />
          ) : (
          <>
          {activeModule === 'overview' && (
            <>
                {/* Key Metrics - Executive Summary */}
                <section className="bg-white border border-gray-200 rounded-2xl shadow-[0_2px_18px_rgba(15,23,42,0.06)] overflow-visible">
                  <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_2fr]">
                    <div className="border-b xl:border-b-0 xl:border-r border-gray-200">
                      <div className="p-6 h-full">
                        <div className="rounded-xl border-0 shadow-none bg-white h-full p-6 flex flex-col">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Portfolio Status</div>
                          <div className="text-sm text-gray-500 mt-1 mb-5">Actual vs {comparisonLabel}</div>
                          <div className="flex items-center justify-between mb-5">
                            <div>
                              <div className="text-[30px] leading-tight font-semibold text-slate-navy tabular-nums">{metrics.totalHotels}</div>
                              <div className="text-sm text-gray-500">hotels monitored</div>
                            </div>
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
                              <Building2 className="w-5 h-5" />
                            </div>
                          </div>

                          <div className="space-y-4">
                        {portfolioStatusRows.map((row) => {
                          const pct = metrics.totalHotels > 0 ? (row.count / metrics.totalHotels) * 100 : 0;
                          const representedHotels = statusHoursByRisk[row.key];
                          return (
                            <div
                              key={row.key}
                              className="relative"
                              onMouseEnter={() => setStatusPopoverOpen(row.key)}
                              onMouseLeave={() => setStatusPopoverOpen((current) => (current === row.key ? null : current))}
                            >
                              <div className="flex items-center justify-between text-sm mb-1.5">
                                <div className="flex items-center gap-2 text-slate-navy font-medium">
                                    <row.icon className={`w-3.5 h-3.5 ${row.iconClass}`} />
                                  <span>{row.label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`tabular-nums font-semibold ${row.textClass}`}>{pct.toFixed(0)}%</span>
                                  <button
                                    type="button"
                                    onClick={row.onViewDetails}
                                    className="tabular-nums text-slate-navy text-xl leading-none font-semibold hover:text-teal"
                                    aria-label={`View ${row.label} details`}
                                  >
                                    {row.count}
                                  </button>
                                </div>
                              </div>
                              <div className="h-2 rounded-full bg-gray-200">
                                <div className={`h-2 rounded-full ${row.barClass}`} style={{ width: `${pct}%` }} />
                              </div>

                              {statusPopoverOpen === row.key && (
                                <div
                                  role="tooltip"
                                  className="absolute z-20 mt-2 left-0 right-0 xl:left-auto xl:right-0 xl:w-[34rem] bg-white border border-gray-200 rounded-lg shadow-lg p-3"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{row.label} Properties</div>
                                    <div className={`text-xs font-semibold ${row.textClass}`}>{representedHotels.length} hotels</div>
                                  </div>
                                  {representedHotels.length === 0 ? (
                                    <div className="text-sm text-gray-500">No properties in this category.</div>
                                  ) : (
                                    <div className="overflow-y-auto max-h-64 border border-gray-100 rounded-md">
                                      <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                                          <tr>
                                            <th className="text-left px-3 py-2">Property</th>
                                            <th className="text-right px-3 py-2">Actual Hours</th>
                                            <th className="text-right px-3 py-2">{comparisonLabel} Hours</th>
                                            <th className="text-right px-3 py-2">Variance %</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {representedHotels.map((hotel) => {
                                            const variancePct = hotel.comparisonHours > 0
                                              ? ((hotel.actualHours - hotel.comparisonHours) / hotel.comparisonHours) * 100
                                              : 0;
                                            return (
                                              <tr key={hotel.hotelId} className="border-t border-gray-100">
                                                <td className="px-3 py-2 text-slate-navy"><HotelLink hotelId={hotel.hotelId}>{hotel.hotelName}</HotelLink></td>
                                                <td className="px-3 py-2 text-right tabular-nums">{Math.round(hotel.actualHours).toLocaleString()}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">{Math.round(hotel.comparisonHours).toLocaleString()}</td>
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
                          );
                        })}
                          </div>

                          <div className="mt-auto pt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={openStatusDetails}
                              className="text-sm font-medium text-slate-navy hover:text-teal underline underline-offset-2"
                            >
                              View details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                      <div className="p-6">
                        <div className="rounded-xl border-0 shadow-none bg-white overflow-visible h-full flex flex-col">
                          <div className="p-6 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unfavorable Cost Variance</div>
                                <div className="mt-2 text-[30px] leading-tight tabular-nums font-semibold text-red-600">
                                  <PerformanceRiskValuePopover
                                    value={<span>${Math.round(riskCostSummary.totalRiskCost).toLocaleString()}</span>}
                                    totalAmount={riskCostSummary.totalRiskCost}
                                    contributions={riskCostSummary.contributions}
                                    emptyMessage="No over-plan risk cost currently identified."
                                  />
                                </div>
                                <div className="mt-2 text-sm text-gray-600">{riskCostSummary.percentOfPlan.toFixed(1)}% of planned labor cost</div>
                              </div>
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600">
                                <DollarSign className="w-5 h-5" />
                              </div>
                            </div>
                            <div className="mt-auto pt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setPerformanceRiskDetailsOpen(true)}
                                className="text-sm font-medium text-slate-navy hover:text-teal underline underline-offset-2"
                              >
                                View details
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 p-6 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                                  <span>Service Risk Score</span>
                                  <InlineInfoTooltip content={SERVICE_RISK_PORTFOLIO_HELP} />
                                </div>
                                <div className="mt-2 text-[30px] leading-tight tabular-nums font-semibold text-indigo-600">
                                  <ServiceRiskValuePopover
                                    value={<span>{serviceDeliveryRiskSummary.riskIndex.toFixed(0)} / 100</span>}
                                    riskIndex={serviceDeliveryRiskSummary.riskIndex}
                                    highRiskCount={serviceDeliveryRiskSummary.highRiskCount}
                                    contributions={serviceDeliveryRiskSummary.contributions}
                                    emptyMessage="No material service delivery under-plan risk identified."
                                  />
                                </div>
                                <div className="mt-2 text-sm text-gray-600">{serviceDeliveryRiskSummary.highRiskCount} hotels high-risk</div>
                              </div>
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
                                <ClipboardList className="w-5 h-5" />
                              </div>
                            </div>
                            <div className="mt-auto pt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setServiceRiskDetailsOpen(true)}
                                className="text-sm font-medium text-slate-navy hover:text-teal underline underline-offset-2"
                              >
                                View details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 h-full">
                        <OTExposurePopoverCard
                          summary={otExposureSummary}
                          onViewDetails={() => setOtExposureDetailsOpen(true)}
                        />
                      </div>
                    </div>
                  </div>
                </section>

              {/* Performance Insights */}
              <SectionPanel
                title="Performance Insights"
                icon={<AlertTriangle className="w-5 h-5" />}
                flush
                action={
                  <>
                    <ExportButton sectionLabel="Performance Insights" />
                    <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-0.5" role="group" aria-label="Performance Insights sort mode">
                      <button
                        type="button"
                        onClick={() => setPerformanceInsightsSortMode('cost-impact')}
                        className={`px-2.5 py-1 text-xs rounded ${performanceInsightsSortMode === 'cost-impact' ? 'bg-slate-100 text-slate-navy font-medium' : 'text-gray-600 hover:text-slate-navy'}`}
                      >
                        Cost impact
                      </button>
                      <button
                        type="button"
                        onClick={() => setPerformanceInsightsSortMode('customer-impact')}
                        className={`px-2.5 py-1 text-xs rounded ${performanceInsightsSortMode === 'customer-impact' ? 'bg-slate-100 text-slate-navy font-medium' : 'text-gray-600 hover:text-slate-navy'}`}
                      >
                        Customer impact
                      </button>
                    </div>
                    <CollapseToggle
                      collapsed={!!collapsedSections.attention}
                      onToggle={() => toggleSection('attention')}
                      sectionLabel="Performance Insights"
                    />
                  </>
                }
              >
                {!collapsedSections.attention && (
                  <HotelsRequiringAttention hotels={attentionHotels} />
                )}
              </SectionPanel>

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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
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

          {activeModule === 'pace-performance' && (
            <PaceAndPerformance
              metrics={filteredMetrics}
              hotels={MOCK_HOTELS.filter((h) => selectedIdSet.has(h.id))}
              period={period}
              periodScale={view.additiveScale}
            />
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
            <ScenarioLab metrics={filteredMetrics} hotelNameById={hotelNameById} />
          )}
          </>
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
              'pace-performance': 'Pace & Performance',
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

      <RiskDetailsModal
        open={onTrackDetailsOpen}
        onClose={() => setOnTrackDetailsOpen(false)}
        comparisonBasis={comparisonBasis}
        comparisonLabel={comparisonLabel}
        title="Hotels On Track (<2% variance): Department Performance"
        emptyMessage="No hotels on track for the current selection."
        hotels={departmentPerformanceByRisk['on-track']}
      />

      <RiskDetailsModal
        open={cautionDetailsOpen}
        onClose={() => setCautionDetailsOpen(false)}
        comparisonBasis={comparisonBasis}
        comparisonLabel={comparisonLabel}
        title="Hotels in Caution (2-4% variance): Department Performance"
        emptyMessage="No hotels in caution for the current selection."
        hotels={departmentPerformanceByRisk.caution}
      />

      <RiskDetailsModal
        open={atRiskDetailsOpen}
        onClose={() => setAtRiskDetailsOpen(false)}
        comparisonBasis={comparisonBasis}
        comparisonLabel={comparisonLabel}
        title="Hotels at Risk (5%+ variance): Department Performance"
        emptyMessage="No hotels at risk for the current selection."
        hotels={departmentPerformanceByRisk['at-risk']}
      />

      <PerformanceRiskDetailsModal
        open={performanceRiskDetailsOpen}
        onClose={() => setPerformanceRiskDetailsOpen(false)}
        hotels={performanceRiskDetails}
      />

      <ServiceRiskDetailsModal
        open={serviceRiskDetailsOpen}
        onClose={() => setServiceRiskDetailsOpen(false)}
        contributions={serviceDeliveryRiskSummary.contributions}
        riskIndex={serviceDeliveryRiskSummary.riskIndex}
        highRiskCount={serviceDeliveryRiskSummary.highRiskCount}
        emptyMessage="No material service delivery under-plan risk identified."
      />

      <OTExposureDetailsModal
        open={otExposureDetailsOpen}
        onClose={() => setOtExposureDetailsOpen(false)}
        summary={otExposureSummary}
      />
    </div>
    </HotelSelectionProvider>
  );
};

export default PortfolioOverview;
