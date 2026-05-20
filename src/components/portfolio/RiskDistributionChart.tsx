import React from 'react';
import { RiskDistributionPoint } from '../../types';

interface RiskDistributionChartProps {
  data: RiskDistributionPoint[];
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ data }) => {
  const chartWidth = 400;
  const chartHeight = 320;
  const padding = 40;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'at-risk':
        return '#DC2626'; // red
      case 'caution':
        return '#F59E0B'; // amber
      case 'on-track':
        return '#059669'; // emerald
      default:
        return '#6B7280'; // gray
    }
  };

  const gridLines = [
    { x: 0, label: 'Low' },
    { x: 50, label: 'Medium' },
    { x: 100, label: 'High' },
  ];

  return (
    <div className="metric-card overflow-hidden">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{ maxHeight: '400px' }}
      >
        {/* Grid lines */}
        {gridLines.map((line) => (
          <g key={`vgrid-${line.x}`}>
            <line
              x1={padding + (line.x / 100) * plotWidth}
              y1={padding}
              x2={padding + (line.x / 100) * plotWidth}
              y2={chartHeight - padding}
              stroke="#E5E7EB"
              strokeDasharray="4"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={padding + (line.x / 100) * plotHeight}
              x2={chartWidth - padding}
              y2={padding + (line.x / 100) * plotHeight}
              stroke="#E5E7EB"
              strokeDasharray="4"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Quadrant zones - background areas */}
        {/* Low-Low zone */}
        <rect
          x={padding}
          y={padding + (50 / 100) * plotHeight}
          width={(50 / 100) * plotWidth}
          height={(50 / 100) * plotHeight}
          fill="#DBEAFE"
          opacity="0.3"
        />
        {/* Low-High zone */}
        <rect
          x={padding}
          y={padding}
          width={(50 / 100) * plotWidth}
          height={(50 / 100) * plotHeight}
          fill="#FEF3C7"
          opacity="0.3"
        />
        {/* High-Low zone */}
        <rect
          x={padding + (50 / 100) * plotWidth}
          y={padding + (50 / 100) * plotHeight}
          width={(50 / 100) * plotWidth}
          height={(50 / 100) * plotHeight}
          fill="#FEF3C7"
          opacity="0.3"
        />
        {/* High-High zone */}
        <rect
          x={padding + (50 / 100) * plotWidth}
          y={padding}
          width={(50 / 100) * plotWidth}
          height={(50 / 100) * plotHeight}
          fill="#FECACA"
          opacity="0.3"
        />

        {/* Axes */}
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="#1F2937"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={padding}
          y2={padding}
          stroke="#1F2937"
          strokeWidth="2"
        />

        {/* Axis labels */}
        <text
          x={chartWidth / 2}
          y={chartHeight - 5}
          textAnchor="middle"
          className="text-xs fill-gray-700"
          fontSize="12"
        >
          Likelihood
        </text>
        <text
          x={15}
          y={chartHeight / 2}
          textAnchor="middle"
          className="text-xs fill-gray-700"
          fontSize="12"
          transform={`rotate(-90, 15, ${chartHeight / 2})`}
        >
          Financial Impact
        </text>

        {/* Grid line labels */}
        {gridLines.map((line) => (
          <g key={`label-${line.x}`}>
            <text
              x={padding + (line.x / 100) * plotWidth}
              y={chartHeight - padding + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              fontSize="11"
            >
              {line.label}
            </text>
            <text
              x={padding - 20}
              y={chartHeight - padding - (line.x / 100) * plotHeight + 4}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              fontSize="11"
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Data points */}
        {data.map((point) => {
          const x = padding + (point.likelihood / 100) * plotWidth;
          const y = chartHeight - padding - (point.impact / 100) * plotHeight;
          const color = getRiskColor(point.riskLevel);

          return (
            <circle
              key={point.hotelId}
              cx={x}
              cy={y}
              r="7"
              fill={color}
              opacity="0.8"
              className="hover:opacity-100 transition-opacity"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-600"></div>
          <span className="text-xs text-gray-600">On Track (68, 53%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500"></div>
          <span className="text-xs text-gray-600">Caution (23, 18%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-600"></div>
          <span className="text-xs text-gray-600">At Risk (17, 13%)</span>
        </div>
      </div>
    </div>
  );
};

export default RiskDistributionChart;
