import React, { useState } from 'react';
import { User, LogOut, ChevronDown, Calendar } from 'lucide-react';

const Header = ({ user, vessels, currentVessel, onVesselChange, onLogout, dateRange, onDateRangeChange }) => {
  const [isVesselDropdownOpen, setIsVesselDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Previous vessel handling code remains the same...
  const selectedVessels = Array.isArray(currentVessel) 
    ? currentVessel 
    : currentVessel ? [currentVessel] : [];

  const handleVesselToggle = (vesselId) => {
    if (vesselId === '') {
      onVesselChange([]);
      return;
    }
    const updatedSelection = selectedVessels.includes(vesselId)
      ? selectedVessels.filter(id => id !== vesselId)
      : [...selectedVessels, vesselId];
    onVesselChange(updatedSelection);
  };

  const getVesselDisplayText = () => {
    if (selectedVessels.length === 0) return 'All Vessels';
    if (selectedVessels.length === 1) {
      const vesselName = vessels.find(([id]) => id === selectedVessels[0])?.[1];
      return vesselName || 'All Vessels';
    }
    return `${selectedVessels.length} Vessels Selected`;
  };

  const handlePresetDateRange = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onDateRangeChange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    });
  };

  const getDateRangeDisplay = () => {
    if (!dateRange.from && !dateRange.to) return 'Select date range';
    if (dateRange.from && !dateRange.to) return `From ${dateRange.from}`;
    if (!dateRange.from && dateRange.to) return `Until ${dateRange.to}`;
    return `${dateRange.from} to ${dateRange.to}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-background border-b">
      <div className="container mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-bold">Defects Manager</h1>
          
          {/* Vessel Selector */}
          {vessels.length > 0 && (
            <div className="relative">
              <button
                className="flex items-center space-x-2 bg-background border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 hover:bg-accent/50"
                onClick={() => setIsVesselDropdownOpen(!isVesselDropdownOpen)}
              >
                <span>{getVesselDisplayText()}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
              
              {isVesselDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-background border rounded-md shadow-lg p-1.5 z-20">
                  <div className="text-xs text-muted-foreground px-2 py-0.5">Select Vessels</div>
                  <div className="h-px bg-border my-1" />
                  <div className="max-h-[240px] overflow-y-auto">
                    <label className="flex items-center px-2 py-1 hover:bg-accent/50 rounded-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="mr-2 h-3 w-3"
                        checked={selectedVessels.length === 0}
                        onChange={() => handleVesselToggle('')}
                      />
                      <span className="text-xs">All Vessels</span>
                    </label>
                    {vessels.map(([id, name]) => (
                      <label
                        key={id}
                        className="flex items-center px-2 py-1 hover:bg-accent/50 rounded-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="mr-2 h-3 w-3"
                          checked={selectedVessels.includes(id)}
                          onChange={() => handleVesselToggle(id)}
                        />
                        <span className="text-xs">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date Range Selector */}
          <div className="relative">
            <button
              className="flex items-center space-x-2 bg-background border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 hover:bg-accent/50"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              <Calendar className="h-3 w-3" />
              <span>{getDateRangeDisplay()}</span>
            </button>

            {isDatePickerOpen && (
              <div className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg p-2 z-20">
                <div className="grid gap-2">
                  <div className="flex gap-2">
                    <div className="grid gap-1">
                      <label className="text-[10px] text-muted-foreground">From</label>
                      <input
                        type="date"
                        className="w-32 px-1.5 py-0.5 text-xs border rounded-md bg-background"
                        value={dateRange.from || ''}
                        onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] text-muted-foreground">To</label>
                      <input
                        type="date"
                        className="w-32 px-1.5 py-0.5 text-xs border rounded-md bg-background"
                        value={dateRange.to || ''}
                        onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                        min={dateRange.from}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { label: 'Last 7 days', days: 7 },
                      { label: 'Last 30 days', days: 30 },
                      { label: 'This month', days: null },
                      { label: 'This year', days: null }
                    ].map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (preset.days) {
                            handlePresetDateRange(preset.days);
                          } else if (preset.label === 'This month') {
                            const now = new Date();
                            const from = new Date(now.getFullYear(), now.getMonth(), 1);
                            onDateRangeChange({
                              from: from.toISOString().split('T')[0],
                              to: now.toISOString().split('T')[0]
                            });
                          } else {
                            const now = new Date();
                            const from = new Date(now.getFullYear(), 0, 1);
                            onDateRangeChange({
                              from: from.toISOString().split('T')[0],
                              to: now.toISOString().split('T')[0]
                            });
                          }
                        }}
                        className="px-2 py-1 text-xs border rounded-md hover:bg-accent/50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => onDateRangeChange({ from: undefined, to: undefined })}
                    className="px-2 py-1 text-xs border rounded-md hover:bg-accent/50 text-red-500"
                  >
                    Clear dates
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Menu */}
        {user && (
          <div className="relative">
            <button
              className="flex items-center space-x-2 hover:bg-accent rounded-full p-1.5"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            >
              <User className="h-4 w-4" />
              <span className="text-xs font-medium">{user.email}</span>
            </button>

            {isUserDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 bg-background border rounded-md shadow-lg z-20">
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-accent/50"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside handlers */}
      {(isVesselDropdownOpen || isDatePickerOpen || isUserDropdownOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setIsVesselDropdownOpen(false);
            setIsDatePickerOpen(false);
            setIsUserDropdownOpen(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
