// SearchBar.jsx
import React from 'react';
import { Input } from './ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from './ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

const SearchBar = ({ 
  onSearch, 
  onFilterStatus, 
  onFilterCriticality, 
  onFilterRaisedBy,
  status = [], // Now an array
  criticality = [], // Already an array
  raisedBy = [], // Now an array
  raisedByOptions = []
}) => {
  // Generic handler for all filter types
  const handleFilterToggle = (type, value, currentSelection, onFilter) => {
    if (value === '') {
      // If "All" is clicked, clear selection
      onFilter([]);
      return;
    }

    const updatedSelection = currentSelection.includes(value)
      ? currentSelection.filter(item => item !== value)
      : [...currentSelection, value];
    
    onFilter(updatedSelection);
  };

  // Get display text for any filter type
  const getFilterDisplayText = (type, selection, options) => {
    if (selection.length === 0) return `All ${type}`;
    if (selection.length === 1) return selection[0];
    return `${selection.length} Selected`;
  };

  const statusOptions = ['OPEN', 'IN PROGRESS', 'CLOSED'];

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-2 mb-2">
      <div className="w-full max-w-xs">
        <Input
          placeholder="Search defects..."
          onChange={(e) => onSearch(e.target.value)}
          className="h-8 text-xs bg-[#132337]/30 border-white/10 focus:ring-[#3BADE5] focus:ring-1"
        />
      </div>
      
      <div className="flex gap-2">
        {/* Status Multi-select Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-between w-[140px] h-8 px-3 text-xs bg-[#132337]/30 border border-white/10 rounded-md">
            <span>{getFilterDisplayText('Status', status)}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[140px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Select Status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
              <label className="flex flex-1 items-center">
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4 rounded border-gray-300"
                  checked={status.length === 0}
                  onChange={() => handleFilterToggle('Status', '', status, onFilterStatus)}
                />
                All Status
              </label>
            </div>
            {statusOptions.map((value) => (
              <div 
                key={value}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent"
              >
                <label className="flex flex-1 items-center">
                  <input
                    type="checkbox"
                    className="mr-2 h-4 w-4 rounded border-gray-300"
                    checked={status.includes(value)}
                    onChange={() => handleFilterToggle('Status', value, status, onFilterStatus)}
                  />
                  {value}
                </label>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Criticality Multi-select Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-between w-[140px] h-8 px-3 text-xs bg-[#132337]/30 border border-white/10 rounded-md">
            <span>{getFilterDisplayText('Criticality', criticality)}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[140px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Select Criticality
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
              <label className="flex flex-1 items-center">
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4 rounded border-gray-300"
                  checked={criticality.length === 0}
                  onChange={() => handleFilterToggle('Criticality', '', criticality, onFilterCriticality)}
                />
                All Criticality
              </label>
            </div>
            {['High', 'Medium', 'Low'].map((value) => (
              <div 
                key={value}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent"
              >
                <label className="flex flex-1 items-center">
                  <input
                    type="checkbox"
                    className="mr-2 h-4 w-4 rounded border-gray-300"
                    checked={criticality.includes(value)}
                    onChange={() => handleFilterToggle('Criticality', value, criticality, onFilterCriticality)}
                  />
                  {value}
                </label>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Raised By Multi-select Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-between w-[140px] h-8 px-3 text-xs bg-[#132337]/30 border border-white/10 rounded-md">
            <span>{getFilterDisplayText('Defect Source', raisedBy)}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[140px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Select Raised By
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
              <label className="flex flex-1 items-center">
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4 rounded border-gray-300"
                  checked={raisedBy.length === 0}
                  onChange={() => handleFilterToggle('Raised By', '', raisedBy, onFilterRaisedBy)}
                />
                All Users
              </label>
            </div>
            {raisedByOptions.map((value) => (
              <div 
                key={value}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent"
              >
                <label className="flex flex-1 items-center">
                  <input
                    type="checkbox"
                    className="mr-2 h-4 w-4 rounded border-gray-300"
                    checked={raisedBy.includes(value)}
                    onChange={() => handleFilterToggle('Raised By', value, raisedBy, onFilterRaisedBy)}
                  />
                  {value}
                </label>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default SearchBar;
