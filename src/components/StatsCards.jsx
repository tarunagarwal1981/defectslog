import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const EquipmentBar = ({ name, value, maxValue, isFirst }) => {
  const percentage = (value / maxValue) * 100;
  
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
  // Your existing data processing logic remains the same
  const equipmentData = useMemo(() => {
    // ... existing equipmentData logic
  }, [data]);

  const statusMetrics = useMemo(() => {
    // ... existing statusMetrics logic
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Equipment Distribution Card */}
      <Card className="relative bg-[#132337] border-0 overflow-hidden transform perspective-1000">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3BADE5]/5 to-transparent" />
        <div className="absolute inset-0 bg-[#0B1623] opacity-40" />
        <div 
          className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 60%)',
            transform: 'translateZ(2px)'
          }} 
        />
        <CardContent className="relative p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-medium text-[#f4f4f4]/90 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#3BADE5] rounded-full" />
              Equipment Distribution
            </h3>
            <div className="text-[10px] text-white/40 px-2 py-1 bg-[#0B1623] rounded-full">
              Total: {equipmentData.totalCount}
            </div>
          </div>
          <div className="h-[280px] overflow-y-auto custom-scrollbar pr-2">
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
      <Card className="relative bg-[#132337] border-0 overflow-hidden transform perspective-1000">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3BADE5]/5 to-transparent" />
        <div className="absolute inset-0 bg-[#0B1623] opacity-40" />
        <div 
          className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 60%)',
            transform: 'translateZ(2px)'
          }} 
        />
        <CardContent className="relative p-6 backdrop-blur-sm">
          <h3 className="text-sm font-medium text-[#f4f4f4]/90 mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-[#3BADE5] rounded-full" />
            Status Overview
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-[#0B1623]/50 rounded-lg backdrop-blur-sm">
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
            <div className="text-center p-4 bg-[#0B1623]/50 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold text-[#f4f4f4]">
                {statusMetrics.total}
              </div>
              <div className="text-xs text-[#f4f4f4]/60 mt-1.5">
                Total Defects
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Closed', value: statusMetrics.closed, rate: statusMetrics.closureRate, color: 'from-green-500/30 to-green-500/60' },
              { label: 'Open', value: statusMetrics.open, rate: statusMetrics.openRate, color: 'from-red-500/30 to-red-500/60' },
              { label: 'In Progress', value: statusMetrics.inProgress, rate: statusMetrics.inProgressRate, color: 'from-yellow-500/30 to-yellow-500/60' }
            ].map(status => (
              <div key={status.label} className="bg-[#0B1623]/30 p-3 rounded-lg">
                <div className="flex justify-between mb-2">
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
