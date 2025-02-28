import { User, LogOut, ChevronDown, Calendar, Ship } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

const styles = `
  .header-container {
    background: rgba(11, 22, 35, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(59, 173, 229, 0.1);
  }

  .dropdown-content {
    background: rgba(11, 22, 35, 0.98);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(59, 173, 229, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(11, 22, 35, 0.3);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(59, 173, 229, 0.3);
    border-radius: 4px;
  }

  .date-input {
    color-scheme: dark;
  }

  .date-input::-webkit-calendar-picker-indicator {
    filter: invert(1);
    opacity: 0.5;
  }

  .button-hover {
    transition: all 0.2s ease;
  }

  .button-hover:hover {
    background: rgba(59, 173, 229, 0.1);
    border-color: rgba(59, 173, 229, 0.3);
  }

  .gradient-text {
    background: linear-gradient(45deg, #3BADE5, #8B5CF6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Header = ({ 
  user, 
  vessels = [], 
  currentVessel, 
  onVesselChange, 
  onLogout, 
  dateRange = { from: '', to: '' }, 
  onDateRangeChange = () => {} 
}) => {
  // All your existing state and refs remain the same
  const [isVesselDropdownOpen, setIsVesselDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const vesselDropdownRef = useRef(null);
  const datePickerRef = useRef(null);
  const userDropdownRef = useRef(null);

  // All your existing functions remain unchanged
  // ... (keep all your existing functions)

  return (
    <>
      <style>{styles}</style>
      <header className="fixed top-0 left-0 right-0 z-50 header-container">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-lg font-bold gradient-text flex items-center">
              <Ship className="h-5 w-5 mr-2 text-[#3BADE5]" />
              Defects Manager
            </h1>
            
            {/* Vessel Selector */}
            {vesselList.length > 0 && (
              <div className="relative" ref={vesselDropdownRef}>
                <button
                  className="button-hover flex items-center space-x-2 bg-[#132337]/50 border border-[#3BADE5]/10 rounded-md px-3 py-1.5 text-sm focus:outline-none"
                  onClick={() => setIsVesselDropdownOpen(!isVesselDropdownOpen)}
                >
                  <Ship className="h-4 w-4 text-[#3BADE5]/70" />
                  <span className="text-white/80">{getVesselDisplayText()}</span>
                  <ChevronDown className="h-4 w-4 text-[#3BADE5]/50" />
                </button>
                
                {isVesselDropdownOpen && (
                  <div className="dropdown-content absolute top-full left-0 mt-1 w-56 rounded-md">
                    <div className="p-3">
                      <div className="text-sm text-[#3BADE5] mb-2">Select Vessels</div>
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        <label className="flex items-center px-2 py-2 hover:bg-[#3BADE5]/5 rounded-md cursor-pointer">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 rounded accent-[#3BADE5]"
                            checked={selectedVessels.length === 0}
                            onChange={() => handleVesselToggle('')}
                          />
                          <span className="text-sm text-white/80">All Vessels</span>
                        </label>
                        {vesselList.map(([id, name]) => (
                          <label
                            key={id}
                            className="flex items-center px-2 py-2 hover:bg-[#3BADE5]/5 rounded-md cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="mr-2 h-4 w-4 rounded accent-[#3BADE5]"
                              checked={selectedVessels.includes(id)}
                              onChange={() => handleVesselToggle(id)}
                            />
                            <span className="text-sm text-white/80">{name}</span>
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
                className="button-hover flex items-center space-x-2 bg-[#132337]/50 border border-[#3BADE5]/10 rounded-md px-3 py-1.5 text-sm"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              >
                <Calendar className="h-4 w-4 text-[#3BADE5]/70" />
                <span className="text-white/80">{getDateRangeDisplay()}</span>
                <ChevronDown className="h-4 w-4 text-[#3BADE5]/50" />
              </button>

              {isDatePickerOpen && (
                <div className="dropdown-content absolute top-full left-0 mt-1 p-4 rounded-md w-[320px]">
                  <div className="grid gap-4">
                    <div className="flex gap-4">
                      <div className="grid gap-2">
                        <label className="text-xs text-[#3BADE5]">From</label>
                        <input
                          type="date"
                          className="date-input w-36 px-2 py-1.5 text-sm border border-[#3BADE5]/20 rounded-md bg-[#132337]/50 focus:border-[#3BADE5]/40 focus:outline-none"
                          value={dateRange?.from || ''}
                          onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs text-[#3BADE5]">To</label>
                        <input
                          type="date"
                          className="date-input w-36 px-2 py-1.5 text-sm border border-[#3BADE5]/20 rounded-md bg-[#132337]/50 focus:border-[#3BADE5]/40 focus:outline-none"
                          value={dateRange?.to || ''}
                          onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                          min={dateRange?.from || ''}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Last 7 days', action: () => handlePresetDateRange(7) },
                        { label: 'Last 30 days', action: () => handlePresetDateRange(30) },
                        { label: 'This month', action: handleThisMonth },
                        { label: 'This year', action: handleThisYear }
                      ].map(({ label, action }) => (
                        <button
                          key={label}
                          onClick={action}
                          className="button-hover px-3 py-1.5 text-sm border border-[#3BADE5]/20 rounded-md text-white/80"
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        onDateRangeChange({ from: '', to: '' });
                        setIsDatePickerOpen(false);
                      }}
                      className="button-hover px-3 py-1.5 text-sm border border-red-500/20 rounded-md text-red-400 hover:bg-red-500/10"
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
                className="button-hover flex items-center space-x-3 bg-[#132337]/50 border border-[#3BADE5]/10 rounded-full px-4 py-1.5"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <User className="h-4 w-4 text-[#3BADE5]" />
                <span className="text-sm text-white/80">{user.email}</span>
                <ChevronDown className="h-4 w-4 text-[#3BADE5]/50" />
              </button>

              {isUserDropdownOpen && (
                <div className="dropdown-content absolute top-full right-0 mt-1 rounded-md min-w-[200px]">
                  <button
                    onClick={() => {
                      onLogout();
                      setIsUserDropdownOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
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
      {/* Add spacing for fixed header */}
      <div className="h-14" />
    </>
  );
};

export default Header;
