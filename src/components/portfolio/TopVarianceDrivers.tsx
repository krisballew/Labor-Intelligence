import React, { useMemo, useState } from 'react';
import { TopVarianceDriver, LaborMetrics } from '../../types';
import { Zap, ChevronDown, ChevronRight } from 'lucide-react';

interface TopVarianceDriversProps {
  drivers: TopVarianceDriver[];
  metrics: LaborMetrics[];
  hotelNameById: Map<string, string>;
  additiveScale?: number;
}

type DriverKey =
  | 'housekeeping-productivity'
  | 'scheduled-overtime'
  | 'actual-vs-schedule'
  | 'forecast-error'
  | 'wage-rate'
  | 'generic';

interface SupportingMetric {
  label: string;
  value: string;
}

interface HotelBreakdownRow {
  hotelId: string;
  hotelName: string;
  amount: number;
  metrics: SupportingMetric[];
}

const classifyDriver = (category: string): DriverKey => {
  const c = category.toLowerCase();
  if (c.includes('housekeep') || c.includes('productiv')) return 'housekeeping-productivity';
  if (c.includes('overtime')) return 'scheduled-overtime';
  if (c.includes('above schedule') || c.includes('execution') || c.includes('actual hours')) return 'actual-vs-schedule';
  if (c.includes('forecast')) return 'forecast-error';
  if (c.includes('wage') || c.includes('rate')) return 'wage-rate';
  return 'generic';
};

const fmtCurrency = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const fmtHours = (n: number) =>
  `${n >= 0 ? '' : '-'}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} hrs`;

const fmtPct = (n: number, digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;

const computeWeight = (key: DriverKey, m: LaborMetrics): number => {
  switch (key) {
    case 'housekeeping-productivity':
      return Math.max(0, m.actualHours - m.standardHours);
    case 'scheduled-overtime':
      return Math.max(0, m.scheduledOvertimeHours);
    case 'actual-vs-schedule':
      return Math.max(0, m.actualHours - m.scheduledHours);
    case 'forecast-error':
      return Math.abs(m.actualHours - m.forecastedHours);
    case 'wage-rate':
      return Math.max(0, m.actualCost - m.budgetedCost);
    case 'generic':
    default:
      return Math.max(0, m.actualCost - m.budgetedCost);
  }
};

const buildSupportingMetrics = (
  key: DriverKey,
  m: LaborMetrics,
  scale: number,
): SupportingMetric[] => {
  const costVar = (m.actualCost - m.budgetedCost) * scale;
  switch (key) {
    case 'housekeeping-productivity': {
      const overStd = m.actualHours - m.standardHours;
      const pctOver = m.standardHours > 0 ? (overStd / m.standardHours) * 100 : 0;
      return [
        { label: 'Actual vs Standard', value: fmtHours(overStd * scale) },
        { label: '% Over Standard', value: fmtPct(pctOver) },
        { label: 'Cost Variance', value: fmtCurrency(costVar) },
      ];
    }
    case 'scheduled-overtime': {
      const otHours = m.scheduledOvertimeHours * scale;
      const otRate = m.actualHours > 0 ? m.actualCost / m.actualHours : 0;
      const otCost = m.scheduledOvertimeHours * otRate * 1.5 * scale;
      return [
        { label: 'Scheduled OT Hours', value: fmtHours(otHours) },
        { label: 'Est. OT Cost', value: fmtCurrency(otCost) },
        { label: 'OT % of Hours', value: fmtPct(m.actualHours > 0 ? (m.scheduledOvertimeHours / m.actualHours) * 100 : 0) },
      ];
    }
    case 'actual-vs-schedule': {
      const overSched = m.actualHours - m.scheduledHours;
      const pct = m.scheduledHours > 0 ? (overSched / m.scheduledHours) * 100 : 0;
      return [
        { label: 'Actual vs Schedule', value: fmtHours(overSched * scale) },
        { label: '% Over Schedule', value: fmtPct(pct) },
        { label: 'Cost Variance', value: fmtCurrency(costVar) },
      ];
    }
    case 'forecast-error': {
      const err = m.actualHours - m.forecastedHours;
      const pct = m.forecastedHours > 0 ? (err / m.forecastedHours) * 100 : 0;
      return [
        { label: 'Actual vs Forecast', value: fmtHours(err * scale) },
        { label: 'Forecast Error', value: fmtPct(pct) },
        { label: 'Cost Variance', value: fmtCurrency(costVar) },
      ];
    }
    case 'wage-rate': {
      const actualRate = m.actualHours > 0 ? m.actualCost / m.actualHours : 0;
      const budgetRate = m.budgetedHours > 0 ? m.budgetedCost / m.budgetedHours : 0;
      const rateDelta = actualRate - budgetRate;
      const pct = budgetRate > 0 ? (rateDelta / budgetRate) * 100 : 0;
      return [
        { label: 'Actual Rate', value: `$${actualRate.toFixed(2)}/hr` },
        { label: 'Budget Rate', value: `$${budgetRate.toFixed(2)}/hr` },
        { label: 'Rate Variance', value: fmtPct(pct) },
      ];
    }
    case 'generic':
    default:
      return [
        { label: 'Cost Variance', value: fmtCurrency(costVar) },
        { label: 'Actual Hours', value: fmtHours(m.actualHours * scale) },
      ];
  }
};

export const TopVarianceDrivers: React.FC<TopVarianceDriversProps> = ({
  drivers,
  metrics,
  hotelNameById,
  additiveScale = 1,
}) => {
  const maxImpact = Math.max(...drivers.map((d) => d.impact));
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const breakdownsByDriver = useMemo(() => {
    return drivers.map((driver) => {
      const key = classifyDriver(driver.category);
      const weighted = metrics
        .map((m) => ({ m, w: computeWeight(key, m) }))
        .filter((x) => x.w > 0);
      const totalWeight = weighted.reduce((s, x) => s + x.w, 0);
      if (totalWeight === 0) return [] as HotelBreakdownRow[];
      const rows: HotelBreakdownRow[] = weighted.map(({ m, w }) => ({
        hotelId: m.hotelId,
        hotelName: hotelNameById.get(m.hotelId) ?? m.hotelId,
        amount: (w / totalWeight) * driver.impact,
        metrics: buildSupportingMetrics(key, m, additiveScale),
      }));
      rows.sort((a, b) => b.amount - a.amount);
      return rows;
    });
  }, [drivers, metrics, hotelNameById, additiveScale]);

  return (
    <div className="metric-card">
      <div className="divide-y divide-gray-100">
        {drivers.map((driver, index) => {
          const barWidth = (driver.impact / maxImpact) * 100;
          const breakdown = breakdownsByDriver[index];
          const isOpen = openIndex === index;
          return (
            <div key={index} className="py-3 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => setOpenIndex((cur) => (cur === index ? null : index))}
                aria-expanded={isOpen}
                className="w-full text-left focus:outline-none focus:ring-2 focus:ring-teal rounded-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange/10 text-orange flex-shrink-0">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-navy truncate">
                        <span className="text-gray-400 mr-1.5 tabular-nums">#{index + 1}</span>
                        <span>{driver.category}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">{driver.description}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-slate-navy tabular-nums">
                      ${(driver.impact / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500 tabular-nums">{driver.percentage}%</div>
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange to-orange-light h-full rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 ml-7 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Properties driving {driver.category}
                    </div>
                    <div className="text-xs font-semibold text-gray-700 tabular-nums flex-shrink-0">
                      {fmtCurrency(driver.impact)} total
                    </div>
                  </div>
                  {breakdown.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No property-level breakdown available for the current selection.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {breakdown.map((row) => {
                        const sharePct = driver.impact > 0 ? (row.amount / driver.impact) * 100 : 0;
                        return (
                          <li key={row.hotelId} className="py-2 first:pt-0 last:pb-0">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-slate-navy truncate">
                                {row.hotelName}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-semibold text-slate-navy tabular-nums">
                                  {fmtCurrency(row.amount)}
                                </div>
                                <div className="text-[11px] text-gray-500 tabular-nums">
                                  {sharePct.toFixed(0)}% of driver
                                </div>
                              </div>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                              {row.metrics.map((sm) => (
                                <div key={sm.label} className="text-[11px] text-gray-600">
                                  <span className="text-gray-400">{sm.label}: </span>
                                  <span className="font-medium text-slate-navy tabular-nums">{sm.value}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-1.5 h-1 bg-gray-100 rounded">
                              <div
                                className="h-1 bg-gradient-to-r from-orange to-orange-light rounded"
                                style={{ width: `${sharePct}%` }}
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
        })}
      </div>
    </div>
  );
};

export default TopVarianceDrivers;
