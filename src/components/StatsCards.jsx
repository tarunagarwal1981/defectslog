import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const styles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .card-hover-effect {
    transition: all 0.2s ease-in-out;
    height: 30vh;
    min-height: 300px;
  }
  
  .card-hover-effect:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 173, 229, 0.15);
  }

  .stats-gradient {
    background: linear-gradient(135deg, rgba(59, 173, 229, 0.1) 0%, rgba(19, 35, 55, 0.2) 100%);
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(11, 22, 35, 0.3);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(59, 173, 229, 0.3);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 173, 229, 0.5);
  }
`;

const EquipmentBar = ({ name, value, maxValue, isFirst }) => {
  const percentage = (value / maxValue) * 100;
  
  return (
    <div className={`relative ${isFirst ? '' : 'mt-2'} group`}>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/90 group-hover:text-[#3BADE5] transition-colors duration-200">{name}</span>
          <span className="text-[10px] text-white/60">{value}</span>
        </div>
        <span className="text-[10px] text-white/60">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 w-full bg-[#0B1623]/50 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-500 relative overflow-hidden group-hover:shadow-[0_0_8px_rgba(59,173,229,0.3)]"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#3BADE5]/60 to-[#3BADE5] animate-pulse" />
        </div>
      </div>
    </div>
  );
};

const StatsCards = ({ data = [] }) => {
  // Your existing data processing code remains the same
  const equipmentData = useMemo(() => {
    if (!data.length) return { items: [], totalCount: 0 };

    const counts = data.reduce((acc, item) => {
      if (item.Equipments) {
        acc[item.Equipments] = (acc[item.Equipments] || 0) + 1;
      }
      return acc;
    }, {});

    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

    const items = Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: (value / totalCount) * 100
      }))
      .sort((a, b) => b.value - a.value);

    return { items, totalCount };
  }, [data]);

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

  return (
    <>
      <style>{styles}</style>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        {/* Equipment Distribution Card */}
        <Card className="card-hover-effect bg-[#132337]/30 backdrop-blur-sm border border-[#3BADE5]/10 relative overflow-hidden">
          <div className="absolute inset-0 stats-gradient opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B1623]/20" />
          <CardContent className="p-6 relative h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-[#f4f4f4]/90 flex items-center">
                <span className="inline-block w-1 h-4 bg-gradient-to-b from-[#3BADE5] to-transparent rounded-sm mr-2"></span>
                Equipment Distribution
              </h3>
              <div className="text-[10px] text-white/40 bg-[#0B1623]/30 px-2 py-1 rounded-full">
                Total: {equipmentData.totalCount}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
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
        <Card className="card-hover-effect bg-[#132337]/30 backdrop-blur-sm border border-[#3BADE5]/10 relative overflow-hidden">
          <div className="absolute inset-0 stats-gradient opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B1623]/20" />
          <CardContent className="p-6 relative h-full flex flex-col">
            <h3 className="text-sm font-medium text-[#f4f4f4]/90 mb-4 flex items-center">
              <span className="inline-block w-1 h-4 bg-gradient-to-b from-[#3BADE5] to-transparent rounded-sm mr-2"></span>
              Status Overview
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 rounded-lg bg-[#0B1623]/30 hover:bg-[#0B1623]/40 transition-colors duration-200">
                <div className="text-2xl font-bold text-[#3BADE5] drop-shadow-[0_0_8px_rgba(59,173,229,0.3)]">
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
              <div className="text-center p-4 rounded-lg bg-[#0B1623]/30 hover:bg-[#0B1623]/40 transition-colors duration-200">
                <div className="text-2xl font-bold text-[#f4f4f4] drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
                  {statusMetrics.total}
                </div>
                <div className="text-xs text-[#f4f4f4]/60 mt-1.5">
                  Total Defects
                </div>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {[
                { label: 'Closed', value: statusMetrics.closed, rate: statusMetrics.closureRate, color: 'from-green-500/50 to-green-500', shadowColor: 'rgba(34,197,94,0.2)' },
                { label: 'Open', value: statusMetrics.open, rate: statusMetrics.openRate, color: 'from-red-500/50 to-red-500', shadowColor: 'rgba(239,68,68,0.2)' },
                { label: 'In Progress', value: statusMetrics.inProgress, rate: statusMetrics.inProgressRate, color: 'from-yellow-500/50 to-yellow-500', shadowColor: 'rgba(234,179,8,0.2)' }
              ].map(status => (
                <div key={status.label} className="group">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-white/60 group-hover:text-white/90 transition-colors duration-200">{status.label}</span>
                    <span className="text-xs text-white/60 group-hover:text-white/90 transition-colors duration-200">
                      {status.value} ({status.rate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#0B1623]/50 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full bg-gradient-to-r ${status.color} rounded-full transition-all duration-500 group-hover:shadow-[0_0_8px_${status.shadowColor}]`}
                      style={{ width: `${status.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default StatsCards;
