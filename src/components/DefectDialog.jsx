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
//import { checkPermission } from '../utils/permissionUtils';


const MAX_FILE_SIZE = 2 * 1024 * 1024; // 5MB
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
  
  const isFieldVisible = (fieldId) => {
    if (!permissions?.fieldPermissions) return true;
    return permissions.fieldPermissions[fieldId]?.visible;
  };

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
  

  // Add this function to check if field is editable
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
        return field.dbField;  // Added explicit return
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto bg-[#0B1623]"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-medium text-white">
            {isNew ? 'Add New Defect' : 'Edit Defect'}
          </DialogTitle>
          <p id="dialog-description" className="text-xs text-white/60">
            {isNew ? 'Create a new defect record' : 'Edit existing defect details'}
          </p>
        </DialogHeader>
        
        <div className="grid gap-3 py-3">
          {getVisibleFields().map(([fieldId, field]) => {
            // Skip fields that should be hidden
            if (field.conditionalDisplay && !field.conditionalDisplay(defect)) {
              return null;
            }

            const isEditable = isFieldEditable(fieldId);

            switch (field.type) {
              case 'checkbox':
                return (
                  <div key={fieldId} className="grid gap-1.5">
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
                      <span className="text-xs font-medium text-white/80">
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
                  <div key={fieldId} className="grid gap-1.5">
                    <label htmlFor={fieldId} className="text-xs font-medium text-white/80">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <select
                      id={fieldId}
                      className="flex h-8 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
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
                  </div>
                );

              case 'textarea':
                return (
                  <div key={fieldId} className="grid gap-1.5">
                    <label htmlFor={fieldId} className="text-xs font-medium text-white/80">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <textarea
                      id={fieldId}
                      className="flex h-24 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
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
                  <div key={fieldId} className="grid gap-1.5">
                    <label htmlFor={fieldId} className="text-xs font-medium text-white/80">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <div className="relative h-8">
                      <input
                        id={fieldId}
                        type="date"
                        className="absolute inset-0 h-8 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 text-xs text-transparent hover:border-[#3BADE5]/40 focus:outline-none focus:ring-1 focus:ring-[#3BADE5] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:text-white [&::-webkit-calendar-picker-indicator]:hover:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-70"
                        value={formatDateForInput(defect?.[field.dbField])}
                        onChange={(e) => onChange(field.dbField, e.target.value)}
                        required={field.required}
                        disabled={!isEditable}
                        aria-required={field.required}
                      />
                      <div className="absolute inset-0 flex items-center px-2 text-xs text-white pointer-events-none">
                        {formatDateDisplay(defect?.[field.dbField]) || 'dd/mm/yyyy'}
                      </div>
                    </div>
                  </div>
                );

              case 'file':
                return (
                  <div key={fieldId} className="grid gap-1.5">
                    <label className="text-xs font-medium text-white/80">
                      {field.label}
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] cursor-pointer hover:border-[#3BADE5]/40">
                        <Upload className="h-4 w-4 text-white" />
                        <span className="text-xs text-white">Upload {field.label} (Max 2MB: PDF, DOC, Images)</span>
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
                        <div className="space-y-1">
                          {(fieldId === 'initialFiles' ? initialFiles : closureFiles).map((file, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-white/80">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="truncate flex-1">{file.name}</span>
                              <button
                                onClick={() => fieldId === 'initialFiles' ? removeInitialFile(index) : removeClosureFile(index)}
                                className="p-1 hover:bg-white/10 rounded-full"
                                disabled={!isEditable}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Show existing files */}
                      {defect?.[field.dbField]?.length > 0 && (
                        <div className="space-y-1 mt-2">
                          <div className="text-xs text-white/60">Existing files:</div>
                          {defect[field.dbField].map((file, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-white/80">
                              <FileText className="h-3.5 w-3.5" />
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
                  <div key={fieldId} className="text-xs text-white/60">
                    Unsupported field type: {field.type}
                  </div>
                );  
            }
          })}

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-[#132337] rounded-full h-1.5">
              <div
                className="bg-[#3BADE5] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="h-7 px-3 text-xs font-medium rounded-[4px] border border-[#3BADE5]/20 hover:border-[#3BADE5]/40 text-white disabled:opacity-50"
          >
            Cancel
          </button>
          {canSave() && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-7 px-3 text-xs font-medium rounded-[4px] bg-[#3BADE5] hover:bg-[#3BADE5]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : (isNew ? 'Add Defect' : 'Save Changes')}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default DefectDialog;