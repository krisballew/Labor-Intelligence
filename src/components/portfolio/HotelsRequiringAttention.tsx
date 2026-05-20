import React from 'react';
import { HotelRiskSummary, RiskLevel, RiskTrendStatus } from '../../types';
import { RiskBadge, Currency } from '../ui/Card';
import { ChevronRight, Sparkles, TrendingUp, TrendingDown, Clock3 } from 'lucide-react';

interface HotelsRequiringAttentionProps {
  hotels: HotelRiskSummary[];
}

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

export const HotelsRequiringAttention: React.FC<HotelsRequiringAttentionProps> = ({ hotels }) => {
  return (
    <div className="metric-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider w-12">
              Rank
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">
              Hotel
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">
              Risk Level
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">
              Primary Risk Driver
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">
              Trend
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">
              Labor Variance
            </th>
          </tr>
        </thead>
        <tbody>
          {hotels.map((item, index) => {
            const trendVisual = TREND_VISUALS[item.trend.status];
            const change = changeLabel(item.trend.status, item.trend.changeVsPriorPeriod);
            return (
              <tr
                key={item.hotel.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer align-top"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs tabular-nums">
                    {index + 1}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900">{item.hotel.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.hotel.region}</div>
                </td>
                <td className="py-4 px-4 max-w-xs">
                  <RiskBadge level={item.riskLevel} text={item.riskLevel.replace('-', ' ')} />
                  <div className="text-xs text-gray-500 mt-2 leading-snug">
                    {RISK_LEVEL_DESCRIPTIONS[item.riskLevel]}
                  </div>
                </td>
                <td className="py-4 px-4 max-w-sm">
                  <div className="font-medium text-gray-900">
                    {formatDriverCategory(item.topVarianceDriver.category)}
                    <span className="text-gray-500 font-normal ml-2">
                      ({item.topVarianceDriver.percentage}% of variance)
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{item.topVarianceDriver.description}</div>
                  <div className="text-xs text-gray-500 mt-1 italic">{item.keyInsight}</div>
                </td>
                <td className="py-4 px-4 max-w-xs">
                  <div className={`risk-badge ${trendVisual.badgeClass}`}>
                    {trendVisual.icon}
                    {trendVisual.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{periodsLabel(item.trend.periodsActive)}</div>
                  {change && <div className="text-xs text-gray-600 mt-0.5">{change}</div>}
                  <div className="text-xs text-gray-500 mt-1 leading-snug">{item.trend.note}</div>
                </td>
                <td className="py-4 px-4 text-right whitespace-nowrap">
                  <Currency amount={item.variance} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-6 pt-4 border-t border-gray-200">
        <a href="#" className="text-teal-dark text-sm font-semibold hover:text-teal flex items-center gap-1">
          View full list in details <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

export default HotelsRequiringAttention;
