import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#132337] px-3 py-2 rounded-md border border-[#3BADE5]/20 shadow-lg">
        <p className="text-xs text-[#f4f4f4] font-medium">{data.fullName}</p>
        <p className="text-[10px] text-[#f4f4f4]/80 mt-1">
          Count: {data.value} ({((data.value / data.parentTotal) * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomizedContent = ({ x, y, width, height, name, value, parentTotal }) => {
  const opacity = parentTotal ? (0.3 + (value / parentTotal) * 0.7) : 0.5;
  const shouldShowText = width > 60 && height > 30;
  const shouldShowOnlyValue = width > 40 && height > 25;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#3BADE5"
        opacity={opacity}
        stroke="#0B1623"
        strokeWidth={1}
        className="transition-all duration-200 hover:opacity-90"
      />
      {shouldShowText ? (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 5}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            className="font-medium select-none pointer-events-none"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={9}
            opacity={0.8}
            className="select-none pointer-events-none"
          >
            {value}
          </text>
        </>
      ) : shouldShowOnlyValue ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={9}
          className="select-none pointer-events-none"
        >
          {value}
        </text>
      ) : null}
    </g>
  );
};

const StatsCards = ({ data = [] }) => {
  // Equipment data processing
  const equipmentData = useMemo(() => {
    if (!data.length) return { children: [], totalCount: 0 };

    const counts = data.reduce((acc, item) => {
      if (item.Equipments) {
        acc[item.Equipments] = (acc[item.Equipments] || 0) + 1;
      }
      return acc;
    }, {});

    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

    const children = Object.entries(counts)
      .map(([name, value]) => ({
        name: name.length > 15 ? `${name.substring(0, 15)}...` : name,
        fullName: name,
        value,
        parentTotal: totalCount,
        size: value
      }))
      .sort((a, b) => b.value - a.value);

    return { children, totalCount };
  }, [data]);

  // Status metrics calculation
  const statusMetrics = useMemo(() => {
    const total = data.length;
    const closed = data.filter(item => item['Status (Vessel)'] === 'CLOSED').length;
    const open = data.filter(item => item['Status (Vessel)'] === 'OPEN').length;
    const inProgress = data.filter(item => item['Status (Vessel)'] === 'IN PROGRESS').length;

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const previousMonth = data.filter(item =>
      new Date(item['Date Reported']) < lastMonth &&
      new Date(item['Date Reported']) > new Date(lastMonth.setMonth(lastMonth.getMonth() - 1))
    );
    const previousTotal = previousMonth.length || 1;
    const previousClosed = previousMonth.filter(item => item['Status (Vessel)'] === 'CLOSED').length;
    const previousRate = (previousClosed / previousTotal) * 100;
    const currentRate = (closed / (total || 1)) * 100;
    const rateChange = currentRate - previousRate;

    return {
      total,
      closed,
      open,
      inProgress,
      closureRate: (closed / (total || 1)) * 100,
      openRate: (open / (total || 1)) * 100,
      inProgressRate: (inProgress / (total || 1)) * 100,
      rateChange
    };
  }, [data]);

  // Legend rendering
  const renderLegend = () => {
    if (!equipmentData.children.length) return null;

    const legendData = equipmentData.children.slice(0, 3);
    return (
      <div className="mt-4 flex flex-wrap gap-3">
        {legendData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full bg-[#3BADE5]" 
              style={{ opacity: 0.3 + ((item.value / item.parentTotal) * 0.7) }} 
            />
            <span className="text-[10px] text-white/60">{item.fullName}</span>
          </div>
        ))}
        {equipmentData.children.length > 3 && (
          <div className="text-[10px] text-white/40">
            and {equipmentData.children.length - 3} more...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Equipment Distribution Card */}
      <Card className="bg-[#132337]/30 backdrop-blur-sm border border-white/10">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-medium text-[#f4f4f4]/90">
              Equipment Distribution
            </h3>
            <div className="text-[10px] text-white/40">
              Total: {equipmentData.totalCount}
            </div>
          </div>
          <div className="h-[280px]">
            {equipmentData.children.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={equipmentData.children}
                  dataKey="size"
                  aspectRatio={1.5}
                  stroke="#0B1623"
                  content={<CustomizedContent />}
                  animationDuration={500}
                >
                  <Tooltip content={<CustomTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/40 text-sm">
                No equipment data available
              </div>
            )}
          </div>
          {renderLegend()}
        </CardContent>
      </Card>

      {/* Status Overview Card */}
      <Card className="bg-[#132337]/30 backdrop-blur-sm border border-white/10">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-[#f4f4f4]/90 mb-6">
            Status Overview
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#3BADE5]">
                {statusMetrics.closureRate.toFixed(1)}%
              </div>
              <div className="text-xs text-[#f4f4f4]/60 mt-1.5">
                Closure Rate
                <span className={`inline-flex items-center ml-2 text-[10px] ${
                  statusMetrics.rateChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {statusMetrics.rateChange >= 0 ?
                    <TrendingUp className="h-3 w-3 mr-0.5" /> :
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  }
                  {Math.abs(statusMetrics.rateChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#f4f4f4]">
                {statusMetrics.total}
              </div>
              <div className="text-xs text-[#f4f4f4]/60 mt-1.5">
                Total Defects
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Status bars */}
            {[
              { label: 'Closed', value: statusMetrics.closed, rate: statusMetrics.closureRate, color: 'from-green-500/30 to-green-500/60' },
              { label: 'Open', value: statusMetrics.open, rate: statusMetrics.openRate, color: 'from-red-500/30 to-red-500/60' },
              { label: 'In Progress', value: statusMetrics.inProgress, rate: statusMetrics.inProgressRate, color: 'from-yellow-500/30 to-yellow-500/60' }
            ].map(status => (
              <div key={status.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-white/60">{status.label}</span>
                  <span className="text-xs text-white/60">
                    {status.value} ({status.rate.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${status.color} rounded-full transition-all duration-500`}
                    style={{ width: `${status.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
