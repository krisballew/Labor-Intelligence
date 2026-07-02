import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Clock,
  DollarSign,
  Gauge,
  TrendingDown,
  TrendingUp,
  UserX,
} from 'lucide-react';
import { Currency, Percentage, SectionPanel } from '../ui/Card';
import { Hotel, LaborMetrics } from '../../types';

type PeriodFilter = 'previous-month' | 'current-month' | 'ytd';

interface PaceAndPerformanceProps {
  metrics: LaborMetrics[];
  hotels: Hotel[];
  period: PeriodFilter;
  periodScale: number;
}

interface MetricRow {
  metric: string;
  yesterdayActual: string;
  todayForecast: string;
  sevenDayPace: string;
  budget: string;
  variance: string;
  status: string;
  statusTone: 'good' | 'watch' | 'bad';
}

interface DepartmentRow {
  department: string;
  demandDriver: string;
  actualLaborHours: number;
  productivity: number;
  target: number;
  variance: number;
  keyIssue: string;
  recommendedAction: string;
}

type PacePerspective = 'weekly' | 'monthly' | 'ytd';

interface PaceChartPoint {
  label: string;
  budget: number;
  actual: number | null;
  projected: number;
  priorYear: number | null;
}

interface PaceChartModel {
  title: string;
  subtitle: string;
  points: PaceChartPoint[];
  actualToDate: number;
  projectedTotal: number;
  budgetTotal: number;
  priorYearTotal: number | null;
  assumptionLabel: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const badgeTone: Record<MetricRow['statusTone'], string> = {
  good: 'bg-emerald-100 text-emerald-700',
  watch: 'bg-amber-100 text-amber-700',
  bad: 'bg-red-100 text-red-700',
};

const formatSigned = (n: number, suffix = '', digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}${suffix}`;

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function hash01(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash ^ input.charCodeAt(i)) * 16777619;
    hash >>>= 0;
  }
  return (hash % 10000) / 10000;
}

function buildCumulativeSeries(
  labels: string[],
  elapsedPoints: number,
  actualToDate: number,
  projectedTotal: number,
  budgetTotal: number,
  priorYearTotal: number | null,
): PaceChartPoint[] {
  const totalPoints = labels.length;
  const safeElapsed = clamp(elapsedPoints, 1, totalPoints);
  const projectedRemaining = Math.max(projectedTotal - actualToDate, 0);
  const priorYearStep = priorYearTotal !== null ? priorYearTotal / totalPoints : null;

  return labels.map((label, idx) => {
    const pointNumber = idx + 1;
    const budget = (budgetTotal * pointNumber) / totalPoints;
    const priorYear = priorYearStep !== null ? priorYearStep * pointNumber : null;

    if (pointNumber <= safeElapsed) {
      return {
        label,
        budget,
        actual: (actualToDate * pointNumber) / safeElapsed,
        projected: (actualToDate * pointNumber) / safeElapsed,
        priorYear,
      };
    }

    const futurePoints = Math.max(totalPoints - safeElapsed, 1);
    const projected = actualToDate + (projectedRemaining * (pointNumber - safeElapsed)) / futurePoints;

    return {
      label,
      budget,
      actual: null,
      projected,
      priorYear,
    };
  });
}

function buildPolyline(
  points: PaceChartPoint[],
  selector: (point: PaceChartPoint) => number | null,
  width: number,
  height: number,
  padX: number,
  padY: number,
  maxValue: number,
): string {
  const innerWidth = width - (padX * 2);
  const innerHeight = height - (padY * 2);

  return points
    .map((point, idx) => {
      const value = selector(point);
      if (value === null) return null;
      const x = padX + (innerWidth * idx) / Math.max(points.length - 1, 1);
      const y = padY + innerHeight - ((value / Math.max(maxValue, 1)) * innerHeight);
      return `${x},${y}`;
    })
    .filter((value): value is string => value !== null)
    .join(' ');
}

const PaceProjectionChart: React.FC<{
  chart: PaceChartModel;
  perspective: PacePerspective;
  onPerspectiveChange: (perspective: PacePerspective) => void;
}> = ({ chart, perspective, onPerspectiveChange }) => {
  const width = 980;
  const height = 380;
  const padX = 56;
  const padY = 24;
  const maxValue = Math.max(
    ...chart.points.flatMap((point) => [point.budget, point.projected, point.actual ?? 0, point.priorYear ?? 0]),
    1,
  );
  const tickValues = Array.from({ length: 5 }, (_, idx) => Math.round((maxValue * (4 - idx)) / 4));
  const budgetLine = buildPolyline(chart.points, (point) => point.budget, width, height, padX, padY, maxValue);
  const actualLine = buildPolyline(chart.points, (point) => point.actual, width, height, padX, padY, maxValue);
  const projectedLine = buildPolyline(chart.points, (point) => point.projected, width, height, padX, padY, maxValue);
  const priorYearLine = chart.priorYearTotal !== null
    ? buildPolyline(chart.points, (point) => point.priorYear, width, height, padX, padY, maxValue)
    : '';

  return (
    <SectionPanel
      title="Pace Projection Curve"
      icon={<TrendingUp className="w-5 h-5" />}
      subtitle={chart.subtitle}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
          {(['weekly', 'monthly', 'ytd'] as PacePerspective[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onPerspectiveChange(option)}
              className={`px-3.5 py-2 text-xs rounded-md font-medium ${
                perspective === option ? 'bg-slate-100 text-slate-navy shadow-sm' : 'text-gray-600 hover:text-slate-navy'
              }`}
            >
              {option === 'ytd' ? 'Year to Date' : option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1"><span className="w-4 h-0.5 bg-indigo-600 inline-block" />Budget</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"><span className="w-4 h-0.5 bg-slate-navy inline-block" />Actual to date</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange/20 bg-orange/10 px-2.5 py-1"><span className="w-4 h-0.5 bg-orange inline-block" />Projected finish</span>
          {chart.priorYearTotal !== null && (
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1"><span className="w-4 h-0.5 bg-gray-400 inline-block" />Prior year actual</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-base font-semibold text-slate-navy">{chart.title}</div>
            <div className="text-sm text-gray-500 mt-1 max-w-3xl">{chart.assumptionLabel}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs tabular-nums w-full xl:w-auto">
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="text-gray-500">Actual to Date</div>
              <div className="mt-1 font-semibold text-slate-navy">{Math.round(chart.actualToDate).toLocaleString()} hrs</div>
            </div>
            <div className="rounded-lg border border-orange/20 bg-white px-3 py-2">
              <div className="text-gray-500">Projected Finish</div>
              <div className="mt-1 font-semibold text-orange">{Math.round(chart.projectedTotal).toLocaleString()} hrs</div>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2">
              <div className="text-gray-500">Budget</div>
              <div className="mt-1 font-semibold text-indigo-600">{Math.round(chart.budgetTotal).toLocaleString()} hrs</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="text-gray-500">Projected Variance</div>
              <div className={`mt-1 font-semibold ${chart.projectedTotal > chart.budgetTotal ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatSigned(chart.projectedTotal - chart.budgetTotal, '', 0)} hrs
              </div>
            </div>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {tickValues.map((value, idx) => {
            const y = padY + ((height - (padY * 2)) * idx) / 4;
            return (
              <g key={value + idx}>
                <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#dbe3ee" strokeWidth={1.25} />
                <text x={padX - 10} y={y + 4} textAnchor="end" fontSize={11} className="fill-gray-500">
                  {Math.round(value).toLocaleString()}
                </text>
              </g>
            );
          })}

          {chart.points.map((point, idx) => {
            const x = padX + ((width - (padX * 2)) * idx) / Math.max(chart.points.length - 1, 1);
            const showTick = chart.points.length <= 12 || idx === 0 || idx === chart.points.length - 1 || idx % Math.ceil(chart.points.length / 6) === 0;
            return (
              <g key={point.label}>
                <line x1={x} y1={padY} x2={x} y2={height - padY} stroke="#f4f7fb" strokeWidth={1} />
                {showTick && (
                  <text x={x} y={height - 4} textAnchor="middle" fontSize={11} className="fill-gray-600 font-medium">
                    {point.label}
                  </text>
                )}
              </g>
            );
          })}

          {priorYearLine && (
            <polyline
              fill="none"
              stroke="#9ca3af"
              strokeWidth={2.5}
              strokeDasharray="6 5"
              points={priorYearLine}
            />
          )}
          <polyline fill="none" stroke="#4f46e5" strokeWidth={3.5} points={budgetLine} />
          <polyline fill="none" stroke="#0d3b66" strokeWidth={4} points={actualLine} />
          <polyline fill="none" stroke="#ea580c" strokeWidth={4} strokeDasharray="8 5" points={projectedLine} />

          {chart.points.map((point, idx) => {
            const x = padX + ((width - (padX * 2)) * idx) / Math.max(chart.points.length - 1, 1);
            const projectedY = padY + (height - (padY * 2)) - ((point.projected / Math.max(maxValue, 1)) * (height - (padY * 2)));
            const actualY = point.actual === null
              ? null
              : padY + (height - (padY * 2)) - ((point.actual / Math.max(maxValue, 1)) * (height - (padY * 2)));
            return (
              <g key={`${point.label}-markers`}>
                <circle cx={x} cy={projectedY} r={4.5} fill="#ffffff" stroke="#ea580c" strokeWidth={2.5} />
                {actualY !== null && <circle cx={x} cy={actualY} r={4} fill="#0d3b66" stroke="#ffffff" strokeWidth={1.5} />}
              </g>
            );
          })}
        </svg>
      </div>
    </SectionPanel>
  );
};

const PaceAndPerformance: React.FC<PaceAndPerformanceProps> = ({
  metrics,
  hotels,
  period,
  periodScale,
}) => {
  const [pacePerspective, setPacePerspective] = useState<PacePerspective>('monthly');
  const model = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIdx = now.getMonth();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const startOfYear = new Date(year, 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
    const daysInYear = new Date(year, 11, 31).getDate() + 365;
    const weekdayIndex = ((now.getDay() + 6) % 7) + 1;

    const selectedHotels = hotels.filter((h) => metrics.some((m) => m.hotelId === h.id));
    const roomSupply = selectedHotels.reduce((sum, h) => sum + h.roomCount, 0);

    const actualHours = metrics.reduce((s, m) => s + m.actualHours, 0) * periodScale;
    const forecastHours = metrics.reduce((s, m) => s + m.forecastedHours, 0) * periodScale;
    const scheduledHours = metrics.reduce((s, m) => s + m.scheduledHours, 0) * periodScale;
    const budgetHours = metrics.reduce((s, m) => s + m.budgetedHours, 0) * periodScale;

    const actualCost = metrics.reduce((s, m) => s + m.actualCost, 0) * periodScale;
    const budgetCost = metrics.reduce((s, m) => s + m.budgetedCost, 0) * periodScale;
    const overtimeHours = metrics.reduce((s, m) => s + m.actualOvertimeHours, 0) * periodScale;
    const remainingMonthDays = Math.max(daysInMonth - dayOfMonth, 0);
    const remainingProjectedHours = Math.max(Math.max(forecastHours, scheduledHours) - actualHours, 0);
    const projectedMonthHours = actualHours + remainingProjectedHours;

    const avgAdr = roomSupply > 0
      ? selectedHotels.reduce((s, h) => s + (145 + h.roomCount * 0.15), 0) / selectedHotels.length
      : 170;

    const forecastOcc = clamp(70 + ((forecastHours - budgetHours) / Math.max(budgetHours, 1)) * 16, 50, 95);
    const actualOcc = clamp(
      forecastOcc + ((actualHours - forecastHours) / Math.max(forecastHours, 1)) * 14,
      45,
      98,
    );
    const budgetOcc = clamp(
      forecastOcc - ((forecastHours - budgetHours) / Math.max(budgetHours, 1)) * 8,
      45,
      95,
    );

    const roomsActual = Math.round(roomSupply * (actualOcc / 100));
    const roomsForecast = Math.round(roomSupply * (forecastOcc / 100));
    const roomsBudget = Math.round(roomSupply * (budgetOcc / 100));

    const arrivalsForecast = Math.round(roomsForecast * 0.47);
    const arrivalsActual = Math.round(arrivalsForecast * (1 + ((actualOcc - forecastOcc) / 100)));
    const arrivalsBudget = Math.round(roomsBudget * 0.46);

    const departuresForecast = Math.round(roomsForecast * 0.44);
    const departuresActual = Math.round(departuresForecast * (1 + ((actualOcc - forecastOcc) / 140)));
    const departuresBudget = Math.round(roomsBudget * 0.45);

    const sevenDayOcc = ((actualOcc * 3) + (forecastOcc * 4)) / 7;
    const sevenDayRooms = Math.round(((roomsActual * 3) + (roomsForecast * 4)));
    const sevenDayArrivals = Math.round(((arrivalsActual * 3) + (arrivalsForecast * 4)));
    const sevenDayDepartures = Math.round(((departuresActual * 3) + (departuresForecast * 4)));

    const sevenDayHours = ((actualHours * 3) + (forecastHours * 4));
    const sevenDayBudgetHours = budgetHours * 7;
    const sevenDayCost = ((actualCost * 3) + ((actualCost / Math.max(actualHours, 1)) * forecastHours * 4));
    const sevenDayBudgetCost = budgetCost * 7;

    const revenueYesterday = roomsActual * avgAdr;
    const revenuePace = sevenDayRooms * avgAdr;

    const laborCostPctRevenueActual = revenueYesterday > 0 ? (actualCost / revenueYesterday) * 100 : 0;
    const laborCostPctRevenueBudget = revenueYesterday > 0 ? (budgetCost / revenueYesterday) * 100 : 0;
    const laborCostPctRevenuePace = revenuePace > 0 ? (sevenDayCost / revenuePace) * 100 : 0;

    const productivityActual = actualHours / Math.max(roomsActual, 1);
    const productivityTarget = budgetHours / Math.max(roomsBudget, 1);
    const productivityPace = sevenDayHours / Math.max(sevenDayRooms, 1);

    const scheduleCoverageActual = forecastHours > 0 ? (scheduledHours / forecastHours) * 100 : 0;
    const scheduleCoverageBudget = 98;
    const scheduleCoveragePace = scheduleCoverageActual - 0.6;

    const callOffsActual = Math.round(
      selectedHotels.reduce((sum, h) => sum + (2 + hash01(`${h.id}|calloff`) * 4), 0) * (period === 'ytd' ? 5 : 1),
    );
    const callOffsPace = Math.round(callOffsActual * 0.75);
    const callOffsBudget = Math.round(selectedHotels.length * (period === 'ytd' ? 6 : 1.4));

    const summaryCards = [
      {
        label: 'Labor Cost Variance',
        value: actualCost - budgetCost,
        helper: `${formatSigned(((actualCost - budgetCost) / Math.max(budgetCost, 1)) * 100, '%')} vs budget`,
        icon: <DollarSign className="w-5 h-5" />,
        tone: actualCost > budgetCost ? 'bad' : 'good',
      },
      {
        label: 'Overtime Risk',
        value: overtimeHours,
        helper: overtimeHours > 220 ? 'High' : overtimeHours > 140 ? 'Watch' : 'Stable',
        icon: <Clock className="w-5 h-5" />,
        tone: overtimeHours > 220 ? 'bad' : overtimeHours > 140 ? 'watch' : 'good',
      },
      {
        label: 'Schedule Coverage',
        value: scheduleCoverageActual,
        helper: `${formatSigned(scheduleCoverageActual - scheduleCoverageBudget, ' pts')} vs target`,
        icon: <CalendarClock className="w-5 h-5" />,
        tone: scheduleCoverageActual >= 98 ? 'good' : scheduleCoverageActual >= 94 ? 'watch' : 'bad',
      },
      {
        label: 'Forecast Occupancy',
        value: forecastOcc,
        helper: `Actual ${actualOcc.toFixed(1)}%`,
        icon: <Gauge className="w-5 h-5" />,
        tone: Math.abs(actualOcc - forecastOcc) <= 1.5 ? 'good' : 'watch',
      },
      {
        label: 'Productivity Gap',
        value: ((productivityTarget - productivityActual) / Math.max(productivityTarget, 0.001)) * 100,
        helper: `${productivityActual.toFixed(2)} hrs / occ room`,
        icon: <Activity className="w-5 h-5" />,
        tone: productivityActual <= productivityTarget ? 'good' : 'bad',
      },
    ] as const;

    const metricRows: MetricRow[] = [
      {
        metric: 'Occupancy %',
        yesterdayActual: `${actualOcc.toFixed(1)}%`,
        todayForecast: `${forecastOcc.toFixed(1)}%`,
        sevenDayPace: `${sevenDayOcc.toFixed(1)}%`,
        budget: `${budgetOcc.toFixed(1)}%`,
        variance: `${formatSigned(sevenDayOcc - budgetOcc, ' pts')}`,
        status: Math.abs(sevenDayOcc - budgetOcc) <= 1.2 ? 'On pace' : sevenDayOcc > budgetOcc ? 'High demand' : 'Soft demand',
        statusTone: Math.abs(sevenDayOcc - budgetOcc) <= 1.2 ? 'good' : 'watch',
      },
      {
        metric: 'Rooms Occupied',
        yesterdayActual: roomsActual.toLocaleString(),
        todayForecast: roomsForecast.toLocaleString(),
        sevenDayPace: sevenDayRooms.toLocaleString(),
        budget: (roomsBudget * 7).toLocaleString(),
        variance: formatSigned(sevenDayRooms - roomsBudget * 7, '', 0),
        status: sevenDayRooms > roomsBudget * 7 ? 'High demand' : 'On pace',
        statusTone: sevenDayRooms > roomsBudget * 7 ? 'watch' : 'good',
      },
      {
        metric: 'Arrivals',
        yesterdayActual: arrivalsActual.toLocaleString(),
        todayForecast: arrivalsForecast.toLocaleString(),
        sevenDayPace: sevenDayArrivals.toLocaleString(),
        budget: (arrivalsBudget * 7).toLocaleString(),
        variance: formatSigned(sevenDayArrivals - arrivalsBudget * 7, '', 0),
        status: sevenDayArrivals > arrivalsBudget * 7 ? 'Watch staffing' : 'On pace',
        statusTone: sevenDayArrivals > arrivalsBudget * 7 ? 'watch' : 'good',
      },
      {
        metric: 'Departures',
        yesterdayActual: departuresActual.toLocaleString(),
        todayForecast: departuresForecast.toLocaleString(),
        sevenDayPace: sevenDayDepartures.toLocaleString(),
        budget: (departuresBudget * 7).toLocaleString(),
        variance: formatSigned(sevenDayDepartures - departuresBudget * 7, '', 0),
        status: 'On pace',
        statusTone: 'good',
      },
      {
        metric: 'Labor Hours',
        yesterdayActual: Math.round(actualHours).toLocaleString(),
        todayForecast: Math.round(forecastHours).toLocaleString(),
        sevenDayPace: Math.round(sevenDayHours).toLocaleString(),
        budget: Math.round(sevenDayBudgetHours).toLocaleString(),
        variance: formatSigned(sevenDayHours - sevenDayBudgetHours, '', 0),
        status: sevenDayHours > sevenDayBudgetHours ? 'Over budget' : 'On pace',
        statusTone: sevenDayHours > sevenDayBudgetHours ? 'bad' : 'good',
      },
      {
        metric: 'Labor Cost',
        yesterdayActual: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(actualCost),
        todayForecast: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((actualCost / Math.max(actualHours, 1)) * forecastHours),
        sevenDayPace: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(sevenDayCost),
        budget: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(sevenDayBudgetCost),
        variance: `${formatSigned(sevenDayCost - sevenDayBudgetCost, '', 0)}`,
        status: sevenDayCost > sevenDayBudgetCost ? 'Over budget' : 'On pace',
        statusTone: sevenDayCost > sevenDayBudgetCost ? 'bad' : 'good',
      },
      {
        metric: 'Labor Cost % of Revenue',
        yesterdayActual: `${laborCostPctRevenueActual.toFixed(1)}%`,
        todayForecast: `${(laborCostPctRevenueActual + 0.3).toFixed(1)}%`,
        sevenDayPace: `${laborCostPctRevenuePace.toFixed(1)}%`,
        budget: `${laborCostPctRevenueBudget.toFixed(1)}%`,
        variance: `${formatSigned(laborCostPctRevenuePace - laborCostPctRevenueBudget, ' pts')}`,
        status: laborCostPctRevenuePace > laborCostPctRevenueBudget + 1 ? 'Needs action' : 'Watch',
        statusTone: laborCostPctRevenuePace > laborCostPctRevenueBudget + 1 ? 'bad' : 'watch',
      },
      {
        metric: 'Productivity',
        yesterdayActual: `${productivityActual.toFixed(2)} hrs / occupied room`,
        todayForecast: `${(productivityActual + 0.01).toFixed(2)}`,
        sevenDayPace: `${productivityPace.toFixed(2)}`,
        budget: `${productivityTarget.toFixed(2)}`,
        variance: `${formatSigned(productivityPace - productivityTarget, '', 2)}`,
        status: productivityPace > productivityTarget ? 'Below target' : 'On target',
        statusTone: productivityPace > productivityTarget ? 'bad' : 'good',
      },
      {
        metric: 'Overtime Hours',
        yesterdayActual: Math.round(overtimeHours).toLocaleString(),
        todayForecast: Math.round(overtimeHours * 1.12).toLocaleString(),
        sevenDayPace: Math.round(overtimeHours * 7.2).toLocaleString(),
        budget: Math.round(overtimeHours * 5.1).toLocaleString(),
        variance: formatSigned(overtimeHours * 2.1, '', 0),
        status: overtimeHours > 220 ? 'Critical' : 'Watch',
        statusTone: overtimeHours > 220 ? 'bad' : 'watch',
      },
      {
        metric: 'Schedule Coverage',
        yesterdayActual: `${scheduleCoverageActual.toFixed(1)}%`,
        todayForecast: `${(scheduleCoverageActual - 0.8).toFixed(1)}%`,
        sevenDayPace: `${scheduleCoveragePace.toFixed(1)}%`,
        budget: `${scheduleCoverageBudget.toFixed(1)}%`,
        variance: `${formatSigned(scheduleCoveragePace - scheduleCoverageBudget, ' pts')}`,
        status: scheduleCoveragePace < 95 ? 'Under-covered' : 'On pace',
        statusTone: scheduleCoveragePace < 95 ? 'bad' : 'good',
      },
      {
        metric: 'Call-Offs',
        yesterdayActual: callOffsActual.toLocaleString(),
        todayForecast: '—',
        sevenDayPace: callOffsPace.toLocaleString(),
        budget: callOffsBudget.toLocaleString(),
        variance: formatSigned(callOffsPace - callOffsBudget, '', 0),
        status: callOffsPace > callOffsBudget ? 'High risk' : 'On pace',
        statusTone: callOffsPace > callOffsBudget ? 'bad' : 'good',
      },
    ];

    const departmentRows: DepartmentRow[] = [
      {
        department: 'Housekeeping',
        demandDriver: `${roomsForecast.toLocaleString()} rooms`,
        actualLaborHours: actualHours * 0.31,
        productivity: (actualHours * 0.31) / Math.max(roomsForecast, 1),
        target: 1.2,
        variance: ((actualHours * 0.31) / Math.max(roomsForecast, 1)) - 1.2,
        keyIssue: 'Overtime and late checkout compression',
        recommendedAction: 'Add PT support and rebalance AM board by floor.',
      },
      {
        department: 'Front Office',
        demandDriver: `${(arrivalsForecast + departuresForecast).toLocaleString()} arr/dep`,
        actualLaborHours: actualHours * 0.11,
        productivity: (arrivalsForecast + departuresForecast) / Math.max(actualHours * 0.11, 1),
        target: 2.5,
        variance: ((arrivalsForecast + departuresForecast) / Math.max(actualHours * 0.11, 1)) - 2.5,
        keyIssue: 'Coverage dips during arrival peaks',
        recommendedAction: 'Shift one PM agent into 3-7 PM arrival window.',
      },
      {
        department: 'F&B Outlet',
        demandDriver: `${Math.round(roomsForecast * 2.9).toLocaleString()} covers`,
        actualLaborHours: actualHours * 0.19,
        productivity: (roomsForecast * 2.9) / Math.max(actualHours * 0.19, 1),
        target: 4.0,
        variance: ((roomsForecast * 2.9) / Math.max(actualHours * 0.19, 1)) - 4,
        keyIssue: 'Section sizing not aligned to shoulder periods',
        recommendedAction: 'Re-size sections and stagger open/close labor.',
      },
      {
        department: 'Banquets',
        demandDriver: `${Math.round(roomsForecast * 1.7).toLocaleString()} covers`,
        actualLaborHours: actualHours * 0.13,
        productivity: (roomsForecast * 1.7) / Math.max(actualHours * 0.13, 1),
        target: 3.25,
        variance: ((roomsForecast * 1.7) / Math.max(actualHours * 0.13, 1)) - 3.25,
        keyIssue: 'Setup overlap driving pre-function overtime',
        recommendedAction: 'Stagger setup crews and lock event sequencing.',
      },
      {
        department: 'Engineering',
        demandDriver: `${Math.round(roomsForecast * 0.24).toLocaleString()} work orders`,
        actualLaborHours: actualHours * 0.08,
        productivity: (roomsForecast * 0.24) / Math.max(actualHours * 0.08, 1),
        target: 0.62,
        variance: ((roomsForecast * 0.24) / Math.max(actualHours * 0.08, 1)) - 0.62,
        keyIssue: 'Preventive work displaced by reactive calls',
        recommendedAction: 'Protect PM blocks during low-demand windows.',
      },
    ];

    const weeklyBudgetHours = budgetHours * (7 / daysInMonth);
    const weeklyActualHours = actualHours * (Math.min(weekdayIndex, dayOfMonth) / Math.max(dayOfMonth, 1));
    const futureDailyHours = remainingMonthDays > 0
      ? (projectedMonthHours - actualHours) / remainingMonthDays
      : actualHours / Math.max(dayOfMonth, 1);
    const weeklyProjectedHours = weeklyActualHours + (futureDailyHours * Math.max(7 - weekdayIndex, 0));

    const performanceRatio = budgetHours > 0 && dayOfMonth > 0
      ? actualHours / Math.max(budgetHours * (dayOfMonth / daysInMonth), 1)
      : 1;
    const seasonality = [0.88, 0.9, 0.94, 0.98, 1.01, 1.04, 1.07, 1.05, 1.01, 0.97, 0.95, 1.1];
    const seasonalTotal = seasonality.reduce((sum, value) => sum + value, 0);
    const annualBudgetHours = budgetHours * 12;
    const annualProjectedHours = projectedMonthHours * 12;
    let ytdActualToDate = 0;
    let ytdProjectedYearEnd = 0;
    let ytdPriorYearTotal: number | null = null;
    seasonality.forEach((weight, idx) => {
      const budgetMonth = (annualBudgetHours * weight) / seasonalTotal;
      const projectedMonth = (annualProjectedHours * weight) / seasonalTotal;
      if (idx < monthIdx) {
        ytdActualToDate += budgetMonth * performanceRatio;
        ytdProjectedYearEnd += projectedMonth;
      } else if (idx === monthIdx) {
        ytdActualToDate += actualHours;
        ytdProjectedYearEnd += projectedMonthHours;
      } else {
        ytdProjectedYearEnd += projectedMonth;
      }
    });

    const paceCharts: Record<PacePerspective, PaceChartModel> = {
      weekly: {
        title: 'Weekly pace vs budget',
        subtitle: 'Current week actual pace plus remaining scheduled / forecast labor projected through week-end',
        points: buildCumulativeSeries(WEEKDAY_ABBR, weekdayIndex, weeklyActualHours, weeklyProjectedHours, weeklyBudgetHours, null),
        actualToDate: weeklyActualHours,
        projectedTotal: weeklyProjectedHours,
        budgetTotal: weeklyBudgetHours,
        priorYearTotal: null,
        assumptionLabel: 'Projection extends this week using remaining scheduled or forecast labor hours as the best estimate of where labor will finish.',
      },
      monthly: {
        title: 'Month pace vs budget',
        subtitle: 'Month-to-date actual labor hours with a forward projection to month-end',
        points: buildCumulativeSeries(
          Array.from({ length: daysInMonth }, (_, idx) => `${idx + 1}`),
          dayOfMonth,
          actualHours,
          projectedMonthHours,
          budgetHours,
          null,
        ),
        actualToDate: actualHours,
        projectedTotal: projectedMonthHours,
        budgetTotal: budgetHours,
        priorYearTotal: null,
        assumptionLabel: 'Actuals are shown through today; the projected tail uses remaining scheduled or forecast labor hours for the rest of the month.',
      },
      ytd: {
        title: 'Year-to-date pace vs budget',
        subtitle: 'Budgeted year labor pace versus current run-rate annualized through year-end',
        points: buildCumulativeSeries(MONTH_ABBR, monthIdx + 1, ytdActualToDate, ytdProjectedYearEnd, annualBudgetHours, ytdPriorYearTotal),
        actualToDate: ytdActualToDate,
        projectedTotal: ytdProjectedYearEnd,
        budgetTotal: annualBudgetHours,
        priorYearTotal: ytdPriorYearTotal,
        assumptionLabel: 'Because prior-year actuals are not present in the current dataset, the YTD curve annualizes current run-rate and remaining projected labor.',
      },
    };

    return {
      summaryCards,
      metricRows,
      departmentRows,
      paceCharts,
      executiveSummary:
        'Labor is pacing above budget for the next 7 days, led by housekeeping overtime, front desk arrival-window coverage gaps, and banquet setup overlap. Occupancy is tracking slightly above plan, but labor hours and labor cost are pacing above target. Immediate actions should focus on overtime compression, shift rebalancing during peak arrivals, and validation of banquet staffing assumptions.',
      flags: [
        { icon: <DollarSign className="w-4 h-4" />, label: 'Over budget labor', detail: '7-day labor cost pace is above budget plan.' },
        { icon: <AlertTriangle className="w-4 h-4" />, label: 'Under-covered shifts', detail: 'Coverage below target during arrivals and event setup.' },
        { icon: <Clock className="w-4 h-4" />, label: 'Overtime risk', detail: 'Overtime is pacing above tolerance thresholds.' },
        { icon: <TrendingDown className="w-4 h-4" />, label: 'Productivity decline', detail: 'Hours per occupied room are above target in core departments.' },
        { icon: <Gauge className="w-4 h-4" />, label: 'Forecast mismatch', detail: 'Labor plan does not fully track expected occupancy and arrivals.' },
        { icon: <UserX className="w-4 h-4" />, label: 'Attendance risk', detail: 'Call-offs are elevated versus expected pace.' },
      ],
    };
  }, [hotels, metrics, period, periodScale]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {model.summaryCards.map((c) => {
          const toneClass = c.tone === 'good' ? 'text-emerald-600' : c.tone === 'watch' ? 'text-amber-600' : 'text-red-600';
          return (
            <div key={c.label} className="metric-card">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-gray-500">{c.label}</div>
                <div className="w-8 h-8 rounded-md bg-gray-50 text-gray-500 flex items-center justify-center">{c.icon}</div>
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-navy tabular-nums">
                {c.label.includes('Cost') ? (
                  <Currency amount={Number(c.value)} />
                ) : c.label.includes('Coverage') || c.label.includes('Occupancy') ? (
                  `${Number(c.value).toFixed(1)}%`
                ) : c.label.includes('Gap') ? (
                  <Percentage value={Number(c.value)} />
                ) : (
                  `${Math.round(Number(c.value)).toLocaleString()} hrs`
                )}
              </div>
              <div className={`mt-1 text-xs ${toneClass}`}>{c.helper}</div>
            </div>
          );
        })}
      </div>

      <SectionPanel
        title="Hotel Workforce Pace & Performance"
        icon={<Activity className="w-5 h-5" />}
        subtitle="Demand, labor, cost, productivity, and attendance pace versus budget"
        flush
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Metric</th>
                <th className="text-right px-4 py-2 font-medium">Yesterday Actual</th>
                <th className="text-right px-4 py-2 font-medium">Today Forecast</th>
                <th className="text-right px-4 py-2 font-medium">7-Day Pace</th>
                <th className="text-right px-4 py-2 font-medium">Budget</th>
                <th className="text-right px-4 py-2 font-medium">Variance</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {model.metricRows.map((row) => (
                <tr key={row.metric} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-800">{row.metric}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{row.yesterdayActual}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{row.todayForecast}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-900 font-medium">{row.sevenDayPace}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">{row.budget}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.variance}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${badgeTone[row.statusTone]}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <div className="space-y-5">
        <PaceProjectionChart
          chart={model.paceCharts[pacePerspective]}
          perspective={pacePerspective}
          onPerspectiveChange={setPacePerspective}
        />

        <SectionPanel
          title="Executive Summary"
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="Plain-language interpretation and variance exceptions"
        >
          <p className="text-sm text-gray-700 leading-relaxed">{model.executiveSummary}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {model.flags.map((flag) => (
              <div key={flag.label} className="rounded-md border border-gray-200 p-2.5 flex items-start gap-2">
                <span className="text-gray-500 mt-0.5">{flag.icon}</span>
                <div>
                  <div className="text-sm font-medium text-slate-navy">{flag.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{flag.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Department Demand, Productivity, and Action Plan"
        icon={<Gauge className="w-5 h-5" />}
        subtitle="Demand forecast + labor + productivity + recommended corrective actions"
        flush
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Department</th>
                <th className="text-left px-4 py-2 font-medium">Demand Forecast</th>
                <th className="text-right px-4 py-2 font-medium">Actual Labor Hours</th>
                <th className="text-right px-4 py-2 font-medium">Productivity</th>
                <th className="text-right px-4 py-2 font-medium">Target</th>
                <th className="text-right px-4 py-2 font-medium">Variance</th>
                <th className="text-left px-4 py-2 font-medium">Key Issue</th>
                <th className="text-left px-4 py-2 font-medium">Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {model.departmentRows.map((row) => (
                <tr key={row.department} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2 font-medium text-gray-800">{row.department}</td>
                  <td className="px-4 py-2 text-gray-700">{row.demandDriver}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-800">{Math.round(row.actualLaborHours).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.productivity.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">{row.target.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <span className={row.variance > 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
                      {formatSigned(row.variance, '', 2)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{row.keyIssue}</td>
                  <td className="px-4 py-2 text-gray-700">{row.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
};

export default PaceAndPerformance;
