import React, { useState } from 'react';
import { PlusCircle, FileText, Trash2, ChevronDown, ChevronUp, X, ExternalLink, Download } from 'lucide-react';
import ExportButton from './ui/ExportButton';
import { exportToCSV } from '../utils/exportToCSV';
import { Dialog, DialogContent } from './ui/dialog';

const STATUS_COLORS = {
  'OPEN': {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    glow: 'shadow-[0_0_10px_rgba(255,77,79,0.3)]'
  },
  'CLOSED': {
    bg: 'bg-green-500/20',
    text: 'text-green-300',
    glow: 'shadow-[0_0_10px_rgba(82,196,26,0.3)]'
  },
  'IN PROGRESS': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
    glow: 'shadow-[0_0_10px_rgba(250,173,20,0.3)]'
  }
};

const CRITICALITY_COLORS = {
  'High': {
    bg: 'bg-red-500/20',
    text: 'text-red-300'
  },
  'Medium': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300'
  },
  'Low': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-300'
  }
};

const FilePreviewDialog = ({ file, isOpen, onClose }) => {
  const isImage = /\.(jpg|jpeg|png)$/i.test(file?.name || '');
  const isPDF = /\.pdf$/i.test(file?.name || '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B1623] p-4 max-w-[90vw] max-h-[90vh] w-fit overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-white truncate max-w-[60vh]">
            {file?.name}
          </h3>
          <div className="flex gap-2 shrink-0">
            <a
              href={file?.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full hover:bg-white/10 text-[#3BADE5] transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="bg-[#132337] rounded-lg overflow-hidden">
          {isImage ? (
            <div className="max-h-[70vh] overflow-auto">
              <img 
                src={file?.url} 
                alt={file?.name} 
                className="max-w-full h-auto object-contain"
              />
            </div>
          ) : isPDF ? (
            <iframe 
              src={file?.url} 
              className="w-full h-[70vh]" 
              title={file?.name}
            />
          ) : (
            <div className="p-4 text-center text-white/60">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p>Preview not available</p>
              <a
                href={file?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3BADE5] hover:underline inline-flex items-center gap-1 mt-2"
              >
                Open file <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DefectRow = ({ defect, index, onEditDefect, onDeleteDefect, onDeleteFile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleFileClick = (file, e) => {
    e.stopPropagation();
    setSelectedFile(file);
    setIsFilePreviewOpen(true);
  };

  const handleFileDelete = async (fileIndex, fileType, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this file?')) {
      await onDeleteFile(defect.id, fileIndex, fileType);
    }
  };

  const renderFileSection = (files, title, fileType) => {
    if (!files?.length) return null;
    
    return (
      <div>
        <div className="text-xs font-medium text-white/80 mb-1">{title}</div>
        <div className="flex flex-wrap gap-2">
          {files.map((file, fileIndex) => (
            <div
              key={fileIndex}
              className="flex items-center gap-2 bg-[#0B1623] px-2 py-1 rounded"
            >
              <FileText className="h-3.5 w-3.5 text-[#3BADE5]" />
              <button
                onClick={(e) => handleFileClick(file, e)}
                className="text-xs text-white/90 hover:text-[#3BADE5] transition-colors truncate max-w-[150px]"
              >
                {file.name}
              </button>
              <button
                onClick={(e) => handleFileDelete(fileIndex, fileType, e)}
                className="p-1 hover:bg-red-500/20 text-red-400 rounded-full transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <tr className="table-hover-row cursor-pointer border-b border-white/10 hover:bg-white/5">
        <td className="px-3 py-1.5">
          <button
            onClick={toggleExpand}
            className="p-0.5 hover:bg-white/10 rounded transition-colors"
          >
            <span className={`inline-block transition-transform duration-200 text-[#3BADE5] ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
              ▼
            </span>
          </button>
        </td>
        <td className="px-3 py-1.5">{index + 1}</td>
        <td className="px-3 py-1.5" onClick={() => onEditDefect(defect)}>
          {defect.vessel_name}
        </td>
        <td className="px-3 py-1.5" onClick={() => onEditDefect(defect)}>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] 
            ${STATUS_COLORS[defect['Status (Vessel)']].bg} 
            ${STATUS_COLORS[defect['Status (Vessel)']].text}
            ${STATUS_COLORS[defect['Status (Vessel)']].glow}
            transition-all duration-200`}
          >
            <span className="w-1 h-1 rounded-full bg-current mr-1"></span>
            {defect['Status (Vessel)']}
          </span>
        </td>
        <td className="px-3 py-1.5" onClick={() => onEditDefect(defect)}>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] 
            ${CRITICALITY_COLORS[defect.Criticality]?.bg || 'bg-gray-500/20'} 
            ${CRITICALITY_COLORS[defect.Criticality]?.text || 'text-gray-300'}`}
          >
            {defect.Criticality || 'N/A'}
          </span>
        </td>
        <td className="px-3 py-1.5 truncate max-w-[150px]" title={defect.Equipments} onClick={() => onEditDefect(defect)}>
          {defect.Equipments}
        </td>
        <td className="px-3 py-1.5 truncate max-w-[200px]" title={defect.Description} onClick={() => onEditDefect(defect)}>
          {defect.Description}
        </td>
        <td className="px-3 py-1.5 truncate max-w-[200px]" title={defect['Action Planned']} onClick={() => onEditDefect(defect)}>
          {defect['Action Planned']}
        </td>
        <td className="px-3 py-1.5" onClick={() => onEditDefect(defect)}>
          {defect['Date Reported'] ? new Date(defect['Date Reported']).toLocaleDateString() : '-'}
        </td>
        <td className="px-3 py-1.5" onClick={() => onEditDefect(defect)}>
          {defect['Date Completed'] ? new Date(defect['Date Completed']).toLocaleDateString() : '-'}
        </td>
        <td className="px-3 py-1.5">
          <div className="flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this defect?')) {
                  onDeleteDefect(defect.id);
                }
              }}
              className="p-1 hover:bg-red-500/20 text-red-400 rounded-full transition-colors"
              aria-label="Delete defect"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-[#132337]/50">
          <td colSpan="11" className="px-8 py-3 border-b border-white/10">
            <div className="grid gap-3">
              <div>
                <div className="text-xs font-medium text-white/80 mb-1">Description</div>
                <div className="text-xs text-white/90">{defect.Description || '-'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-white/80 mb-1">Action Planned</div>
                <div className="text-xs text-white/90">{defect['Action Planned'] || '-'}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-white/80 mb-1">Comments</div>
                <div className="text-xs text-white/90">{defect.Comments || '-'}</div>
              </div>
              
              {(defect.before_files?.length > 0 || defect.after_files?.length > 0) && (
                <div className="space-y-3">
                  {renderFileSection(defect.before_files, 'Before Documentation', 'before')}
                  {renderFileSection(defect.after_files, 'After Documentation', 'after')}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
      <FilePreviewDialog
        file={selectedFile}
        isOpen={isFilePreviewOpen}
        onClose={() => {
          setIsFilePreviewOpen(false);
          setSelectedFile(null);
        }}
      />
    </>
  );
};

const DefectsTable = ({ 
  data, 
  onAddDefect, 
  onEditDefect,
  onDeleteDefect,
  onDeleteFile,
  loading,
  searchTerm = '',
  statusFilter = '',
  criticalityFilter = '' 
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'Date Reported',
    direction: 'desc'
  });

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key 
        ? prevConfig.direction === 'asc' ? 'desc' : 'asc'
        : 'asc'
    }));
  };

  const getSortedData = () => {
    const sortedData = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      let comparison = 0;

      if (sortConfig.key.includes('Date')) {
        comparison = new Date(aValue) - new Date(bValue);
      } else if (typeof aValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue - bValue;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sortedData;
  };

  const handleExport = () => {
    exportToCSV(getSortedData(), {
      search: searchTerm,
      status: statusFilter,
      criticality: criticalityFilter
    });
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />;
  };

  const columns = [
    { key: 'vessel_name', label: 'Vessel' },
    { key: 'Status (Vessel)', label: 'Status' },
    { key: 'Criticality', label: 'Criticality' },
    { key: 'Equipments', label: 'Equipment' },
    { key: 'Description', label: 'Description' },
    { key: 'Action Planned', label: 'Action Planned' },
    { key: 'Date Reported', label: 'Reported' },
    { key: 'Date Completed', label: 'Completed' }
  ];

  const sortedData = getSortedData();

  return (
    <div className="glass-card rounded-[4px]">
      <div className="flex justify-between items-center px-3 py-2 border-b border-white/10">
        <h2 className="text-sm font-medium text-[#f4f4f4]">Defects Register</h2>
        <div className="flex items-center gap-2">
          <ExportButton onClick={handleExport} />
          <button 
            onClick={onAddDefect} 
            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-[4px] 
              text-white bg-[#3BADE5] hover:bg-[#3BADE5]/80 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Add Defect
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#132337] border-b border-white/10">
              <th className="px-3 py-2 text-left font-semibold text-[#f4f4f4] opacity-90 w-8"></th>
              <th className="px-3 py-2 text-left font-semibold text-[#f4f4f4] opacity-90 w-12">#</th>
              {columns.map(column => (
                <th 
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className="px-3 py-2 text-left font-semibold text-[#f4f4f4] opacity-90 cursor-pointer hover:bg-white/5"
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-left font-semibold text-[#f4f4f4] opacity-90 w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[#f4f4f4]">
            {loading ? (
              <tr>
                <td colSpan="11" className="px-3 py-2 text-center">Loading...</td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-3 py-2 text-center">No defects found</td>
              </tr>
            ) : (
              sortedData.map((defect, index) => (
                <DefectRow
                  key={defect.id}
                  defect={defect}
                  index={index}
                  onEditDefect={onEditDefect}
                  onDeleteDefect={onDeleteDefect}
                  onDeleteFile={onDeleteFile}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DefectsTable;
