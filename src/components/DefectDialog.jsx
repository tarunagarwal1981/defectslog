import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Upload, FileText, X } from 'lucide-react';
import { toast } from './ui/use-toast';
import { supabase } from '../supabaseClient';
import { formatDateForInput, formatDateDisplay } from '../utils/dateUtils';
import { CORE_FIELDS } from '../config/fieldMappings';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const DefectDialog = ({ 
  isOpen, 
  onClose, 
  defect, 
  onChange, 
  onSave, 
  vessels, 
  isNew,
  permissions, 
  isExternal 
}) => {
  const [initialFiles, setInitialFiles] = useState([]);
  const [closureFiles, setClosureFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  
  // Function to check if field is visible
  const isFieldVisible = (fieldId) => {
    if (!permissions?.fieldPermissions) return true;
    return permissions.fieldPermissions[fieldId]?.visible;
  };

  // Function to handle silent mode change
  const handleSilentModeChange = async (checked) => {
    try {
      // Update local state immediately for responsive UI
      onChange('external_visibility', !checked); // Note the inversion: checked means hidden
  
      if (!isNew) {
        // Update database if this is an existing defect
        const { error } = await supabase
          .from('defects register')
          .update({ external_visibility: !checked })
          .eq('id', defect.id);
  
        if (error) throw error;
  
        toast({
          title: "Success",
          description: `Defect is now ${!checked ? 'visible to' : 'hidden from'} external users`,
        });
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      // Revert local state on error
      onChange('external_visibility', defect.external_visibility);
      
      toast({
        title: "Error",
        description: "Failed to update visibility setting",
        variant: "destructive",
      });
    }
  };

  // Function to check if field is editable
  const isFieldEditable = (fieldId) => {
    if (!permissions?.actionPermissions) return true;
    if (isNew) return permissions.actionPermissions['create'];
    return permissions.actionPermissions['update'];
  };

  // Function to get visible fields from section
  const getVisibleFields = () => {
    return Object.entries(CORE_FIELDS.DIALOG)
      .filter(([fieldId, field]) => {
        // Check basic visibility
        if (!isFieldVisible(fieldId)) return false;
        
        // Check conditional display
        if (field.conditionalDisplay && !defect) return false;
        if (field.conditionalDisplay && !field.conditionalDisplay(defect)) {
          return false;
        }
      
        // External users special handling
        if (isExternal && field.restrictedToInternal) {
          return false;
        }
      
        return true;
      })
      .sort((a, b) => a[1].displayOrder - b[1].displayOrder);
  };

  // Function to check if save should be enabled
  const canSave = () => {
    if (!permissions?.actionPermissions) return false;
    return isNew ? 
      permissions.actionPermissions['create'] : 
      permissions.actionPermissions['update'];
  };

  // Handle dialog close attempt
  const handleCloseAttempt = () => {
    // If there are unsaved changes, show confirmation dialog
    if (initialFiles.length > 0 || closureFiles.length > 0 || hasFormChanges()) {
      setShowConfirmClose(true);
    } else {
      // No changes, close directly
      onClose();
    }
  };

  // Function to check if form has changes
  const hasFormChanges = () => {
    // Add logic to check if any fields were modified
    // This is a simple example - you may need more complex comparison
    return initialFiles.length > 0 || closureFiles.length > 0;
  };

  // Handle confirmed close
  const handleConfirmedClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  // Cancel close attempt
  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  const validateDefect = (defectData) => {
    // Check dates logic
    if (defectData['Date Completed'] && defectData['Date Reported']) {
      const closureDate = new Date(defectData['Date Completed']);
      const reportedDate = new Date(defectData['Date Reported']);
      
      if (closureDate < reportedDate) {
        toast({
          title: "Invalid Date",
          description: "Closure date cannot be before the reported date",
          variant: "destructive",
        });
        return false;
      }
    }
  
    // Get visible fields and their requirements
    const visibleFields = Object.entries(CORE_FIELDS.DIALOG)
      .filter(([fieldId, field]) => {
        if (!isFieldVisible(fieldId)) return false;
        
        // Check conditional display
        if (field.conditionalDisplay && !field.conditionalDisplay(defectData)) {
          return false;
        }
        return true;
      })
      .filter(([_, field]) => {
        // Check if field is required
        if (field.required) return true;
        if (field.conditionalRequired && field.conditionalRequired(defectData)) {
          return true;
        }
        return false;
      })
      .map(([_, field]) => {
        return field.dbField;
      });
  
    // Add specific requirements for CLOSED status
    if (defectData['Status (Vessel)'] === 'CLOSED') {
      if (!defectData['Date Completed']) {
        toast({
          title: "Required Field Missing",
          description: "Please enter Date Completed for closed defects",
          variant: "destructive",
        });
        return false;
      }
      visibleFields.push('closure_comments');
    }
  
    // Check for missing required fields
    const missing = visibleFields.filter(field => !defectData[field]);
    
    if (missing.length > 0) {
      // Map field names to more readable labels
      const fieldLabels = {
        'vessel_id': 'Vessel',
        'Equipments': 'Equipment',
        'Description': 'Description',
        'Status (Vessel)': 'Status',
        'Criticality': 'Criticality',
        'Date Reported': 'Date Reported',
        'raised_by': 'Defect Source',
        'closure_comments': 'Closure Comments',
        'Action Planned': 'Action Planned'
      };
  
      const missingFieldLabels = missing.map(field => fieldLabels[field] || field);
      
      toast({
        title: "Missing Information",
        description: (
          <div className="space-y-2">
            <p className="text-sm font-medium">Please fill in the following fields:</p>
            <ul className="list-disc pl-4 text-sm space-y-1">
              {missingFieldLabels.map((field, index) => (
                <li key={index} className="text-sm opacity-90">{field}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "subtle",
        className: "bg-[#132337] border border-[#3BADE5]/20 text-white",
      });
      return false;
    }
    return true;
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: `${file.name} exceeds 2MB limit`,
        variant: "destructive",
      });
      return false;
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `${file.name} is not a supported file type`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const uploadFiles = async (files, defectId, type = 'initial') => {
    const uploadedFiles = [];
    let progress = 0;
    
    for (const file of files) {
      if (!validateFile(file)) continue;

      const fileExt = file.name.split('.').pop();
      const fileName = `${defectId}/${type}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('defect-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          name: file.name,
          path: fileName,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });

        progress += (1 / files.length) * 100;
        setUploadProgress(Math.round(progress));

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }

    return uploadedFiles;
  };

  const handleInitialFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setInitialFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const handleClosureFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setClosureFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const removeInitialFile = (index) => {
    setInitialFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const removeClosureFile = (index) => {
    setClosureFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setUploadProgress(0);
    
      // Set default value for external_visibility if not set
      const updatedDefectData = {
        ...defect,
        external_visibility: defect.external_visibility ?? true
      };
    
      if (!validateDefect(updatedDefectData)) {
        setSaving(false);
        return;
      }
    
      // Upload files if any
      let uploadedInitialFiles = [];
      let uploadedClosureFiles = [];
    
      if (initialFiles.length > 0) {
        uploadedInitialFiles = await uploadFiles(initialFiles, updatedDefectData.id || 'temp', 'initial');
      }
    
      if (closureFiles.length > 0 && updatedDefectData['Status (Vessel)'] === 'CLOSED') {
        uploadedClosureFiles = await uploadFiles(closureFiles, updatedDefectData.id || 'temp', 'closure');
      }
    
      // Combine existing and new files
      const finalDefect = {
        ...updatedDefectData,
        initial_files: [
          ...(updatedDefectData.initial_files || []),
          ...uploadedInitialFiles
        ],
        completion_files: [
          ...(updatedDefectData.completion_files || []),
          ...uploadedClosureFiles
        ],
        closure_comments: updatedDefectData.closure_comments || ''
      };
    
      await onSave(finalDefect);
      setInitialFiles([]);
      setClosureFiles([]);
      setUploadProgress(0);
      
    } catch (error) {
      console.error('Error in DefectDialog save:', error);
      toast({
        title: "Error",
        description: "Failed to save defect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Main Dialog */}
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // Intercept the close event
            handleCloseAttempt();
            return false; // Prevent default closing behavior
          }
          return true;
        }}
      >
        <DialogContent 
          className="max-w-md max-h-[90vh] overflow-hidden bg-[#0B1623] border border-[#3BADE5]/30 p-0"
          style={{
            boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,173,229,0.2), 0 0 20px rgba(59,173,229,0.2) inset',
          }}
          aria-describedby="dialog-description"
          // This prevents the default closing behavior when clicking outside
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="border-b border-[#3BADE5]/30 pb-3 px-4 pt-4 bg-gradient-to-b from-[#132337] to-[#0B1623]">
            <DialogTitle className="text-sm font-medium text-white flex items-center">
              <span className="inline-block w-1 h-4 bg-gradient-to-b from-[#3BADE5] to-[#3BADE5]/50 rounded-sm mr-2"></span>
              {isNew ? 'Add New Defect' : 'Edit Defect'}
            </DialogTitle>
            <p id="dialog-description" className="text-xs text-white/60 ml-3">
              {isNew ? 'Create a new defect record' : 'Edit existing defect details'}
            </p>
          </DialogHeader>
          
          <div className="overflow-y-auto custom-scrollbar px-4 py-3 max-h-[calc(90vh-140px)]" 
               style={{
                 scrollbarWidth: 'thin',
                 scrollbarColor: 'rgba(59,173,229,0.4) rgba(11,22,35,0.1)'
               }}>
            <div className="grid gap-3">
              {getVisibleFields().map(([fieldId, field]) => {
                // Skip fields that should be hidden
                if (field.conditionalDisplay && !field.conditionalDisplay(defect)) {
                  return null;
                }

                const isEditable = isFieldEditable(fieldId);

                switch (field.type) {
                  case 'checkbox':
                    return (
                      <div key={fieldId} className="grid gap-1">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-[#3BADE5] focus:ring-[#3BADE5]"
                            checked={fieldId === 'silentMode' 
                              ? !defect?.[field.dbField] // Invert for silent mode
                              : defect?.[field.dbField] ?? field.defaultValue}
                            onChange={(e) => {
                              if (fieldId === 'silentMode') {
                                handleSilentModeChange(e.target.checked);
                              } else {
                                onChange(field.dbField, e.target.checked);
                              }
                            }}
                            disabled={!isFieldEditable(fieldId)}
                            id={fieldId}
                          />
                          <span className="text-sm font-medium text-white/90">
                            {field.label}
                            {fieldId === 'silentMode' && (
                              <span className="ml-2 text-xs text-white/60">
                                ({!defect?.[field.dbField] ? 'Hidden from external users' : 'Visible to external users'})
                              </span>
                            )}
                          </span>
                        </label>
                      </div>
                    );
                  
                  case 'select':
                    return (
                      <div key={fieldId} className="grid gap-1">
                        <label htmlFor={fieldId} className="text-sm font-medium text-white/90 flex items-center">
                          {field.label} {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <div className="relative">
                          <select
                            id={fieldId}
                            className="flex h-10 w-full rounded-sm border border-[#3BADE5]/30 bg-[#0F1A29] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/60 appearance-none shadow-inner shadow-[#000]/40"
                            value={defect?.[field.dbField] || ''}
                            onChange={(e) => onChange(field.dbField, e.target.value)}
                            required={field.required}
                            disabled={!isEditable}
                            aria-required={field.required}
                          >
                            <option value="">Select {field.label}</option>
                            {field.dbField === 'vessel_id' 
                              ? Object.entries(vessels).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                              ))
                              : field.options?.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#3BADE5]/70">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    );

                  case 'textarea':
                    return (
                      <div key={fieldId} className="grid gap-1">
                        <label htmlFor={fieldId} className="text-sm font-medium text-white/90 flex items-center">
                          {field.label} {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <textarea
                          id={fieldId}
                          className="flex h-24 w-full rounded-sm border border-[#3BADE5]/30 bg-[#0F1A29] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/60 shadow-inner shadow-[#000]/40"
                          value={defect?.[field.dbField] || ''}
                          onChange={(e) => onChange(field.dbField, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          required={field.required}
                          disabled={!isEditable}
                          rows={field.rows || 3}
                        />
                      </div>
                    );

                  case 'date':
                    return (
                      <div key={fieldId} className="grid gap-1">
                        <label htmlFor={fieldId} className="text-sm font-medium text-white/90 flex items-center">
                          {field.label} {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <div className="relative h-10">
                          <input
                            id={fieldId}
                            type="date"
                            className="absolute inset-0 h-10 w-full rounded-sm border border-[#3BADE5]/30 bg-[#0F1A29] px-3 text-sm text-transparent hover:border-[#3BADE5]/60 focus:outline-none focus:ring-1 focus:ring-[#3BADE5] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:text-white [&::-webkit-calendar-picker-indicator]:hover:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-70 shadow-inner shadow-[#000]/40"
                            value={formatDateForInput(defect?.[field.dbField])}
                            onChange={(e) => onChange(field.dbField, e.target.value)}
                            required={field.required}
                            disabled={!isEditable}
                            aria-required={field.required}
                          />
                          <div className="absolute inset-0 flex items-center px-3 text-sm text-white pointer-events-none">
                            {formatDateDisplay(defect?.[field.dbField]) || 'dd/mm/yyyy'}
                          </div>
                        </div>
                      </div>
                    );

                  case 'file':
                    return (
                      <div key={fieldId} className="grid gap-1">
                        <label className="text-sm font-medium text-white/90">
                          {field.label}
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 px-3 py-2 rounded-sm border border-[#3BADE5]/30 bg-[#0F1A29] cursor-pointer hover:border-[#3BADE5]/60 transition-colors shadow-inner shadow-[#000]/40">
                            <Upload className="h-4 w-4 text-[#3BADE5]" />
                            <span className="text-sm text-white">Upload {field.label} (Max 2MB: PDF, DOC, Images)</span>
                            <input
                              type="file"
                              multiple={field.multiple}
                              className="hidden"
                              onChange={fieldId === 'initialFiles' ? handleInitialFileChange : handleClosureFileChange}
                              accept={field.accept}
                              disabled={!isEditable}
                            />
                          </label>
                          {/* Show selected files */}
                          {(fieldId === 'initialFiles' ? initialFiles : closureFiles).length > 0 && (
                            <div className="space-y-1 bg-[#0F1A29] p-3 rounded-sm border border-[#3BADE5]/10">
                              {(fieldId === 'initialFiles' ? initialFiles : closureFiles).map((file, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-white/90">
                                  <FileText className="h-3.5 w-3.5 text-[#3BADE5]" />
                                  <span className="truncate flex-1">{file.name}</span>
                                  <button
                                    onClick={() => fieldId === 'initialFiles' ? removeInitialFile(index) : removeClosureFile(index)}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                    disabled={!isEditable}
                                  >
                                    <X className="h-3.5 w-3.5 text-red-400" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Show existing files */}
                          {defect?.[field.dbField]?.length > 0 && (
                            <div className="space-y-1 bg-[#0F1A29] p-3 rounded-sm border border-[#3BADE5]/10 mt-2">
                              <div className="text-sm text-white/70 mb-1">Existing files:</div>
                              {defect[field.dbField].map((file, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-white/90">
                                  <FileText className="h-3.5 w-3.5 text-[#3BADE5]" />
                                  <span className="truncate flex-1">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );

                  default:
                    return (
                      <div key={fieldId} className="text-sm text-white/60">
                        Unsupported field type: {field.type}
                      </div>
                    );  
                }
              })}

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-[#0F1A29] rounded-full h-2 overflow-hidden border border-[#3BADE5]/20">
                  <div
                    className="bg-gradient-to-r from-[#3BADE5]/80 to-[#3BADE5] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#3BADE5]/20 mt-1 px-4 pb-4 bg-gradient-to-t from-[#132337] to-[#0B1623]">
            <button
              onClick={handleCloseAttempt}
              disabled={saving}
              className="h-8 px-4 text-sm font-medium rounded-sm border border-[#3BADE5]/30 hover:border-[#3BADE5]/60 bg-[#0F1A29]/60 text-white disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            {canSave() && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-8 px-4 text-sm font-medium rounded-sm bg-[#3BADE5] hover:bg-[#3BADE5]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  boxShadow: '0 2px 8px rgba(59,173,229,0.4), 0 0 0 1px rgba(59,173,229,0.5), 0 1px 3px rgba(255,255,255,0.1) inset'
                }}
              >
                {saving ? 'Saving...' : (isNew ? 'Add Defect' : 'Save Changes')}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {showConfirmClose && (
        <Dialog open={showConfirmClose} onOpenChange={handleCancelClose}>
          <DialogContent className="max-w-sm bg-[#0B1623] border border-[#3BADE5]/30 p-0">
            <DialogHeader className="border-b border-[#3BADE5]/20 pb-3 px-4 pt-4 bg-gradient-to-b from-[#132337] to-[#0B1623]">
              <DialogTitle className="text-sm font-medium text-white">
                Discard Changes?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-white/90 py-3 px-4">
              You have unsaved changes. Are you sure you want to close this form and discard your changes?
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#3BADE5]/20 px-4 pb-4 bg-gradient-to-t from-[#132337] to-[#0B1623]">
              <button
                onClick={handleCancelClose}
                className="h-8 px-4 text-sm font-medium rounded-sm border border-[#3BADE5]/30 hover:border-[#3BADE5]/60 bg-[#0F1A29]/60 text-white"
              >
                Continue Editing
              </button>
              <button
                onClick={handleConfirmedClose}
                className="h-8 px-4 text-sm font-medium rounded-sm bg-red-500/80 hover:bg-red-500 text-white"
                style={{
                  boxShadow: '0 2px 8px rgba(239,68,68,0.3), 0 0 0 1px rgba(239,68,68,0.4)'
                }}
              >
                Discard Changes
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default DefectDialog;
