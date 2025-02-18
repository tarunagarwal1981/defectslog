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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { CORE_FIELDS } from '../config/fieldMappings';

const isColumnVisible = (fieldId, permissions) => {
  if (!permissions?.fieldPermissions) return true;
  return permissions.fieldPermissions[fieldId]?.visible;
};

const canPerformAction = (action, permissions) => {
  if (!permissions?.actionPermissions) return false;
  return permissions.actionPermissions[action];
};

const getVisibleColumns = (permissions, isExternal) => {
  return Object.entries(CORE_FIELDS.TABLE)
    .filter(([fieldId, field]) => {
      // Always show action columns
      if (field.isAction) return true;
      
      // Check permission visibility
      if (!isColumnVisible(fieldId, permissions)) return false;
      
      // Handle external user restrictions
      if (isExternal && field.restrictedToInternal) return false;
      
      return true;
    })
    .sort((a, b) => a[1].priority - b[1].priority);
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

const TruncatedText = ({ text, maxWidth = "max-w-[200px]" }) => {
  if (!text) return '-';
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={`truncate ${maxWidth}`}>
            {text}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-sm bg-[#132337] text-white border-white/20"
        >
          <p className="text-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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





const DefectRow = ({ defect: initialDefect, index, onEditDefect, onDeleteDefect, permissions,
  isExternal }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [defect, setDefect] = useState(initialDefect);
  const canEdit = canPerformAction('update', permissions);
  const canDelete = canPerformAction('delete', permissions);  

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
      setDefect(updatedDefect);
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
     
        {getVisibleColumns(permissions, isExternal).map(([fieldId, field]) => {
          if (field.isAction) {
            if (fieldId === 'expandToggle') {
              return (
                <td 
                  key={fieldId} 
                  className={`px-3 py-1.5 sticky left-0 z-10`}
                >
                  <button
                    onClick={toggleExpand}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <span className={`inline-block transition-transform duration-200 text-[#3BADE5] ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                      ▼
                    </span>
                  </button>
                </td>
              );
            }
            if (fieldId === 'actions') {
              return (
                <td 
                  key={fieldId} 
                  className={`px-3 py-1.5 sticky right-0 z-10`}
                >
                  <div className="flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        canDelete && onDeleteDefect(defect.id);
                      }}
                      className={`p-1 text-red-400 rounded-full transition-colors
                        ${canDelete ? 'hover:bg-red-500/20' : 'opacity-50 cursor-not-allowed'}`}
                      aria-label="Delete defect"
                      disabled={!canDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              );
            }
            return <td key={fieldId} className="px-3 py-1.5"></td>;
          }

          // Regular content cells
          let content;
          switch (fieldId) {
            case 'vessel':
              content = defect.vessel_name;
              break;
            case 'status':
              content = (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] 
                  ${STATUS_COLORS[defect['Status (Vessel)']].bg} 
                  ${STATUS_COLORS[defect['Status (Vessel)']].text}
                  ${STATUS_COLORS[defect['Status (Vessel)']].glow}
                  transition-all duration-200`}
                >
                  <span className="w-1 h-1 rounded-full bg-current mr-1"></span>
                  {defect['Status (Vessel)']}
                </span>
              );
              break;
            case 'criticality':
              content = (
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] 
                  ${CRITICALITY_COLORS[defect.Criticality]?.bg || 'bg-gray-500/20'} 
                  ${CRITICALITY_COLORS[defect.Criticality]?.text || 'text-gray-300'}`}
                >
                  {defect.Criticality || 'N/A'}
                </span>
              );
              break;
            case 'equipments':
              content = <TruncatedText text={defect.Equipments} maxWidth="max-w-[150px]" />;
              break;
            case 'description':
              content = <TruncatedText text={defect.Description} />;
              break;
            case 'actionPlanned':
              content = <TruncatedText text={defect['Action Planned']} />;
              break;
            case 'dateReported':
              content = defect['Date Reported'] 
                ? new Date(defect['Date Reported']).toLocaleDateString('en-GB') 
                : '-';
              break;
            case 'dateCompleted':
              content = defect['Date Completed'] 
                ? new Date(defect['Date Completed']).toLocaleDateString('en-GB') 
                : '-';
              break;
            case 'raisedBy':
              content = defect.raised_by || '-';
              break;
            case 'comments':
              content = <TruncatedText text={defect.Comments} title="Follow-Up" />;
              break;
            case 'closureComments':
              content = <TruncatedText text={defect.closure_comments} />;
              break;
            case 'silentMode':
              content = (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] 
                  ${defect.external_visibility ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}
                >
                  {defect.external_visibility ? 'Visible' : 'Hidden'}
                </span>
              );
              break;  
            case 'index':
              content = index + 1;
              break;
            default:
              content = defect[field.dbField] || '-';
          }

          return (
            <td 
              key={fieldId} 
              className={`px-3 py-1.5 ${field.fixedLeft ? 'sticky left-0 z-10 bg-[#0B1623]' : ''} 
                ${field.fixedRight ? 'sticky right-0 z-10 bg-[#0B1623]' : ''}`}
              onClick={() => canEdit && onEditDefect(defect)}
            >
              {content}
            </td>
          );
        })}
      </tr>

     
      {isExpanded && (
        <tr className="bg-[#132337]/50">
          <td colSpan={getVisibleColumns(permissions, isExternal).length} className="p-4 border-b border-white/10">
            <div className="space-y-4">
              {/* Main Content in 3-column Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Basic Details */}
                <div className="bg-[#0B1623] rounded-md p-3">
                  <h4 className="text-xs font-medium text-[#3BADE5] mb-2">Description</h4>
                  <div className="text-xs leading-relaxed text-white/90 break-words">
                    {defect.Description || '-'}
                  </div>
                </div>
                
                <div className="bg-[#0B1623] rounded-md p-3">
                  <h4 className="text-xs font-medium text-[#3BADE5] mb-2">Action Planned</h4>
                  <div className="text-xs leading-relaxed text-white/90 break-words">
                    {defect['Action Planned'] || '-'}
                  </div>
                </div>
      
                <div className="bg-[#0B1623] rounded-md p-3">
                  <h4 className="text-xs font-medium text-[#3BADE5] mb-2">Follow-Up</h4>
                  <div className="text-xs leading-relaxed text-white/90 break-words">
                    {defect.Comments || '-'}
                  </div>
                </div>

                {/* <div className="bg-[#0B1623] rounded-md p-3">
                  <h4 className="text-xs font-medium text-[#3BADE5] mb-2">Visibility Settings</h4>
                  <div className="text-xs leading-relaxed text-white/90 break-words flex items-center gap-2">
                    <span className="text-white/60">External Visibility:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] 
                      ${defect.external_visibility ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}
                    >
                      {defect.external_visibility ? 'Visible to External Users' : 'Hidden from External Users'}
                    </span>
                  </div>
                </div> */}

                {/* Initial Documentation */}
                <div className="bg-[#0B1623] rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-[#3BADE5]">Initial Documentation</h4>
                    <div className="text-[10px] text-white/60 px-2 py-0.5 bg-[#132337] rounded-full">
                      {defect.initial_files?.length || 0} files
                    </div>
                  </div>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    {defect.initial_files?.length > 0 ? (
                      <FileList
                        files={defect.initial_files}
                        onDelete={handleDeleteFile}
                        title=""
                      />
                    ) : (
                      <div className="text-xs text-white/40 italic">No documentation available</div>
                    )}
                  </div>
                </div>
      
                {/* Show closure content only when status is CLOSED */}
                {defect['Status (Vessel)'] === 'CLOSED' && (
                  <>
                    <div className="bg-[#0B1623] rounded-md p-3">
                      <h4 className="text-xs font-medium text-[#3BADE5] mb-2">Closure Comments</h4>
                      <div className="text-xs leading-relaxed text-white/90 break-words">
                        {defect.closure_comments || '-'}
                      </div>
                    </div>
      
                    <div className="bg-[#0B1623] rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-[#3BADE5]">Closure Documentation</h4>
                        <div className="text-[10px] text-white/60 px-2 py-0.5 bg-[#132337] rounded-full">
                          {defect.completion_files?.length || 0} files
                        </div>
                      </div>
                      <div className="max-h-32 overflow-y-auto custom-scrollbar pr-2">
                        {defect.completion_files?.length > 0 ? (
                          <FileList
                            files={defect.completion_files}
                            onDelete={handleDeleteFile}
                            title=""
                          />
                        ) : (
                          <div className="text-xs text-white/40 italic">No documentation available</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
      
              {/* Bottom row with Raised By and Generate Report */}
              <div className="flex justify-between items-center">
                {/* Left section with Raised By and External Visibility */}
                <div className="flex items-center gap-4">
                  {/* Raised By info */}
                  {defect.raised_by && (
                    <div className="text-xs text-white/60">
                      Defect Source: <span className="text-white/80">{defect.raised_by}</span>
                    </div>
                  )}
                  
                  {/* External Visibility indicator */}
                  {isColumnVisible('silentMode', permissions) && (
                    <div className="text-xs text-white/60">
                      External Visibility: 
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] 
                        ${defect.external_visibility ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}
                      >
                        {defect.external_visibility ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Generate Report Button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const getSignedUrls = async (files) => {
                        const urls = {};
                        for (const file of files || []) {
                          try {
                            const { data: { signedUrl }, error } = await supabase.storage
                              .from('defect-files')
                              .createSignedUrl(file.path, 3600);
                            
                            if (error) {
                              console.error('Error getting signed URL for file:', file.name, error);
                              continue;
                            }
                            urls[file.path] = signedUrl;
                          } catch (error) {
                            console.error('Error getting signed URL for file:', file.name, error);
                          }
                        }
                        return urls;
                      };
                
                      const initialUrls = await getSignedUrls(defect.initial_files);
                      const completionUrls = await getSignedUrls(defect.completion_files);
                      
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
                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md 
                    text-white bg-[#3BADE5] hover:bg-[#3BADE5]/80 transition-colors shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
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
  criticalityFilter = '',
  permissions, // Add this
  isExternal  
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'Date Reported',
    direction: 'desc'
  });

  const handleSort = (key) => {
    // Only allow sorting on visible columns
    if (!isColumnVisible(key, permissions)) return;
  
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

  

  return (
    <div className="glass-card rounded-[4px] flex flex-col h-[calc(100vh-200px)]">
      {/* Header Section */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-white/10">
        <h2 className="text-sm font-medium text-[#f4f4f4]">Defects Register</h2>
        <div className="flex items-center gap-2">
          <ExportButton onClick={handleExport} />
          <button 
            onClick={onAddDefect}
            disabled={!canPerformAction('create', permissions)}
            className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-[4px] 
              text-white bg-[#3BADE5] transition-colors
              ${canPerformAction('create', permissions) ? 'hover:bg-[#3BADE5]/80' : 'opacity-50 cursor-not-allowed'}`}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Add Defect
          </button>
        </div>
      </div>
  
      {/* Table Container */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#132337] border-b border-white/10">
                {getVisibleColumns(permissions, isExternal).map(([fieldId, field]) => (
                  <th 
                    key={fieldId}
                    onClick={() => !field.isAction && handleSort(field.dbField)}
                    className={`px-3 py-2 text-left font-semibold text-[#f4f4f4] opacity-90 
                      ${field.isAction ? '' : 'cursor-pointer hover:bg-white/5'}
                      ${field.fixedLeft ? 'sticky left-0 z-10 bg-[#132337]' : ''}
                      ${field.fixedRight ? 'sticky right-0 z-10 bg-[#132337]' : ''}`}
                    style={{ width: field.width, minWidth: field.minWidth }}
                  >
                    <div className="flex items-center gap-1">
                      {field.label}
                      {!field.isAction && renderSortIcon(field.dbField)}
                    </div>
                  </th>
                ))}
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
                    permissions={permissions}
                    isExternal={isExternal}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DefectsTable;
