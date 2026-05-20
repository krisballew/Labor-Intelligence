import {
  Hotel,
  LaborMetrics,
  RiskLevel,
  PortfolioMetrics,
  HotelRiskSummary,
  RiskDistributionPoint,
  TopVarianceDriver,
  AIInsight,
  LaborQuickStatsSection,
  QuickStatRow,
} from '../types';

// Sample hotels
export const MOCK_HOTELS: Hotel[] = [
  {
    id: 'h1',
    name: 'Seaside Resort',
    region: 'West Coast',
    brand: 'Luxury',
    serviceLevel: 'luxury',
    roomCount: 250,
  },
  {
    id: 'h2',
    name: 'Metro Downtown',
    region: 'Northeast',
    brand: 'Upscale',
    serviceLevel: 'upper-upscale',
    roomCount: 180,
  },
  {
    id: 'h3',
    name: 'Lakeside Hotel',
    region: 'Midwest',
    brand: 'Upscale',
    serviceLevel: 'upscale',
    roomCount: 150,
  },
  {
    id: 'h4',
    name: 'Airport Suites',
    region: 'Northeast',
    brand: 'Select Service',
    serviceLevel: 'select-service',
    roomCount: 120,
  },
  {
    id: 'h5',
    name: 'City Center Inn',
    region: 'Midwest',
    brand: 'Select Service',
    serviceLevel: 'select-service',
    roomCount: 100,
  },
  {
    id: 'h6',
    name: 'Beach Paradise',
    region: 'West Coast',
    brand: 'Upscale',
    serviceLevel: 'upscale',
    roomCount: 200,
  },
  {
    id: 'h7',
    name: 'Mountain Lodge',
    region: 'West Coast',
    brand: 'Upscale',
    serviceLevel: 'upscale',
    roomCount: 175,
  },
  {
    id: 'h8',
    name: 'Downtown Plaza',
    region: 'South',
    brand: 'Upscale',
    serviceLevel: 'upscale',
    roomCount: 160,
  },
];

// Generate labor metrics for each hotel
const generateLaborMetrics = (hotelId: string): LaborMetrics => {
  const metricsMap: { [key: string]: Omit<LaborMetrics, 'hotelId' | 'periodEnd'> } = {
    h1: {
      // Seaside Resort - At Risk
      actualHours: 12100,
      budgetedHours: 11500,
      forecastedHours: 11800,
      scheduledHours: 11700,
      standardHours: 11200,
      actualCost: 181500,
      budgetedCost: 172500,
      forecastedCost: 177000,
      actualOvertimeHours: 850,
      scheduledOvertimeHours: 720,
      ovetimeRate: 1.5,
      actualVariance: 5.2,
      costVariance: 5.2,
      riskLevel: 'at-risk',
      varianceDrivers: [
        {
          category: 'overtime',
          impact: 12800,
          percentage: 40,
          description: 'Scheduled overtime 18% above target',
        },
        {
          category: 'productivity',
          impact: 9200,
          percentage: 29,
          description: 'Housekeeping productivity 8.4% below standard',
        },
        {
          category: 'demand',
          impact: 6000,
          percentage: 19,
          description: 'Higher occupancy than budgeted',
        },
        {
          category: 'execution',
          impact: 3600,
          percentage: 12,
          description: 'Hours above schedule (early clock-in/late clock-out)',
        },
      ],
    },
    h2: {
      // Metro Downtown - At Risk
      actualHours: 9200,
      budgetedHours: 8800,
      forecastedHours: 9000,
      scheduledHours: 8900,
      standardHours: 8600,
      actualCost: 147200,
      budgetedCost: 140800,
      forecastedCost: 144000,
      actualOvertimeHours: 650,
      scheduledOvertimeHours: 580,
      ovetimeRate: 1.5,
      actualVariance: 4.5,
      costVariance: 4.5,
      riskLevel: 'at-risk',
      varianceDrivers: [
        {
          category: 'overtime',
          impact: 9700,
          percentage: 50,
          description: 'Actual overtime exceeds scheduled',
        },
        {
          category: 'productivity',
          impact: 5200,
          percentage: 27,
          description: 'Food & beverage productivity gap',
        },
        {
          category: 'demand',
          impact: 3100,
          percentage: 16,
          description: 'Occupancy aligned with forecast',
        },
        {
          category: 'execution',
          impact: 1700,
          percentage: 7,
          description: 'Schedule compliance variance',
        },
      ],
    },
    h3: {
      // Lakeside Hotel - Caution
      actualHours: 8500,
      budgetedHours: 8200,
      forecastedHours: 8400,
      scheduledHours: 8300,
      standardHours: 8100,
      actualCost: 127500,
      budgetedCost: 123000,
      forecastedCost: 126000,
      actualOvertimeHours: 520,
      scheduledOvertimeHours: 480,
      ovetimeRate: 1.5,
      actualVariance: 3.7,
      costVariance: 3.7,
      riskLevel: 'caution',
      varianceDrivers: [
        {
          category: 'overtime',
          impact: 6400,
          percentage: 45,
          description: 'Overtime trending above target',
        },
        {
          category: 'demand',
          impact: 3200,
          percentage: 35,
          description: 'Higher-than-budgeted occupancy',
        },
        {
          category: 'productivity',
          impact: 2400,
          percentage: 17,
          description: 'Slight productivity variance',
        },
        {
          category: 'execution',
          impact: 500,
          percentage: 3,
          description: 'Minor schedule variance',
        },
      ],
    },
    h4: {
      // Airport Suites - Caution
      actualHours: 6200,
      budgetedHours: 6000,
      forecastedHours: 6100,
      scheduledHours: 6050,
      standardHours: 5900,
      actualCost: 93000,
      budgetedCost: 90000,
      forecastedCost: 91500,
      actualOvertimeHours: 380,
      scheduledOvertimeHours: 320,
      ovetimeRate: 1.5,
      actualVariance: 3.3,
      costVariance: 3.3,
      riskLevel: 'caution',
      varianceDrivers: [
        {
          category: 'demand',
          impact: 2800,
          percentage: 50,
          description: 'Demand-driven labor increase',
        },
        {
          category: 'overtime',
          impact: 1800,
          percentage: 32,
          description: 'Overtime higher than planned',
        },
        {
          category: 'productivity',
          impact: 800,
          percentage: 14,
          description: 'Productivity stable',
        },
        {
          category: 'execution',
          impact: 200,
          percentage: 4,
          description: 'Schedule adherence good',
        },
      ],
    },
    h5: {
      // City Center Inn - Caution
      actualHours: 5400,
      budgetedHours: 5200,
      forecastedHours: 5300,
      scheduledHours: 5250,
      standardHours: 5100,
      actualCost: 81000,
      budgetedCost: 78000,
      forecastedCost: 79500,
      actualOvertimeHours: 320,
      scheduledOvertimeHours: 280,
      ovetimeRate: 1.5,
      actualVariance: 3.8,
      costVariance: 3.8,
      riskLevel: 'caution',
      varianceDrivers: [
        {
          category: 'demand',
          impact: 2100,
          percentage: 55,
          description: 'Group arrivals above plan',
        },
        {
          category: 'overtime',
          impact: 1200,
          percentage: 31,
          description: 'Weekend compression impact',
        },
        {
          category: 'execution',
          impact: 500,
          percentage: 13,
          description: 'Schedule adjustments made',
        },
        {
          category: 'productivity',
          impact: 100,
          percentage: 1,
          description: 'Productivity on target',
        },
      ],
    },
    h6: {
      // Beach Paradise - On Track
      actualHours: 9600,
      budgetedHours: 9600,
      forecastedHours: 9600,
      scheduledHours: 9550,
      standardHours: 9550,
      actualCost: 144000,
      budgetedCost: 144000,
      forecastedCost: 144000,
      actualOvertimeHours: 420,
      scheduledOvertimeHours: 420,
      ovetimeRate: 1.5,
      actualVariance: 0.0,
      costVariance: 0.0,
      riskLevel: 'on-track',
      varianceDrivers: [
        {
          category: 'demand',
          impact: 0,
          percentage: 0,
          description: 'Demand aligned with forecast',
        },
        {
          category: 'productivity',
          impact: 0,
          percentage: 0,
          description: 'Productivity at standard',
        },
        {
          category: 'overtime',
          impact: 0,
          percentage: 0,
          description: 'Overtime at target',
        },
        {
          category: 'execution',
          impact: 0,
          percentage: 0,
          description: 'Excellent schedule adherence',
        },
      ],
    },
    h7: {
      // Mountain Lodge - On Track
      actualHours: 8800,
      budgetedHours: 8800,
      forecastedHours: 8800,
      scheduledHours: 8750,
      standardHours: 8750,
      actualCost: 132000,
      budgetedCost: 132000,
      forecastedCost: 132000,
      actualOvertimeHours: 380,
      scheduledOvertimeHours: 380,
      ovetimeRate: 1.5,
      actualVariance: 0.0,
      costVariance: 0.0,
      riskLevel: 'on-track',
      varianceDrivers: [
        {
          category: 'demand',
          impact: 0,
          percentage: 0,
          description: 'Demand matched expectations',
        },
        {
          category: 'productivity',
          impact: 0,
          percentage: 0,
          description: 'Above standard performance',
        },
        {
          category: 'overtime',
          impact: 0,
          percentage: 0,
          description: 'Well-controlled',
        },
        {
          category: 'execution',
          impact: 0,
          percentage: 0,
          description: 'Excellent execution',
        },
      ],
    },
    h8: {
      // Downtown Plaza - On Track
      actualHours: 7900,
      budgetedHours: 7900,
      forecastedHours: 7900,
      scheduledHours: 7850,
      standardHours: 7850,
      actualCost: 118500,
      budgetedCost: 118500,
      forecastedCost: 118500,
      actualOvertimeHours: 320,
      scheduledOvertimeHours: 320,
      ovetimeRate: 1.5,
      actualVariance: 0.0,
      costVariance: 0.0,
      riskLevel: 'on-track',
      varianceDrivers: [
        {
          category: 'demand',
          impact: 0,
          percentage: 0,
          description: 'Aligned with forecast',
        },
        {
          category: 'productivity',
          impact: 0,
          percentage: 0,
          description: 'Consistent performance',
        },
        {
          category: 'overtime',
          impact: 0,
          percentage: 0,
          description: 'Controlled',
        },
        {
          category: 'execution',
          impact: 0,
          percentage: 0,
          description: 'Strong adherence',
        },
      ],
    },
  };

  const metrics = metricsMap[hotelId] || metricsMap['h1'];
  return {
    hotelId,
    periodEnd: new Date(2024, 3, 30), // April 30, 2024 (previous month)
    ...metrics,
  };
};

export const MOCK_LABOR_METRICS: LaborMetrics[] = MOCK_HOTELS.map((hotel) =>
  generateLaborMetrics(hotel.id)
);

// Portfolio-level metrics
export const MOCK_PORTFOLIO_METRICS: PortfolioMetrics = {
  totalHotels: 8,
  hotelsOnTrack: 3,
  hotelsInCaution: 3,
  hotelsAtRisk: 2,
  totalLaborVariance: 31200, // dollars
  totalLaborVariancePercent: 3.8,
  overtimeExposure: 642000, // Next 4 weeks
  overtimeExposureNextPeriod: 642000,
  forecastConfidence: 78,
  productivityDrift: -2.1,
};

// Hotels requiring attention (sorted by variance)
export const MOCK_HOTELS_REQUIRING_ATTENTION: HotelRiskSummary[] = [
  {
    hotel: MOCK_HOTELS[0],
    metrics: MOCK_LABOR_METRICS[0],
    variance: 9000,
    riskLevel: 'at-risk',
    topVarianceDriver: {
      category: 'overtime',
      impact: 12800,
      percentage: 40,
      description: 'Scheduled overtime 18% above target',
    },
    keyInsight: 'Housekeeping productivity driving controllable variance',
    trend: {
      status: 'persistent',
      periodsActive: 4,
      changeVsPriorPeriod: 6.5,
      note: 'Overtime variance has held above target for 4 consecutive months and is widening.',
    },
  },
  {
    hotel: MOCK_HOTELS[1],
    metrics: MOCK_LABOR_METRICS[1],
    variance: 6400,
    riskLevel: 'at-risk',
    topVarianceDriver: {
      category: 'overtime',
      impact: 9700,
      percentage: 50,
      description: 'Actual overtime exceeds scheduled',
    },
    keyInsight: 'Actual hours exceed schedule in F&B department',
    trend: {
      status: 'worsening',
      periodsActive: 2,
      changeVsPriorPeriod: 22.0,
      note: 'Driver impact up 22% vs prior month; deteriorating quickly.',
    },
  },
  {
    hotel: MOCK_HOTELS[2],
    metrics: MOCK_LABOR_METRICS[2],
    variance: 4500,
    riskLevel: 'caution',
    topVarianceDriver: {
      category: 'overtime',
      impact: 6400,
      percentage: 45,
      description: 'Overtime trending above target',
    },
    keyInsight: 'Monitor overtime concentration in supervisory roles',
    trend: {
      status: 'emerging',
      periodsActive: 1,
      changeVsPriorPeriod: 0,
      note: 'New this period — first month flagged for overtime variance.',
    },
  },
  {
    hotel: MOCK_HOTELS[3],
    metrics: MOCK_LABOR_METRICS[3],
    variance: 3000,
    riskLevel: 'caution',
    topVarianceDriver: {
      category: 'demand',
      impact: 2800,
      percentage: 50,
      description: 'Demand-driven labor increase',
    },
    keyInsight: 'Variance supported by occupancy; continue monitoring',
    trend: {
      status: 'improving',
      periodsActive: 3,
      changeVsPriorPeriod: -15.0,
      note: 'Driver impact down 15% vs prior month; corrective actions taking hold.',
    },
  },
  {
    hotel: MOCK_HOTELS[4],
    metrics: MOCK_LABOR_METRICS[4],
    variance: 3000,
    riskLevel: 'caution',
    topVarianceDriver: {
      category: 'demand',
      impact: 2100,
      percentage: 55,
      description: 'Group arrivals above plan',
    },
    keyInsight: 'Group blocks driving labor above budget',
    trend: {
      status: 'emerging',
      periodsActive: 1,
      changeVsPriorPeriod: 0,
      note: 'New this period — driven by unplanned group arrivals.',
    },
  },
];

// Risk distribution data for scatter plot
export const MOCK_RISK_DISTRIBUTION: RiskDistributionPoint[] = [
  { hotelId: 'h1', hotelName: 'Seaside Resort', likelihood: 85, impact: 90, riskLevel: 'at-risk' },
  { hotelId: 'h2', hotelName: 'Metro Downtown', likelihood: 80, impact: 85, riskLevel: 'at-risk' },
  { hotelId: 'h3', hotelName: 'Lakeside Hotel', likelihood: 60, impact: 65, riskLevel: 'caution' },
  { hotelId: 'h4', hotelName: 'Airport Suites', likelihood: 55, impact: 60, riskLevel: 'caution' },
  { hotelId: 'h5', hotelName: 'City Center Inn', likelihood: 50, impact: 58, riskLevel: 'caution' },
  { hotelId: 'h6', hotelName: 'Beach Paradise', likelihood: 25, impact: 20, riskLevel: 'on-track' },
  { hotelId: 'h7', hotelName: 'Mountain Lodge', likelihood: 30, impact: 25, riskLevel: 'on-track' },
  { hotelId: 'h8', hotelName: 'Downtown Plaza', likelihood: 28, impact: 22, riskLevel: 'on-track' },
];

// Top variance drivers across portfolio
export const MOCK_TOP_VARIANCE_DRIVERS: TopVarianceDriver[] = [
  {
    category: 'Housekeeping Productivity',
    impact: 23200,
    percentage: 34,
    description: '8.4% above standard on high-departure days',
  },
  {
    category: 'Scheduled Overtime',
    impact: 16300,
    percentage: 25,
    description: 'Overtime 18% above target across portfolio',
  },
  {
    category: 'Actual Hours Above Schedule',
    impact: 12100,
    percentage: 20,
    description: 'Early clock-ins and late clock-outs; execution issues',
  },
  {
    category: 'Forecast Error',
    impact: 7800,
    percentage: 12,
    description: 'Occupancy variance not fully anticipated',
  },
  {
    category: 'Wage Rate Variance',
    impact: 4200,
    percentage: 9,
    description: 'Market rate adjustments in select markets',
  },
];

// AI Insights and opportunities
export const MOCK_AI_INSIGHTS: AIInsight[] = [
  {
    id: 'insight-1',
    type: 'cost',
    title: 'Housekeeping Productivity Driving Controllable Variance',
    description:
      'Actual housekeeping hours exceeded standard by 8.4%, creating approximately $18,200 in excess labor cost. The variance is concentrated on high-departure weekends.',
    impact: 18200,
    confidence: 92,
    recommendedAction:
      'Review room attendant productivity, rebalance weekend schedules, and reduce scheduled overtime where coverage exceeds standard.',
    owner: 'Director of Housekeeping',
    timeframe: 'this-week',
  },
  {
    id: 'insight-2',
    type: 'quality',
    title: 'Front Office Labor Below Standard During Peak Arrivals',
    description:
      'Actual front office hours were 6.1% below standard while arrivals exceeded forecast. Although this creates favorable labor variance, it may increase check-in delays and guest satisfaction risk.',
    impact: -4200,
    confidence: 85,
    recommendedAction: 'Protect arrival-window coverage and monitor guest satisfaction metrics.',
    owner: 'General Manager',
    timeframe: 'immediate',
  },
  {
    id: 'insight-3',
    type: 'overtime',
    title: 'Scheduled Overtime Trending Above Target',
    description:
      'Scheduled overtime for the remaining month is projected to exceed target by 680 hours. If unchanged, this will create approximately $21,000 in additional labor cost.',
    impact: 21000,
    confidence: 88,
    recommendedAction:
      'Evaluate schedule optimization and reduce scheduled overtime in housekeeping supervisors and night audit roles.',
    owner: 'Regional Labor Manager',
    timeframe: 'this-week',
  },
  {
    id: 'insight-4',
    type: 'forecast',
    title: 'Demand Forecast Requires Recalibration',
    description:
      'Labor exceeded forecast by 4.2%, but rooms revenue exceeded forecast by 7.6%. The labor increase appears directionally justified by occupancy upside.',
    impact: 8100,
    confidence: 90,
    recommendedAction:
      'Recalibrate demand forecast using actual occupancy data and revenue trends. Focus on overtime containment rather than labor reduction.',
    owner: 'Revenue Manager / Labor Planner',
    timeframe: 'this-week',
  },
  {
    id: 'insight-5',
    type: 'operational',
    title: 'Labor Execution Issues in Select Properties',
    description:
      'Actual hours exceeded scheduled hours by 1,240 hours across the portfolio. Variance came from early clock-ins, late clock-outs, and unscheduled work primarily in housekeeping and F&B.',
    impact: 12100,
    confidence: 94,
    recommendedAction:
      'Implement schedule discipline protocols and review manager scheduling practices at Seaside Resort and Metro Downtown.',
    owner: 'General Managers',
    timeframe: 'immediate',
  },
];

// Labor Performance Quick Stats — Actual vs 3+9 forecast (Apr)
export const MOCK_LABOR_QUICK_STATS: LaborQuickStatsSection[] = [
  {
    section: 'Rooms',
    rows: [
      { label: 'Rooms Occupancy', forecast: 76, actual: 77, variancePercent: 1.6, format: 'percent', direction: 'higher-better' },
      { label: 'Rooms Revenue ($M)', forecast: 396.9, actual: 402.2, variancePercent: 1.3, format: 'currency-m', direction: 'higher-better', decimals: 1 },
      { label: 'Average Daily Rate', forecast: 255.10, actual: 254.98, variancePercent: 0.0, format: 'currency', direction: 'higher-better', decimals: 2 },
      { label: 'Rooms Productivity', forecast: 1.054, actual: 1.030, variancePercent: -2.3, format: 'ratio', direction: 'higher-better', decimals: 3 },
      { label: 'Payroll %', forecast: 11, actual: 11, variancePercent: -0.7, format: 'percent', direction: 'lower-better' },
      { label: 'Hourly Net Wage', forecast: 25.87, actual: 26.26, variancePercent: -1.5, format: 'currency', direction: 'lower-better', decimals: 2 },
      { label: 'Overtime % (of Ttl Hrs)', forecast: 2.5, actual: 3.2, variancePercent: 30.2, format: 'percent', direction: 'lower-better', decimals: 1 },
      { label: 'Leased Labor % (of Ttl Hrs)', forecast: 13, actual: 13, variancePercent: 5.4, format: 'percent', direction: 'lower-better' },
    ],
  },
  {
    section: 'Food & Beverage',
    rows: [
      { label: 'Total Customers', forecast: 2325588, actual: 2359093, variancePercent: 1.4, format: 'number', direction: 'higher-better' },
      { label: 'F&B Revenue ($M)', forecast: 173.6, actual: 177.2, variancePercent: 2.1, format: 'currency-m', direction: 'higher-better', decimals: 1 },
      { label: 'Avg Check', forecast: 74.65, actual: 75.13, variancePercent: 0.6, format: 'currency', direction: 'higher-better', decimals: 2 },
      { label: 'F&B Productivity', forecast: 0.624, actual: 0.614, variancePercent: -1.5, format: 'ratio', direction: 'higher-better', decimals: 3 },
      { label: 'Payroll %', forecast: 19, actual: 19, variancePercent: -2.8, format: 'percent', direction: 'lower-better' },
      { label: 'Hourly Net Wage', forecast: 22.92, actual: 22.75, variancePercent: 0.7, format: 'currency', direction: 'lower-better', decimals: 2 },
      { label: 'Overtime % (of Ttl Hrs)', forecast: 4.1, actual: 4.2, variancePercent: 3.1, format: 'percent', direction: 'lower-better', decimals: 1 },
      { label: 'Leased Labor % (of Ttl Hrs)', forecast: 7.3, actual: 8.3, variancePercent: 14.9, format: 'percent', direction: 'lower-better', decimals: 1 },
    ],
  },
  {
    section: 'Outlets',
    rows: [
      { label: 'Outlet Customers', forecast: 1437835, actual: 1492323, variancePercent: 3.8, format: 'number', direction: 'higher-better' },
      { label: 'Outlet Revenue ($M)', forecast: 59.7, actual: 60.4, variancePercent: 1.1, format: 'currency-m', direction: 'higher-better', decimals: 1 },
      { label: 'Avg Check', forecast: 41.54, actual: 40.44, variancePercent: -2.6, format: 'currency', direction: 'higher-better', decimals: 2 },
      { label: 'Outlet Productivity', forecast: 0.411, actual: 0.386, variancePercent: -6.1, format: 'ratio', direction: 'higher-better', decimals: 3 },
      { label: 'Payroll %', forecast: 20, actual: 20, variancePercent: -2.7, format: 'percent', direction: 'lower-better' },
      { label: 'Hourly Net Wage', forecast: 20.37, actual: 20.55, variancePercent: -0.9, format: 'currency', direction: 'lower-better', decimals: 2 },
      { label: 'Overtime % (of Ttl Hrs)', forecast: 3, actual: 3, variancePercent: 3.1, format: 'percent', direction: 'lower-better' },
      { label: 'Leased Labor % (of Ttl Hrs)', forecast: 3, actual: 3, variancePercent: 12.0, format: 'percent', direction: 'lower-better' },
    ],
  },
  {
    section: 'Banquets',
    rows: [
      { label: 'Banquet Customers', forecast: 887752, actual: 866776, variancePercent: -2.4, format: 'number', direction: 'higher-better' },
      { label: 'Banquet Revenue ($M)', forecast: 113.9, actual: 116.9, variancePercent: 2.6, format: 'currency-m', direction: 'higher-better', decimals: 1 },
      { label: 'Avg Check', forecast: 128.28, actual: 134.85, variancePercent: 5.1, format: 'currency', direction: 'higher-better', decimals: 2 },
      { label: 'Banquet Productivity', forecast: 0.424, actual: 0.452, variancePercent: 6.6, format: 'ratio', direction: 'higher-better', decimals: 3 },
      { label: 'Payroll %', forecast: 7.0, actual: 6.74, variancePercent: -3.7, format: 'percent', direction: 'lower-better' },
      { label: 'Hourly Net Wage', forecast: 21.26, actual: 20.15, variancePercent: -5.2, format: 'currency', direction: 'lower-better', decimals: 2 },
      { label: 'Overtime % (of Ttl Hrs)', forecast: 5.0, actual: 4.47, variancePercent: -10.6, format: 'percent', direction: 'lower-better', decimals: 1 },
      { label: 'Leased Labor % (of Ttl Hrs)', forecast: 6.0, actual: 7.04, variancePercent: 17.4, format: 'percent', direction: 'lower-better' },
    ],
  },
  {
    section: 'Kitchen & Stewarding',
    rows: [
      { label: 'Total Customers', forecast: 2325588, actual: 2359099, variancePercent: 1.4, format: 'number', direction: 'higher-better' },
      { label: 'F&B Revenue ($M)', forecast: 173.6, actual: 177.2, variancePercent: 2.1, format: 'currency-m', direction: 'higher-better', decimals: 1 },
      { label: 'Avg Check', forecast: 74.65, actual: 75.13, variancePercent: 0.6, format: 'currency', direction: 'higher-better', decimals: 2 },
      { label: 'BOH Productivity', forecast: 0.208, actual: 0.204, variancePercent: -1.9, format: 'ratio', direction: 'higher-better', decimals: 3 },
      { label: 'Payroll %', forecast: 8.0, actual: 7.85, variancePercent: -1.9, format: 'percent', direction: 'lower-better' },
      { label: 'Hourly Net Wage', forecast: 27.31, actual: 27.48, variancePercent: 0.6, format: 'currency', direction: 'lower-better', decimals: 2 },
      { label: 'Overtime % (of Ttl Hrs)', forecast: 5.0, actual: 5.64, variancePercent: 12.9, format: 'percent', direction: 'lower-better', decimals: 1 },
      { label: 'Leased Labor % (of Ttl Hrs)', forecast: 14.0, actual: 16.0, variancePercent: 14.3, format: 'percent', direction: 'lower-better' },
    ],
  },
];

// Per-hotel quick stats. Additive metrics (currency-m, number) are allocated by room-count
// share; rate metrics are perturbed deterministically per hotel.
const TOTAL_ROOMS = MOCK_HOTELS.reduce((sum, h) => sum + h.roomCount, 0);

const isAdditive = (format: QuickStatRow['format']): boolean =>
  format === 'currency-m' || format === 'number';

function hotelOffset(hotelIndex: number, rowIndex: number, scale: number): number {
  // Deterministic pseudo-random offset in [-scale, +scale]
  const seed = Math.sin(hotelIndex * 31.7 + rowIndex * 12.3) * 1000;
  return ((seed - Math.floor(seed)) * 2 - 1) * scale;
}

export const MOCK_QUICK_STATS_BY_HOTEL: Record<string, LaborQuickStatsSection[]> = Object.fromEntries(
  MOCK_HOTELS.map((hotel, hotelIndex) => {
    const share = hotel.roomCount / TOTAL_ROOMS;
    const sections = MOCK_LABOR_QUICK_STATS.map((section) => ({
      section: section.section,
      rows: section.rows.map((row, rowIndex) => {
        let forecast: number;
        let actual: number;
        if (isAdditive(row.format)) {
          forecast = row.forecast * share;
          actual = row.actual * share;
        } else {
          const offset = hotelOffset(hotelIndex, rowIndex, 0.08); // ±8%
          forecast = row.forecast * (1 + offset);
          actual = row.actual * (1 + offset * 0.95);
        }
        const variancePercent = forecast === 0 ? 0 : ((actual - forecast) / forecast) * 100;
        return { ...row, forecast, actual, variancePercent };
      }),
    }));
    return [hotel.id, sections];
  })
);
