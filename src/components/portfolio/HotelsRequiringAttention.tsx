import React, { useMemo, useState } from 'react';
import { HotelRiskSummary, RiskLevel, RiskTrendStatus } from '../../types';
import { RiskBadge, Currency } from '../ui/Card';
import { HotelLink } from '../ui/HotelSelectionContext';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock3,
  AlertTriangle,
  AlertCircle,
  Building2,
  PieChart,
  ChevronDown,
  ChevronRight,
  DollarSign,
} from 'lucide-react';

interface HotelsRequiringAttentionProps {
  hotels: HotelRiskSummary[];
}

const RISK_THRESHOLD_BADGES: Record<RiskLevel, string> = {
  'on-track': 'On Track (<2% variance)',
  caution: 'Caution (2-4% variance)',
  'at-risk': 'At Risk (5%+ variance)',
};

const RISK_LEVEL_DESCRIPTIONS: Record<RiskLevel, string> = {
  'at-risk': 'Labor variance exceeds tolerance and is not fully demand-supported. Requires intervention this period.',
  caution: 'Labor variance trending unfavorable. Monitor closely; corrective action may be needed.',
  'on-track': 'Labor performance within tolerance of plan.',
};

const DRIVER_CATEGORY_LABELS: Record<string, string> = {
  overtime: 'Overtime',
  demand: 'Demand-Driven',
  productivity: 'Productivity',
  scheduling: 'Scheduling',
  forecast: 'Forecast Error',
  leased: 'Leased Labor',
  'service-quality': 'Service Quality Risk',
};

const formatDriverCategory = (category: string): string =>
  DRIVER_CATEGORY_LABELS[category.toLowerCase()] ??
  category.charAt(0).toUpperCase() + category.slice(1);

interface TrendVisual {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
}

const TREND_VISUALS: Record<RiskTrendStatus, TrendVisual> = {
  emerging: {
    label: 'Emerging',
    icon: <Sparkles className="w-3 h-3 mr-1" />,
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
    icon: <Clock3 className="w-3 h-3 mr-1" />,
    badgeClass: 'bg-orange-100 text-orange-800',
  },
};

const periodsLabel = (n: number): string => `${n} ${n === 1 ? 'period' : 'periods'} active`;

const changeLabel = (status: RiskTrendStatus, change: number): string | null => {
  if (status === 'emerging' || change === 0) return null;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}% vs prior period`;
};

const fmtSigned = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const fmtSignedHours = (n: number): string => `${n >= 0 ? '+' : ''}${Math.round(n).toLocaleString()}`;

const riskLevelHeading = (level: RiskLevel): string => {
  return RISK_THRESHOLD_BADGES[level];
};

export const HotelsRequiringAttention: React.FC<HotelsRequiringAttentionProps> = ({ hotels }) => {
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const flagged = hotels.length;
    const atRisk = hotels.filter((h) => h.riskLevel === 'at-risk').length;
    const caution = hotels.filter((h) => h.riskLevel === 'caution').length;
    const totalVariance = hotels.reduce((sum, h) => sum + h.variance, 0);

    const driverCounts = hotels.reduce<Record<string, number>>((acc, h) => {
      const key = formatDriverCategory(h.topVarianceDriver.category);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const topDrivers = Object.entries(driverCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([driver, count]) => `${count} ${driver}`)
      .join(' / ');

    return { flagged, atRisk, caution, totalVariance, topDrivers };
  }, [hotels]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl leading-none font-semibold text-slate-navy tabular-nums">{summary.flagged}</div>
                <div className="text-sm text-gray-600">Flagged hotels</div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl leading-none font-semibold text-slate-navy tabular-nums">{summary.atRisk}</div>
                <div className="text-sm text-gray-600">At Risk (5%+ variance)</div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl leading-none font-semibold text-slate-navy tabular-nums">{summary.caution}</div>
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
              {Math.round(summary.totalVariance).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm text-gray-600">Driver split</div>
            <div className="text-base font-semibold text-slate-navy leading-tight">{summary.topDrivers || 'No driver data'}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {hotels.map((item, index) => {
          const trendVisual = TREND_VISUALS[item.trend.status];
          const change = changeLabel(item.trend.status, item.trend.changeVsPriorPeriod);
          const isExpanded = expandedHotelId === item.hotel.id;

          const serviceQualityGapPct = item.metrics.standardHours > 0
            ? ((item.metrics.standardHours - item.metrics.actualHours) / item.metrics.standardHours) * 100
            : 0;
          const hasServiceQualityRisk = serviceQualityGapPct > 5;

          const hoursVariance = item.metrics.actualHours - item.metrics.budgetedHours;
          const costVariance = item.metrics.actualCost - item.metrics.budgetedCost;
          const hoursVariancePct = item.metrics.budgetedHours > 0
            ? (hoursVariance / item.metrics.budgetedHours) * 100
            : 0;
          const costVariancePct = item.metrics.budgetedCost > 0
            ? (costVariance / item.metrics.budgetedCost) * 100
            : 0;
          const overtimeShare = item.metrics.actualHours > 0
            ? (item.metrics.actualOvertimeHours / item.metrics.actualHours) * 100
            : 0;

          return (
            <article key={item.hotel.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-4 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr_1.25fr_1.1fr_0.55fr_44px] gap-3 items-start">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm tabular-nums">
                    {index + 1}
                  </div>
                  <div>
                    <HotelLink hotelId={item.hotel.id} className="font-medium text-gray-900 leading-tight">
                      {item.hotel.name}
                    </HotelLink>
                    <div className="text-sm text-gray-500 mt-1">{item.hotel.region}</div>
                  </div>
                </div>

                <div className="xl:border-l xl:border-gray-200 xl:pl-4">
                  <RiskBadge level={item.riskLevel} text={riskLevelHeading(item.riskLevel)} />
                  <div className="text-xs text-gray-500 mt-2 leading-snug">
                    {RISK_LEVEL_DESCRIPTIONS[item.riskLevel]}
                  </div>
                </div>

                <div className="xl:border-l xl:border-gray-200 xl:pl-4">
                  <div className="text-sm text-gray-500">Primary driver</div>
                  <div className="font-semibold text-slate-navy text-lg leading-tight mt-1">
                    {formatDriverCategory(item.topVarianceDriver.category)}
                    <span className="text-gray-500 font-normal ml-1">({item.topVarianceDriver.percentage}% of variance)</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">• {item.topVarianceDriver.description}</div>
                  <div className="text-sm text-gray-500 mt-1 italic">• {item.keyInsight}</div>
                  {hasServiceQualityRisk && (
                    <div className="text-sm text-red-600 mt-1 font-medium">
                      • Service quality risk flag: {serviceQualityGapPct.toFixed(1)}% below standard hours
                    </div>
                  )}
                </div>

                <div className="xl:border-l xl:border-gray-200 xl:pl-4">
                  <div className={`risk-badge ${trendVisual.badgeClass}`}>
                    {trendVisual.icon}
                    {trendVisual.label}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">{periodsLabel(item.trend.periodsActive)}</div>
                  {change && <div className="text-sm text-gray-600">{change}</div>}
                  <div className="text-sm text-gray-500 mt-1 leading-snug">{item.trend.note}</div>
                </div>

                <div className="xl:border-l xl:border-gray-200 xl:pl-4 text-right">
                  <div className="text-sm text-gray-500">Labor variance</div>
                  <div className="text-3xl leading-none tabular-nums mt-1">
                    <Currency amount={item.variance} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedHotelId(isExpanded ? null : item.hotel.id)}
                  className="self-center justify-self-end w-9 h-9 rounded-md border border-gray-200 text-slate-navy hover:bg-gray-50"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? `Collapse ${item.hotel.name} details` : `Expand ${item.hotel.name} details`}
                >
                  {isExpanded ? <ChevronDown className="w-5 h-5 mx-auto" /> : <ChevronRight className="w-5 h-5 mx-auto" />}
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 px-4 py-4 bg-gray-50/50 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <section className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-navy">Risk Determination Data</h4>
                    <p className="text-xs text-gray-500 mt-1">Inputs used to classify this hotel as {riskLevelHeading(item.riskLevel)}.</p>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Actual Hours</div>
                        <div className="tabular-nums font-semibold text-slate-navy">{Math.round(item.metrics.actualHours).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Budgeted Hours</div>
                        <div className="tabular-nums font-semibold text-slate-navy">{Math.round(item.metrics.budgetedHours).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Forecasted Hours</div>
                        <div className="tabular-nums font-semibold text-slate-navy">{Math.round(item.metrics.forecastedHours).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Scheduled Hours</div>
                        <div className="tabular-nums font-semibold text-slate-navy">{Math.round(item.metrics.scheduledHours).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Standard Hours</div>
                        <div className="tabular-nums font-semibold text-slate-navy">{Math.round(item.metrics.standardHours).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Standard Gap %</div>
                        <div className={`tabular-nums font-semibold ${hasServiceQualityRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                          {serviceQualityGapPct >= 0 ? '+' : ''}{serviceQualityGapPct.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Service Quality Risk</div>
                        <div className={`font-semibold ${hasServiceQualityRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                          {hasServiceQualityRisk ? 'Flagged (>5% below standard)' : 'Not flagged'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Hours Variance</div>
                        <div className={`tabular-nums font-semibold ${hoursVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {fmtSignedHours(hoursVariance)} ({fmtSigned(hoursVariancePct)})
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Actual Cost</div>
                        <div className="tabular-nums font-semibold text-slate-navy">${Math.round(item.metrics.actualCost).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Budgeted Cost</div>
                        <div className="tabular-nums font-semibold text-slate-navy">${Math.round(item.metrics.budgetedCost).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Forecasted Cost</div>
                        <div className="tabular-nums font-semibold text-slate-navy">${Math.round(item.metrics.forecastedCost).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="text-gray-500">Cost variance signal:</span>{' '}
                      <span className={`tabular-nums font-semibold ${costVariance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${Math.round(costVariance).toLocaleString()} ({fmtSigned(costVariancePct)})
                      </span>
                    </div>
                  </section>

                  <section className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-navy">Primary Driver Support Data</h4>
                    <p className="text-xs text-gray-500 mt-1">Evidence supporting why {formatDriverCategory(item.topVarianceDriver.category)} is the top driver.</p>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Primary Driver Impact</div>
                        <div className="font-semibold text-slate-navy tabular-nums">${Math.round(item.topVarianceDriver.impact).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Share of Total Variance</div>
                        <div className="font-semibold text-slate-navy tabular-nums">{item.topVarianceDriver.percentage}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Actual OT Hours</div>
                        <div className="font-semibold text-slate-navy tabular-nums">{Math.round(item.metrics.actualOvertimeHours).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Scheduled OT Hours</div>
                        <div className="font-semibold text-slate-navy tabular-nums">{Math.round(item.metrics.scheduledOvertimeHours).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">OT Share of Actual Hours</div>
                        <div className="font-semibold text-slate-navy tabular-nums">{overtimeShare.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Driver Description</div>
                        <div className="font-semibold text-slate-navy">{item.topVarianceDriver.description}</div>
                      </div>
                    </div>

                    <div className="mt-4 border border-gray-100 rounded-md overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-gray-50 px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500">
                        <div>Variance Driver Breakdown</div>
                        <div className="text-right">Impact</div>
                        <div className="text-right">Share</div>
                      </div>
                      {item.metrics.varianceDrivers.map((driver) => (
                        <div key={driver.category} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 border-t border-gray-100 text-sm">
                          <div>
                            <div className="font-medium text-slate-navy">{formatDriverCategory(driver.category)}</div>
                            <div className="text-xs text-gray-500">{driver.description}</div>
                          </div>
                          <div className="text-right tabular-nums font-medium text-slate-navy">${Math.round(driver.impact).toLocaleString()}</div>
                          <div className="text-right tabular-nums text-gray-600">{driver.percentage}%</div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default HotelsRequiringAttention;
