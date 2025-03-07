import React, { useMemo } from 'react';
import { Activity, AlertCircle, Triangle } from 'lucide-react';

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
    
    // Count by equipment type
    const equipmentCounts = {};
    
    // Criticality by status
    const criticalityByStatus = {
      'High': { 'OPEN': 0, 'IN PROGRESS': 0, 'CLOSED': 0 },
      'Medium': { 'OPEN': 0, 'IN PROGRESS': 0, 'CLOSED': 0 },
      'Low': { 'OPEN': 0, 'IN PROGRESS': 0, 'CLOSED': 0 }
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
      const criticality = defect.Criticality;
      if (criticality in criticalityCounts) {
        criticalityCounts[criticality]++;
        
        // Track criticality by status
        if (status && criticality && criticalityByStatus[criticality] && criticalityByStatus[criticality][status] !== undefined) {
          criticalityByStatus[criticality][status]++;
        }
      }
      
      // Count by equipment
      if (defect.Equipments) {
        if (!equipmentCounts[defect.Equipments]) {
          equipmentCounts[defect.Equipments] = 1;
        } else {
          equipmentCounts[defect.Equipments]++;
        }
      }
    });
    
    // Process equipment data for display - show ALL equipment types
    let equipmentData = Object.entries(equipmentCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalDefects) * 100)
      }))
      .sort((a, b) => b.count - a.count);
    
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
      criticalityCounts,
      criticalityByStatus,
      equipmentData
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
        
        {/* High Criticality Status Distribution */}
        {stats.criticalityCounts.High > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1 mb-2">
              <Triangle className="h-3 w-3 fill-red-500 text-red-500" />
              <span className="text-xs text-white/80">High Criticality Status</span>
            </div>
            <div className="flex justify-between items-center text-[10px] pb-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-white/80">Open: {stats.criticalityByStatus.High.OPEN}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-white/80">In Progress: {stats.criticalityByStatus.High['IN PROGRESS']}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-white/80">Closed: {stats.criticalityByStatus.High.CLOSED}</span>
              </div>
            </div>
            <div className="h-1.5 bg-[#132337] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-red-500"
                style={{ 
                  width: `${stats.criticalityCounts.High > 0 ? 
                    (stats.criticalityByStatus.High.OPEN / stats.criticalityCounts.High) * 100 : 0}%` 
                }}
              ></div>
              <div
                className="h-full bg-yellow-500"
                style={{ 
                  width: `${stats.criticalityCounts.High > 0 ? 
                    (stats.criticalityByStatus.High['IN PROGRESS'] / stats.criticalityCounts.High) * 100 : 0}%` 
                }}
              ></div>
              <div
                className="h-full bg-green-500"
                style={{ 
                  width: `${stats.criticalityCounts.High > 0 ? 
                    (stats.criticalityByStatus.High.CLOSED / stats.criticalityCounts.High) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Card 3: Equipment Distribution */}
      <div className="glass-card rounded-[4px] p-4 shadow-lg border border-white/5 backdrop-blur-sm flex flex-col">
        <h3 className="text-sm font-medium text-[#f4f4f4] mb-2">Equipment Distribution</h3>
        
        {/* Scrollable Area - with fixed height to match other cards */}
        <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow" style={{ height: "150px" }}>
          <div className="space-y-2">
            {stats.equipmentData.map((item, index) => {
              // Generate colors for different equipment types using a color palette
              const colors = [
                '#3BADE5', '#805AD5', '#38B2AC', '#718096', 
                '#F56565', '#ED8936', '#ECC94B', '#48BB78',
                '#4299E1', '#667EEA', '#9F7AEA', '#ED64A6'
              ];
              const color = colors[index % colors.length];
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/80 truncate max-w-[180px]" title={item.name}>{item.name}</span>
                    <span className="text-white/60">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#132337] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: color
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {stats.equipmentData.length === 0 && (
          <div className="flex items-center justify-center h-32 text-white/40 text-xs">
            No equipment data available
          </div>
        )}
        
        {/* Equipment count summary - positioned at the bottom */}
        {stats.equipmentData.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs text-white/60 mb-2">
              Equipment Types: <span className="text-white/80">{stats.equipmentData.length}</span>
            </div>
            
            {/* Show a warning if any equipment has high number of defects */}
            {stats.equipmentData[0]?.percentage > 30 && (
              <div className="flex items-start gap-2 bg-[#132337] p-2 rounded-md mt-2">
                <AlertCircle className="h-4 w-4 text-[#3BADE5] flex-shrink-0 mt-0.5" />
                <div className="text-[10px] text-white/80">
                  <span className="font-medium text-[#3BADE5]">{stats.equipmentData[0].name}</span> accounts for {stats.equipmentData[0].percentage}% of all defects, which may require focused attention.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Add custom scrollbar styles to your global CSS or as a style tag in your component
const scrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #132337;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #3BADE5;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3BA0D5;
}
`;

export default StatsCards;
