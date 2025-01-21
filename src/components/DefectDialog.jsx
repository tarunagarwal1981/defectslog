import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { supabase } from '../supabaseClient';
import { formatDateForInput, formatDateDisplay } from '../utils/dateUtils';

// Constants
const MAX_FILE_SIZE = 2 * 1024 * 1024;
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
  isNew 
}) => {
  const { toast } = useToast();
  const [initialFiles, setInitialFiles] = useState([]);
  const [closureFiles, setClosureFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form input component for consistent styling
  const FormInput = ({ label, id, required, children }) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center text-xs font-medium text-white/80">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );

  // Reusable input class for consistent styling
  const inputClass = "w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-white/20 transition duration-200";

  const validateDefect = (defectData) => {
    const toastConfig = {
      variant: "destructive",
      duration: 3000,
    };

    if (defectData['Date Completed'] && defectData['Date Reported']) {
      const closureDate = new Date(defectData['Date Completed']);
      const reportedDate = new Date(defectData['Date Reported']);
      
      if (closureDate < reportedDate) {
        toast({
          title: "Invalid Date",
          description: "Closure date cannot be before the reported date",
          ...toastConfig
        });
        return false;
      }
    }
    
    const fieldNames = {
      'vessel_id': 'Vessel',
      'Equipments': 'Equipment',
      'Description': 'Description',
      'Status (Vessel)': 'Status',
      'Criticality': 'Criticality',
      'Date Reported': 'Date Reported',
      'raised_by': 'Raised By'
    };
    
    const required = [
      'vessel_id',
      'Equipments',
      'Description',
      'Status (Vessel)',
      'Criticality',
      'Date Reported',
      'raised_by'
    ];

    if (defectData['Status (Vessel)'] === 'CLOSED') {
      required.push('closure_comments');
      if (!defectData['Date Completed']) {
        toast({
          title: "Required Field Missing",
          description: "Please enter Date Completed for closed defects",
          variant: "destructive",
        });
        return false;
      }
    }
    
    const missing = required.filter(field => !defectData[field]);
    
    if (missing.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: (
          <div className="mt-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              <span>Please fill in all required fields:</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {missing.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {fieldNames[field]}
                </li>
              ))}
            </ul>
          </div>
        ),
        ...toastConfig
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

  // File handling functions
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

      if (!validateDefect(defect)) {
        setSaving(false);
        return;
      }

      let uploadedInitialFiles = [];
      let uploadedClosureFiles = [];

      if (initialFiles.length > 0) {
        uploadedInitialFiles = await uploadFiles(initialFiles, defect.id || 'temp', 'initial');
      }

      if (closureFiles.length > 0 && defect['Status (Vessel)'] === 'CLOSED') {
        uploadedClosureFiles = await uploadFiles(closureFiles, defect.id || 'temp', 'closure');
      }

      const updatedDefect = {
        ...defect,
        initial_files: [...(defect.initial_files || []), ...uploadedInitialFiles],
        completion_files: [...(defect.completion_files || []), ...uploadedClosureFiles],
        closure_comments: defect.closure_comments || ''
      };

      await onSave(updatedDefect);
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

  // File list component
  const FileList = ({ files, onRemove, existing, title }) => (
    <div className="space-y-2">
      {files?.length > 0 && (
        <div className="space-y-1.5">
          {title && <div className="text-xs text-white/60">{title}</div>}
          {files.map((file, index) => (
            <div key={index} 
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5 text-sm text-white/80">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate flex-1">{file.name}</span>
              {!existing && (
                <button
                  onClick={() => onRemove(index)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-[#0B1623] p-0 overflow-hidden rounded-lg border border-white/10">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle className="text-lg font-semibold text-white">
            {isNew ? 'Add New Defect' : 'Edit Defect'}
          </DialogTitle>
          <p className="text-sm text-white/60">
            {isNew ? 'Create a new defect record' : 'Edit existing defect details'}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Vessel and Equipment Section */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Vessel" id="vessel" required>
              <select
                id="vessel"
                className={inputClass}
                value={defect?.vessel_id || ''}
                onChange={(e) => onChange('vessel_id', e.target.value)}
              >
                <option value="">Select Vessel</option>
                {Object.entries(vessels).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </FormInput>

            <FormInput label="Equipment" id="equipment" required>
              <select
                id="equipment"
                className={inputClass}
                value={defect?.Equipments || ''}
                onChange={(e) => onChange('Equipments', e.target.value)}
              >
                <option value="">Select Equipment</option>
                <option value="Air System and Air Compressor">Air System and Air Compressor</option>
                <option value="Airconditioning & Refrigeration System">Airconditioning & Refrigeration System</option>
                <option value="Cargo and Ballast System">Cargo and Ballast System</option>
                <option value="Deck Crane and Grab">Deck Crane and Grab</option>
                <option value="BWTS">BWTS</option>
                <option value="Aux Engine">Aux Engine</option>
                <option value="Main Engine">Main Engine</option>
                <option value="LO System">LO System</option>
                <option value="FO System">FO System</option>
                <option value="FW and SW System">FW and SW System</option>
                <option value="Load line Item">Load line Item</option>
                <option value="SOLAS">SOLAS</option>
                <option value="MARPOL">MARPOL</option>
                <option value="Navigation and Radio Equipment">Navigation and Radio Equipment</option>
                <option value="Anchor and Mooring">Anchor and Mooring</option>
                <option value="Steam System">Steam System</option>
                <option value="Steering Gear and Rudder">Steering Gear and Rudder</option>
                <option value="Others">Others</option>
              </select>
            </FormInput>
          </div>

          {/* Description and Action Section */}
          <div className="space-y-4">
            <FormInput label="Description" id="description" required>
              <textarea
                id="description"
                className={`${inputClass} h-24 resize-none`}
                value={defect?.Description || ''}
                onChange={(e) => onChange('Description', e.target.value)}
                placeholder="Enter defect description"
              />
            </FormInput>

            <FormInput label="Action Planned" id="action" required>
              <textarea
                id="action"
                className={`${inputClass} h-24 resize-none`}
                value={defect?.['Action Planned'] || ''}
                onChange={(e) => onChange('Action Planned', e.target.value)}
                placeholder="Enter planned action"
              />
            </FormInput>
          </div>

          {/* Status and Criticality Section */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Status" id="status" required>
              <select
                id="status"
                className={inputClass}
                value={defect?.['Status (Vessel)'] || ''}
                onChange={(e) => onChange('Status (Vessel)', e.target.value)}
              >
                <option value="">Select Status</option>
                <option value="OPEN">Open</option>
                <option value="IN PROGRESS">In Progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </FormInput>

            <FormInput label="Criticality" id="criticality" required>
              <select
                id="criticality"
                className={inputClass}
                value={defect?.Criticality || ''}
                onChange={(e) => onChange('Criticality', e.target.value)}
              >
                <option value="">Select Status</option>
                <option value="OPEN">Open</option>
                <option value="IN PROGRESS">In Progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </FormInput>

            <FormInput label="Criticality" id="criticality" required>
              <select
                id="criticality"
                className={inputClass}
                value={defect?.Criticality || ''}
                onChange={(e) => onChange('Criticality', e.target.value)}
              >
                <option value="">Select Criticality</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </FormInput>
          </div>

          {/* Dates Section */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Date Reported" id="dateReported" required>
              <div className="relative">
                <input
                  type="date"
                  id="dateReported"
                  className={`${inputClass} text-white`}
                  value={formatDateForInput(defect?.['Date Reported'])}
                  onChange={(e) => onChange('Date Reported', e.target.value)}
                />
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <span className="text-white/40 text-sm">
                    {formatDateDisplay(defect?.['Date Reported']) || 'Select date'}
                  </span>
                </div>
              </div>
            </FormInput>

            <FormInput 
              label="Date Completed" 
              id="dateCompleted" 
              required={defect?.['Status (Vessel)'] === 'CLOSED'}
            >
              <div className="relative">
                <input
                  type="date"
                  id="dateCompleted"
                  className={`${inputClass} text-white`}
                  value={formatDateForInput(defect?.['Date Completed'])}
                  onChange={(e) => onChange('Date Completed', e.target.value)}
                  disabled={defect?.['Status (Vessel)'] !== 'CLOSED'}
                />
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <span className="text-white/40 text-sm">
                    {formatDateDisplay(defect?.['Date Completed']) || 'Select date'}
                  </span>
                </div>
              </div>
            </FormInput>
          </div>

          {/* Raised By Section */}
          <FormInput label="Raised By" id="raisedBy" required>
            <select
              id="raisedBy"
              className={inputClass}
              value={defect?.raised_by || ''}
              onChange={(e) => onChange('raised_by', e.target.value)}
            >
              <option value="">Select Source</option>
              <option value="Vessel">Vessel</option>
              <option value="Office">Office</option>
              <option value="Owners">Owners</option>
              <option value="PSC">PSC</option>
              <option value="CLASS">CLASS</option>
              <option value="FLAG">FLAG</option>
              <option value="Guarantee Claim">Guarantee Claim</option>
              <option value="Others">Others</option>
            </select>
          </FormInput>

          {/* Initial Files Upload Section */}
          <div className="space-y-4">
            <FormInput label="Initial Documentation" id="initialFiles">
              <div className="space-y-3">
                <label className="group flex items-center gap-3 p-4 rounded-lg border border-dashed border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors cursor-pointer">
                  <Upload className="h-5 w-5 text-white/60 group-hover:text-blue-500" />
                  <div className="flex-1">
                    <div className="text-sm text-white">Upload Initial Files</div>
                    <div className="text-xs text-white/60">PDF, DOC, or images up to 2MB</div>
                  </div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleInitialFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
                
                <FileList 
                  files={initialFiles}
                  onRemove={removeInitialFile}
                />
                
                <FileList 
                  files={defect?.initial_files}
                  existing
                  title="Existing files:"
                />
              </div>
            </FormInput>
          </div>

          {/* Closure Section - Only shown when status is CLOSED */}
          {defect?.['Status (Vessel)'] === 'CLOSED' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <FormInput label="Closure Comments" id="closureComments" required>
                <textarea
                  id="closureComments"
                  className={`${inputClass} h-24 resize-none`}
                  value={defect?.closure_comments || ''}
                  onChange={(e) => onChange('closure_comments', e.target.value)}
                  placeholder="Enter closure comments and findings"
                />
              </FormInput>

              <FormInput label="Closure Documentation" id="closureFiles">
                <div className="space-y-3">
                  <label className="group flex items-center gap-3 p-4 rounded-lg border border-dashed border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors cursor-pointer">
                    <Upload className="h-5 w-5 text-white/60 group-hover:text-blue-500" />
                    <div className="flex-1">
                      <div className="text-sm text-white">Upload Closure Files</div>
                      <div className="text-xs text-white/60">PDF, DOC, or images up to 2MB</div>
                    </div>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleClosureFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>

                  <FileList 
                    files={closureFiles}
                    onRemove={removeClosureFile}
                  />
                  
                  <FileList 
                    files={defect?.completion_files}
                    existing
                    title="Existing closure files:"
                  />
                </div>
              </FormInput>
            </div>
          )}

          {/* Upload Progress Indicator */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              isNew ? 'Add Defect' : 'Save Changes'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DefectDialog;
