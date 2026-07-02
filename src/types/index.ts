// Hotel and performance types
export interface Hotel {
  id: string;
  name: string;
  region: string;
  brand: string;
  serviceLevel: 'select-service' | 'upscale' | 'upper-upscale' | 'luxury';
  roomCount: number;
}

export interface HotelGroup {
  id: string;
  name: string;
  hotelIds: string[];
}

export type RiskLevel = 'on-track' | 'caution' | 'at-risk';

export interface LaborMetrics {
  hotelId: string;
  periodEnd: Date;
  actualHours: number;
  budgetedHours: number;
  forecastedHours: number;
  scheduledHours: number;
  standardHours: number;
  actualCost: number;
  budgetedCost: number;
  forecastedCost: number;
  actualOvertimeHours: number;
  scheduledOvertimeHours: number;
  ovetimeRate: number;
  actualVariance: number; // Percentage
  costVariance: number; // Percentage
  riskLevel: RiskLevel;
  varianceDrivers: VarianceDriver[];
}

export interface VarianceDriver {
  category: 'demand' | 'productivity' | 'scheduling' | 'overtime' | 'wage-rate' | 'forecast' | 'execution' | 'service-quality';
  impact: number; // Dollar amount
  percentage: number;
  description: string;
}

export interface PortfolioMetrics {
  totalHotels: number;
  hotelsOnTrack: number;
  hotelsInCaution: number;
  hotelsAtRisk: number;
  totalLaborVariance: number;
  totalLaborVariancePercent: number;
  overtimeExposure: number;
  overtimeExposureNextPeriod: number;
  forecastConfidence: number;
  productivityDrift: number;
}

export type RiskTrendStatus = 'emerging' | 'worsening' | 'improving' | 'persistent';

export interface RiskTrend {
  status: RiskTrendStatus;
  periodsActive: number; // number of consecutive periods this risk has been flagged
  changeVsPriorPeriod: number; // % change in driver impact vs prior period (negative = improving for cost drivers)
  note: string;
}

export interface HotelRiskSummary {
  hotel: Hotel;
  metrics: LaborMetrics;
  variance: number;
  riskLevel: RiskLevel;
  topVarianceDriver: VarianceDriver;
  keyInsight: string;
  trend: RiskTrend;
}

export interface RiskDistributionPoint {
  hotelId: string;
  hotelName: string;
  likelihood: number; // 0-100 (Low, Medium, High)
  impact: number; // 0-100 (Low, Medium, High)
  riskLevel: RiskLevel;
}

export interface TopVarianceDriver {
  category: string;
  impact: number;
  percentage: number;
  description: string;
}

export interface AIInsight {
  id: string;
  type: 'cost' | 'quality' | 'overtime' | 'operational' | 'forecast' | 'productivity';
  title: string;
  description: string;
  impact: number;
  confidence: number;
  recommendedAction: string;
  owner?: string;
  timeframe: 'immediate' | 'this-week' | 'this-month';
}

// Quick Stats (Actual vs 3+9 forecast)
export type QuickStatFormat = 'percent' | 'currency-m' | 'currency' | 'number' | 'ratio';
export type QuickStatDirection = 'higher-better' | 'lower-better';

export interface QuickStatRow {
  label: string;
  forecast: number;
  actual: number;
  variancePercent: number;
  format: QuickStatFormat;
  direction: QuickStatDirection;
  decimals?: number;
}

export interface LaborQuickStatsSection {
  section: 'Rooms' | 'Food & Beverage' | 'Outlets' | 'Banquets' | 'Kitchen & Stewarding';
  rows: QuickStatRow[];
}

// Property-focused (single-hotel) org hierarchy & metrics
export type OrgEntityType = 'division' | 'department' | 'job';

export interface EntityLaborMetrics {
  hotelId: string;
  entityId: string;
  entityName: string;
  entityType: OrgEntityType;
  divisionName: string;
  departmentName?: string; // present for department + job rows
  parentId?: string; // department.parentId = division.id; job.parentId = department.id
  actualHours: number;
  budgetedHours: number;
  forecastedHours: number;
  scheduledHours: number;
  standardHours: number;
  actualCost: number;
  budgetedCost: number;
  forecastedCost: number;
  actualOvertimeHours: number;
  scheduledOvertimeHours: number;
  costVariancePercent: number;
  riskLevel: RiskLevel;
  topDriver: {
    category: 'overtime' | 'productivity' | 'demand' | 'execution' | 'wage-rate' | 'forecast' | 'scheduling';
    percentage: number;
    description: string;
  };
}

export interface PropertyOrgBreakdown {
  divisions: EntityLaborMetrics[];
  departments: EntityLaborMetrics[];
  jobs: EntityLaborMetrics[];
}
