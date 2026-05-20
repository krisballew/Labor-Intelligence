# Labor Intelligence

An AI-powered labor performance platform designed for hotel operators to gain complete visibility and control of labor performance across their portfolio.

## Overview

Labor Intelligence provides hotel executives, regional leaders, and general managers with:

- **Executive visibility** across single hotels, groups, regions, brands, or entire portfolio
- **Performance measurement** comparing actual vs budget, forecast, schedule, and standards
- **AI-powered diagnosis** of labor variance root causes and business impact
- **Forward-looking forecasting** to predict month-end position and exposure
- **Scenario planning** to model decisions before implementation
- **Actionable insights** and recovery recommendations

## Project Structure

```
labor-intelligence/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   └── portfolio/       # Portfolio-specific components
│   ├── pages/               # Page components
│   ├── data/                # Mock data and API integration
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Root app component
│   ├── main.tsx             # Vite entry point
│   └── index.css            # Global styles and Tailwind
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development server and bundling)
- **Styling**: Tailwind CSS + custom CSS
- **Icons**: Lucide React
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will open automatically at `http://localhost:5173`.

## Features Implemented

### ✅ Portfolio Overview (Phase 1)

The current prototype includes the executive portfolio overview dashboard:

- **Key Metrics**: Hotels on track, in caution, at risk, total labor variance, and overtime exposure
- **Hotels Requiring Attention**: Ranked table of properties by labor variance impact
- **Risk Distribution Chart**: Scatter plot showing likelihood vs financial impact of labor risk
- **Top Variance Drivers**: Breakdown of controllable and uncontrollable variance sources
- **AI Insight Banner**: Executive summary of portfolio labor position and recommendations

### Mock Data

The prototype includes comprehensive mock data based on the product narrative:

- 8 sample hotels with varied risk profiles
- Labor metrics for budget, forecast, schedule, and standard comparisons
- Overtime data and productivity variances
- Risk distributions across the portfolio
- AI-generated insights and recommendations

## Features Coming Next (Phase 2)

1. **Performance Analytics**
   - Actual vs Budget detailed view
   - Actual vs Forecast analysis
   - Actual vs Schedule execution tracking
   - Actual vs Standards operational review

2. **Overtime Intelligence**
   - Actual overtime tracking
   - Scheduled overtime exposure
   - Concentration analysis by department/role
   - Avoidable vs unavoidable classification

3. **Mid-Month Forecast**
   - Month-to-date actuals vs plan
   - Remaining period forecast
   - Month-end projection
   - Recovery opportunity identification

4. **Productivity Benchmarking**
   - Hotel productivity comparison
   - Department-level analysis
   - Normalization factors (service level, occupancy, etc.)
   - Best practice identification

5. **Scenario Lab**
   - What-if analysis
   - Variable adjustment (occupancy, wage rates, productivity, etc.)
   - Impact modeling
   - Recovery planning

6. **AI Insights Hub**
   - Prioritized recommendations
   - Root cause analysis
   - Recovery action plans
   - Confidence levels and impact quantification

## Data Model

Key TypeScript types define the data structure:

- `Hotel`: Property-level information
- `LaborMetrics`: Performance measurements (actual vs budget/forecast/schedule/standard)
- `PortfolioMetrics`: Aggregated portfolio-level metrics
- `RiskDistributionPoint`: Risk matrix data
- `VarianceDriver`: Root cause categorization
- `AIInsight`: AI-generated recommendations

See `src/types/index.ts` for complete type definitions.

## Styling

The prototype uses:

- **Tailwind CSS** for utility-first styling
- **Custom component classes** for consistent card styling
- **Color scheme**: Teal (#0D5463, #1B7A8A) for primary, Orange (#E85D1F) for variance/risk
- **Responsive design** with Tailwind breakpoints (mobile-first approach)

## Development Guidelines

### Component Structure

- **UI Components** (`src/components/ui/`): Reusable, stateless presentational components
- **Feature Components** (`src/components/portfolio/`): Domain-specific components with some logic
- **Page Components** (`src/pages/`): Full page layouts that compose features

### Adding New Features

1. Define types in `src/types/index.ts`
2. Create mock data in `src/data/mockData.ts`
3. Build components bottom-up (UI → Features → Pages)
4. Import and compose in page components
5. Add routing as needed (future)

## Performance Considerations

- Mock data is pre-generated and not fetched
- SVG charts are used for scalability
- Component reusability reduces bundle size
- Tailwind CSS is optimized for production

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)