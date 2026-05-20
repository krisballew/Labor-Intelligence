# Labor Intelligence - Architecture & Roadmap

## System Architecture

### Frontend Application Stack

```
┌─────────────────────────────────────────────────────┐
│            Labor Intelligence UI Layer               │
├─────────────────────────────────────────────────────┤
│  Pages (Portfolio, Performance, Overtime, etc.)      │
├─────────────────────────────────────────────────────┤
│  Feature Components (Portfolio, Performance, etc.)   │
├─────────────────────────────────────────────────────┤
│  UI Components (MetricCard, Charts, Tables, etc.)    │
├─────────────────────────────────────────────────────┤
│  Tailwind CSS + Lucide Icons                         │
├─────────────────────────────────────────────────────┤
│  TypeScript Types & Interfaces                       │
├─────────────────────────────────────────────────────┤
│  Mock Data Layer (Future: API Layer)                 │
└─────────────────────────────────────────────────────┘
           ↓ (Future Integration)
        Backend API
     (Node.js/Express)
           ↓
      Database Layer
   (PostgreSQL/MongoDB)
```

### Key Design Principles

1. **Separation of Concerns**
   - UI Components: Presentation only
   - Feature Components: Domain logic + presentation
   - Pages: Orchestration of features
   - Data: Mock data separate from components

2. **Type Safety**
   - Full TypeScript strict mode
   - Interfaces for all major concepts
   - No `any` types

3. **Reusability**
   - Shared UI component library
   - Consistent styling approach
   - Card-based layout pattern

4. **Responsiveness**
   - Mobile-first Tailwind approach
   - Adaptive grid layouts
   - Touch-friendly interactions

## Feature Implementation Roadmap

### Phase 1: Foundation ✅ (COMPLETE)

**Portfolio Overview Dashboard**

Features:
- Executive summary metrics (6 KPIs)
- Hotels requiring attention (ranked table)
- Risk distribution matrix (scatter plot)
- Top variance drivers (bar chart)
- AI insight banner
- Period filtering (Previous Month, Current Month, YTD, Current Quarter)

Timeline: Weeks 1-2 (Complete)
Status: Ready for review

Deliverables:
- ✅ Complete UI implementation
- ✅ Mock data structure
- ✅ Type definitions
- ✅ Responsive design
- ✅ Documentation

### Phase 2: Performance Analytics (2-3 weeks)

**Actual vs Budget / Forecast / Schedule / Standards**

Components:
- Tab navigation for comparison type selection
- Metrics comparison (side-by-side actual vs target)
- Variance breakdown (driver analysis)
- Property-level drill-down
- Department-level analysis (housekeeping, F&B, etc.)

Data Structure:
```typescript
interface PerformanceMetrics {
  propertyId: string;
  comparisonType: 'budget' | 'forecast' | 'schedule' | 'standards';
  actualHours: number;
  targetHours: number;
  variance: number;
  percentageVariance: number;
  drivers: VarianceDriver[];
  byDepartment: DepartmentBreakdown[];
}
```

Key Insights:
- Identify demand-driven vs controllable variance
- Surface quality risk (under-standard)
- Detect execution issues

### Phase 3: Overtime Intelligence (2-3 weeks)

**Actual vs Scheduled Overtime**

Components:
- Overtime summary (actual vs scheduled)
- By hotel breakdown
- By department breakdown
- By job role breakdown
- Concentration analysis (where is OT concentrated?)
- Avoidable vs unavoidable classification

Data Structure:
```typescript
interface OvertimeMetrics {
  propertyId: string;
  actualOvertime: number;
  scheduledOvertime: number;
  targetOvertime: number;
  exposureNextMonth: number;
  byDepartment: { [dept: string]: OvertimeDetail };
  concentrationRisk: 'low' | 'medium' | 'high';
  recoveryOpportunity: number;
}
```

Key Insights:
- Identify OT concentration (critical roles)
- Flag unplanned OT (schedule vs actual gap)
- Quantify recovery opportunity
- Recommend preventive actions

### Phase 4: Mid-Month Forecast (2-3 weeks)

**Proactive Month-End Position**

Components:
- Month-to-date summary (actual vs plan)
- Remaining month forecast
- Projected month-end position
- Recovery gap identification
- Confidence indicator
- Recommended actions

Data Structure:
```typescript
interface MidMonthForecast {
  propertyId: string;
  mtdActualHours: number;
  mtdBudgetHours: number;
  mtdVariance: number;
  remainingDays: number;
  remainingBudget: number;
  remainingForecast: number;
  projectedMonthEnd: {
    hours: number;
    cost: number;
    variance: number;
    variancePercent: number;
  };
  forecastConfidence: number;
  recoveryGap: number;
  recommendedActions: Action[];
}
```

Key Insights:
- Surface month-end exposure early
- Distinguish budget vs demand support
- Identify controllable recovery
- Track forecast accuracy

### Phase 5: Productivity Benchmarking (2-3 weeks)

**Performance Comparison**

Components:
- Hotel comparison (vs standard, vs peers)
- Department breakdown
- Trend line (over time)
- Best practice examples
- Productivity gap analysis

Data Structure:
```typescript
interface ProductivityBenchmark {
  propertyId: string;
  department: string;
  actualProductivity: number; // hours per room/cover/transaction
  standardProductivity: number;
  peerAverageProductivity: number;
  gap: number;
  trend: number; // month-over-month change
  improvementOpportunity: number;
}
```

Key Insights:
- Identify high/low productivity properties
- Surface improvement opportunities
- Track productivity trends
- Enable peer learning

### Phase 6: Scenario Lab (3-4 weeks)

**What-If Analysis & Decision Support**

Components:
- Input controls (sliders for key variables)
- Real-time impact calculation
- Scenario comparison (actual vs scenario)
- Recovery planning mode
- Scenario saving/sharing (future)

Controllable Variables:
- Occupancy (±%)
- Revenue (±%)
- Wage rates (±%)
- Overtime limit (hours)
- Productivity improvement (±%)
- Agency labor (hours)
- Staffing changes
- Rooms out of service
- Group demand adjustments
- Forecast assumptions

Impact Outputs:
- Labor hours change
- Labor cost change
- Budget variance change
- OT exposure change
- Quality risk change
- Month-end projection
- Recovery gap

Key Insights:
- Enable data-driven decision making
- Quantify recovery paths
- Identify lever effectiveness
- Build confidence in actions

### Phase 7: AI Insights Hub (3-4 weeks)

**Prioritized Recommendations & Action Plans**

Components:
- Insight prioritization (by impact/urgency)
- Insight detail view (root cause + actions)
- Insight filtering/search
- Owner assignment
- Timeline tracking
- Outcome tracking (did action help?)

Insight Types:
1. **Cost Risk**: Over-budget situations
   - Impact: $X over/under
   - Confidence: X%
   - Root cause: demand, productivity, execution, etc.
   - Actions: specific, quantified recommendations

2. **Quality Risk**: Under-standard situations
   - Impact: service/guest risk assessment
   - Confidence: X%
   - Root cause: understaffing, scheduling
   - Actions: coverage protection

3. **Overtime Risk**: OT exposure
   - Impact: $X additional cost if unchanged
   - Confidence: X%
   - Root cause: scheduling, demand, capacity
   - Actions: OT reduction

4. **Operational Risk**: Execution issues
   - Impact: hours leakage, schedule non-compliance
   - Confidence: X%
   - Root cause: manager discipline, employee behavior
   - Actions: process improvements

5. **Forecast Risk**: Forecast inaccuracy
   - Impact: labor plan misalignment
   - Confidence: X%
   - Root cause: demand volatility, forecast model
   - Actions: reforecasting, schedule flexibility

6. **Productivity Risk**: Productivity gaps
   - Impact: $X excess labor vs standard
   - Confidence: X%
   - Root cause: workflow, staffing, equipment
   - Actions: optimization, training

Data Structure:
```typescript
interface AIInsight {
  id: string;
  type: RiskType;
  propertyId: string;
  title: string;
  description: string;
  
  // Evidence
  metricName: string;
  actualValue: number;
  expectedValue: number;
  variance: number;
  
  // Impact
  dollarImpact: number;
  hoursImpact: number;
  qualityRisk: 'low' | 'medium' | 'high';
  
  // Confidence
  confidence: number; // 0-100
  dataQuality: 'high' | 'medium' | 'low';
  
  // Action
  recommendedAction: string;
  actionOwner: string; // role or name
  actionTimeframe: 'immediate' | 'this-week' | 'this-month';
  estimatedRecovery: number;
  
  // Status
  status: 'new' | 'acknowledged' | 'in-progress' | 'resolved';
  createdDate: Date;
  targetDate: Date;
}
```

### Phase 8: Refinements & Integration (Ongoing)

**Backend Integration**
- Replace mock data with real API calls
- Authentication & authorization
- Data persistence
- Real-time updates (WebSocket)

**Performance Optimization**
- Code splitting by feature
- Lazy loading of pages
- Image optimization
- Bundle analysis

**Advanced Features**
- CSV/PDF export
- Email scheduling
- Custom dashboards
- Saved filters/views
- Advanced search
- Comparison mode (hotel vs hotel, period vs period)

**Mobile & Accessibility**
- Responsive design completion
- Touch interactions
- Keyboard navigation
- Screen reader support
- Dark mode (optional)

## Data Model Expansion

### Current (Phase 1)
- Hotel (property definition)
- LaborMetrics (performance data)
- PortfolioMetrics (aggregated)
- VarianceDriver (root cause)
- AIInsight (recommendation)

### Future Additions
- DepartmentMetrics (housekeeping, F&B, etc.)
- EmployeeMetrics (optional, privacy-aware)
- ScheduleData (shift details)
- PayrollData (wage rates, actual vs budgeted)
- ForecastData (demand, labor forecast)
- StandardsData (productivity standards)
- BenchmarkData (peer comparisons)
- ScenarioData (what-if results)
- ActionPlanData (recommendations tracking)

## API Integration (Future)

### Endpoints Needed
```
GET /api/portfolio/metrics
GET /api/hotels/{hotelId}/metrics
GET /api/hotels/{hotelId}/performance
GET /api/hotels/{hotelId}/overtime
GET /api/hotels/{hotelId}/forecast
GET /api/hotels/{hotelId}/productivity
POST /api/scenarios/calculate
GET /api/insights
GET /api/insights/{insightId}
```

### Data Flow (Future)
```
Backend API → React State (useState/useContext) → Components → UI
```

## Development Environment

### Current Tools
- Node.js 16+
- npm/yarn
- Vite (dev server + bundler)
- TypeScript (type checking)
- Tailwind CSS (styling)
- Lucide React (icons)

### Recommended Tools for Next Phase
- React Router (navigation)
- Zustand or Context API (state management)
- React Query or SWR (data fetching)
- Jest & React Testing Library (testing)
- Storybook (component documentation)
- ESLint & Prettier (code quality)

## Success Metrics

### Phase 1 (Current)
- [x] Portfolio Overview loads without errors
- [x] All metrics display correctly
- [x] Responsive on mobile/tablet/desktop
- [x] No console errors or warnings
- [x] Load time < 2 seconds

### Phase 2+
- Performance Analytics accessed by 80%+ of users
- Insights acted upon within 1 week (80%+)
- Month-end variance predictions accurate within ±5%
- Scenario Lab prevents 10+ hours/month unplanned OT
- Productivity benchmarking drives 2% improvement

## Known Limitations & Assumptions

1. **Mock Data**: Currently using static mock data; will integrate real API
2. **Single Portfolio**: No multi-tenant support yet
3. **Read-Only**: No ability to create actions or update recommendations yet
4. **No Export**: CSV/PDF export coming in Phase 8
5. **No Historical Data**: Trends coming in Phase 5+
6. **No Real-Time Updates**: Static data; real-time updates in Phase 8
7. **No Complex Filtering**: Basic period filters only; advanced filtering in Phase 8

## Questions for Stakeholders

1. **Navigation Model**: Global nav or page-based navigation?
2. **Drill-Down Path**: Portfolio → Region → Hotel → Department → Shift?
3. **Comparison Modes**: Support period-over-period comparisons?
4. **Export Features**: Priority (PDF, CSV, Email, Dashboards)?
5. **Integration Points**: Which systems should connect (PMS, Payroll, Scheduling)?
6. **Historical Depth**: How many months/years of history needed?
7. **Granularity**: Employee-level detail or stop at department?
8. **Mobile Support**: Full mobile app or responsive web?
