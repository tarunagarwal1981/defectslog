import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const EquipmentBar = ({ name, value, maxValue, isFirst }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className={`relative ${isFirst ? '' : 'mt-2'}`}>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/90">{name}</span>
          <span className="text-[10px] text-white/60">({value})</span>
        </div>
        <span className="text-[10px] text-white/60">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full bg-[#0B1623] rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#3BADE5]/70 to-[#3BADE5] animate-shimmer" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
};

const StatsCards = ({ data = [] }) => {
  // Equipment data processing with error handling
  const equipmentData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { items: [], totalCount: 0 };
    }

    const counts = data.reduce((acc, item) => {
      if (item?.Equipments) {
        acc[item.Equipments] = (acc[item.Equipments] || 0) + 1;
      }
      return acc;
    }, {});

    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

    const items = Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalCount > 0 ? (value / totalCount) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    return { items, totalCount };
  }, [data]);

  // Status metrics calculation with error handling
  const statusMetrics = useMemo(() => {
    if (!Array.isArray(data)) return {
      total: 0,
      closed: 0,
      open: 0,
      inProgress: 0,
      closureRate: 0,
      openRate: 0,
      inProgressRate: 0,
      rateChange: 0
    };

    const total = data.length;
    const closed = data.filter(item => item?.['Status (Vessel)'] === 'CLOSED').length;
    const open = data.filter(item => item?.['Status (Vessel)'] === 'OPEN').length;
    const inProgress = data.filter(item => item?.['Status (Vessel)'] === 'IN PROGRESS').length;

    // Calculate month-over-month change
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const previousMonth = data.filter(item => {
      const date = new Date(item?.['Date Reported']);
      return date < lastMonth && date > new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1);
    });

    const previousTotal = previousMonth.length || 1;
    const previousClosed = previousMonth.filter(item => item?.['Status (Vessel)'] === 'CLOSED').length;
    const previousRate = (previousClosed / previousTotal) * 100;
    const currentRate = total ? (closed / total) * 100 : 0;
    const rateChange = currentRate - previousRate;

    return {
      total,
      closed,
      open,
      inProgress,
      closureRate: total ? (closed / total) * 100 : 0,
      openRate: total ? (open / total) * 100 : 0,
      inProgressRate: total ? (inProgress / total) * 100 : 0,
      rateChange
    };
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" style={{ height: 'calc(30vh - 2rem)' }}>
      {/* Equipment Distribution Card */}
      <Card className="relative bg-[#132337] border-0 overflow-hidden transform hover:scale-[1.01] transition-transform duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3BADE5]/5 to-transparent" />
        <div className="absolute inset-0 bg-[#0B1623] opacity-40" />
        <div 
          className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 60%)',
            transform: 'translateZ(2px)'
          }} 
        />
        <CardContent className="relative h-full p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#3BADE5] rounded-full" />
              <h3 className="text-sm font-medium text-[#f4f4f4]/90">
                Equipment Distribution
              </h3>
            </div>
            <div className="text-[10px] text-white/40 px-2 py-1 bg-[#0B1623] rounded-full">
              Total: {equipmentData.totalCount}
            </div>
          </div>
          <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar pr-2">
            {equipmentData.items.length > 0 ? (
              <div className="space-y-1">
                {equipmentData.items.map((item, index) => (
                  <EquipmentBar
                    key={item.name}
                    name={item.name}
                    value={item.value}
                    maxValue={equipmentData.totalCount}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/40 text-sm">
                No equipment data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Overview Card */}
      <Card className="relative bg-[#132337] border-0 overflow-hidden transform hover:scale-[1.01] transition-transform duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3BADE5]/5 to-transparent" />
        <div className="absolute inset-0 bg-[#0B1623] opacity-40" />
        <div 
          className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 60%)',
            transform: 'translateZ(2px)'
          }} 
        />
        <CardContent className="relative h-full p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-[#3BADE5] rounded-full" />
            <h3 className="text-sm font-medium text-[#f4f4f4]/90">
              Status Overview
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#0B1623]/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-[#3BADE5]">
                {statusMetrics.closureRate.toFixed(1)}%
              </div>
              <div className="text-xs text-[#f4f4f4]/60 mt-1.5 flex items-center">
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
            <div className="bg-[#0B1623]/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-[#f4f4f4]">
                {statusMetrics.total}
              </div>
              <div className="text-xs text-[#f4f4f4]/60 mt-1.5">
                Total Defects
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Closed', value: statusMetrics.closed, rate: statusMetrics.closureRate, color: 'from-green-500/30 to-green-500/60' },
              { label: 'Open', value: statusMetrics.open, rate: statusMetrics.openRate, color: 'from-red-500/30 to-red-500/60' },
              { label: 'In Progress', value: statusMetrics.inProgress, rate: statusMetrics.inProgressRate, color: 'from-yellow-500/30 to-yellow-500/60' }
            ].map(status => (
              <div key={status.label} className="bg-[#0B1623]/30 p-2 rounded-lg">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-white/60">{status.label}</span>
                  <span className="text-xs text-white/60">
                    {status.value} ({status.rate.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-[#0B1623] rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${status.color} rounded-full transition-all duration-500`}
                    style={{ width: `${status.rate}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                  </div>
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
