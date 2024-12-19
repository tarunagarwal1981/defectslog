import React, { useState } from 'react';
import { PlusCircle, FileText, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import ExportButton from './ui/ExportButton';
import { exportToCSV } from '../utils/exportToCSV';
import { supabase } from '../supabaseClient';
import { toast } from './ui/use-toast';

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

// File Viewer Component
const FileViewer = ({ url, filename, onClose }) => (
  <Dialog open={true} onOpenChange={onClose}>
    <DialogContent className="max-w-4xl max-h-[90vh] bg-[#0B1623]">
      <DialogHeader>
        <DialogTitle className="text-sm font-medium text-white flex justify-between items-center">
          <span>{filename}</span>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </DialogTitle>
      </DialogHeader>
      <div className="mt-4">
        {url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
          <img src={url} alt={filename} className="max-w-full h-auto" />
        ) : (
          <iframe src={url} className="w-full h-[70vh]" title={filename} />
        )}
      </div>
    </DialogContent>
  </Dialog>
);

// File List Component
const FileList = ({ files, onDelete, title }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileClick = async (file) => {
    try {
      const { data: { signedUrl }, error } = await supabase.storage
        .from('defect-files')
        .createSignedUrl(file.path, 3600); // 1 hour expiry

      if (error) throw error;

      setSelectedFile({ url: signedUrl, name: file.name });
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast({
        title: "Error",
        description: "Failed to load file",
        variant: "destructive",
      });
    }
  };

  if (!files?.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-white/80 mb-1">{title}</div>
      {files.map((file, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-[#3BADE5]" />
          <button
            onClick={() => handleFileClick(file)}
            className="text-white/90 hover:text-white truncate flex-1"
          >
            {file.name}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(file)}
              className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-500/20"
              aria-label="Delete file"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {selectedFile && (
        <FileViewer
          url={selectedFile.url}
          filename={selectedFile.name}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
};

const DefectRow = ({ defect, index, onEditDefect, onDeleteDefect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleDeleteFile = async (file) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('defect-files')
        .remove([file.path]);

      if (storageError) throw storageError;

      // Update defect record
      const isInitialFile = defect.initial_files.some(f => f.path === file.path);
      const updatedDefect = {
        ...defect,
        initial_files: isInitialFile 
          ? defect.initial_files.filter(f => f.path !== file.path)
          : defect.initial_files,
        completion_files: !isInitialFile
          ? defect.completion_files.filter(f => f.path !== file.path)
          : defect.completion_files
      };

      const { error: updateError } = await supabase
        .from('defects register')
        .update(updatedDefect)
        .eq('id', defect.id);

      if (updateError) throw updateError;

      toast({
        title: "File Deleted",
        description: "File was successfully removed",
      });

    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
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
        <td className="px-3 py-1.5 truncate max-w-[150px]" onClick={() => onEditDefect(defect)}>
          {defect.Equipments}
        </td>
        <td className="px-3 py-1.5 truncate max-w-[200px]" onClick={() => onEditDefect(defect)}>
          {defect.Description}
        </td>
        <td className="px-3 py-1.5 truncate max-w-[200px]" onClick={() => onEditDefect(defect)}>
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
                onDeleteDefect(defect.id);
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
          <td colSpan="11" className="px-8 py-4 border-b border-white/10">
            <div className="space-y-6">
              {/* Top section: Text content */}
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <h4 className="text-xs font-medium text-white/80 mb-2">Description</h4>
                  <p className="text-xs text-white/90">{defect.Description || '-'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-white/80 mb-2">Action Planned</h4>
                  <p className="text-xs text-white/90">{defect['Action Planned'] || '-'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-white/80 mb-2">Comments</h4>
                  <p className="text-xs text-white/90">{defect.Comments || '-'}</p>
                </div>
              </div>

              {/* Files section */}
              <div className="flex gap-8">
                <div className="flex-1">
                  {defect.initial_files?.length > 0 && (
                    <FileList
                      files={defect.initial_files}
                      onDelete={handleDeleteFile}
                      title="Initial Documentation"
                    />
                  )}
                </div>
                <div className="flex-1">
                  {defect.completion_files?.length > 0 && (
                    <FileList
                      files={defect.completion_files}
                      onDelete={handleDeleteFile}
                      title="Closure Documentation"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const getSignedUrls = async (files) => {
                        const urls = {};
                        for (const file of files) {
                          if (file.type.startsWith('image/')) {
                            try {
                              const { data: { signedUrl } } = await supabase.storage
                                .from('defect-files')
                                .createSignedUrl(file.path, 3600);
                              
                              urls[file.path] = signedUrl;
                            } catch (error) {
                              console.error('Error getting signed URL:', error);
                            }
                          }
                        }
                        return urls;
                      };

                      const initialUrls = await getSignedUrls(defect.initial_files || []);
                      const completionUrls = await getSignedUrls(defect.completion_files || []);
                      
                      const { generateDefectReport } = await import('../utils/generateDefectReport');
                      await generateDefectReport(defect, {
                        ...initialUrls,
                        ...completionUrls
                      });

                      toast({
                        title: "Success",
                        description: "Report generated successfully",
                      });
                    } catch (error) {
                      console.error('Error generating report:', error);
                      toast({
                        title: "Error",
                        description: "Failed to generate report",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 text-xs font-medium rounded-md 
                    text-white bg-[#3BADE5] hover:bg-[#3BADE5]/80 transition-colors shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}; // End of DefectRow

// Start of DefectsTable component
const DefectsTable = ({ 
  data, 
  onAddDefect, 
  onEditDefect,
  onDeleteDefect,
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

  const sortedData = getSortedData();

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
