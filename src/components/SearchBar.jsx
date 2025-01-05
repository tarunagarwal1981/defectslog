import React from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const SearchBar = ({ 
  onSearch, 
  onFilterStatus, 
  onFilterCriticality, 
  onFilterRaisedBy,
  status, 
  criticality,
  raisedBy,
  raisedByOptions = [] // Array of unique raised_by values
}) => {
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

        <Select value={criticality} onValueChange={onFilterCriticality}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-[#132337]/30 border-white/10">
            <SelectValue placeholder="All Criticality" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="">All Criticality</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={raisedBy} onValueChange={onFilterRaisedBy}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-[#132337]/30 border-white/10">
            <SelectValue placeholder="Created By" />
          </SelectTrigger>
          <SelectContent className="text-xs max-h-[200px]">
            <SelectItem value="">All Users</SelectItem>
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
