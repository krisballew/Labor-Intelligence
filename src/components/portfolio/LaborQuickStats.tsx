import React, { useMemo } from 'react';
import { Hotel, LaborQuickStatsSection, QuickStatRow } from '../../types';

export type QuickStatsPeriod = 'previous-month' | 'current-month' | 'ytd';

interface LaborQuickStatsProps {
  hotels: Hotel[];
  statsByHotel: Record<string, LaborQuickStatsSection[]>;
  period?: QuickStatsPeriod;
  selectedIds: string[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PeriodView {
  forecastLabel: string;
  subtitle: string;
  additiveScale: number;
}

function getPeriodView(period: QuickStatsPeriod): PeriodView {
  const now = new Date();
  const m = now.getMonth();
  const prevMonthName = MONTH_NAMES[m === 0 ? 11 : m - 1];
  const currentMonthName = MONTH_NAMES[m];
  const closedMonths = m;
  const remainingMonths = 12 - m;
  const firstForecastMonthName = currentMonthName;
  const rollingLabel = `${closedMonths}+${remainingMonths}`;
  const rollingExplain = `${closedMonths}+${remainingMonths} rolling forecast: Jan–${prevMonthName} actualized, ${firstForecastMonthName}–December still forecasted.`;

  switch (period) {
    case 'previous-month':
      return {
        forecastLabel: rollingLabel,
        subtitle: `${prevMonthName} actuals vs ${prevMonthName} reforecast. ${rollingExplain}`,
        additiveScale: 0.25,
      };
    case 'current-month':
      return {
        forecastLabel: rollingLabel,
        subtitle: `${currentMonthName} month-to-date actuals vs full-month forecast. ${rollingExplain}`,
        additiveScale: 0.15,
      };
    case 'ytd':
    default:
      return {
        forecastLabel: rollingLabel,
        subtitle: `Year-to-date actuals vs the current ${rollingLabel} reforecast. ${rollingExplain}`,
        additiveScale: 1,
      };
  }
}

const SECTION_COLORS: Record<LaborQuickStatsSection['section'], string> = {
  Rooms: 'bg-teal-dark',
  'Food & Beverage': 'bg-orange',
  Outlets: 'bg-orange-light',
  Banquets: 'bg-teal',
  'Kitchen & Stewarding': 'bg-teal-light',
};

function formatValue(row: QuickStatRow, value: number): string {
  const decimals = row.decimals ?? 0;
  switch (row.format) {
    case 'percent':
      return `${value.toFixed(decimals)}%`;
    case 'currency-m':
      return `$${value.toFixed(decimals)}`;
    case 'currency':
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    case 'ratio':
      return value.toFixed(decimals);
    case 'number':
      return value.toLocaleString('en-US');
    default:
      return String(value);
  }
}

function varianceColor(row: QuickStatRow): string {
  if (Math.abs(row.variancePercent) < 0.05) return 'bg-gray-100 text-gray-700';
  const favorable =
    row.direction === 'higher-better' ? row.variancePercent > 0 : row.variancePercent < 0;
  return favorable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
}

const isAdditive = (format: QuickStatRow['format']): boolean =>
  format === 'currency-m' || format === 'number';

function aggregateSections(
  statsByHotel: Record<string, LaborQuickStatsSection[]>,
  hotels: Hotel[],
  selectedIds: string[]
): LaborQuickStatsSection[] {
  const selected = hotels.filter((h) => selectedIds.includes(h.id));
  if (selected.length === 0) return [];
  const totalWeight = selected.reduce((sum, h) => sum + h.roomCount, 0);
  const template = statsByHotel[selected[0].id];

  return template.map((section, sectionIdx) => ({
    section: section.section,
    rows: section.rows.map((row, rowIdx) => {
      let forecast = 0;
      let actual = 0;
      if (isAdditive(row.format)) {
        for (const h of selected) {
          const r = statsByHotel[h.id][sectionIdx].rows[rowIdx];
          forecast += r.forecast;
          actual += r.actual;
        }
      } else {
        for (const h of selected) {
          const r = statsByHotel[h.id][sectionIdx].rows[rowIdx];
          forecast += r.forecast * h.roomCount;
          actual += r.actual * h.roomCount;
        }
        forecast /= totalWeight;
        actual /= totalWeight;
      }
      const variancePercent = forecast === 0 ? 0 : ((actual - forecast) / forecast) * 100;
      return { ...row, forecast, actual, variancePercent };
    }),
  }));
}

export const LaborQuickStats: React.FC<LaborQuickStatsProps> = ({
  hotels,
  statsByHotel,
  period = 'previous-month',
  selectedIds,
}) => {
  const { forecastLabel: label, additiveScale } = useMemo(
    () => getPeriodView(period),
    [period]
  );
  const sections = useMemo(() => {
    const aggregated = aggregateSections(statsByHotel, hotels, selectedIds);
    if (additiveScale === 1) return aggregated;
    return aggregated.map((section) => ({
      section: section.section,
      rows: section.rows.map((row) =>
        isAdditive(row.format)
          ? { ...row, forecast: row.forecast * additiveScale, actual: row.actual * additiveScale }
          : row
      ),
    }));
  }, [statsByHotel, hotels, selectedIds, additiveScale]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-navy">
            Labor Performance Quick Stats
          </h2>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="metric-card text-center text-gray-500 text-sm py-12">
          Select one or more properties to view labor performance.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.section} className="metric-card p-0 overflow-hidden">
              <div
                className={`${SECTION_COLORS[section.section]} text-white text-center py-2 font-semibold text-sm`}
              >
                {section.section}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-3 py-2 font-medium w-1/3">Metric</th>
                    <th className="text-right px-2 py-2 font-medium">{label}</th>
                    <th className="text-right px-2 py-2 font-medium">Act</th>
                    <th className="text-right px-2 py-2 font-medium">+/-</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.label} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-700">{row.label}</td>
                      <td className="px-2 py-2 text-right text-gray-600 tabular-nums">
                        {formatValue(row, row.forecast)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-900 font-medium tabular-nums">
                        {formatValue(row, row.actual)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-medium tabular-nums ${varianceColor(row)}`}
                        >
                          {row.variancePercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LaborQuickStats;
