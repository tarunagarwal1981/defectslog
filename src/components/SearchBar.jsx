import React from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
  status, 
  criticality = [], // Now an array
  raisedBy,
  raisedByOptions = []
}) => {
  // Handle criticality toggle
  const handleCriticalityToggle = (value) => {
    if (value === '') {
      // If "All Criticality" is clicked, clear selection
      onFilterCriticality([]);
      return;
    }

    const updatedSelection = criticality.includes(value)
      ? criticality.filter(item => item !== value)
      : [...criticality, value];
    
    onFilterCriticality(updatedSelection);
  };

  // Get display text for criticality
  const getCriticalityDisplayText = () => {
    if (criticality.length === 0) return 'All Criticality';
    if (criticality.length === 1) return criticality[0];
    return `${criticality.length} Selected`;
  };

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
        <Select value={status} onValueChange={onFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-[#132337]/30 border-white/10">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN PROGRESS">In Progress</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        {/* Criticality Multi-select Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-between w-[140px] h-8 px-3 text-xs bg-[#132337]/30 border border-white/10 rounded-md">
            <span>{getCriticalityDisplayText()}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[140px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Select Criticality
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* All Criticality Option */}
            <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent">
              <label className="flex flex-1 items-center">
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4 rounded border-gray-300"
                  checked={criticality.length === 0}
                  onChange={() => handleCriticalityToggle('')}
                />
                All Criticality
              </label>
            </div>
            {/* Individual Criticality Options */}
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
                    onChange={() => handleCriticalityToggle(value)}
                  />
                  {value}
                </label>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={raisedBy} onValueChange={onFilterRaisedBy}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-[#132337]/30 border-white/10">
            <SelectValue placeholder="Created By" />
          </SelectTrigger>
          <SelectContent className="text-xs max-h-[200px]">
            <SelectItem value="">Raised By</SelectItem>
            {raisedByOptions.map((user) => (
              <SelectItem key={user} value={user}>
                {user}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SearchBar;
