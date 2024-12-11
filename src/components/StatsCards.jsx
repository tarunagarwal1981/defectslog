import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = [
  '#3BADE5', '#5C6BC0', '#7E57C2', '#AB47BC',
  '#EC407A', '#EF5350', '#FFA726', '#FFEE58',
  '#66BB6A', '#26A69A', '#26C6DA', '#29B6F6',
  '#5C6BC0', '#7986CB', '#9575CD', '#BA68C8'
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#132337] px-3 py-2 rounded-md border border-[#3BADE5]/20 shadow-lg">
        <p className="text-xs text-[#f4f4f4] font-medium">{data.name}</p>
        <p className="text-[10px] text-[#f4f4f4]/80 mt-1">Count: {data.value}</p>
      </div>
    );
  }
  return null;
};

const CustomizedContent = ({ root, depth, x, y, width, height, index, name, value }) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={COLORS[index % COLORS.length]}
        opacity={0.8}
        className="hover:opacity-100 transition-opacity duration-200"
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 5}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            className="font-medium"
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
          >
            {value}
          </text>
        </>
      )}
    </g>
  );
};

const StatsCards = ({ data }) => {
  // Equipment data processing
  const equipmentData = useMemo(() => {
    const counts = data.reduce((acc, item) => {
      acc[item.Equipments] = (acc[item.Equipments] || 0) + 1;
      return acc;
    }, {});

    return {
      name: 'Equipment',
      children: Object.entries(counts)
        .map(([name, value]) => ({
          name,
          value,
          size: value
        }))
        .sort((a, b) => b.value - a.value)
    };
  }, [data]);

  // Status metrics calculation
  const statusMetrics = useMemo(() => {
    const total = data.length;
    const closed = data.filter(item => item['Status (Vessel)'] === 'CLOSED').length;
    const open = data.filter(item => item['Status (Vessel)'] === 'OPEN').length;
    const inProgress = data.filter(item => item['Status (Vessel)'] === 'IN PROGRESS').length;

    // Calculate month-over-month change
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Equipment Distribution Card */}
      <Card className="bg-[#132337]/30 backdrop-blur-sm border border-white/10">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-[#f4f4f4]/90 mb-6">
            Equipment Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={equipmentData.children}
                dataKey="size"
                aspectRatio={1}
                stroke="#0B1623"
                content={<CustomizedContent />}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
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
            {/* Closed Status */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs text-green-400">Closed</span>
                <span className="text-xs text-green-400">
                  {statusMetrics.closed} ({statusMetrics.closureRate.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500/50 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${statusMetrics.closureRate}%` }}
                />
              </div>
            </div>

            {/* Open Status */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs text-red-400">Open</span>
                <span className="text-xs text-red-400">
                  {statusMetrics.open} ({statusMetrics.openRate.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500/50 to-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${statusMetrics.openRate}%` }}
                />
              </div>
            </div>

            {/* In Progress Status */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs text-yellow-400">In Progress</span>
                <span className="text-xs text-yellow-400">
                  {statusMetrics.inProgress} ({statusMetrics.inProgressRate.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                {statusMetrics.inProgressRate > 0 ? (
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500/50 to-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${statusMetrics.inProgressRate}%` }}
                  />
                ) : (
                  <div className="h-full w-full border border-dashed border-white/20 rounded-full" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
