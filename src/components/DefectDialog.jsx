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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
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
  const [initialFiles, setInitialFiles] = useState([]);
  const [closureFiles, setClosureFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateDefect = (defectData) => {
    const required = [
      'vessel_id',
      'Equipments',
      'Description',
      'Status (Vessel)',
      'Criticality',
      'Date Reported'
    ];

    // Add closure_comments requirement for CLOSED status
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
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: `${file.name} exceeds 5MB limit`,
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

      if (!validateDefect(defect)) {
        setSaving(false);
        return;
      }

      // Upload files if any
      let uploadedInitialFiles = [];
      let uploadedClosureFiles = [];

      if (initialFiles.length > 0) {
        uploadedInitialFiles = await uploadFiles(initialFiles, defect.id || 'temp', 'initial');
      }

      if (closureFiles.length > 0 && defect['Status (Vessel)'] === 'CLOSED') {
        uploadedClosureFiles = await uploadFiles(closureFiles, defect.id || 'temp', 'closure');
      }

      // Combine existing and new files
      const updatedDefect = {
        ...defect,
        initial_files: [
          ...(defect.initial_files || []),
          ...uploadedInitialFiles
        ],
        completion_files: [
          ...(defect.completion_files || []),
          ...uploadedClosureFiles
        ],
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
          {/* Vessel Selection */}
          <div className="grid gap-1.5">
            <label htmlFor="vessel" className="text-xs font-medium text-white/80">
              Vessel <span className="text-red-400">*</span>
            </label>
            <select
              id="vessel"
              className="flex h-8 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
              value={defect?.vessel_id || ''}
              onChange={(e) => onChange('vessel_id', e.target.value)}
              required
              aria-required="true"
            >
              <option value="">Select Vessel</option>
              {Object.entries(vessels).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          {/* Equipment */}
          <div className="grid gap-1.5">
            <label htmlFor="equipment" className="text-xs font-medium text-white/80">
              Equipment <span className="text-red-400">*</span>
            </label>
            <select
              id="equipment"
              className="flex h-8 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
              value={defect?.Equipments || ''}
              onChange={(e) => onChange('Equipments', e.target.value)}
              required
              aria-required="true"
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
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <label htmlFor="description" className="text-xs font-medium text-white/80">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="description"
              className="flex h-16 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
              value={defect?.Description || ''}
              onChange={(e) => onChange('Description', e.target.value)}
              placeholder="Enter defect description"
              required
              aria-required="true"
            />
          </div>

          {/* Action Planned */}
          <div className="grid gap-1.5">
            <label htmlFor="action" className="text-xs font-medium text-white/80">
              Action Planned <span className="text-red-400">*</span>
            </label>
            <textarea
              id="action"
              className="flex h-16 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
              value={defect?.['Action Planned'] || ''}
              onChange={(e) => onChange('Action Planned', e.target.value)}
              placeholder="Enter planned action"
              required
              aria-required="true"
            />
          </div>

          {/* Comments */}
          <div className="grid gap-1.5">
            <label htmlFor="comments" className="text-xs font-medium text-white/80">
              Comments
            </label>
            <textarea
              id="comments"
              className="flex h-16 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
              value={defect?.Comments || ''}
              onChange={(e) => onChange('Comments', e.target.value)}
              placeholder="Add any additional comments"
            />
          </div>

          {/* Status */}
          <div className="grid gap-1.5">
            <label htmlFor="status" className="text-xs font-medium text-white/80">
              Status <span className="text-red-400">*</span>
            </label>
            <select
              id="status"
              className="flex h-8 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
              value={defect?.['Status (Vessel)'] || ''}
              onChange={(e) => onChange('Status (Vessel)', e.target.value)}
              required
              aria-required="true"
            >
              <option value="">Select Status</option>
              <option value="OPEN">Open</option>
              <option value="IN PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Criticality */}
          <div className="grid gap-1.5">
            <label htmlFor="criticality" className="text-xs font-medium text-white/80">
              Criticality <span className="text-red-400">*</span>
            </label>
            <select
              id="criticality"
              className="flex h-8 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
              value={defect?.Criticality || ''}
              onChange={(e) => onChange('Criticality', e.target.value)}
              required
              aria-required="true"
            >
              <option value="">Select Criticality</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="dateReported" className="text-xs font-medium text-white/80">
                Date Reported <span className="text-red-400">*</span>
              </label>
              <input
                id="dateReported"
                type="date"
                className="flex h-8 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
                value={defect?.['Date Reported'] || ''}
                onChange={(e) => onChange('Date Reported', e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="dateCompleted" className="text-xs font-medium text-white/80">
                Date Completed {defect?.['Status (Vessel)'] === 'CLOSED' && <span className="text-red-400">*</span>}
              </label>
              <input
                id="dateCompleted"
                type="date"
                className="flex h-8 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
                value={defect?.['Date Completed'] || ''}
                onChange={(e) => onChange('Date Completed', e.target.value)}
                required={defect?.['Status (Vessel)'] === 'CLOSED'}
                aria-required={defect?.['Status (Vessel)'] === 'CLOSED'}
              />
            </div>
          </div>

          {/* Initial Files Upload */}
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-white/80">
              Initial Documentation
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] cursor-pointer hover:border-[#3BADE5]/40">
                <Upload className="h-4 w-4 text-white" />
                <span className="text-xs text-white">Upload Initial Files (Max 2MB: PDF, DOC, Images)</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleInitialFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </label>
              {initialFiles.length > 0 && (
                <div className="space-y-1">
                  {initialFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-white/80">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate flex-1">{file.name}</span>
                      <button
                        onClick={() => removeInitialFile(index)}
                        className="p-1 hover:bg-white/10 rounded-full"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {defect?.initial_files?.length > 0 && (
                <div className="space-y-1 mt-2">
                  <div className="text-xs text-white/60">Existing files:</div>
                  {defect.initial_files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-white/80">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate flex-1">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Closure section only shown when status is CLOSED */}
          {defect?.['Status (Vessel)'] === 'CLOSED' && (
            <>
              {/* Closure Comments */}
              <div className="grid gap-1.5">
                <label htmlFor="closureComments" className="text-xs font-medium text-white/80">
                  Closure Comments <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="closureComments"
                  className="flex h-16 w-full rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3BADE5] hover:border-[#3BADE5]/40"
                  value={defect?.closure_comments || ''}
                  onChange={(e) => onChange('closure_comments', e.target.value)}
                  placeholder="Enter closure comments and findings"
                  required
                  aria-required="true"
                />
              </div>

              {/* Closure Files Upload */}
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-white/80">
                  Closure Documentation
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] cursor-pointer hover:border-[#3BADE5]/40">
                    <Upload className="h-4 w-4 text-white" />
                    <span className="text-xs text-white">Upload Closure Files (Max 2MB: PDF, DOC, Images)</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleClosureFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                  {closureFiles.length > 0 && (
                    <div className="space-y-1">
                      {closureFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-white/80">
                          <FileText className="h-3.5 w-3.5" />
                          <span className="truncate flex-1">{file.name}</span>
                          <button
                            onClick={() => removeClosureFile(index)}
                            className="p-1 hover:bg-white/10 rounded-full"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {defect?.completion_files?.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <div className="text-xs text-white/60">Existing closure files:</div>
                      {defect.completion_files.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-white/80">
                          <FileText className="h-3.5 w-3.5" />
                          <span className="truncate flex-1">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

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
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-3 text-xs font-medium rounded-[4px] bg-[#3BADE5] hover:bg-[#3BADE5]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : (isNew ? 'Add Defect' : 'Save Changes')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DefectDialog;
