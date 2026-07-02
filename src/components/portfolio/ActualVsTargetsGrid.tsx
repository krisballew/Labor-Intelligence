import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Hotel, LaborMetrics } from '../../types';
import ExportButton from '../ui/ExportButton';
import CollapseToggle from '../ui/CollapseToggle';
import { HotelLink } from '../ui/HotelSelectionContext';

interface ActualVsTargetsGridProps {
  hotels: Hotel[];
  metrics: LaborMetrics[];
  additiveScale: number;
  periodLabel: string;
  selectedIds: string[];
}

type ComparisonKey = 'budget' | 'forecast' | 'schedule' | 'standards';

interface ComparisonDef {
  key: ComparisonKey;
  label: string;
  required?: boolean;
  accent: string;
}

const COMPARISONS: ComparisonDef[] = [
  { key: 'budget', label: 'Budget', required: true, accent: 'bg-teal-dark text-white' },
  { key: 'forecast', label: 'Forecast', accent: 'bg-emerald-600 text-white' },
  { key: 'schedule', label: 'Schedule', accent: 'bg-blue-600 text-white' },
  { key: 'standards', label: 'Standards', accent: 'bg-indigo-600 text-white' },
];

interface DeptDef {
  name: string;
  share: number; // share of total hours/cost (target side)
  actualBias: number; // -0.20..0.20 over/under spend bias applied to actual share
}

interface DivisionDef {
  name: string;
  departments: DeptDef[];
}

// Total of all department shares across divisions = 1.0
const LABOR_STRUCTURE: DivisionDef[] = [
  {
    name: 'Rooms',
    departments: [
      { name: 'Front Office', share: 0.10, actualBias: 0.04 },
      { name: 'Housekeeping', share: 0.30, actualBias: 0.08 },
      { name: 'Reservations', share: 0.03, actualBias: -0.05 },
    ],
  },
  {
    name: 'Food & Beverage',
    departments: [
      { name: 'Restaurants', share: 0.10, actualBias: 0.06 },
      { name: 'Banquets', share: 0.08, actualBias: -0.03 },
      { name: 'Bars & Lounges', share: 0.04, actualBias: 0.02 },
    ],
  },
  {
    name: 'Kitchen & Stewarding',
    departments: [
      { name: 'Main Kitchen', share: 0.12, actualBias: 0.05 },
      { name: 'Stewarding', share: 0.04, actualBias: 0.10 },
    ],
  },
  {
    name: 'Administrative & General',
    departments: [
      { name: 'Executive Office', share: 0.02, actualBias: -0.02 },
      { name: 'Accounting', share: 0.02, actualBias: 0.0 },
      { name: 'Human Resources', share: 0.01, actualBias: 0.0 },
    ],
  },
  {
    name: 'Sales & Marketing',
    departments: [{ name: 'Sales & Marketing', share: 0.04, actualBias: -0.04 }],
  },
  {
    name: 'Engineering',
    departments: [
      { name: 'Maintenance', share: 0.08, actualBias: 0.03 },
      { name: 'Grounds', share: 0.02, actualBias: 0.0 },
    ],
  },
];

// Normalized actual shares for each leaf (sum to 1)
const NORMALIZED_ACTUAL_SHARES: { division: string; name: string; targetShare: number; actualShare: number }[] = (() => {
  const raw = LABOR_STRUCTURE.flatMap((div) =>
    div.departments.map((d) => ({
      division: div.name,
      name: d.name,
      targetShare: d.share,
      rawActual: d.share * (1 + d.actualBias),
    }))
  );
  const rawTotal = raw.reduce((s, r) => s + r.rawActual, 0);
  return raw.map((r) => ({
    division: r.division,
    name: r.name,
    targetShare: r.targetShare,
    actualShare: r.rawActual / rawTotal,
  }));
})();

interface LeafBreakdown {
  name: string;
  actualHours: number;
  actualCost: number;
  targets: Record<ComparisonKey, { hours: number; cost: number }>;
}

interface DivisionBreakdown {
  name: string;
  actualHours: number;
  actualCost: number;
  targets: Record<ComparisonKey, { hours: number; cost: number }>;
  departments: LeafBreakdown[];
}

function buildBreakdown(row: PropertyRow): DivisionBreakdown[] {
  const leafByDivision = new Map<string, LeafBreakdown[]>();
  for (const leaf of NORMALIZED_ACTUAL_SHARES) {
    const lb: LeafBreakdown = {
      name: leaf.name,
      actualHours: row.actualHours * leaf.actualShare,
      actualCost: row.actualCost * leaf.actualShare,
      targets: {
        budget: {
          hours: row.targets.budget.hours * leaf.targetShare,
          cost: row.targets.budget.cost * leaf.targetShare,
        },
        forecast: {
          hours: row.targets.forecast.hours * leaf.targetShare,
          cost: row.targets.forecast.cost * leaf.targetShare,
        },
        schedule: {
          hours: row.targets.schedule.hours * leaf.targetShare,
          cost: row.targets.schedule.cost * leaf.targetShare,
        },
        standards: {
          hours: row.targets.standards.hours * leaf.targetShare,
          cost: row.targets.standards.cost * leaf.targetShare,
        },
      },
    };
    const arr = leafByDivision.get(leaf.division) ?? [];
    arr.push(lb);
    leafByDivision.set(leaf.division, arr);
  }
  return LABOR_STRUCTURE.map((div) => {
    const departments = leafByDivision.get(div.name) ?? [];
    const agg: DivisionBreakdown = {
      name: div.name,
      actualHours: 0,
      actualCost: 0,
      targets: {
        budget: { hours: 0, cost: 0 },
        forecast: { hours: 0, cost: 0 },
        schedule: { hours: 0, cost: 0 },
        standards: { hours: 0, cost: 0 },
      },
      departments,
    };
    for (const d of departments) {
      agg.actualHours += d.actualHours;
      agg.actualCost += d.actualCost;
      (Object.keys(agg.targets) as ComparisonKey[]).forEach((k) => {
        agg.targets[k].hours += d.targets[k].hours;
        agg.targets[k].cost += d.targets[k].cost;
      });
    }
    return agg;
  });
}

interface PropertyRow {
  hotel: Hotel;
  actualHours: number;
  actualCost: number;
  targets: Record<ComparisonKey, { hours: number; cost: number }>;
}

function buildRows(
  hotels: Hotel[],
  metrics: LaborMetrics[],
  selectedIds: string[],
  scale: number
): PropertyRow[] {
  const metricsById = new Map(metrics.map((m) => [m.hotelId, m]));
  return hotels
    .filter((h) => selectedIds.includes(h.id))
    .map((hotel) => {
      const m = metricsById.get(hotel.id);
      if (!m) {
        const empty = { hours: 0, cost: 0 };
        return {
          hotel,
          actualHours: 0,
          actualCost: 0,
          targets: { budget: empty, forecast: empty, schedule: empty, standards: empty },
        };
      }
      const baseRate = m.actualHours > 0 ? m.actualCost / m.actualHours : 0;
      return {
        hotel,
        actualHours: m.actualHours * scale,
        actualCost: m.actualCost * scale,
        targets: {
          budget: { hours: m.budgetedHours * scale, cost: m.budgetedCost * scale },
          forecast: { hours: m.forecastedHours * scale, cost: m.forecastedCost * scale },
          schedule: {
            hours: m.scheduledHours * scale,
            cost: m.scheduledHours * baseRate * scale,
          },
          standards: {
            hours: m.standardHours * scale,
            cost: m.standardHours * baseRate * scale,
          },
        },
      };
    });
}

const fmtHours = (n: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

const fmtCurrency = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

const varianceClass = (delta: number): string => {
  if (delta > 0) return 'text-orange font-semibold';
  if (delta < 0) return 'text-emerald-600 font-semibold';
  return 'text-gray-500';
};

const fmtSignedHours = (n: number): string => (n > 0 ? '+' : '') + fmtHours(n);

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

export const ActualVsTargetsGrid: React.FC<ActualVsTargetsGridProps> = ({
  hotels,
  metrics,
  additiveScale,
  periodLabel,
  selectedIds,
}) => {
  const [enabledComparisons, setEnabledComparisons] = useState<ComparisonKey[]>(['budget']);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpandedIds((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleComparison = (key: ComparisonKey, required?: boolean) => {
    if (required) return;
    setEnabledComparisons((curr) =>
      curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key]
    );
  };

  const orderedComparisons = useMemo(
    () => COMPARISONS.filter((c) => enabledComparisons.includes(c.key)),
    [enabledComparisons]
  );

  const rows = useMemo(
    () => buildRows(hotels, metrics, selectedIds, additiveScale),
    [hotels, metrics, selectedIds, additiveScale]
  );

  const totals = useMemo(() => {
    const t = {
      actualHours: 0,
      actualCost: 0,
      targets: {
        budget: { hours: 0, cost: 0 },
        forecast: { hours: 0, cost: 0 },
        schedule: { hours: 0, cost: 0 },
        standards: { hours: 0, cost: 0 },
      } as Record<ComparisonKey, { hours: number; cost: number }>,
    };
    for (const r of rows) {
      t.actualHours += r.actualHours;
      t.actualCost += r.actualCost;
      (Object.keys(t.targets) as ComparisonKey[]).forEach((k) => {
        t.targets[k].hours += r.targets[k].hours;
        t.targets[k].cost += r.targets[k].cost;
      });
    }
    return t;
  }, [rows]);

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-navy tracking-tight leading-tight">Actual vs Targets</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Compare actual hours and cost against any combination of targets. Expand a property to drill into divisions and departments.
            <span className="text-gray-400"> · {periodLabel}</span>
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <ExportButton sectionLabel="Actual vs Targets" />
          <CollapseToggle
            collapsed={collapsed}
            onToggle={() => setCollapsed((v) => !v)}
            sectionLabel="Actual vs Targets"
          />
        </div>
      </div>

      {!collapsed && (
        <>

      <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1">
          Compare against:
        </span>
        {COMPARISONS.map((c) => {
          const active = enabledComparisons.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleComparison(c.key, c.required)}
              disabled={c.required}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? `${c.accent} border-transparent`
                  : 'bg-white text-gray-600 border-gray-300 hover:border-teal hover:text-teal-dark'
              } ${c.required ? 'cursor-default opacity-95' : 'cursor-pointer'}`}
              title={c.required ? 'Always included' : active ? 'Click to remove' : 'Click to add'}
            >
              {c.label}
              {c.required && <span className="ml-1 opacity-70">(default)</span>}
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
                Property
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
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={3 + orderedComparisons.length * 4}
                  className="text-center text-sm text-gray-500 py-8"
                >
                  Select at least one property to view comparisons.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isExpanded = expandedIds.has(r.hotel.id);
              const breakdown = isExpanded ? buildBreakdown(r) : null;
              return (
                <React.Fragment key={r.hotel.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 border-r border-gray-100">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(r.hotel.id)}
                          className="mt-0.5 text-gray-500 hover:text-slate-navy focus:outline-none focus:ring-2 focus:ring-teal rounded"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Collapse ${r.hotel.name}` : `Expand ${r.hotel.name}`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <span>
                          <HotelLink hotelId={r.hotel.id} className="block font-medium text-slate-navy">
                            {r.hotel.name}
                          </HotelLink>
                          <span className="block text-xs text-gray-500">{r.hotel.region}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums text-gray-900 whitespace-nowrap">{fmtHours(r.actualHours)}</td>
                    <td className="py-3 px-2 text-right tabular-nums text-gray-900 border-r border-gray-100 whitespace-nowrap">
                      {fmtCurrency(r.actualCost)}
                    </td>
                    {orderedComparisons.map((c) => {
                      const target = r.targets[c.key];
                      const hoursVar = r.actualHours - target.hours;
                      const costVar = r.actualCost - target.cost;
                      return (
                        <React.Fragment key={c.key}>
                          <td className="py-3 px-2 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmtHours(target.hours)}</td>
                          <td className={`py-3 px-2 text-right tabular-nums whitespace-nowrap ${varianceClass(hoursVar)}`}>
                            {fmtSignedHours(hoursVar)}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmtCurrency(target.cost)}</td>
                          <td className={`py-3 px-2 text-right tabular-nums border-r border-gray-100 last:border-r-0 whitespace-nowrap ${varianceClass(costVar)}`}>
                            {fmtSignedCurrency(costVar)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                  {isExpanded && breakdown && breakdown.flatMap((div) => [
                    <tr key={`${r.hotel.id}-div-${div.name}`} className="bg-gray-50/60 border-b border-gray-100">
                      <td className="py-2 px-3 pl-10 border-r border-gray-100">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-navy">
                          {div.name}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-800 text-xs whitespace-nowrap">{fmtHours(div.actualHours)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-800 text-xs border-r border-gray-100 whitespace-nowrap">
                        {fmtCurrency(div.actualCost)}
                      </td>
                      {orderedComparisons.map((c) => {
                        const target = div.targets[c.key];
                        const hoursVar = div.actualHours - target.hours;
                        const costVar = div.actualCost - target.cost;
                        return (
                          <React.Fragment key={c.key}>
                            <td className="py-2 px-2 text-right tabular-nums text-gray-700 text-xs whitespace-nowrap">{fmtHours(target.hours)}</td>
                            <td className={`py-2 px-2 text-right tabular-nums text-xs whitespace-nowrap ${varianceClass(hoursVar)}`}>
                              {fmtSignedHours(hoursVar)}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums text-gray-700 text-xs whitespace-nowrap">{fmtCurrency(target.cost)}</td>
                            <td className={`py-2 px-2 text-right tabular-nums text-xs border-r border-gray-100 last:border-r-0 whitespace-nowrap ${varianceClass(costVar)}`}>
                              {fmtSignedCurrency(costVar)}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>,
                    ...div.departments.map((dept) => (
                      <tr key={`${r.hotel.id}-dept-${div.name}-${dept.name}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 pl-16 border-r border-gray-100">
                          <span className="text-xs text-gray-700">{dept.name}</span>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-gray-700 text-xs whitespace-nowrap">{fmtHours(dept.actualHours)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-gray-700 text-xs border-r border-gray-100 whitespace-nowrap">
                          {fmtCurrency(dept.actualCost)}
                        </td>
                        {orderedComparisons.map((c) => {
                          const target = dept.targets[c.key];
                          const hoursVar = dept.actualHours - target.hours;
                          const costVar = dept.actualCost - target.cost;
                          return (
                            <React.Fragment key={c.key}>
                              <td className="py-2 px-2 text-right tabular-nums text-gray-600 text-xs whitespace-nowrap">{fmtHours(target.hours)}</td>
                              <td className={`py-2 px-2 text-right tabular-nums text-xs whitespace-nowrap ${varianceClass(hoursVar)}`}>
                                {fmtSignedHours(hoursVar)}
                              </td>
                              <td className="py-2 px-2 text-right tabular-nums text-gray-600 text-xs whitespace-nowrap">{fmtCurrency(target.cost)}</td>
                              <td className={`py-2 px-2 text-right tabular-nums text-xs border-r border-gray-100 last:border-r-0 whitespace-nowrap ${varianceClass(costVar)}`}>
                                {fmtSignedCurrency(costVar)}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    )),
                  ])}
                </React.Fragment>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                <td className="py-3 px-3 border-r border-gray-200 text-slate-navy">
                  Totals
                  <div className="text-xs font-normal text-gray-500">{rows.length} properties</div>
                </td>
                <td className="py-3 px-2 text-right tabular-nums text-slate-navy whitespace-nowrap">{fmtHours(totals.actualHours)}</td>
                <td className="py-3 px-2 text-right tabular-nums text-slate-navy border-r border-gray-200 whitespace-nowrap">
                  {fmtCurrency(totals.actualCost)}
                </td>
                {orderedComparisons.map((c) => {
                  const t = totals.targets[c.key];
                  const hoursVar = totals.actualHours - t.hours;
                  const costVar = totals.actualCost - t.cost;
                  return (
                    <React.Fragment key={c.key}>
                      <td className="py-3 px-2 text-right tabular-nums text-slate-navy whitespace-nowrap">{fmtHours(t.hours)}</td>
                      <td className={`py-3 px-2 text-right tabular-nums whitespace-nowrap ${varianceClass(hoursVar)}`}>
                        {fmtSignedHours(hoursVar)}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-slate-navy whitespace-nowrap">{fmtCurrency(t.cost)}</td>
                      <td className={`py-3 px-2 text-right tabular-nums border-r border-gray-200 last:border-r-0 whitespace-nowrap ${varianceClass(costVar)}`}>
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

        </>
      )}
    </section>
  );
};

export default ActualVsTargetsGrid;
