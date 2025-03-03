import React, { useMemo } from 'react';
import { Activity, AlertCircle } from 'lucide-react';

const StatsCards = ({ data = [] }) => {
  const stats = useMemo(() => {
    // Count totals
    const totalDefects = data.length;
    let openCount = 0;
    let inProgressCount = 0;
    let closedCount = 0;
    let overdueCount = 0;
    
    // Count by criticality
    const criticalityCounts = {
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    
    // Count by status
    const today = new Date();
    data.forEach(defect => {
      // Count by status
      const status = defect['Status (Vessel)'];
      if (status === 'OPEN') openCount++;
      else if (status === 'IN PROGRESS') inProgressCount++;
      else if (status === 'CLOSED') closedCount++;
      
      // Count overdue items (only for non-closed items with a target date)
      if (status !== 'CLOSED' && defect.target_date) {
        const targetDate = new Date(defect.target_date);
        if (targetDate < today) {
          overdueCount++;
        }
      }
      
      // Count by criticality
      if (defect.Criticality in criticalityCounts) {
        criticalityCounts[defect.Criticality]++;
      }
    });
    
    // Calculate percentages
    const openPercentage = totalDefects > 0 ? (openCount / totalDefects) * 100 : 0;
    const inProgressPercentage = totalDefects > 0 ? (inProgressCount / totalDefects) * 100 : 0;
    const closedPercentage = totalDefects > 0 ? (closedCount / totalDefects) * 100 : 0;
    const overduePercentage = totalDefects > 0 ? (overdueCount / totalDefects) * 100 : 0;
    
    return {
      totalDefects,
      openCount,
      inProgressCount,
      closedCount,
      overdueCount,
      openPercentage,
      inProgressPercentage,
      closedPercentage,
      overduePercentage,
      criticalityCounts
    };
  }, [data]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Total Defects */}
      <div className="glass-card rounded-[4px] p-4 shadow-lg border border-white/5 backdrop-blur-sm flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-medium text-[#f4f4f4]">Total Defects</h3>
          <Activity className="text-[#3BADE5] h-4 w-4" />
        </div>
        <p className="text-2xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#3BADE5] to-[#f4f4f4]">
          {stats.totalDefects}
        </p>
        
        {/* Status overview */}
        <div className="mt-auto">
          <p className="text-xs text-white/60 mb-1">Status Overview</p>
          <div className="space-y-2">
            {/* Open */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-red-300">Open</span>
                <span className="text-white/80">{stats.openCount} ({stats.openPercentage.toFixed(1)}%)</span>
              </div>
              <div className="h-1.5 bg-[#132337] rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${stats.openPercentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* In Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-yellow-300">In Progress</span>
                <span className="text-white/80">{stats.inProgressCount} ({stats.inProgressPercentage.toFixed(1)}%)</span>
              </div>
              <div className="h-1.5 bg-[#132337] rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: `${stats.inProgressPercentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* Closed */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-green-300">Closed</span>
                <span className="text-white/80">{stats.closedCount} ({stats.closedPercentage.toFixed(1)}%)</span>
              </div>
              <div className="h-1.5 bg-[#132337] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${stats.closedPercentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* Overdue */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="flex items-center">
                  <AlertCircle className="h-2 w-2 mr-1 text-orange-400" />
                  <span className="text-orange-300">Overdue</span>
                </span>
                <span className="text-white/80">{stats.overdueCount} ({stats.overduePercentage.toFixed(1)}%)</span>
              </div>
              <div className="h-1.5 bg-[#132337] rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${stats.overduePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Card 2: Criticality Breakdown */}
      <div className="glass-card rounded-[4px] p-4 shadow-lg border border-white/5 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-[#f4f4f4] mb-4">Criticality Breakdown</h3>
        <div className="flex items-center justify-between my-4">
          {/* High */}
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-300 mb-1">{stats.criticalityCounts.High}</div>
            <div className="text-[10px] text-white/60">High</div>
          </div>
          
          {/* Medium */}
          <div className="text-center">
            <div className="text-2xl font-semibold text-yellow-300 mb-1">{stats.criticalityCounts.Medium}</div>
            <div className="text-[10px] text-white/60">Medium</div>
          </div>
          
          {/* Low */}
          <div className="text-center">
            <div className="text-2xl font-semibold text-blue-300 mb-1">{stats.criticalityCounts.Low}</div>
            <div className="text-[10px] text-white/60">Low</div>
          </div>
        </div>
        
        {/* Criticality bar */}
        <div className="h-1.5 bg-[#132337] rounded-full overflow-hidden flex mt-6">
          <div
            className="h-full bg-red-500"
            style={{ width: `${stats.totalDefects > 0 ? (stats.criticalityCounts.High / stats.totalDefects) * 100 : 0}%` }}
          ></div>
          <div
            className="h-full bg-yellow-500"
            style={{ width: `${stats.totalDefects > 0 ? (stats.criticalityCounts.Medium / stats.totalDefects) * 100 : 0}%` }}
          ></div>
          <div
            className="h-full bg-blue-500"
            style={{ width: `${stats.totalDefects > 0 ? (stats.criticalityCounts.Low / stats.totalDefects) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
      
      {/* Card 3: Completion Rate */}
      <div className="glass-card rounded-[4px] p-4 shadow-lg border border-white/5 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-[#f4f4f4] mb-2">Completion Rate</h3>
        <div className="flex flex-col items-center justify-center py-4">
          <svg className="w-24 h-24" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#132337"
              strokeWidth="12"
            />
            
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={stats.closedPercentage > 66 ? '#10B981' : stats.closedPercentage > 33 ? '#FBBF24' : '#EF4444'}
              strokeWidth="12"
              strokeDasharray={`${stats.closedPercentage * 2.51} 251`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'all 0.3s ease' }}
            />
            
            {/* Center text */}
            <text
              x="50"
              y="55"
              fontSize="18"
              fontWeight="bold"
              textAnchor="middle"
              fill="white"
            >
              {stats.closedPercentage.toFixed(0)}%
            </text>
          </svg>
          <p className="text-xs text-white/60 mt-2">
            {stats.closedCount} of {stats.totalDefects} defects closed
          </p>
        </div>
        
        {/* Overdue warning if applicable */}
        {stats.overdueCount > 0 && (
          <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-orange-300">
              {stats.overdueCount} {stats.overdueCount === 1 ? 'defect is' : 'defects are'} past target date
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCards;