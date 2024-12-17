import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { toast } from './ui/use-toast';

const DefectDialog = ({ 
  isOpen, 
  onClose, 
  defect, 
  onChange, 
  onSave, 
  vessels, 
  isNew 
}) => {
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const validateDefect = (defectData) => {
    const required = [
      'vessel_id',
      'Equipments',
      'Description',
      'Status (Vessel)',
      'Criticality',
      'Date Reported'
    ];
    
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

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => {
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      const isValidType = /\.(pdf|doc|docx|jpg|jpeg|png)$/i.test(file.name);
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 5MB limit`,
          variant: "destructive",
        });
      }
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
      }
      return isValidSize && isValidType;
    });
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index, fileToRemove) => {
    if (fileToRemove?.url) {
      // For already uploaded files
      onChange('files', (defect.files || []).filter((_, i) => i !== index));
    } else {
      // For newly selected files
      setFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!validateDefect(defect)) {
        setSaving(false);
        return;
      }

      await onSave(defect, files);
      setFiles([]);
      
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

  const dialogDescription = isNew ? 'Create a new defect record with the form below.' : 'Edit the defect record details with the form below.';
  const dialogDescriptionId = 'defect-dialog-description';

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose}
    >
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto bg-[#0B1623]"
        aria-describedby={dialogDescriptionId}
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-medium text-white">
            {isNew ? 'Add New Defect' : 'Edit Defect'}
          </DialogTitle>
          <p id={dialogDescriptionId} className="text-xs text-white/60">
            {dialogDescription}
          </p>
        </DialogHeader>
        
        <div className="grid gap-3 py-3">
          {/* Previous form fields remain exactly the same until the Associated Files section */}
          
          {/* Updated Associated Files section */}
          <div className="grid gap-1.5">
            <label htmlFor="files" className="text-xs font-medium text-white/80">
              Associated Files
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] cursor-pointer hover:border-[#3BADE5]/40">
                <Upload className="h-4 w-4 text-white" />
                <span className="text-xs text-white">Upload Files</span>
                <input
                  id="files"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  aria-label="Upload files"
                />
              </label>

              {/* Previously uploaded files */}
              {defect?.files?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-white/60">Uploaded Files:</p>
                  {defect.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-xs text-white bg-[#132337] p-2 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-[#3BADE5] truncate max-w-[200px]"
                        >
                          {file.name}
                        </a>
                      </div>
                      <button
                        onClick={() => removeFile(index, file)}
                        className="text-white/60 hover:text-white"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Newly selected files */}
              {files.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-white/60">Selected Files:</p>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-xs text-white bg-[#132337] p-2 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-white/60 hover:text-white"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comments section remains the same */}
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
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={saving || uploading}
            className="h-7 px-3 text-xs font-medium rounded-[4px] border border-[#3BADE5]/20 hover:border-[#3BADE5]/40 text-white disabled:opacity-50"
            aria-label="Cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="h-7 px-3 text-xs font-medium rounded-[4px] bg-[#3BADE5] hover:bg-[#3BADE5]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            aria-label={isNew ? "Add new defect" : "Save changes"}
          >
            {(saving || uploading) && <Loader2 className="h-3 w-3 animate-spin" />}
            {saving ? 'Saving...' : uploading ? 'Uploading...' : (isNew ? 'Add Defect' : 'Save Changes')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DefectDialog;
