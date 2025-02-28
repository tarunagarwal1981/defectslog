import { User, LogOut, ChevronDown, Calendar } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

const Header = ({ 
  user, 
  vessels = [], 
  currentVessel, 
  onVesselChange, 
  onLogout, 
  dateRange = { from: '', to: '' }, 
  onDateRangeChange = () => {} 
}) => {
  const [isVesselDropdownOpen, setIsVesselDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const vesselDropdownRef = useRef(null);
  const datePickerRef = useRef(null);
  const userDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vesselDropdownRef.current && !vesselDropdownRef.current.contains(event.target)) {
        setIsVesselDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const vesselList = Array.isArray(vessels) ? vessels : [];
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
      const vesselName = vesselList.find(([id]) => id === selectedVessels[0])?.[1];
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
    setIsDatePickerOpen(false);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    onDateRangeChange({
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    });
    setIsDatePickerOpen(false);
  };

  const handleThisYear = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    onDateRangeChange({
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    });
    setIsDatePickerOpen(false);
  };

  const getDateRangeDisplay = () => {
    if (!dateRange?.from && !dateRange?.to) return 'All Time';
    if (dateRange?.from && !dateRange?.to) return `From ${dateRange.from}`;
    if (!dateRange?.from && dateRange?.to) return `Until ${dateRange.to}`;
    return `${dateRange.from} to ${dateRange.to}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-background border-b">
      <div className="container mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold">Defects Manager</h1>
          
          {/* Vessel Selector */}
          {vesselList.length > 0 && (
            <div className="relative" ref={vesselDropdownRef}>
              <button
                className="flex items-center space-x-2 bg-background border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 hover:bg-accent/50"
                onClick={() => setIsVesselDropdownOpen(!isVesselDropdownOpen)}
              >
                <span>{getVesselDisplayText()}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              
              {isVesselDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-background border rounded-md shadow-lg">
                  <div className="p-2">
                    <div className="text-xs text-muted-foreground mb-1">Select Vessels</div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <label className="flex items-center px-2 py-1.5 hover:bg-accent/50 rounded-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="mr-2 h-3 w-3 rounded border-gray-300"
                          checked={selectedVessels.length === 0}
                          onChange={() => handleVesselToggle('')}
                        />
                        <span className="text-xs">All Vessels</span>
                      </label>
                      {vesselList.map(([id, name]) => (
                        <label
                          key={id}
                          className="flex items-center px-2 py-1.5 hover:bg-accent/50 rounded-sm cursor-pointer"
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
                </div>
              )}
            </div>
          )}

          {/* Date Range Selector */}
          <div className="relative" ref={datePickerRef}>
            <button
              className="flex items-center space-x-2 bg-[#132337] border border-[#3BADE5]/20 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 hover:bg-[#1c3251] hover:border-[#3BADE5]/40"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              <Calendar className="h-4 w-4" />
              <span>{getDateRangeDisplay()}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
          
            {isDatePickerOpen && (
              <div className="absolute top-full left-0 mt-1 bg-[#0B1623] border border-[#3BADE5]/20 rounded-md shadow-lg p-2 z-20 w-[280px]">
                <div className="grid gap-2">
                  <div className="flex gap-2">
                    <div className="grid gap-1">
                      <label className="text-[10px] text-muted-foreground">From</label>
                      <input
                        type="date"
                        className="w-32 px-1.5 py-0.5 text-xs border rounded-md bg-background"
                        value={dateRange?.from || ''}
                        onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] text-muted-foreground">To</label>
                      <input
                        type="date"
                        className="w-32 px-1.5 py-0.5 text-xs border rounded-md bg-background"
                        value={dateRange?.to || ''}
                        onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                        min={dateRange?.from || ''}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => handlePresetDateRange(7)}
                      className="px-2 py-1 text-xs border rounded-md hover:bg-accent/50"
                    >
                      Last 7 days
                    </button>
                    <button
                      onClick={() => handlePresetDateRange(30)}
                      className="px-2 py-1 text-xs border rounded-md hover:bg-accent/50"
                    >
                      Last 30 days
                    </button>
                    <button
                      onClick={handleThisMonth}
                      className="px-2 py-1 text-xs border rounded-md hover:bg-accent/50"
                    >
                      This month
                    </button>
                    <button
                      onClick={handleThisYear}
                      className="px-2 py-1 text-xs border rounded-md hover:bg-accent/50"
                    >
                      This year
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onDateRangeChange({ from: '', to: '' });
                      setIsDatePickerOpen(false);
                    }}
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
          <div className="relative" ref={userDropdownRef}>
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
                  onClick={() => {
                    onLogout();
                    setIsUserDropdownOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm text-red-500 hover:bg-accent/50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
