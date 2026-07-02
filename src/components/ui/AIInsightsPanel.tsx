import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X, Send, Loader2, Lightbulb, RefreshCw } from 'lucide-react';
import { Hotel, LaborMetrics } from '../../types';

export interface AIInsightsContext {
  activeModule: string;
  moduleLabel: string;
  periodLabel: string;
  periodScale: number;
  hotels: Hotel[];
  selectedHotels: Hotel[];
  metrics: LaborMetrics[];
  riskCounts: { onTrack: number; caution: number; atRisk: number };
}

interface AIInsightsPanelProps {
  open: boolean;
  onClose: () => void;
  context: AIInsightsContext;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
}

// ---------- Derived analytics helpers ----------

interface DerivedSummary {
  totalActualHours: number;
  totalBudgetHours: number;
  totalScheduledHours: number;
  totalForecastHours: number;
  totalActualCost: number;
  totalBudgetCost: number;
  totalForecastCost: number;
  totalStandardHours: number;
  totalOtHours: number;
  totalOtCost: number;
  hoursVariance: number;
  hoursVariancePct: number;
  scheduledHoursVariance: number;
  scheduledHoursVariancePct: number;
  forecastHoursVariance: number;
  forecastHoursVariancePct: number;
  costVariance: number;
  costVariancePct: number;
  stdVariance: number;
  stdVariancePct: number;
  otRate: number;
  perHotel: HotelDerived[];
  topOverBudget: HotelDerived | null;
  topUnderBudget: HotelDerived | null;
  topOt: HotelDerived | null;
  topStdMiss: HotelDerived | null;
  topScheduleGap: HotelDerived | null;
  topForecastGap: HotelDerived | null;
}

interface HotelDerived {
  hotel: Hotel;
  actualHours: number;
  budgetHours: number;
  scheduledHours: number;
  forecastHours: number;
  actualCost: number;
  budgetCost: number;
  forecastCost: number;
  standardHours: number;
  otHours: number;
  otCost: number;
  costVariance: number;
  costVariancePct: number;
  hoursVariance: number;
  scheduledVariance: number;
  scheduledVariancePct: number;
  forecastVariance: number;
  forecastVariancePct: number;
  stdVariance: number;
}

function getScopeLabels(ctx: AIInsightsContext) {
  const singleProperty = ctx.selectedHotels.length === 1;
  const propertyName = ctx.selectedHotels[0]?.name ?? 'selected property';
  return {
    singleProperty,
    subjectLabel: singleProperty ? propertyName : 'portfolio',
    subjectNoun: singleProperty ? 'property' : 'properties',
    subjectSingular: singleProperty ? 'property' : 'property',
    selectedLabel: singleProperty ? 'this property' : 'this portfolio',
  };
}

function buildSummary(ctx: AIInsightsContext): DerivedSummary {
  const s = ctx.periodScale;
  const perHotel: HotelDerived[] = [];
  for (const m of ctx.metrics) {
    const hotel = ctx.hotels.find((h) => h.id === m.hotelId);
    if (!hotel) continue;
    const actualHours = m.actualHours * s;
    const budgetHours = m.budgetedHours * s;
    const scheduledHours = m.scheduledHours * s;
    const forecastHours = m.forecastedHours * s;
    const actualCost = m.actualCost * s;
    const budgetCost = m.budgetedCost * s;
    const forecastCost = m.forecastedCost * s;
    const standardHours = m.standardHours * s;
    const otHours = m.actualOvertimeHours * s;
    const blendedRate = m.actualHours > 0 ? m.actualCost / m.actualHours : 0;
    const otCost = otHours * blendedRate * 1.5;
    perHotel.push({
      hotel,
      actualHours,
      budgetHours,
      scheduledHours,
      forecastHours,
      actualCost,
      budgetCost,
      forecastCost,
      standardHours,
      otHours,
      otCost,
      costVariance: actualCost - budgetCost,
      costVariancePct: budgetCost > 0 ? ((actualCost - budgetCost) / budgetCost) * 100 : 0,
      hoursVariance: actualHours - budgetHours,
      scheduledVariance: actualHours - scheduledHours,
      scheduledVariancePct: scheduledHours > 0 ? ((actualHours - scheduledHours) / scheduledHours) * 100 : 0,
      forecastVariance: actualHours - forecastHours,
      forecastVariancePct: forecastHours > 0 ? ((actualHours - forecastHours) / forecastHours) * 100 : 0,
      stdVariance: actualHours - standardHours,
    });
  }

  const sum = (sel: (h: HotelDerived) => number) => perHotel.reduce((acc, h) => acc + sel(h), 0);
  const totalActualHours = sum((h) => h.actualHours);
  const totalBudgetHours = sum((h) => h.budgetHours);
  const totalScheduledHours = sum((h) => h.scheduledHours);
  const totalForecastHours = sum((h) => h.forecastHours);
  const totalActualCost = sum((h) => h.actualCost);
  const totalBudgetCost = sum((h) => h.budgetCost);
  const totalForecastCost = sum((h) => h.forecastCost);
  const totalStandardHours = sum((h) => h.standardHours);
  const totalOtHours = sum((h) => h.otHours);
  const totalOtCost = sum((h) => h.otCost);

  const hoursVariance = totalActualHours - totalBudgetHours;
  const scheduledHoursVariance = totalActualHours - totalScheduledHours;
  const forecastHoursVariance = totalActualHours - totalForecastHours;
  const costVariance = totalActualCost - totalBudgetCost;
  const stdVariance = totalActualHours - totalStandardHours;

  const topOverBudget = [...perHotel].sort((a, b) => b.costVariance - a.costVariance)[0] ?? null;
  const topUnderBudget = [...perHotel].sort((a, b) => a.costVariance - b.costVariance)[0] ?? null;
  const topOt = [...perHotel].sort((a, b) => b.otCost - a.otCost)[0] ?? null;
  const topStdMiss = [...perHotel].sort((a, b) => b.stdVariance - a.stdVariance)[0] ?? null;
  const topScheduleGap = [...perHotel].sort((a, b) => Math.abs(b.scheduledVariance) - Math.abs(a.scheduledVariance))[0] ?? null;
  const topForecastGap = [...perHotel].sort((a, b) => Math.abs(b.forecastVariance) - Math.abs(a.forecastVariance))[0] ?? null;

  return {
    totalActualHours,
    totalBudgetHours,
    totalScheduledHours,
    totalForecastHours,
    totalActualCost,
    totalBudgetCost,
    totalForecastCost,
    totalStandardHours,
    totalOtHours,
    totalOtCost,
    hoursVariance,
    hoursVariancePct: totalBudgetHours > 0 ? (hoursVariance / totalBudgetHours) * 100 : 0,
    scheduledHoursVariance,
    scheduledHoursVariancePct: totalScheduledHours > 0 ? (scheduledHoursVariance / totalScheduledHours) * 100 : 0,
    forecastHoursVariance,
    forecastHoursVariancePct: totalForecastHours > 0 ? (forecastHoursVariance / totalForecastHours) * 100 : 0,
    costVariance,
    costVariancePct: totalBudgetCost > 0 ? (costVariance / totalBudgetCost) * 100 : 0,
    stdVariance,
    stdVariancePct: totalStandardHours > 0 ? (stdVariance / totalStandardHours) * 100 : 0,
    otRate: totalActualHours > 0 ? (totalOtHours / totalActualHours) * 100 : 0,
    perHotel,
    topOverBudget: topOverBudget && topOverBudget.costVariance > 0 ? topOverBudget : null,
    topUnderBudget: topUnderBudget && topUnderBudget.costVariance < 0 ? topUnderBudget : null,
    topOt,
    topStdMiss: topStdMiss && topStdMiss.stdVariance > 0 ? topStdMiss : null,
    topScheduleGap,
    topForecastGap,
  };
}

// ---------- Formatting ----------

const fmtCurrency = (n: number): string => {
  const abs = Math.abs(n);
  let val: string;
  if (abs >= 1_000_000) val = `$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  else if (abs >= 1_000) val = `$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  else val = `$${abs.toFixed(0)}`;
  return n < 0 ? `-${val}` : val;
};
const fmtSignedCurrency = (n: number) => (n >= 0 ? `+${fmtCurrency(n)}` : fmtCurrency(n));
const fmtHours = (n: number) => `${Math.round(n).toLocaleString()} hrs`;
const fmtSignedHours = (n: number) =>
  `${n >= 0 ? '+' : '-'}${Math.round(Math.abs(n)).toLocaleString()} hrs`;
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

// ---------- Insight generation ----------

interface Insight {
  kind: 'risk' | 'opportunity' | 'observation';
  title: string;
  body: string;
  actions?: string[];
}

function generateInsights(ctx: AIInsightsContext, s: DerivedSummary): Insight[] {
  const insights: Insight[] = [];
  const scope = getScopeLabels(ctx);

  const addScheduleCoverage = () => {
    if (Math.abs(s.scheduledHoursVariancePct) <= 2) return;
    const isUnderScheduled = s.scheduledHoursVariance > 0;
    insights.push({
      kind: isUnderScheduled ? 'risk' : 'opportunity',
      title: isUnderScheduled
        ? `${scope.selectedLabel} scheduled coverage trails actual hours by ${fmtHours(s.scheduledHoursVariance)}`
        : `${scope.selectedLabel} scheduled coverage exceeds actual hours by ${fmtHours(-s.scheduledHoursVariance)}`,
      body: s.topScheduleGap
        ? `${s.topScheduleGap.hotel.name} has the largest schedule gap at ${fmtSignedHours(s.topScheduleGap.scheduledVariance)} vs. scheduled hours.`
        : 'Coverage is uneven across the selected properties.',
      actions: isUnderScheduled
        ? [
            'Re-align the next 7 days of schedules to forecasted demand and close the coverage gap.',
            'Shift open shifts into the highest-pressure departments before adding overtime.',
          ]
        : [
            'Trim over-scheduled shifts where occupancy does not support current coverage.',
            'Convert excess coverage into flex hours or training time before premium hours are triggered.',
          ],
    });
  };

  const addForecastHoursDrift = () => {
    if (Math.abs(s.forecastHoursVariancePct) <= 2.5) return;
    const isOverActual = s.forecastHoursVariance > 0;
    insights.push({
      kind: isOverActual ? 'risk' : 'observation',
      title: isOverActual
        ? `${scope.selectedLabel} actual hours are ahead of forecast by ${fmtHours(s.forecastHoursVariance)}`
        : `${scope.selectedLabel} actual hours are below forecast by ${fmtHours(-s.forecastHoursVariance)}`,
      body: s.topForecastGap
        ? `${s.topForecastGap.hotel.name} shows the largest forecast-hours drift at ${fmtSignedHours(s.topForecastGap.forecastVariance)}.`
        : 'Forecast-hours drift is spread across the selected properties.',
      actions: isOverActual
        ? [
            'Refresh the demand forecast and rebase the remaining schedule to avoid creating additional OT.',
            'Check whether occupancy or service recovery demand is driving the extra hours.',
          ]
        : [
            'Confirm service levels and response times are holding with the leaner-than-forecast hours.',
            'Lock the favorable forecast delta into the next planning cycle if quality remains stable.',
          ],
    });
  };

  const addConcentration = () => {
    if (ctx.selectedHotels.length <= 1 || !s.topOt || s.totalOtCost <= 0) return;
    const share = (s.topOt.otCost / s.totalOtCost) * 100;
    if (share < 35) return;
    insights.push({
      kind: 'observation',
      title: `${s.topOt.hotel.name} accounts for ${share.toFixed(0)}% of total OT cost`,
      body: `OT exposure is concentrated in one property, so a targeted schedule reset there will move the portfolio fastest.`,
      actions: [
        `Deep-dive ${s.topOt.hotel.name} to identify the top OT-producing departments and shift the next schedule away from premium hours.`,
        'Compare the property’s actual hours to scheduled hours to isolate whether the issue is coverage, demand, or execution.',
      ],
    });
  };

  const addCostVariance = () => {
    if (Math.abs(s.costVariancePct) <= 1.5) return;
    const isOver = s.costVariance > 0;
    insights.push({
      kind: isOver ? 'risk' : 'opportunity',
      title: isOver
        ? `${scope.selectedLabel} labor cost is over budget by ${fmtCurrency(s.costVariance)} (${fmtPct(s.costVariancePct)})`
        : `${scope.selectedLabel} labor cost is under budget by ${fmtCurrency(-s.costVariance)} (${fmtPct(s.costVariancePct)})`,
      body:
        s.topOverBudget && isOver
          ? `${s.topOverBudget.hotel.name} drives ${fmtCurrency(s.topOverBudget.costVariance)} of the overage (${fmtPct(
              s.topOverBudget.costVariancePct
            )}). Reviewing scheduling and OT here would yield the largest impact.`
          : s.topUnderBudget && !isOver
          ? `${s.topUnderBudget.hotel.name} contributes the most favorable variance at ${fmtCurrency(s.topUnderBudget.costVariance)}. Validate service levels haven't slipped.`
          : 'Variance is spread across multiple properties.',
      actions: isOver
        ? [
            s.topOverBudget
              ? `Open a 1:1 with the ${s.topOverBudget.hotel.name} GM to review last week's schedule vs. demand and identify ${fmtCurrency(
                  Math.min(s.topOverBudget.costVariance, s.costVariance * 0.5)
                )} of recoverable spend.`
              : 'Run a variance walk with the top 3 over-budget properties this week.',
            'Freeze discretionary OT approvals above 4% of scheduled hours until variance closes.',
            'Re-baseline the next 2-week schedule against forecasted occupancy and demand drivers.',
          ]
        : [
            'Audit guest-satisfaction and service-recovery metrics at the top under-budget property to confirm coverage is adequate.',
            'Capture the productivity playbook from the leading property and share it with the caution cohort.',
          ],
    });
  };

  const addHoursVariance = () => {
    if (Math.abs(s.hoursVariancePct) <= 1.5) return;
    const isOver = s.hoursVariance > 0;
    insights.push({
      kind: isOver ? 'risk' : 'opportunity',
      title: `${scope.selectedLabel} actual hours are ${fmtSignedHours(s.hoursVariance)} vs. budget (${fmtPct(s.hoursVariancePct)})`,
      body: isOver
        ? 'Hours are running hot — look at scheduling discipline and call-in coverage.'
        : 'Hours are running lean — confirm coverage matches forecasted occupancy.',
      actions: isOver
        ? [
            'Tighten daily schedule sign-off: require department-head approval for any shift extension over 30 minutes.',
            'Cross-train 2–3 staff across Front Office and Housekeeping to absorb call-in coverage without OT.',
            'Push next-day demand forecasts into the scheduler nightly so start counts reflect actual occupancy.',
          ]
        : [
            'Validate service standards (room cleans/hr, F&B covers/hr) are still being met at lower staffing.',
            'If quality holds, lock the leaner template into next month’s schedule.',
          ],
    });
  };

  const addOvertime = () => {
    if (s.otRate > 6) {
      insights.push({
        kind: 'risk',
        title: `${scope.selectedLabel} overtime rate is elevated at ${s.otRate.toFixed(1)}% of actual hours`,
        body: s.topOt
          ? `${s.topOt.hotel.name} carries the highest OT cost exposure at ${fmtCurrency(s.topOt.otCost)} from ${fmtHours(
              s.topOt.otHours
            )}. Consider shifting hours from premium to base coverage.`
          : 'Distribute coverage to reduce premium hours.',
        actions: [
          s.topOt
            ? `Audit ${s.topOt.hotel.name}’s top OT departments and reassign 25–40% of premium hours to part-time or float pools.`
            : 'Identify the top 3 OT-driving departments and reassign premium hours to part-time pools.',
          'Set a hard OT cap of 5% of scheduled hours per department; require Director-level approval beyond that.',
          'Stand up a daily 9am OT watch report so managers act on yesterday’s premium hours, not next week’s payroll close.',
        ],
      });
    } else if (s.otRate < 3 && s.totalActualHours > 0) {
      insights.push({
        kind: 'observation',
        title: `${scope.selectedLabel} overtime is well controlled at ${s.otRate.toFixed(1)}%`,
        body: `Premium-hour exposure is below the 3% benchmark for ${scope.selectedLabel}.`,
      });
    }
  };

  const addStandards = () => {
    if (s.stdVariance > 0 && s.stdVariancePct > 2) {
      insights.push({
        kind: 'risk',
        title: `${scope.selectedLabel} actual hours exceed productivity standards by ${fmtPct(s.stdVariancePct)}`,
        body: s.topStdMiss
          ? `${s.topStdMiss.hotel.name} is ${fmtSignedHours(s.topStdMiss.stdVariance)} over standard — a productivity coaching candidate.`
          : 'Several properties are operating above standard hours.',
        actions: [
          s.topStdMiss
            ? `Run a productivity audit at ${s.topStdMiss.hotel.name}: shadow Housekeeping and F&B for 2 days and compare actual MPCR / covers-per-hour to standard.`
            : 'Run productivity audits at the 2 worst-performing properties this month.',
          'Refresh task-time standards if they were last calibrated more than 12 months ago.',
          'Add a daily productivity huddle (10 min) for department heads to commit to the day’s MPCR / covers-per-hour target.',
        ],
      });
    } else if (s.stdVariance < 0) {
      insights.push({
        kind: 'opportunity',
        title: `${scope.selectedLabel} is running ${fmtSignedHours(s.stdVariance)} below standard`,
        body: 'Labor efficiency is favorable vs. the productivity baseline; confirm quality scores remain stable.',
        actions: [
          'Spot-check guest-satisfaction trends and service-recovery counts to ensure the leaner labor is not eroding experience.',
          'If quality is stable, document the playbook and roll the tighter standards into next quarter’s budget.',
        ],
      });
    }
  };

  const addForecastDrift = () => {
    if (s.totalForecastCost <= 0) return;
    const delta = s.totalActualCost - s.totalForecastCost;
    if (Math.abs(delta) / s.totalForecastCost <= 0.03) return;
    const isOver = delta > 0;
    insights.push({
      kind: isOver ? 'risk' : 'observation',
      title: `Forecast drift of ${fmtSignedCurrency(delta)} vs. plan`,
      body: 'Mid-period forecast is diverging from actuals — consider re-running the projection model.',
      actions: isOver
        ? [
            'Refresh the demand and occupancy inputs and re-run the mid-month forecast today.',
            'Identify the 2 departments contributing most to the actual-vs-forecast gap and adjust their remaining-month coverage.',
            'Tighten the daily flash report so the GM sees variance the morning after, not at month-end.',
          ]
        : [
            'Re-run the forecast with updated occupancy; if the gap holds, lock in the savings and reset the budget reserve.',
          ],
    });
  };

  const addRiskMix = () => {
    const { onTrack, caution, atRisk } = ctx.riskCounts;
    const total = onTrack + caution + atRisk;
    if (total === 0) return;
    if (atRisk > 0) {
      insights.push({
        kind: 'risk',
        title: `${atRisk} ${atRisk === 1 ? 'property is' : 'properties are'} at risk`,
        body: `${onTrack} on track · ${caution} in caution · ${atRisk} at risk. Prioritize the at-risk ${scope.subjectNoun} in your daily standup.`,
        actions: [
          'Schedule a 30-minute war-room with each at-risk property GM within 48 hours to align on the top 3 corrective levers.',
          'Assign an Ops lead to own the recovery plan for each at-risk property and report progress weekly.',
          'Watch the caution cohort — add them to the weekly variance review so they don’t slide into at-risk.',
        ],
      });
    } else if (caution > onTrack) {
      insights.push({
        kind: 'observation',
        title: `${scope.selectedLabel} caution outweighs on-track (${caution} vs. ${onTrack})`,
        body: 'Trend is drifting; address the largest variance drivers before they escalate to at-risk.',
        actions: [
          'Pull the top variance driver for each caution property and assign an owner this week.',
          'Re-run scheduling templates against the latest 14-day demand forecast.',
        ],
      });
    } else {
      insights.push({
        kind: 'opportunity',
        title: `${onTrack} of ${total} ${scope.subjectNoun} on track`,
        body: `${scope.singleProperty ? 'Property health is strong' : 'Portfolio health is strong'} — focus coaching effort on the caution cohort to lift them to on-track.`,
      });
    }
  };

  switch (ctx.activeModule) {
    case 'overview':
      addRiskMix();
      addCostVariance();
      addScheduleCoverage();
      addForecastHoursDrift();
      addOvertime();
      addConcentration();
      break;
    case 'budget-performance':
      addCostVariance();
      addHoursVariance();
      addScheduleCoverage();
      addForecastDrift();
      addForecastHoursDrift();
      break;
    case 'mid-month-forecast':
      addForecastDrift();
      addForecastHoursDrift();
      addCostVariance();
      addScheduleCoverage();
      addOvertime();
      break;
    case 'plan-standard-performance':
      addStandards();
      addHoursVariance();
      addScheduleCoverage();
      addCostVariance();
      break;
    case 'overtime-intelligence':
      addOvertime();
      addScheduleCoverage();
      addConcentration();
      if (s.topOt) {
        insights.push({
          kind: 'observation',
          title: 'Overtime is concentrated',
          body: `Top property (${s.topOt.hotel.name}) accounts for ${(
            (s.topOt.otCost / Math.max(1, s.totalOtCost)) * 100
          ).toFixed(0)}% of portfolio OT cost.`,
          actions: [
            `Deep-dive ${s.topOt.hotel.name}: pull last 14 days of shift-by-shift OT and identify the top 3 contributing job codes.`,
            'Move premium hours into a shared float pool across nearby properties to absorb peak demand without OT.',
            'Re-bid open requisitions at that property to close any structural understaffing fueling the OT.',
          ],
        });
      }
      break;
    case 'scenario-lab':
      insights.push({
        kind: 'observation',
        title: 'Scenario Lab is a what-if model',
        body: `Baseline labor cost is ${fmtCurrency(s.totalActualCost)} on ${fmtHours(
          s.totalActualHours
        )}. Move the sliders to model occupancy, productivity, OT, agency, and wage changes — then ask me how the scenario compares to budget or forecast for ${scope.selectedLabel}.`,
      });
      addOvertime();
      addScheduleCoverage();
      break;
    default:
      addCostVariance();
      addScheduleCoverage();
      addForecastHoursDrift();
      addOvertime();
      addStandards();
      addConcentration();
  }

  if (insights.length === 0) {
    insights.push({
      kind: 'observation',
      title: 'No material exceptions detected',
      body: `Across ${ctx.selectedHotels.length} selected ${scope.subjectNoun} for ${ctx.periodLabel}, key labor metrics on the ${ctx.moduleLabel} tab are within expected ranges.`,
    });
  }

  return insights;
}

// ---------- NLP question answering (rule-based) ----------

function answerQuestion(q: string, ctx: AIInsightsContext, s: DerivedSummary): string {
  const text = q.toLowerCase();
  const scope = getScopeLabels(ctx);

  const has = (...needles: string[]) => needles.some((n) => text.includes(n));
  const wantsAction = has(
    'recommend',
    'recommendation',
    'what should',
    'what can i do',
    'how do i fix',
    'how to fix',
    'how do we fix',
    'corrective',
    'action',
    'next step',
    'mitigate',
    'reduce',
    'improve'
  );

  const formatActions = (lead: string, actions: string[]) =>
    `${lead}\n\nRecommended actions:\n${actions.map((a) => `• ${a}`).join('\n')}`;

  // Greetings / capabilities
  if (has('hello', 'hi ', 'hey', 'help', 'what can you')) {
    return `I can answer questions about the data currently on your screen — ${ctx.moduleLabel} for ${ctx.periodLabel}, covering ${ctx.selectedHotels.length} selected ${scope.subjectNoun}. Try asking about budget variance, overtime, productivity vs. standards, or how to fix a specific issue.`;
  }

  // Top variance / over budget
  if (has('over budget', 'worst', 'highest variance', 'biggest variance', 'most over')) {
    if (!s.topOverBudget) return 'No property is currently over budget in the selected view.';
    const lead = `${s.topOverBudget.hotel.name} is the most over-budget property at ${fmtCurrency(
      s.topOverBudget.costVariance
    )} (${fmtPct(s.topOverBudget.costVariancePct)}). Actual labor cost is ${fmtCurrency(
      s.topOverBudget.actualCost
    )} vs. a budget of ${fmtCurrency(s.topOverBudget.budgetCost)}.`;
    if (wantsAction) {
      return formatActions(lead, [
        `Open a 1:1 with the ${s.topOverBudget.hotel.name} GM this week to walk the schedule against demand.`,
        'Freeze discretionary OT approvals above 4% of scheduled hours until variance closes.',
        'Re-baseline the next 2-week schedule against the latest forecast.',
      ]);
    }
    return lead;
  }

  if (has('under budget', 'best', 'most favorable', 'lowest variance')) {
    if (!s.topUnderBudget) return 'No property is currently under budget in the selected view.';
    return `${s.topUnderBudget.hotel.name} is the most under-budget property at ${fmtCurrency(
      s.topUnderBudget.costVariance
    )} (${fmtPct(s.topUnderBudget.costVariancePct)}). Audit guest-satisfaction scores to confirm coverage is still adequate.`;
  }

  // Overtime
  if (has('overtime', 'ot ', 'premium hours', 'ot cost', 'ot exposure')) {
    const lead = s.topOt
      ? ` ${s.topOt.hotel.name} leads at ${fmtCurrency(s.topOt.otCost)} (${fmtHours(s.topOt.otHours)}).`
      : '';
    const summary = `${scope.selectedLabel} overtime totals ${fmtHours(s.totalOtHours)} or ${fmtCurrency(s.totalOtCost)} in premium cost — that's ${s.otRate.toFixed(1)}% of actual hours.${lead}`;
    if (wantsAction || s.otRate > 6) {
      return formatActions(summary, [
        s.topOt
          ? `Reassign 25–40% of ${s.topOt.hotel.name}'s premium hours to part-time or float pools.`
          : 'Reassign premium hours in the top 3 OT-driving departments to part-time pools.',
        'Set a 5% OT cap per department; require Director-level approval beyond that.',
        'Stand up a daily 9am OT watch report so managers act on yesterday\u2019s premium hours, not at payroll close.',
      ]);
    }
    return summary;
  }

  // Productivity / standards
  if (has('standard', 'productivity', 'efficiency')) {
    const base = `${scope.selectedLabel} actual vs. standard variance is ${fmtSignedHours(s.stdVariance)} (${fmtPct(
      s.stdVariancePct
    )}). ${
      s.topStdMiss
        ? `${s.topStdMiss.hotel.name} is the largest miss at ${fmtSignedHours(s.topStdMiss.stdVariance)}.`
        : 'No property is materially above standard.'
    }`;
    if (wantsAction && s.stdVariance > 0) {
      return formatActions(base, [
        s.topStdMiss
          ? `Run a productivity audit at ${s.topStdMiss.hotel.name}: shadow Housekeeping and F&B for 2 days and compare actual MPCR / covers-per-hour to standard.`
          : 'Run productivity audits at the 2 worst-performing properties this month.',
        'Refresh task-time standards if last calibrated more than 12 months ago.',
        'Add a daily 10-minute productivity huddle for department heads to commit to the day\u2019s targets.',
      ]);
    }
    return base;
  }

  // Forecast
  if (has('forecast', 'projection', 'projected')) {
    const drift = s.totalActualCost - s.totalForecastCost;
    const lead = `Forecasted labor cost is ${fmtCurrency(s.totalForecastCost)} vs. actuals of ${fmtCurrency(
      s.totalActualCost
    )} — a drift of ${fmtSignedCurrency(drift)} (${fmtPct(
      s.totalForecastCost > 0 ? (drift / s.totalForecastCost) * 100 : 0
    )}).`;
    if (wantsAction && drift > 0) {
      return formatActions(lead, [
        'Refresh the demand and occupancy inputs and re-run the mid-month forecast today.',
        'Identify the top 2 departments driving the gap and adjust the remaining-month coverage plan.',
        'Add a daily flash report so the GM sees the variance the morning after, not at month-end.',
      ]);
    }
    return lead;
  }

  if (has('schedule', 'scheduled', 'coverage', 'roster')) {
    const lead = `${scope.selectedLabel} scheduled hours are ${fmtHours(s.totalScheduledHours)} vs. actual hours of ${fmtHours(s.totalActualHours)} (${fmtSignedHours(s.scheduledHoursVariance)}, ${fmtPct(s.scheduledHoursVariancePct)}).`;
    if (wantsAction && Math.abs(s.scheduledHoursVariancePct) > 2) {
      return formatActions(lead, [
        'Rework the next 7-day schedule against forecasted demand and service priorities.',
        'Pull open shifts from the lowest-pressure areas before adding OT.',
        'Check whether the gap is caused by absenteeism, coverage rules, or late changes.',
      ]);
    }
    return lead;
  }

  if (has('forecast hours', 'forecasted hours', 'forecast staffing', 'forecast staffing hours')) {
    const lead = `${scope.selectedLabel} forecasted hours are ${fmtHours(s.totalForecastHours)} vs. actual hours of ${fmtHours(s.totalActualHours)} (${fmtSignedHours(s.forecastHoursVariance)}, ${fmtPct(s.forecastHoursVariancePct)}).`;
    if (wantsAction && Math.abs(s.forecastHoursVariancePct) > 2.5) {
      return formatActions(lead, [
        'Refresh the labor forecast inputs and re-run the staffing model.',
        'Compare the variance against occupancy and service-recovery demand.',
      ]);
    }
    return lead;
  }

  // Budget / cost totals
  if (has('budget', 'cost', 'spend', 'labor cost')) {
    const lead = `For ${scope.selectedLabel} during ${ctx.periodLabel}, actual labor cost is ${fmtCurrency(
      s.totalActualCost
    )} against a budget of ${fmtCurrency(s.totalBudgetCost)} — variance of ${fmtSignedCurrency(
      s.costVariance
    )} (${fmtPct(s.costVariancePct)}).`;
    if (wantsAction && s.costVariance > 0) {
      return formatActions(lead, [
        s.topOverBudget
          ? `Focus the corrective effort on ${s.topOverBudget.hotel.name} — it carries ${fmtCurrency(s.topOverBudget.costVariance)} of the overage.`
          : 'Run a variance walk with the top 3 over-budget properties this week.',
        'Tighten OT controls (5% cap, Director-level approval beyond).',
        'Re-baseline the next 2-week schedule against the latest demand forecast.',
      ]);
    }
    return lead;
  }

  // Hours
  if (has('hours', 'staffing', 'headcount')) {
    return `${scope.selectedLabel} actual hours: ${fmtHours(s.totalActualHours)} vs. budgeted ${fmtHours(
      s.totalBudgetHours
    )} (${fmtSignedHours(s.hoursVariance)}, ${fmtPct(s.hoursVariancePct)}).`;
  }

  // Risk
  if (has('risk', 'attention', 'at-risk', 'caution', 'on track')) {
    const lead = `${ctx.riskCounts.onTrack} on track · ${ctx.riskCounts.caution} in caution · ${ctx.riskCounts.atRisk} at risk across ${scope.selectedLabel}.`;
    if (wantsAction && ctx.riskCounts.atRisk > 0) {
      return formatActions(lead, [
        'Schedule a 30-minute war-room with each at-risk property GM within 48 hours.',
        'Assign an Ops lead to own the recovery plan for each at-risk property and report weekly.',
        'Pull the caution cohort into the weekly variance review to prevent escalation.',
      ]);
    }
    return lead;
  }

  // Per-property lookup
  for (const h of ctx.selectedHotels) {
    if (text.includes(h.name.toLowerCase())) {
      const hd = s.perHotel.find((p) => p.hotel.id === h.id);
      if (!hd) continue;
      const lead = `${h.name}: actual ${fmtCurrency(hd.actualCost)} vs. budget ${fmtCurrency(
        hd.budgetCost
      )} (${fmtSignedCurrency(hd.costVariance)}, ${fmtPct(hd.costVariancePct)}). OT cost ${fmtCurrency(
        hd.otCost
      )} from ${fmtHours(hd.otHours)}. Standard variance ${fmtSignedHours(hd.stdVariance)}.`;
      if (wantsAction) {
        const actions: string[] = [];
        if (hd.costVariance > 0) {
          actions.push(`Variance walk with the ${h.name} GM this week to identify ${fmtCurrency(hd.costVariance * 0.5)} of recoverable spend.`);
        }
        if (hd.otCost > 0 && hd.actualHours > 0 && (hd.otHours / hd.actualHours) * 100 > 5) {
          actions.push('Cap OT approvals at 5% of scheduled hours; route exceptions to the Director.');
        }
        if (hd.stdVariance > 0) {
          actions.push('Run a 2-day productivity audit in Housekeeping and F&B against current standards.');
        }
        if (actions.length === 0) {
          actions.push('Maintain current playbook — metrics are within range. Spot-check guest-satisfaction trends.');
        }
        return formatActions(lead, actions);
      }
      return lead;
    }
  }

  // Summary fallback
  return `Here's a snapshot of ${ctx.moduleLabel} for ${ctx.periodLabel}: actual cost ${fmtCurrency(
    s.totalActualCost
  )} vs. budget ${fmtCurrency(s.totalBudgetCost)} (${fmtSignedCurrency(s.costVariance)}, ${fmtPct(
    s.costVariancePct
  )}); OT rate ${s.otRate.toFixed(1)}%; standard variance ${fmtSignedHours(
    s.stdVariance
  )}. Ask me about a specific ${scope.subjectSingular}, overtime, forecast drift, or how to fix a specific issue.`;
}

// ---------- Component ----------

const SUGGESTED_PROMPTS_BY_MODULE: Record<string, string[]> = {
  overview: [
    'Which properties are at risk?',
    'What are the biggest variance drivers?',
    'How does overtime look right now?',
    'Where is coverage off schedule?',
    'What corrective actions do you recommend?',
  ],
  'budget-performance': [
    'Which property is most over budget?',
    'How big is the cost variance?',
    'Where are we saving money?',
    'How far off is scheduled coverage?',
    'How do I fix the cost overage?',
  ],
  'mid-month-forecast': [
    'Are we tracking against forecast?',
    'What is the projected month-end?',
    'Which property is drifting most from forecast?',
    'Where is forecast-hours drift largest?',
    'What should I do to close the forecast gap?',
  ],
  'plan-standard-performance': [
    'Which property is operating above standard hours?',
    'How does actual compare to schedule?',
    'Where is unscheduled work highest?',
    'How do scheduled hours compare to actual hours?',
    'How can we improve productivity vs. standard?',
  ],
  'overtime-intelligence': [
    'Where is overtime concentrated?',
    'What is our OT cost exposure?',
    'Which department drives the most OT?',
    'Where is OT most concentrated by property?',
    'How do I reduce overtime?',
  ],
  'scenario-lab': [
    'How does the scenario compare to budget?',
    'What changes would reduce OT cost the most?',
    'What is the quality risk of this scenario?',
    'How does the schedule compare to forecast?',
    'Recommend actions to improve the scenario.',
  ],
};

const DEFAULT_SUGGESTED_PROMPTS = [
  'Which property is most over budget?',
  'How does overtime look right now?',
  'Are we tracking against forecast?',
  'Where is coverage off schedule?',
  'Which property is operating above standard hours?',
];

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ open, onClose, context }) => {
  const summary = useMemo(() => buildSummary(context), [context]);
  const insights = useMemo(() => generateInsights(context, summary), [context, summary]);
  const scope = getScopeLabels(context);
  const suggestedPrompts =
    SUGGESTED_PROMPTS_BY_MODULE[context.activeModule] ?? DEFAULT_SUGGESTED_PROMPTS;

  // Reset chat when the tab changes so the conversation stays scoped to the current view.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setThinking(false);
  }, [context.activeModule]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);
    // Simulate latency
    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: answerQuestion(trimmed, context, summary),
      };
      setMessages((m) => [...m, reply]);
      setThinking(false);
    }, 450 + Math.random() * 350);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setThinking(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] bg-white shadow-2xl border-l border-gray-200 flex flex-col transform transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
        aria-label="AI Insights"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-teal-dark to-teal text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold leading-tight">AI Insights</div>
              <div className="text-[11px] opacity-80 leading-tight">
                Scoped to {context.moduleLabel} · {context.periodLabel} · {context.selectedHotels.length} {scope.subjectNoun}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetChat}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded"
              title="Reset conversation"
              aria-label="Reset conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Insights + chat scroll area */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {/* Auto insights */}
          <div className="p-4 space-y-3 bg-gradient-to-b from-teal/5 to-transparent border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-dark">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>What the AI sees for {scope.subjectLabel}</span>
            </div>
            <ul className="space-y-2">
              {insights.map((ins, i) => {
                const tone =
                  ins.kind === 'risk'
                    ? 'border-l-orange bg-orange/5'
                    : ins.kind === 'opportunity'
                    ? 'border-l-emerald-500 bg-emerald-50'
                    : 'border-l-blue-500 bg-blue-50';
                return (
                  <li key={i} className={`border-l-2 ${tone} px-3 py-2 rounded-r`}>
                    <div className="text-sm font-medium text-slate-navy leading-snug">
                      {ins.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 leading-snug">{ins.body}</div>
                    {ins.actions && ins.actions.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                          Recommended actions
                        </div>
                        <ul className="space-y-1">
                          {ins.actions.map((a, ai) => (
                            <li
                              key={ai}
                              className="text-xs text-gray-700 leading-snug flex gap-2"
                            >
                              <span className="mt-1 inline-block w-1 h-1 rounded-full bg-teal-dark flex-shrink-0" />
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Suggested prompts (only when chat empty) */}
          {messages.length === 0 && (
            <div className="p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Try asking
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="p-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] text-sm leading-relaxed rounded-2xl px-3.5 py-2 whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-teal-dark text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] text-sm leading-relaxed rounded-2xl rounded-bl-sm px-3.5 py-2 bg-gray-100 text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Thinking…</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 px-3 py-3 border-t border-gray-200 bg-white"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the data on screen…"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-teal focus:border-teal"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="p-2 bg-teal-dark text-white rounded-full hover:bg-teal disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </>
  );
};

export default AIInsightsPanel;
