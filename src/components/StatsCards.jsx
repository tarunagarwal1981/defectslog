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
      <div className="h-2.5 w-full bg-[#0B1623] rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
        <div
          className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#3BADE5]/80 to-[#3BADE5] animate-shimmer" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
};

const StatsCards = ({ data = [] }) => {
  // Your existing data processing logic remains the same
  const equipmentData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { items: [], totalCount: 0 };
    }
    // ... rest of your equipment data processing
  }, [data]);

  const statusMetrics = useMemo(() => {
    // ... your existing status metrics calculation
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" style={{ height: 'calc(30vh - 2rem)' }}>
      {/* Equipment Distribution Card */}
      <Card className="relative bg-[#132337] border-0 overflow-hidden transform hover:scale-[1.01] transition-transform duration-200"
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          transform: 'perspective(1000px) rotateX(2deg)',
        }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#3BADE5]/5 to-transparent" />
        <div className="absolute inset-0 bg-[#0B1623] opacity-40" />
        <div 
          className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 60%)',
          }} 
        />
        <CardContent className="relative h-full p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#3BADE5] rounded-full shadow-[0_0_8px_rgba(59,173,229,0.4)]" />
              <h3 className="text-sm font-medium text-[#f4f4f4]/90">
                Equipment Distribution
              </h3>
            </div>
            <div className="text-[10px] text-white/40 px-2 py-1 bg-[#0B1623] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              Total: {equipmentData.totalCount}
            </div>
          </div>
          <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar pr-2">
            {equipmentData.items.length > 0 ? (
              <div className="space-y-2">
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
      <Card className="relative bg-[#132337] border-0 overflow-hidden transform hover:scale-[1.01] transition-transform duration-200"
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          transform: 'perspective(1000px) rotateX(2deg)',
        }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#3BADE5]/5 to-transparent" />
        <div className="absolute inset-0 bg-[#0B1623] opacity-40" />
        <div 
          className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 60%)',
          }} 
        />
        <CardContent className="relative h-full p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-[#3BADE5] rounded-full shadow-[0_0_8px_rgba(59,173,229,0.4)]" />
            <h3 className="text-sm font-medium text-[#f4f4f4]/90">
              Status Overview
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#0B1623]/50 rounded-lg p-3 shadow-[0_4px_12px_rgba(0,0,0,0.2)] transform hover:scale-[1.02] transition-transform">
              <div className="text-2xl font-bold text-[#3BADE5] drop-shadow-[0_2px_4px_rgba(59,173,229,0.4)]">
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
            <div className="bg-[#0B1623]/50 rounded-lg p-3 shadow-[0_4px_12px_rgba(0,0,0,0.2)] transform hover:scale-[1.02] transition-transform">
              <div className="text-2xl font-bold text-[#f4f4f4] drop-shadow-[0_2px_4px_rgba(255,255,255,0.1)]">
                {statusMetrics.total}
              </div>
              <div className="text-xs text-[#f4f4f4]/60 mt-1.5">
                Total Defects
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Closed', value: statusMetrics.closed, rate: statusMetrics.closureRate, color: 'from-green-500/50 to-green-500/80', shadow: 'rgba(34,197,94,0.3)' },
              { label: 'Open', value: statusMetrics.open, rate: statusMetrics.openRate, color: 'from-red-500/50 to-red-500/80', shadow: 'rgba(239,68,68,0.3)' },
              { label: 'In Progress', value: statusMetrics.inProgress, rate: statusMetrics.inProgressRate, color: 'from-yellow-500/50 to-yellow-500/80', shadow: 'rgba(234,179,8,0.3)' }
            ].map(status => (
              <div key={status.label} className="bg-[#0B1623]/30 p-2 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-white/60">{status.label}</span>
                  <span className="text-xs text-white/60">
                    {status.value} ({status.rate.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#0B1623] rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                  <div
                    className={`h-full bg-gradient-to-r ${status.color} rounded-full transition-all duration-500`}
                    style={{ 
                      width: `${status.rate}%`,
                      boxShadow: `0 0 8px ${status.shadow}`
                    }}
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
