# Metrics & Calculations Reference

Engineering reference for every metric, KPI, and derived measure rendered in the Labor Intelligence prototype. For each item you will find: the **display name**, **where it appears** (file / tab / section), the **formula**, the **source data fields**, any **scaling factors**, and any **constants** used.

All field names refer to types in [`src/types.ts`](../src/types.ts) and mock datasets in `src/data/` unless otherwise noted.

---

## 1. Global Concepts

### 1.1 Period scaling — `PERIOD_VIEWS.additiveScale`

Defined in [`src/pages/PortfolioOverview.tsx`](../src/pages/PortfolioOverview.tsx). Mock data represents a full annual aggregation; selecting a period multiplies all **additive** sums (hours, dollars, counts) by `additiveScale` to simulate the smaller window. Rates / percentages are not scaled.

| Period selector   | `additiveScale` | Intent                                   |
| ----------------- | --------------- | ---------------------------------------- |
| Previous Month    | `0.25`          | 1 closed month ÷ 4 prior closed months   |
| Current Month     | `0.15`          | Partial current month MTD                |
| Year to Date      | `1.0`           | Full aggregation (no scaling)            |

> Convention used throughout this doc: `scale = view.additiveScale`.

### 1.2 Source data — `LaborMetrics`

One row per hotel (`MOCK_LABOR_METRICS`). Key fields referenced by metrics below:

- `hotelId`
- `actualHours`, `scheduledHours`, `budgetedHours`, `forecastedHours`, `standardHours`
- `actualCost`, `budgetedCost`, `forecastedCost`
- `actualOvertimeHours`, `scheduledOvertimeHours`
- `overtimeRate` (multiplier, typically `1.5`)

### 1.3 Hotel master — `MOCK_HOTELS`

8 hotels totaling 1,175 rooms. Used for filtering, weighting, and grouping. Each hotel has `id`, `name`, `region`, `rooms`, `segment`.

---

## 2. Portfolio Overview Tab

File: [`src/pages/PortfolioOverview.tsx`](../src/pages/PortfolioOverview.tsx) — `activeModule === 'overview'`.

### 2.1 Risk-count tiles

Hover popovers list each hotel currently in that bucket. Source: `MOCK_RISK_DISTRIBUTION`.

| Tile                | Formula                                              |
| ------------------- | ---------------------------------------------------- |
| Hotels On Track     | `count(hotels where riskLevel === 'on-track')`       |
| Hotels in Caution   | `count(hotels where riskLevel === 'caution')`        |
| Hotels at Risk      | `count(hotels where riskLevel === 'at-risk')`        |

### 2.2 Labor Variance (Actual vs Budget)

```
totalLaborVariance = Σ(actualCost − budgetedCost) × scale
totalBudgeted      = Σ(budgetedCost)              × scale
variancePercent    = (totalLaborVariance / totalBudgeted) × 100
```

- Color: `+` (over budget) → orange, `−` (under budget) → emerald.
- Hover popover shows per-hotel `(actualCost − budgetedCost) × scale` ranked by absolute contribution.

### 2.3 Overtime Exposure

```
For each hotel h:
  baseRate_h = h.actualCost / h.actualHours        // blended hourly rate
  otCost_h   = h.actualOvertimeHours × baseRate_h × 1.5

overtimeExposure = Σ(otCost_h) × scale
```

- Hover popover shows top OT contributors using the same formula per hotel.

### 2.4 Hotels Requiring Attention table

Source: `MOCK_HOTELS_REQUIRING_ATTENTION` (pre-ranked) joined with `MOCK_HOTELS`. The only computed display value:

```
displayedVariance = row.variance × scale
```

Other columns are descriptive fields read directly from the mock (`riskLevel`, `topVarianceDriver.category/.percentage/.description`, `keyInsight`, `trend.status/.periodsActive/.changeVsPriorPeriod/.note`).

### 2.5 Top Variance Drivers

Driver list (portfolio level, currency contribution + share of variance):

| Rank | Driver                          | Impact     | Share |
| ---- | ------------------------------- | ---------- | ----- |
| 1    | Housekeeping Productivity       | `$23,200`  | 34%   |
| 2    | Scheduled Overtime              | `$16,300`  | 25%   |
| 3    | Actual Hours Above Schedule     | `$12,100`  | 20%   |
| 4    | Forecast Error                  | `$7,800`   | 12%   |
| 5    | Wage Rate Variance              | `$4,200`   | 9%    |

Each driver has a "By Hotel" drill-down showing the relevant per-property metric (e.g., actual-vs-standard hours, OT %, actual-vs-schedule hours, forecast error %, $/hr variance). All values come from the mock; the prototype does not recompute them from `LaborMetrics`.

### 2.6 Risk Distribution scatter

Source: `MOCK_RISK_DISTRIBUTION`.

- x = `likelihood` (0–100), y = `impact` (0–100)
- Point color from `riskLevel` (emerald / amber / red)
- Background quadrants are static visual zones — no calculation.

---

## 3. Budget Performance Tab

File: [`src/pages/PortfolioOverview.tsx`](../src/pages/PortfolioOverview.tsx) — `activeModule === 'budget-performance'`. All six top tiles use `ContributionPopoverCard` so every metric exposes a per-property breakdown on hover.

Totals are computed in the `budgetTotals` memo:

```
actualHours    = Σ(actualHours)     × scale
budgetHours    = Σ(budgetedHours)   × scale
actualCost     = Σ(actualCost)      × scale
budgetCost     = Σ(budgetedCost)    × scale

hoursVariance     = actualHours − budgetHours
hoursVariancePct  = (hoursVariance / budgetHours) × 100
costVariance      = actualCost  − budgetCost
costVariancePct   = (costVariance / budgetCost)   × 100
```

| Card               | Value source           | Subtext                |
| ------------------ | ---------------------- | ---------------------- |
| Actual Hours       | `actualHours`          | "Hours"                |
| Budget Hours       | `budgetHours`          | "Hours"                |
| Hours Variance     | `hoursVariance`        | `hoursVariancePct` %   |
| Actual Labor Cost  | `actualCost`           | "USD"                  |
| Budget Labor Cost  | `budgetCost`           | "USD"                  |
| Cost Variance      | `costVariance`         | `costVariancePct` %    |

**Per-property contributions** (`budgetPerProperty` memo) repeat the same formulas per hotel, scaled by `scale`, sorted by `|amount|` descending in the popover.

---

## 4. Labor Performance Quick Stats

File: [`src/components/portfolio/LaborQuickStats.tsx`](../src/components/portfolio/LaborQuickStats.tsx). Source: `MOCK_LABOR_QUICK_STATS` (portfolio totals) and `MOCK_QUICK_STATS_BY_HOTEL` (per-property).

### 4.1 Sections

Rooms · Food & Beverage · Outlets · Banquets · Kitchen & Stewarding. Each section has ~8 rows showing **Forecast**, **Actual**, **Variance**.

### 4.2 Row formula

```
variancePercent = ((actual − forecast) / forecast) × 100
```

Direction (`higher-better` / `lower-better`) drives sign color only.

### 4.3 Aggregation across selected hotels

- **Additive metrics** (`format = 'currency-m' | 'number'`): `Σ hotelValue` then × `scale`.
- **Rate metrics** (`format = 'percent' | 'ratio' | 'currency'` per-unit): weighted average using hotel room count:

```
weightedRate = Σ(hotelValue × hotelRooms) / Σ(hotelRooms)
```

### 4.4 Per-hotel synthesis (when mock lacks a row)

- Additive: `portfolioValue × (hotelRooms / totalRooms)`
- Rate: `portfolioValue × (1 + deterministicOffset)` where offset is bounded ±8% based on a hash of `hotelId` + metric name (stable for display).

---

## 5. Mid-Month Forecast Tab

File: [`src/components/portfolio/MidMonthForecast.tsx`](../src/components/portfolio/MidMonthForecast.tsx).

### 5.1 Efficiency constants

```
MTD_EFFICIENCY        = 0.877   // 87.7% of MTD budget achieved
REMAINING_EFFICIENCY  = 0.914   // 91.4% of remaining budget projected
```

### 5.2 Per-hotel projection

```
mtdFraction        = dayOfMonth / daysInMonth
mtdBudget          = budgetedHours × mtdFraction
mtdActual          = mtdBudget    × MTD_EFFICIENCY

remainingBudget    = budgetedHours × (1 − mtdFraction)
remainingForecast  = remainingBudget × REMAINING_EFFICIENCY

projected          = mtdActual + remainingForecast
variance           = projected − budgetedHours
variancePct        = (variance / budgetedHours) × 100
```

Portfolio totals are sums of the per-hotel values.

### 5.3 KPI cards

| Card                | Formula                |
| ------------------- | ---------------------- |
| MTD Actual          | `Σ mtdActual`          |
| MTD Budget          | `Σ mtdBudget`          |
| Remaining Forecast  | `Σ remainingForecast`  |
| Projected Month-End | `Σ projected`          |
| Projected Variance  | `Σ variance` + `variancePct` |
| Forecast Confidence | see 5.4                |

### 5.4 Forecast Confidence

```
confidence = clamp(40, 95, 92 − |variancePct| × 1.2)
```

Confidence label bins: `≥85 High`, `70–84 Medium-High`, `55–69 Medium`, `40–54 Low-Medium`, `<40 Low`.

---

## 6. Plan & Standard Performance Tab

File: [`src/components/portfolio/PlanStandardPerformance.tsx`](../src/components/portfolio/PlanStandardPerformance.tsx).

Receives `metrics: LaborMetrics[]`, `periodLabel`, and `periodScale` (= `view.additiveScale`). All additive sums multiply by `periodScale`.

### 6.1 Constants

```
UNSCHEDULED_SHARE = 0.66    // fraction of positive schedule variance attributed to unscheduled work
OVERCLOCKED_SHARE = 0.34    // fraction attributed to over-clocking
```

### 6.2 Portfolio totals (`totals` memo)

```
actualHours      = Σ actualHours      × periodScale
scheduledHours   = Σ scheduledHours   × periodScale
standardHours    = Σ standardHours    × periodScale
forecastedHours  = Σ forecastedHours  × periodScale
actualCost       = Σ actualCost       × periodScale

schedVariance    = actualHours − scheduledHours
schedVariancePct = (schedVariance / scheduledHours) × 100
stdVariance      = actualHours − standardHours
stdVariancePct   = (stdVariance / standardHours)   × 100

unscheduled      = max(0, schedVariance) × UNSCHEDULED_SHARE
overclocked      = max(0, schedVariance) × OVERCLOCKED_SHARE

blendedRate      = actualCost / actualHours
standardCost     = standardHours × blendedRate
costRisk         = actualCost   − standardCost
costRiskPct      = (costRisk / standardCost) × 100
qualityRiskLevel = stdVariance < 0 ? 'Elevated' : 'Low'
```

### 6.3 Per-property contributions (`perProperty` memo)

For each metric row `m`:

```
actualHours_h     = m.actualHours    × periodScale
scheduledHours_h  = m.scheduledHours × periodScale
standardHours_h   = m.standardHours  × periodScale
actualCost_h      = m.actualCost     × periodScale
forecast_h        = m.forecastedHours × periodScale

blendedRate_h     = actualCost_h / actualHours_h
standardCost_h    = standardHours_h × blendedRate_h
schedVar_h        = actualHours_h − scheduledHours_h
stdVar_h          = actualHours_h − standardHours_h
unscheduled_h     = max(0, schedVar_h) × UNSCHEDULED_SHARE
overclocked_h     = max(0, schedVar_h) × OVERCLOCKED_SHARE
costRisk_h        = actualCost_h  − standardCost_h
```

### 6.4 KPI cards

Section "Actual vs Schedule":

| Card                        | Value                | Subtext                                       |
| --------------------------- | -------------------- | --------------------------------------------- |
| Scheduled Hours             | `totals.scheduledHours` | `Forecast: <totals.forecastedHours> hrs`   |
| Actual Hours                | `totals.actualHours`    | `Forecast: <totals.forecastedHours> hrs`   |
| Actual vs Scheduled Variance| `totals.schedVariance`  | `totals.schedVariancePct` %                |
| Unscheduled Work            | `totals.unscheduled`    | "Worked but not on schedule"               |
| Over-Clocked Hours          | `totals.overclocked`    | "Clocked beyond schedule"                  |

Section "Actual vs Standards":

| Card                       | Value                  | Subtext                                       |
| -------------------------- | ---------------------- | --------------------------------------------- |
| Standard Hours             | `totals.standardHours` | `Forecast: <totals.forecastedHours> hrs`   |
| Actual Hours               | `totals.actualHours`   | `Forecast: <totals.forecastedHours> hrs`   |
| Actual vs Standard Variance| `totals.stdVariance`   | `totals.stdVariancePct` %                  |
| Cost Risk (Over Std.)      | `totals.costRisk`      | `totals.costRiskPct` %                     |
| Quality Risk (Under Std.)  | `totals.qualityRiskLevel` | "Service / outcome exposure"            |

Hover popovers on the four hours-cards (Scheduled / Standard / both Actual) show, per property, the relevant metric **plus** `Forecast: <forecast_h> hrs`.

### 6.5 Adherence charts

Two SVG bar charts (Actual vs Scheduled, Actual vs Standard). For each:

```
baseline = totals.scheduledHours | totals.standardHours
actual   = totals.actualHours
variance = actual − baseline
variancePct = (variance / baseline) × 100
```

---

## 7. Overtime Intelligence Tab

File: [`src/components/portfolio/OvertimeIntelligence.tsx`](../src/components/portfolio/OvertimeIntelligence.tsx). Look-back (last 7 days) vs look-ahead (next 7 days). All sums multiplied by `view.additiveScale` are noted; many synthetic look-back values are derived from `LaborMetrics` fields.

### 7.1 Per-property derived fields

```
baseRate_h    = m.actualCost / m.actualHours
last7Actual   = m.actualOvertimeHours       // OT hours incurred
next7Sched    = m.scheduledOvertimeHours    // OT hours scheduled forward
otCost_h      = last7Actual × baseRate_h × 1.5
```

### 7.2 KPI cards

| Card                | Formula                                |
| ------------------- | -------------------------------------- |
| Actual OT Hours     | `Σ last7Actual`                        |
| Scheduled OT Hours  | `Σ next7Sched`                         |
| OT Cost Exposure    | `Σ otCost_h`                           |

Each KPI card hover lists top contributing properties.

### 7.3 Department & job hierarchy

Static `OT_HIERARCHY` constants distribute portfolio totals down to division → department → job. Example shares:

**Actual OT distribution** — Housekeeping 41.0%, Front Office 21.5%, Night Audit 12.5%, Engineering 11.4%, F&B 7.8%, Other 5.8%.

**Scheduled OT distribution** — Housekeeping 41.2%, Front Office 24.3%, Night Audit 14.8%, Engineering 10.0%, F&B 6.3%, Other 3.4%.

Each department's hours/cost are computed as `total × share`. Job-level rows multiply department total by job share (e.g., Housekeeping → Room Attendant 62%, Houseperson 18%, Inspector 12%, Laundry Attendant 8%).

### 7.4 OT Hotspots panel

Sourced from per-property OT cost ranked descending. Risk badge thresholds:

```
High    → otCost_h ≥ 0.66 × max(otCost)
Medium  → otCost_h ≥ 0.33 × max(otCost)
Low     → otherwise
```

---

## 8. Scenario Lab Tab

File: [`src/components/portfolio/ScenarioLab.tsx`](../src/components/portfolio/ScenarioLab.tsx). Only the **Current Month forward** period is allowed (Previous Month and YTD are disabled when on this tab).

### 8.1 Sliders

| Input              | Range             | Step | Default | Variable          |
| ------------------ | ----------------- | ---- | ------- | ----------------- |
| Occupancy          | 40 – 100 %        | 1    | 92 %    | `occupancy`       |
| Wage Inflation     | 0 – 15 %          | 0.1  | 3.5 %   | `wageInflation`   |
| Productivity       | −10 – +15 %       | 0.5  | +2 %    | `productivity`    |
| Overtime Reduction | −50 – +25 %       | 1    | −15 %   | `overtimeReduction` |
| Agency Labor       | 0 – 40 %          | 1    | 8 %     | `agencyLabor`     |
| Group Demand       | −25 – +30 %       | 1    | +5 %    | `groupDemand`     |

### 8.2 Baseline

```
BASELINE_OCCUPANCY = 80
baseline = {
  actualHours, otHours, blendedRate,
  budgetedCost, forecastedCost, scheduledHours, standardHours,
  otPct, budgetedHours,
}
```
Built from filtered `LaborMetrics` portfolio sums (scaled appropriately for the current-month window).

### 8.3 Derived factors

```
occFactor          = occupancy / BASELINE_OCCUPANCY
demandFactor       = 1 + groupDemand     / 100
prodFactor         = 1 + productivity    / 100
otFactor           = 1 + overtimeReduction / 100
wageFactor         = 1 + wageInflation   / 100

AGENCY_PREMIUM     = 0.30
agencyShare        = agencyLabor / 100
agencyCostFactor   = 1 + (agencyShare × AGENCY_PREMIUM)
```

### 8.4 Projection

```
projHours          = baseline.actualHours × occFactor × demandFactor / prodFactor
projOtHours        = baseline.otHours     × otFactor   × occFactor
projOtPct          = (projOtHours / projHours) × 100

otSavingsHours     = baseline.otHours − projOtHours
otSavings          = otSavingsHours × baseline.blendedRate × 0.5   // 0.5 = OT premium portion

projCost           = projHours × baseline.blendedRate × wageFactor × agencyCostFactor − otSavings

budgetVariance     = baseline.budgetedCost − projCost              // + = favorable
budgetVariancePct  = (budgetVariance / baseline.budgetedCost) × 100
```

### 8.5 Impact matrices (vs four baselines)

Two tables — Hours and Cost — each compares `projHours` / `projCost` to:

- Budget (`baseline.budgetedHours`, `baseline.budgetedCost`)
- Forecast (`baseline.forecastedHours` / `forecastedCost`)
- Schedule (`baseline.scheduledHours` / scheduled cost = `scheduledHours × blendedRate`)
- Standards (`baseline.standardHours` / standard cost = `standardHours × blendedRate`)

Each row:
```
delta    = projection − baselineValue
deltaPct = (delta / baselineValue) × 100
```

### 8.6 Impact Risks

#### 8.6.1 Quality Risk

```
qualityScore =
    (productivity     > 5  ? (productivity − 5)        × 1.5 : 0)
  + (overtimeReduction < −25 ? (−25 − overtimeReduction) × 0.8 : 0)
  + (agencyLabor      > 15 ? (agencyLabor − 15)        × 0.5 : 0)

Level:
  score ≥ 20 → High
  8 ≤ score < 20 → Medium
  score < 8 → Low

Trend:
  score < 5  → Improved
  5 ≤ score < 15 → Stable
  score ≥ 15 → Worsened
```

#### 8.6.2 OT Exposure

```
otDeltaPP = projOtPct − baseline.otPct      // percentage points
Tone: otDeltaPP ≤ 0 → favorable, otDeltaPP > 0 → unfavorable
```

#### 8.6.3 Recovery Probability

```
recovery = 55
  + clamp(−15, 20, budgetVariancePct × 4)
  + clamp(−10, 10, −otDeltaPP × 2)
  + clamp(−10, 10, productivity)
  − max(0, qualityScore − 5)

recoveryPct      = clamp(5, 99, recovery)
recoveryDeltaPP  = recoveryPct − 69          // 69 = baseline default
```

#### 8.6.4 Agency Cost Premium

```
agencyPremiumCost = projHours × baseline.blendedRate × agencyShare × AGENCY_PREMIUM
```

### 8.7 12-Month projection charts (Hours and Cost)

```
SEASON = [0.07, 0.07, 0.08, 0.08, 0.09, 0.09, 0.10, 0.10, 0.09, 0.08, 0.08, 0.07]
TODAY_INDEX = 4    // May
```

Series per month `i`:

| Line                | Formula                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| Actual (i ≤ TODAY)  | `baseline.actualHours × SEASON[i] × 12`                                 |
| Scenario (i ≥ TODAY)| `projHours × SEASON[i] × 12`                                            |
| Budget (all months) | `baseline.budgetedHours × SEASON[i] × 12` (dashed)                      |
| Forecast (all)      | `baseline.forecastedHours × SEASON[i] × 12` (dashed)                    |

Cost chart uses the same shape with `*Cost` baselines and `projCost`.

---

## 9. Actual vs Targets Grid

File: [`src/components/portfolio/ActualVsTargetsGrid.tsx`](../src/components/portfolio/ActualVsTargetsGrid.tsx). Renders a hierarchical division → department table.

### 9.1 Labor structure (target shares)

| Division              | Departments (target share of total labor)                                            |
| --------------------- | ------------------------------------------------------------------------------------ |
| Rooms                 | Front Office 10%, Housekeeping 30%, Reservations 3%                                  |
| Food & Beverage       | Restaurants 10%, Banquets 8%, Bars 4%                                                |
| Kitchen & Stewarding  | Main Kitchen 12%, Stewarding 4%                                                      |
| Admin & General       | Exec 2%, Accounting 2%, HR 1%                                                        |
| Sales & Marketing     | Sales & Marketing 4%                                                                 |
| Engineering           | Maintenance 8%, Grounds 2%                                                           |

Each department has `actualBias ∈ [−0.20, +0.20]` (e.g., Housekeeping +0.08, Stewarding +0.10, Reservations −0.05).

### 9.2 Actual share normalization

```
rawActualShare_d        = targetShare_d × (1 + actualBias_d)
normalizedActualShare_d = rawActualShare_d / Σ rawActualShare
```

### 9.3 Department rows

For each department `d` with portfolio totals `T` (already multiplied by `additiveScale`):

```
actualHours_d      = T.actualHours      × normalizedActualShare_d
scheduledHours_d   = T.scheduledHours   × targetShare_d
budgetedHours_d    = T.budgetedHours    × targetShare_d
forecastedHours_d  = T.forecastedHours  × targetShare_d
standardHours_d    = T.standardHours    × targetShare_d

actualCost_d       = T.actualCost       × normalizedActualShare_d
budgetedCost_d     = T.budgetedCost     × targetShare_d
forecastedCost_d   = T.forecastedCost   × targetShare_d
scheduledCost_d    = scheduledHours_d   × blendedRate
standardCost_d     = standardHours_d    × blendedRate

variance_d_<X>     = actual_d − x_d        // for each baseline X
```

Division rows sum their child departments.

---

## 10. Risk-distribution / Top-Variance Drivers components

These are largely **display** components reading from `MOCK_RISK_DISTRIBUTION` and `MOCK_VARIANCE_DRIVERS`. No portfolio-level math beyond filtering by selected hotel IDs and formatting currency / percentages.

---

## 11. Formatting helpers

File: [`src/components/ui/Card.tsx`](../src/components/ui/Card.tsx).

- `Currency` — `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })`
- `Percentage` — fixed-1 decimal, signed for variances
- Hours (`fmtNum`) — `Math.round(n).toLocaleString()`

---

## 12. Data-source summary

| Dataset                          | Used by                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `MOCK_HOTELS`                    | Filtering, weighting, grouping (all tabs)                                                |
| `MOCK_LABOR_METRICS`             | Budget, Plan/Standard, Overtime Intelligence, Scenario Lab, Mid-Month Forecast           |
| `MOCK_LABOR_QUICK_STATS`         | Portfolio totals in Labor Quick Stats                                                    |
| `MOCK_QUICK_STATS_BY_HOTEL`      | Per-hotel rows in Labor Quick Stats                                                      |
| `MOCK_RISK_DISTRIBUTION`         | Risk-count tiles, scatter plot                                                           |
| `MOCK_HOTELS_REQUIRING_ATTENTION`| Attention table (Overview tab)                                                           |
| `MOCK_VARIANCE_DRIVERS`          | Top Variance Drivers (Overview tab)                                                      |
| `OT_HIERARCHY` (in-component)    | Department / job breakdown in Overtime Intelligence                                      |
| Labor Structure (in-component)   | Division / department breakdown in Actual vs Targets Grid                                |

---

## 13. Open items / known simplifications

- `MOCK_VARIANCE_DRIVERS` values are illustrative and not recomputed from `LaborMetrics`.
- Per-job OT distributions in `OT_HIERARCHY` are illustrative shares; real implementation should consume per-employee timecard rollups.
- Scenario Lab "Recovery Probability" weights (`× 4`, `× 2`, clamp bounds) are placeholder coefficients chosen to give intuitive UI movement; they should be replaced with calibrated coefficients from historical recovery data.
- `MTD_EFFICIENCY` / `REMAINING_EFFICIENCY` in Mid-Month Forecast are fixed constants. In production these should be derived from rolling actuals.
