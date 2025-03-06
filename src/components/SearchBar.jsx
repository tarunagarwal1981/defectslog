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
import { ChevronDown, Search, Filter, AlertCircle } from 'lucide-react';

const styles = `
  .search-input {
    transition: all 0.2s ease-in-out;
    background: rgba(19, 35, 55, 0.4);
    backdrop-filter: blur(8px);
  }

  .search-input:focus {
    background: rgba(19, 35, 55, 0.6);
    box-shadow: 0 0 0 2px rgba(59, 173, 229, 0.2);
    border-color: rgba(59, 173, 229, 0.4);
  }

  .filter-dropdown-trigger {
    transition: all 0.2s ease-in-out;
    background: rgba(19, 35, 55, 0.4);
    backdrop-filter: blur(8px);
  }

  .filter-dropdown-trigger:hover {
    background: rgba(19, 35, 55, 0.6);
    border-color: rgba(59, 173, 229, 0.4);
  }

  .filter-dropdown-content {
    background: rgba(19, 35, 55, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(59, 173, 229, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .custom-checkbox {
    accent-color: #3BADE5;
    transition: all 0.2s ease;
  }

  .custom-checkbox:hover {
    transform: scale(1.05);
  }

  .filter-item {
    transition: all 0.15s ease;
  }

  .filter-item:hover {
    background: rgba(59, 173, 229, 0.1);
  }
  
  .status-indicator {
    display: inline-flex;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
  }

  .status-open {
    background-color: rgba(239, 68, 68, 0.8);
  }
  
  .status-inprogress {
    background-color: rgba(250, 173, 20, 0.8);
  }
  
  .status-closed {
    background-color: rgba(82, 196, 26, 0.8);
  }
  
  .status-overdue {
    background-color: rgba(249, 115, 22, 0.8);
  }
`;

const SearchBar = ({ 
  onSearch, 
  onFilterStatus, 
  onFilterCriticality, 
  onFilterRaisedBy,
  status = [],
  criticality = [],
  raisedBy = [],
  raisedByOptions = []
}) => {
  // Custom handler for status filter to handle the special OVERDUE case
  const handleStatusFilterToggle = (value, currentSelection) => {
    if (value === '') {
      onFilterStatus([]);
      return;
    }
    
    const updatedSelection = currentSelection.includes(value)
      ? currentSelection.filter(item => item !== value)
      : [...currentSelection, value];
    
    onFilterStatus(updatedSelection);
  };
  
  const handleFilterToggle = (type, value, currentSelection, onFilter) => {
    if (value === '') {
      onFilter([]);
      return;
    }
    const updatedSelection = currentSelection.includes(value)
      ? currentSelection.filter(item => item !== value)
      : [...currentSelection, value];
    onFilter(updatedSelection);
  };

  const getFilterDisplayText = (type, selection, options) => {
    if (selection.length === 0) return `All ${type}`;
    if (selection.length === 1) return selection[0];
    return `${selection.length} Selected`;
  };

  // Add OVERDUE to status options
  const statusOptions = ['OPEN', 'IN PROGRESS', 'CLOSED', 'OVERDUE'];

  const FilterDropdown = ({ type, options, selection, onFilter, label, isStatus = false }) => (
    <DropdownMenu>
      <DropdownMenuTrigger className="filter-dropdown-trigger flex items-center justify-between w-[140px] h-8 px-3 text-xs border border-white/10 rounded-md hover:border-[#3BADE5]/30 group">
        <span className="flex items-center gap-2">
          <Filter className="w-3 h-3 opacity-50 group-hover:opacity-80 transition-opacity" />
          {getFilterDisplayText(type, selection)}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-80 transition-opacity" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="filter-dropdown-content w-[180px] p-2">
        <DropdownMenuLabel className="text-xs text-[#3BADE5]/80 px-2 py-1">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5 my-2" />
        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
          <div className="filter-item rounded-sm px-2 py-1.5">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="custom-checkbox mr-2 h-4 w-4 rounded"
                checked={selection.length === 0}
                onChange={() => isStatus 
                  ? handleStatusFilterToggle('', selection) 
                  : handleFilterToggle(type, '', selection, onFilter)
                }
              />
              <span className="text-sm text-white/80">All {type}</span>
            </label>
          </div>
          {options.map((value) => (
            <div key={value} className="filter-item rounded-sm px-2 py-1.5">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="custom-checkbox mr-2 h-4 w-4 rounded"
                  checked={selection.includes(value)}
                  onChange={() => isStatus 
                    ? handleStatusFilterToggle(value, selection) 
                    : handleFilterToggle(type, value, selection, onFilter)
                  }
                />
                {isStatus ? (
                  <span className="text-sm text-white/80 flex items-center">
                    <span className={`status-indicator ${
                      value === 'OPEN' ? 'status-open' : 
                      value === 'IN PROGRESS' ? 'status-inprogress' : 
                      value === 'CLOSED' ? 'status-closed' :
                      value === 'OVERDUE' ? 'status-overdue' : ''
                    }`}></span>
                    {value === 'OVERDUE' && (
                      <AlertCircle className="inline-block h-3 w-3 mr-1 text-orange-400" />
                    )}
                    {value}
                  </span>
                ) : (
                  <span className="text-sm text-white/80">{value}</span>
                )}
              </label>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="flex items-center justify-between gap-4 px-1 py-2 mb-2 bg-[#132337]/20 rounded-lg backdrop-blur-sm">
        <div className="w-full max-w-xs relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search defects..."
            onChange={(e) => onSearch(e.target.value)}
            className="search-input h-8 text-sm pl-10 pr-4 bg-[#132337]/30 border-white/10 placeholder:text-white/40"
          />
        </div>
        
        <div className="flex gap-3">
          <FilterDropdown
            type="Status"
            options={statusOptions}
            selection={status}
            onFilter={onFilterStatus}
            label="Select Status"
            isStatus={true}
          />
          
          <FilterDropdown
            type="Criticality"
            options={['High', 'Medium', 'Low']}
            selection={criticality}
            onFilter={onFilterCriticality}
            label="Select Criticality"
          />
          
          <FilterDropdown
            type="Defect Source"
            options={raisedByOptions}
            selection={raisedBy}
            onFilter={onFilterRaisedBy}
            label="Select Source"
          />
        </div>
      </div>
    </>
  );
};

export default SearchBar;
