# Labor Intelligence - Mock Data & Type Reference

## Quick Reference: Data Structures

### Core Types

#### Hotel
```typescript
interface Hotel {
  id: string;                    // Unique identifier (e.g., 'h1')
  name: string;                  // Property name
  region: string;                // Region assignment
  brand: string;                 // Brand name
  serviceLevel: 'select-service' | 'upscale' | 'upper-upscale' | 'luxury';
  roomCount: number;             // Total room inventory
}
```

**Usage**: Identify properties across portfolio
**Mock Data**: MOCK_HOTELS array with 8 sample properties

---

#### LaborMetrics
```typescript
interface LaborMetrics {
  hotelId: string;
  periodEnd: Date;
  
  // Hour metrics
  actualHours: number;           // Actual hours worked
  budgetedHours: number;         // Budget plan
  forecastedHours: number;       // Demand-based forecast
  scheduledHours: number;        // Manager schedule
  standardHours: number;         // Operational standard
  
  // Cost metrics
  actualCost: number;            // Actual labor dollars
  budgetedCost: number;          // Budget dollars
  forecastedCost: number;        // Forecast dollars
  
  // Overtime
  actualOvertimeHours: number;   // OT hours worked
  scheduledOvertimeHours: number;// OT hours planned
  overtimeRate: number;          // OT multiplier (e.g., 1.5)
  
  // Variance
  actualVariance: number;        // % difference from budget
  costVariance: number;          // Cost % difference
  riskLevel: RiskLevel;          // Classification
  
  // Root causes
  varianceDrivers: VarianceDriver[];
}
```

**Usage**: Performance measurement against multiple baselines
**Mock Data**: MOCK_LABOR_METRICS array with metrics for each hotel

---

#### VarianceDriver
```typescript
interface VarianceDriver {
  category: 'demand' | 'productivity' | 'scheduling' | 'overtime' | 
            'wage-rate' | 'forecast' | 'execution';
  impact: number;                // Dollar amount
  percentage: number;            // % of total variance
  description: string;           // Human-readable explanation
}
```

**Example**:
```typescript
{
  category: 'productivity',
  impact: 9200,
  percentage: 29,
  description: 'Housekeeping productivity 8.4% below standard'
}
```

**Usage**: Explain why variance occurred
**Categories**:
- `demand`: Occupancy higher/lower than budgeted
- `productivity`: Labor efficiency vs standard
- `scheduling`: Manager scheduling decisions
- `overtime`: Planned or unplanned overtime
- `wage-rate`: Market rate adjustments
- `forecast`: Demand forecast accuracy
- `execution`: Employee clock behavior vs schedule

---

#### RiskLevel
```typescript
type RiskLevel = 'on-track' | 'caution' | 'at-risk';
```

**Mapping**:
- `'on-track'`: No issues, performance within expectations
- `'caution'`: Minor variance or trending issues
- `'at-risk'`: Significant variance or quality risk

---

#### PortfolioMetrics
```typescript
interface PortfolioMetrics {
  totalHotels: number;           // Hotel count
  hotelsOnTrack: number;         // Count by risk level
  hotelsInCaution: number;
  hotelsAtRisk: number;
  
  totalLaborVariance: number;    // Dollars
  totalLaborVariancePercent: number;// Percentage
  
  overtimeExposure: number;      // Next period dollars
  overtimeExposureNextPeriod: number;
  
  forecastConfidence: number;    // 0-100%
  productivityDrift: number;     // % trend
}
```

**Usage**: Executive summary dashboard
**Mock Data**: MOCK_PORTFOLIO_METRICS

---

#### HotelRiskSummary
```typescript
interface HotelRiskSummary {
  hotel: Hotel;
  metrics: LaborMetrics;
  variance: number;              // Dollar variance
  riskLevel: RiskLevel;
  topVarianceDriver: VarianceDriver;
  keyInsight: string;            // Human-readable summary
}
```

**Usage**: "Hotels Requiring Attention" table
**Mock Data**: MOCK_HOTELS_REQUIRING_ATTENTION (5 entries)

---

#### RiskDistributionPoint
```typescript
interface RiskDistributionPoint {
  hotelId: string;
  hotelName: string;
  likelihood: number;            // 0-100 (X-axis)
  impact: number;                // 0-100 (Y-axis)
  riskLevel: RiskLevel;
}
```

**Usage**: Risk matrix scatter plot
**X-Axis**: Likelihood (how likely is the issue to continue/worsen?)
**Y-Axis**: Impact (what's the financial/quality impact?)
**Mock Data**: MOCK_RISK_DISTRIBUTION (8 points)

---

#### TopVarianceDriver
```typescript
interface TopVarianceDriver {
  category: string;              // E.g., "Housekeeping Productivity"
  impact: number;                // Dollar amount
  percentage: number;            // % of total
  description: string;           // Explanation
}
```

**Usage**: Portfolio-level variance breakdown
**Mock Data**: MOCK_TOP_VARIANCE_DRIVERS (5 drivers)

---

#### AIInsight
```typescript
interface AIInsight {
  id: string;
  type: 'cost' | 'quality' | 'overtime' | 'operational' | 'forecast' | 'productivity';
  title: string;
  description: string;
  impact: number;                // Dollar or quality impact
  confidence: number;            // 0-100%
  recommendedAction: string;
  owner?: string;                // Role responsible
  timeframe: 'immediate' | 'this-week' | 'this-month';
}
```

**Usage**: AI recommendations banner and insights hub
**Types**:
- `'cost'`: Cost overrun with controllable recovery
- `'quality'`: Service risk from understaffing
- `'overtime'`: Uncontrolled OT exposure
- `'operational'`: Execution issues (schedule non-compliance)
- `'forecast'`: Forecast accuracy problems
- `'productivity'`: Productivity gaps

**Mock Data**: MOCK_AI_INSIGHTS (5 sample insights)

---

## Mock Data Exports

### Available Data Sets

```typescript
// Hotels
export const MOCK_HOTELS: Hotel[];

// Labor metrics for each hotel
export const MOCK_LABOR_METRICS: LaborMetrics[];

// Portfolio-level summary
export const MOCK_PORTFOLIO_METRICS: PortfolioMetrics;

// Properties requiring attention
export const MOCK_HOTELS_REQUIRING_ATTENTION: HotelRiskSummary[];

// Risk matrix data
export const MOCK_RISK_DISTRIBUTION: RiskDistributionPoint[];

// Top drivers across portfolio
export const MOCK_TOP_VARIANCE_DRIVERS: TopVarianceDriver[];

// AI recommendations
export const MOCK_AI_INSIGHTS: AIInsight[];
```

### Import & Usage

```typescript
import {
  MOCK_HOTELS,
  MOCK_LABOR_METRICS,
  MOCK_PORTFOLIO_METRICS,
  // ... etc
} from '@/data/mockData';
```

---

## Extending Mock Data

### Adding a New Hotel

```typescript
// 1. Add to MOCK_HOTELS
{
  id: 'h9',
  name: 'New Property',
  region: 'South',
  brand: 'Upscale',
  serviceLevel: 'upscale',
  roomCount: 200,
}

// 2. Add to metricsMap in generateLaborMetrics()
h9: {
  actualHours: 9000,
  budgetedHours: 8900,
  // ... rest of metrics
}

// 3. Labor metrics auto-generated via generateLaborMetrics(hotelId)
```

### Modifying Variance Drivers

```typescript
// Current categories:
'demand' | 'productivity' | 'scheduling' | 'overtime' | 'wage-rate' | 'forecast' | 'execution'

// To add new category:
// 1. Update VarianceDriver type in src/types/index.ts
// 2. Add to category union type
// 3. Update generateLaborMetrics() to include
// 4. Update components that display categories
```

### Changing Risk Levels

```typescript
// Current distribution: 3 on-track, 3 caution, 2 at-risk
// To change:

// 1. Modify riskLevel in metricsMap
h1: {
  // ... metrics ...
  riskLevel: 'caution',  // changed from 'at-risk'
}

// 2. Update MOCK_PORTFOLIO_METRICS counts
{
  hotelsOnTrack: 4,      // was 3
  hotelsInCaution: 2,    // was 3
  hotelsAtRisk: 2,       // unchanged
}

// 3. Update MOCK_RISK_DISTRIBUTION if needed
```

---

## Data Relationships

### Data Flow in Portfolio Overview

```
MOCK_HOTELS (Hotel[])
    ↓
MOCK_LABOR_METRICS (LaborMetrics[])
    ↓
MOCK_PORTFOLIO_METRICS (summary)
MOCK_HOTELS_REQUIRING_ATTENTION (ranked list)
MOCK_RISK_DISTRIBUTION (scatter data)
MOCK_TOP_VARIANCE_DRIVERS (driver breakdown)
MOCK_AI_INSIGHTS (recommendations)
```

### Component → Data Mapping

| Component | Uses | Purpose |
|-----------|------|---------|
| MetricCard (KPIs) | MOCK_PORTFOLIO_METRICS | Executive summary |
| HotelsRequiringAttention | MOCK_HOTELS_REQUIRING_ATTENTION | Property ranking |
| RiskDistributionChart | MOCK_RISK_DISTRIBUTION | Risk visualization |
| TopVarianceDrivers | MOCK_TOP_VARIANCE_DRIVERS | Driver breakdown |
| AI Insight Banner | MOCK_AI_INSIGHTS[0] | Top recommendation |

---

## Realistic Data Values

### Labor Hours (per month)
- Select Service (100 rooms): 4,000-6,000 hours
- Upscale (150-200 rooms): 7,000-10,000 hours
- Upper Upscale (180-250 rooms): 10,000-13,000 hours
- Luxury (250+ rooms): 13,000-18,000 hours

### Labor Cost (per month)
- Average wage rate: $15/hour
- Hours × $15 = monthly cost
- Varies by market (urban higher, rural lower)

### Overtime Hours (per month)
- Target: 2-5% of total hours
- Realistic variance: 1-12% of total
- Concentration risk when >50% in 2 departments

### Variance Percentages
- Budget variance: typically ±5% normal, >±10% alarm
- Demand adjustment: ±3% typical
- Productivity: ±5-10% realistic range
- Execution: ±3-7% normal

### Forecast Confidence
- Good forecast: 80-95%
- Adequate forecast: 70-80%
- Poor forecast: <70%

---

## Adding a New Variance Driver

### Example: Add "Agency Labor"

1. **Update Type** (src/types/index.ts):
```typescript
export interface VarianceDriver {
  category: '...' | 'agency-labor';
  // ... rest unchanged
}
```

2. **Add to Mock Data** (src/data/mockData.ts):
```typescript
h1: {
  // ... existing metrics ...
  varianceDrivers: [
    // ... existing drivers ...
    {
      category: 'agency-labor',
      impact: 3500,
      percentage: 11,
      description: 'Agency staffing used in housekeeping',
    }
  ]
}
```

3. **Update Components** if needed:
```typescript
// If component has hard-coded category colors/icons, add handling
const driverColors = {
  'agency-labor': '#FF9800', // Define color
  // ... etc
}
```

---

## Testing Data Validity

### Validation Checks

- [ ] All hotels have metrics
- [ ] Actual variance matches calculated percentage
- [ ] Risk levels align with variance magnitude
- [ ] Variance drivers sum to total variance (±rounding)
- [ ] Percentages sum to ~100% per category
- [ ] Risk distribution points within 0-100 range
- [ ] Impact amounts are positive (unless under-standard)

### Example Validation
```typescript
const metric = MOCK_LABOR_METRICS[0];
const driverSum = metric.varianceDrivers.reduce((sum, d) => sum + d.impact, 0);
console.assert(Math.abs(driverSum - metric.actualVariance) < 100, 
  'Driver sum mismatch');
```

---

## Future: Transition to Real Data

### API Layer Structure (Future)

```typescript
// src/api/laborApi.ts
export async function getPortfolioMetrics(): Promise<PortfolioMetrics> {
  const response = await fetch('/api/portfolio/metrics');
  return response.json();
}

export async function getHotelMetrics(hotelId: string): Promise<LaborMetrics> {
  const response = await fetch(`/api/hotels/${hotelId}/metrics`);
  return response.json();
}

// ... more endpoints
```

### Adapter Pattern (Future)

```typescript
// src/data/dataProvider.ts
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA !== 'false';

export async function getPortfolioMetrics(): Promise<PortfolioMetrics> {
  if (USE_MOCK_DATA) {
    return MOCK_PORTFOLIO_METRICS;
  }
  return await laborApi.getPortfolioMetrics();
}

// Component code stays the same, just calls getPortfolioMetrics()
```

This allows seamless transition from mock to real data without changing components.
