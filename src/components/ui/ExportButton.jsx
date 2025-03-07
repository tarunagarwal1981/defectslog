import React from 'react';
import { Download } from 'lucide-react';

const ExportButton = ({ onClick, className = '', label = 'Export Excel' }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-[4px] 
    text-white bg-[#3BADE5]/80 hover:bg-[#3BADE5] transition-colors ${className}`}
  >
    <Download className="h-3.5 w-3.5 mr-1.5" />
    {label}
  </button>
);

export default ExportButton;
