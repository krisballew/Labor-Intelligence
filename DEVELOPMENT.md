# Labor Intelligence - Project Setup & Development Guide

## Quick Start (After Installing Dependencies)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

## Project Architecture

### Layered Component Design

```
Pages (Full page layouts)
  ↓
Feature Components (Domain-specific)
  ↓
UI Components (Reusable, stateless)
```

### Data Flow

```
mockData.ts (Simulated API responses)
  ↓
React Components (useState for filtering/navigation)
  ↓
UI Rendering
```

## Current Implementation: Portfolio Overview

### What's Built

✅ **Executive Summary Dashboard** (`src/pages/PortfolioOverview.tsx`)
- 5 key metric cards (Hotels On Track, Caution, Risk, Variance, Overtime)
- Period filter buttons (Previous Month, Current Month, YTD, Current Quarter)
- Three main sections: Hotels Requiring Attention, Risk Distribution, Top Variance Drivers

✅ **UI Component Library** (`src/components/ui/`)
- `MetricCard`: Flexible metric display with icon, label, value, subtext
- `RiskBadge`: Visual risk level indicator (on-track/caution/at-risk)
- `SectionHeader`: Consistent section titles with icons
- `FilterButton`: Toggle-style period/filter selection
- `Currency`: Formatted dollar amounts with color coding
- `Percentage`: Formatted percentage with direction indicator

✅ **Portfolio Components** (`src/components/portfolio/`)
- `HotelsRequiringAttention`: Ranked table of properties by variance impact
- `RiskDistributionChart`: SVG scatter plot (Likelihood vs Financial Impact)
- `TopVarianceDrivers`: Horizontal bar chart of variance drivers

✅ **Type Definitions** (`src/types/index.ts`)
Complete TypeScript interfaces for:
- Hotel, LaborMetrics, RiskLevel
- PortfolioMetrics, HotelRiskSummary
- RiskDistributionPoint, AIInsight
- VarianceDriver

✅ **Mock Data** (`src/data/mockData.ts`)
- 8 sample hotels with varied risk profiles
- 3 hotels on-track, 3 in caution, 2 at risk
- Detailed metrics: actual vs budget/forecast/schedule/standard
- Variance drivers with categorization (demand, productivity, overtime, etc.)
- Risk distribution points for scatter plot
- Top variance drivers showing impact and percentage
- AI insights with recommendations

### Design System

**Colors**:
- Primary: Teal (#0D5463 dark, #1B7A8A, #2A9DAD light)
- Accent: Orange (#E85D1F, #F5A623)
- Risk Levels:
  - On Track: Emerald (#059669)
  - Caution: Amber (#F59E0B)
  - At Risk: Red (#DC2626)

**Typography**:
- Headings: Bold, 16-32px
- Labels: Medium, 12px, uppercase
- Body: Regular, 14px

**Layout**:
- Card-based design
- Responsive grid (1 col mobile, 2 col tablet, 3+ col desktop)
- Consistent spacing: 8px base unit

## Building the Next Phase: Performance Analytics

### Step 1: Create the Performance Page Structure

Create `src/pages/PerformanceAnalytics.tsx`:
```typescript
export const PerformanceAnalytics: React.FC = () => {
  const [tab, setTab] = useState('actual-vs-budget');
  
  return (
    <div>
      {/* Tab navigation: Actual vs Budget, Forecast, Schedule, Standards */}
      {/* Content changes based on active tab */}
    </div>
  );
};
```

### Step 2: Create Performance-Specific Components

In `src/components/performance/`:
- `PerformanceHeader`: Show selected hotel/region/brand
- `MetricsComparison`: Side-by-side actual vs target
- `VarianceBreakdown`: Detailed driver analysis
- `DrilldownTable`: Property or department details

### Step 3: Add Navigation

Update `src/App.tsx` or create `src/components/Navigation.tsx`:
```typescript
// Tab or sidebar navigation
// Routes to: Portfolio, Performance, Overtime, Forecast, Productivity, Scenarios, Insights
```

### Step 4: Extend Mock Data

Update `src/data/mockData.ts`:
```typescript
export const MOCK_DEPARTMENT_METRICS = {};
export const MOCK_PERFORMANCE_DETAILS = {};
// Add department-level breakdown
// Add property-level drill-down data
```

## Building Overtime Intelligence

### New Components Needed

- `OvertimeExposure`: Actual vs Scheduled OT summary
- `OvertimeByDepartment`: Department-level OT analysis
- `OvertimeConcentration`: Visualization of OT concentration
- `OvertimeRecoveryPlan`: Recommended OT reduction actions

### New Mock Data

```typescript
export const MOCK_OVERTIME_METRICS = {
  byHotel: { /* actual vs scheduled by property */ },
  byDepartment: { /* housekeeping, F&B, etc. */ },
  byJob: { /* specific roles */ },
  byEmployee: { /* optional; privacy-aware */ },
};
```

## Building the Mid-Month Forecast

### Key Metrics to Track

- MTD actual hours vs budget
- Remaining month forecast
- Projected month-end position
- Recovery gap
- Forecast confidence score

### Components

- `ForecastSummary`: MTD and projected month-end
- `ForecastTimeline`: Visual timeline of actual → forecast → projection
- `RecoveryPlanner`: What-if scenarios for recovery
- `ConfidenceIndicator`: Visual confidence level

## Building Scenario Lab

### Architecture Pattern

```typescript
interface ScenarioInput {
  occupancy: number;
  revenue: number;
  wageRate: number;
  productivity: number;
  overtimeLimit: number;
  agencyUsage: number;
  // ... more variables
}

interface ScenarioOutput {
  laborHours: number;
  laborCost: number;
  budgetVariance: number;
  overtimeExposure: number;
  monthEndProjection: number;
}

function simulateScenario(input: ScenarioInput): ScenarioOutput {
  // Calculate based on business logic
}
```

### Components

- `ScenarioInputs`: Slider controls for each variable
- `ScenarioComparison`: Actual vs Scenario visualization
- `RecoveryCalculator`: What recovery is needed
- `ImpactSummary`: Summary of scenario impacts

## Building Productivity Benchmarking

### Data Needed

```typescript
interface ProductivityBenchmark {
  hotelId: string;
  department: string;
  actualProductivity: number;
  standardProductivity: number;
  peerAverage: number;
  improvement: number;
}
```

### Components

- `ProductivityComparison`: Hotel vs peers vs standard
- `DepartmentAnalysis`: Department productivity gaps
- `TrendLine`: Productivity over time
- `BestPracticeReference`: Leading properties

## Building AI Insights Hub

### Insight Types

1. **Cost Risk**: Over-budget situations with root cause
2. **Quality Risk**: Under-standard situations with guest impact
3. **Overtime Risk**: Uncontrolled OT exposure
4. **Operational Risk**: Execution/scheduling issues
5. **Forecast Risk**: Forecast accuracy problems
6. **Productivity Risk**: Productivity gaps

### Components

- `InsightCard`: Individual insight with confidence/impact
- `InsightList`: Prioritized list by impact/urgency
- `ReccommendationDetail`: Full action plan with owner/timing
- `InsightFilter`: Filter by type, timeframe, impact

## Integration Checklist

### Phase 1 (Current - Portfolio Overview) ✅

- [x] Project setup (Vite, React, TypeScript, Tailwind)
- [x] Component library
- [x] Mock data structure
- [x] Portfolio Overview page
- [x] Type definitions
- [x] Responsive design
- [x] README documentation

### Phase 2 (Performance Analytics)

- [ ] Navigation/routing structure
- [ ] Performance Analytics page
- [ ] Performance-specific components
- [ ] Department-level mock data
- [ ] Property drill-down data
- [ ] Active tab state management

### Phase 3 (Overtime Intelligence)

- [ ] Overtime page
- [ ] Actual vs Scheduled components
- [ ] Department breakdown
- [ ] Recovery opportunity identification
- [ ] Overtime mock data

### Phase 4 (Mid-Month Forecast)

- [ ] Forecast page
- [ ] MTD tracking
- [ ] Month-end projection
- [ ] Recovery gap calculation
- [ ] Forecast confidence logic

### Phase 5 (Scenario Lab)

- [ ] Scenario input controls
- [ ] Simulation logic
- [ ] Impact visualization
- [ ] Recovery calculator
- [ ] Scenario comparison

### Phase 6 (Productivity Benchmarking)

- [ ] Productivity comparison view
- [ ] Peer benchmarking
- [ ] Department analysis
- [ ] Trend visualization
- [ ] Best practice highlighting

### Phase 7 (AI Insights)

- [ ] Insight prioritization logic
- [ ] Insight card components
- [ ] Root cause explanations
- [ ] Recommendation engine
- [ ] Insight filtering/search

### Phase 8 (Refinements)

- [ ] API integration (replace mock data)
- [ ] Performance optimization
- [ ] Export/reporting features
- [ ] Advanced filtering
- [ ] Dashboard customization
- [ ] Mobile optimization

## Testing the Current Build

### Manual Testing

1. Open http://localhost:5173
2. Verify all metrics display correctly
3. Test period filter buttons
4. Hover over risk distribution dots
5. Verify responsive layout on different screen sizes
6. Check color accuracy matches design reference

### Performance Testing

- Open DevTools Performance tab
- Check initial load time
- Verify no console errors
- Check memory usage

## Common Development Tasks

### Adding a New Component

1. Create file: `src/components/[category]/NewComponent.tsx`
2. Define props interface
3. Implement with TypeScript
4. Add to exports if needed
5. Import in parent component

### Adding Mock Data

1. Add type to `src/types/index.ts`
2. Create data in `src/data/mockData.ts`
3. Export from mockData
4. Import in components
5. Pass as props or use in hooks

### Styling a Component

1. Use Tailwind classes for styling
2. Define custom classes in `src/index.css` as needed
3. Use the color variables from `tailwind.config.js`
4. Keep styles responsive with breakpoints

### Creating a New Page

1. Create `src/pages/NewPage.tsx`
2. Import needed components
3. Compose layout
4. Export component
5. Add to App routing (future)

## Production Build

```bash
# Create optimized production build
npm run build

# Output goes to dist/
# All assets are optimized and minified
# Tailwind CSS is purged of unused styles
```

## Future Enhancements

1. **Backend Integration**: Replace mock data with real API calls
2. **Real-time Updates**: WebSocket integration for live metrics
3. **Export Features**: PDF reports, CSV exports, email scheduling
4. **Advanced Filtering**: Multi-select filters, saved views
5. **Customization**: Dashboard customization, user preferences
6. **Mobile App**: React Native or PWA version
7. **Integration**: Connect to payroll, scheduling, PMS systems
8. **ML Models**: More sophisticated forecasting and recommendations

## Questions for Product Review

1. Should filters apply across all pages or per-page?
2. What is the drill-down path: Portfolio → Region → Brand → Hotel → Department?
3. Should Scenario Lab results be shareable/storable?
4. What historical data should be retained for trends?
5. Are there specific departments to prioritize for early versions?
6. Should insights be AI-generated or editor-curated initially?
