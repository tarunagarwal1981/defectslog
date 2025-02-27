import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { X } from 'lucide-react';

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
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const hasUnsavedChanges = () => {
    // Add your logic to check for unsaved changes
    return false;
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleCloseAttempt}
    >
      <DialogContent 
        className="max-w-xl bg-[#0B1623] border-0 p-0"
        style={{
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#0B1623] to-[#132337]">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-[#3BADE5]"></div>
            <DialogTitle className="text-xl font-semibold text-white">
              Add New Defect
            </DialogTitle>
            <button 
              onClick={handleCloseAttempt}
              className="ml-auto text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-400 mt-1 ml-3">Create a new defect record</p>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Vessel */}
          <div className="space-y-2">
            <label className="text-white flex items-center gap-1">
              Vessel <span className="text-red-500">*</span>
            </label>
            <select 
              className="w-full h-10 bg-[#132337] border border-[#3BADE5]/20 rounded-md px-3 text-white focus:outline-none focus:border-[#3BADE5]/40 appearance-none"
              value={defect?.vessel_id || ''}
              onChange={(e) => onChange('vessel_id', e.target.value)}
            >
              <option value="">Select Vessel</option>
              {Object.entries(vessels).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <label className="text-white flex items-center gap-1">
              Equipment <span className="text-red-500">*</span>
            </label>
            <select 
              className="w-full h-10 bg-[#132337] border border-[#3BADE5]/20 rounded-md px-3 text-white focus:outline-none focus:border-[#3BADE5]/40 appearance-none"
              value={defect?.equipment_id || ''}
              onChange={(e) => onChange('equipment_id', e.target.value)}
            >
              <option value="">Select Equipment</option>
              {/* Add equipment options */}
            </select>
          </div>

          {/* Silent Mode */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                id="silentMode"
                className="peer sr-only"
                checked={!defect?.external_visibility}
                onChange={(e) => onChange('external_visibility', !e.target.checked)}
              />
              <div className="h-5 w-5 rounded border border-[#3BADE5]/30 bg-[#132337] flex items-center justify-center peer-checked:bg-[#3BADE5] peer-checked:border-[#3BADE5] transition-colors">
                <svg
                  className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <label htmlFor="silentMode" className="text-white cursor-pointer select-none">
              Silent Mode
              <span className="text-gray-400 text-sm ml-2">(Hidden from external users)</span>
            </label>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-white flex items-center gap-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-24 bg-[#132337] border border-[#3BADE5]/20 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#3BADE5]/40 resize-none"
              placeholder="Enter description"
              value={defect?.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
            />
          </div>

          {/* Action Planned */}
          <div className="space-y-2">
            <label className="text-white flex items-center gap-1">
              Action Planned <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-24 bg-[#132337] border border-[#3BADE5]/20 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#3BADE5]/40 resize-none"
              placeholder="Enter action planned"
              value={defect?.action_planned || ''}
              onChange={(e) => onChange('action_planned', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-gradient-to-r from-[#0B1623] to-[#132337]">
          <button
            onClick={handleCloseAttempt}
            className="px-4 py-2 text-white bg-transparent border border-[#3BADE5]/20 rounded-md hover:border-[#3BADE5]/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-white bg-[#3BADE5] rounded-md hover:bg-[#3BADE5]/90 transition-colors"
          >
            Add Defect
          </button>
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      {showConfirmClose && (
        <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
          <DialogContent className="bg-[#0B1623] p-6 border-0">
            <DialogTitle className="text-lg font-semibold text-white mb-4">
              Discard Changes?
            </DialogTitle>
            <p className="text-gray-400 mb-6">
              You have unsaved changes. Are you sure you want to close this form?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="px-4 py-2 text-white bg-transparent border border-[#3BADE5]/20 rounded-md hover:border-[#3BADE5]/40"
              >
                Continue Editing
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                Discard Changes
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default DefectDialog;
