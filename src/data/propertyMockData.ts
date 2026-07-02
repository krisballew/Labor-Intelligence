import { EntityLaborMetrics, LaborMetrics, PropertyOrgBreakdown, RiskLevel } from '../types';

// ----- Canonical property org hierarchy -----
// share values are local to siblings and sum to ~1.0 within their parent.
interface JobDef {
  name: string;
  share: number;
}
interface DepartmentDef {
  name: string;
  share: number;
  jobs: JobDef[];
}
interface DivisionDef {
  name: string;
  share: number;
  departments: DepartmentDef[];
}

export const PROPERTY_HIERARCHY: DivisionDef[] = [
  {
    name: 'Rooms',
    share: 0.5,
    departments: [
      {
        name: 'Front Office',
        share: 0.25,
        jobs: [
          { name: 'Front Desk Agent', share: 0.55 },
          { name: 'Bell Attendant', share: 0.2 },
          { name: 'Concierge', share: 0.15 },
          { name: 'Night Auditor', share: 0.1 },
        ],
      },
      {
        name: 'Housekeeping',
        share: 0.6,
        jobs: [
          { name: 'Room Attendant', share: 0.6 },
          { name: 'Houseperson', share: 0.18 },
          { name: 'Inspector', share: 0.12 },
          { name: 'Laundry Attendant', share: 0.1 },
        ],
      },
      {
        name: 'Reservations',
        share: 0.15,
        jobs: [
          { name: 'Reservations Agent', share: 0.7 },
          { name: 'Reservations Supervisor', share: 0.3 },
        ],
      },
    ],
  },
  {
    name: 'Food & Beverage',
    share: 0.3,
    departments: [
      {
        name: 'Restaurants',
        share: 0.4,
        jobs: [
          { name: 'Server', share: 0.5 },
          { name: 'Host', share: 0.2 },
          { name: 'Bartender', share: 0.3 },
        ],
      },
      {
        name: 'Banquets',
        share: 0.3,
        jobs: [
          { name: 'Banquet Server', share: 0.6 },
          { name: 'Banquet Captain', share: 0.25 },
          { name: 'Banquet Setup', share: 0.15 },
        ],
      },
      {
        name: 'Kitchen & Stewarding',
        share: 0.3,
        jobs: [
          { name: 'Line Cook', share: 0.55 },
          { name: 'Prep Cook', share: 0.2 },
          { name: 'Steward', share: 0.25 },
        ],
      },
    ],
  },
  {
    name: 'Administrative & General',
    share: 0.1,
    departments: [
      {
        name: 'Sales & Marketing',
        share: 0.35,
        jobs: [
          { name: 'Sales Manager', share: 0.55 },
          { name: 'Sales Coordinator', share: 0.45 },
        ],
      },
      {
        name: 'Finance & Accounting',
        share: 0.3,
        jobs: [
          { name: 'Accountant', share: 0.6 },
          { name: 'AP/AR Clerk', share: 0.4 },
        ],
      },
      {
        name: 'Human Resources',
        share: 0.35,
        jobs: [
          { name: 'HR Generalist', share: 0.6 },
          { name: 'Recruiter', share: 0.4 },
        ],
      },
    ],
  },
  {
    name: 'Engineering',
    share: 0.1,
    departments: [
      {
        name: 'Maintenance',
        share: 0.7,
        jobs: [
          { name: 'Engineer', share: 0.55 },
          { name: 'Maintenance Tech', share: 0.45 },
        ],
      },
      {
        name: 'Grounds',
        share: 0.3,
        jobs: [
          { name: 'Groundskeeper', share: 1 },
        ],
      },
    ],
  },
];

// Deterministic hash -> 0..1 from a string
const hash01 = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h = (h ^ s.charCodeAt(i)) * 16777619;
    h = h >>> 0;
  }
  return (h % 10000) / 10000;
};

// Bias range: returns a multiplier in [1-amplitude, 1+amplitude]
const bias = (seed: string, amplitude: number): number => {
  return 1 + (hash01(seed) - 0.5) * 2 * amplitude;
};

const classifyRisk = (variancePct: number): RiskLevel => {
  if (variancePct > 5) return 'at-risk';
  if (variancePct > 2) return 'caution';
  return 'on-track';
};

const DRIVER_CATEGORIES: EntityLaborMetrics['topDriver']['category'][] = [
  'overtime',
  'productivity',
  'demand',
  'execution',
  'wage-rate',
  'forecast',
  'scheduling',
];

const DRIVER_DESCRIPTIONS: Record<EntityLaborMetrics['topDriver']['category'], string> = {
  overtime: 'Overtime running above scheduled levels',
  productivity: 'Hours per unit above standard',
  demand: 'Higher-than-budgeted demand',
  execution: 'Actual hours over schedule (early in / late out)',
  'wage-rate': 'Average wage rate above plan',
  forecast: 'Forecast under-called actual volume',
  scheduling: 'Scheduled hours above target',
};

const pickDriver = (
  entityId: string,
  variancePct: number,
): EntityLaborMetrics['topDriver'] => {
  const i = Math.floor(hash01(entityId + '|driver') * DRIVER_CATEGORIES.length);
  const category = DRIVER_CATEGORIES[i];
  // % of variance attributed to this driver: 35-70%
  const pct = 35 + Math.floor(hash01(entityId + '|pct') * 35);
  return {
    category,
    percentage: pct,
    description: variancePct > 0
      ? DRIVER_DESCRIPTIONS[category]
      : 'Favorable cost discipline holding below plan',
  };
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface RawSplit {
  divisionShare: number;
  deptShareWithinDivision: number;
  jobShareWithinDept: number;
  divisionName: string;
  departmentName: string;
  jobName: string;
}

const flattenHierarchy = (): RawSplit[] => {
  const out: RawSplit[] = [];
  for (const div of PROPERTY_HIERARCHY) {
    for (const dep of div.departments) {
      for (const job of dep.jobs) {
        out.push({
          divisionShare: div.share,
          deptShareWithinDivision: dep.share,
          jobShareWithinDept: job.share,
          divisionName: div.name,
          departmentName: dep.name,
          jobName: job.name,
        });
      }
    }
  }
  return out;
};

/**
 * Generate division/department/job-level labor metrics for a single hotel by
 * splitting the hotel-level LaborMetrics proportionally and applying small
 * deterministic per-entity biases so different entities show different risk.
 */
export const buildPropertyEntityMetrics = (
  hotelMetrics: LaborMetrics,
  periodScale: number = 1,
): PropertyOrgBreakdown => {
  const hotelId = hotelMetrics.hotelId;

  // Job-level rows first (with bias), then aggregate up to dept/division.
  type JobRow = {
    divisionName: string;
    departmentName: string;
    jobName: string;
    rawWeight: number; // for normalization
    actualWeight: number; // includes bias
  };

  const flat = flattenHierarchy();
  // For each job: target weight = div * dept * job
  // Actual weight = target weight * bias(seed, 0.2)
  const jobRows: JobRow[] = flat.map((f) => {
    const target = f.divisionShare * f.deptShareWithinDivision * f.jobShareWithinDept;
    const seed = `${hotelId}|${f.divisionName}|${f.departmentName}|${f.jobName}`;
    const actualBias = bias(seed + '|act', 0.18);
    return {
      divisionName: f.divisionName,
      departmentName: f.departmentName,
      jobName: f.jobName,
      rawWeight: target,
      actualWeight: target * actualBias,
    };
  });

  // Normalize so target weights sum to 1 (they already do approximately, but force exact)
  const targetTotal = jobRows.reduce((s, r) => s + r.rawWeight, 0);
  const actualTotal = jobRows.reduce((s, r) => s + r.actualWeight, 0);
  for (const r of jobRows) {
    r.rawWeight /= targetTotal;
    r.actualWeight /= actualTotal;
  }

  const scaledHotel = {
    actualHours: hotelMetrics.actualHours * periodScale,
    budgetedHours: hotelMetrics.budgetedHours * periodScale,
    forecastedHours: hotelMetrics.forecastedHours * periodScale,
    scheduledHours: hotelMetrics.scheduledHours * periodScale,
    standardHours: hotelMetrics.standardHours * periodScale,
    actualCost: hotelMetrics.actualCost * periodScale,
    budgetedCost: hotelMetrics.budgetedCost * periodScale,
    forecastedCost: hotelMetrics.forecastedCost * periodScale,
    actualOvertimeHours: hotelMetrics.actualOvertimeHours * periodScale,
    scheduledOvertimeHours: hotelMetrics.scheduledOvertimeHours * periodScale,
  };

  // Per-job OT bias — some departments/jobs run hotter on OT
  const jobs: EntityLaborMetrics[] = jobRows.map((r) => {
    const seed = `${hotelId}|${r.divisionName}|${r.departmentName}|${r.jobName}`;
    const otBias = bias(seed + '|ot', 0.4);
    const jobId = `${hotelId}-${slug(r.divisionName)}-${slug(r.departmentName)}-${slug(r.jobName)}`;
    const deptId = `${hotelId}-${slug(r.divisionName)}-${slug(r.departmentName)}`;
    const actualHours = scaledHotel.actualHours * r.actualWeight;
    const budgetedHours = scaledHotel.budgetedHours * r.rawWeight;
    const forecastedHours = scaledHotel.forecastedHours * r.rawWeight;
    const scheduledHours = scaledHotel.scheduledHours * r.rawWeight;
    const standardHours = scaledHotel.standardHours * r.rawWeight;
    const actualCost = scaledHotel.actualCost * r.actualWeight;
    const budgetedCost = scaledHotel.budgetedCost * r.rawWeight;
    const forecastedCost = scaledHotel.forecastedCost * r.rawWeight;
    const actualOvertimeHours = Math.max(0, scaledHotel.actualOvertimeHours * r.actualWeight * otBias);
    const scheduledOvertimeHours = scaledHotel.scheduledOvertimeHours * r.rawWeight;
    const costVariancePercent = budgetedCost === 0 ? 0 : ((actualCost - budgetedCost) / budgetedCost) * 100;

    return {
      hotelId,
      entityId: jobId,
      entityName: r.jobName,
      entityType: 'job',
      divisionName: r.divisionName,
      departmentName: r.departmentName,
      parentId: deptId,
      actualHours,
      budgetedHours,
      forecastedHours,
      scheduledHours,
      standardHours,
      actualCost,
      budgetedCost,
      forecastedCost,
      actualOvertimeHours,
      scheduledOvertimeHours,
      costVariancePercent,
      riskLevel: classifyRisk(costVariancePercent),
      topDriver: pickDriver(jobId, costVariancePercent),
    };
  });

  // Aggregate jobs -> departments
  const deptMap = new Map<string, EntityLaborMetrics>();
  for (const j of jobs) {
    const deptId = j.parentId!;
    const divisionId = `${hotelId}-${slug(j.divisionName)}`;
    let row = deptMap.get(deptId);
    if (!row) {
      row = {
        hotelId,
        entityId: deptId,
        entityName: j.departmentName!,
        entityType: 'department',
        divisionName: j.divisionName,
        departmentName: j.departmentName,
        parentId: divisionId,
        actualHours: 0,
        budgetedHours: 0,
        forecastedHours: 0,
        scheduledHours: 0,
        standardHours: 0,
        actualCost: 0,
        budgetedCost: 0,
        forecastedCost: 0,
        actualOvertimeHours: 0,
        scheduledOvertimeHours: 0,
        costVariancePercent: 0,
        riskLevel: 'on-track',
        topDriver: { category: 'overtime', percentage: 0, description: '' },
      };
      deptMap.set(deptId, row);
    }
    row.actualHours += j.actualHours;
    row.budgetedHours += j.budgetedHours;
    row.forecastedHours += j.forecastedHours;
    row.scheduledHours += j.scheduledHours;
    row.standardHours += j.standardHours;
    row.actualCost += j.actualCost;
    row.budgetedCost += j.budgetedCost;
    row.forecastedCost += j.forecastedCost;
    row.actualOvertimeHours += j.actualOvertimeHours;
    row.scheduledOvertimeHours += j.scheduledOvertimeHours;
  }
  const departments: EntityLaborMetrics[] = Array.from(deptMap.values()).map((d) => {
    const variancePct = d.budgetedCost === 0 ? 0 : ((d.actualCost - d.budgetedCost) / d.budgetedCost) * 100;
    return {
      ...d,
      costVariancePercent: variancePct,
      riskLevel: classifyRisk(variancePct),
      topDriver: pickDriver(d.entityId, variancePct),
    };
  });

  // Aggregate departments -> divisions
  const divMap = new Map<string, EntityLaborMetrics>();
  for (const d of departments) {
    const divId = d.parentId!;
    let row = divMap.get(divId);
    if (!row) {
      row = {
        hotelId,
        entityId: divId,
        entityName: d.divisionName,
        entityType: 'division',
        divisionName: d.divisionName,
        actualHours: 0,
        budgetedHours: 0,
        forecastedHours: 0,
        scheduledHours: 0,
        standardHours: 0,
        actualCost: 0,
        budgetedCost: 0,
        forecastedCost: 0,
        actualOvertimeHours: 0,
        scheduledOvertimeHours: 0,
        costVariancePercent: 0,
        riskLevel: 'on-track',
        topDriver: { category: 'overtime', percentage: 0, description: '' },
      };
      divMap.set(divId, row);
    }
    row.actualHours += d.actualHours;
    row.budgetedHours += d.budgetedHours;
    row.forecastedHours += d.forecastedHours;
    row.scheduledHours += d.scheduledHours;
    row.standardHours += d.standardHours;
    row.actualCost += d.actualCost;
    row.budgetedCost += d.budgetedCost;
    row.forecastedCost += d.forecastedCost;
    row.actualOvertimeHours += d.actualOvertimeHours;
    row.scheduledOvertimeHours += d.scheduledOvertimeHours;
  }
  const divisions: EntityLaborMetrics[] = Array.from(divMap.values()).map((d) => {
    const variancePct = d.budgetedCost === 0 ? 0 : ((d.actualCost - d.budgetedCost) / d.budgetedCost) * 100;
    return {
      ...d,
      costVariancePercent: variancePct,
      riskLevel: classifyRisk(variancePct),
      topDriver: pickDriver(d.entityId, variancePct),
    };
  });

  return { divisions, departments, jobs };
};
