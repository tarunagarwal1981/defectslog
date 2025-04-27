import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Upload, FileSpreadsheet, X, AlertTriangle, Info } from 'lucide-react';
import { toast } from './ui/use-toast';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

// Mapping for VIR Excel columns to database fields
const VIR_MAPPING = {
  'Sl No': 'SNo',
  "Inspector's Observations / Remarks": 'Description',
  'Corrective Action to be taken': 'Action Planned',
  'Target date': 'target_date',
  'Risk Category': 'Criticality',
  'Area of Concern': 'Equipments',
  'Task Assigned to': 'raised_by',
  'Completed Date': 'Date Completed'
};

const ImportVIRDialog = ({ isOpen, onClose, vesselNames, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectedVessel, setDetectedVessel] = useState(null);
  const fileInputRef = useRef(null);
  
  // Reset state when dialog closes
  const handleClose = () => {
    setFile(null);
    setDetectedVessel(null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      extractVesselInfo(selectedFile);
    }
  };
  
  // Function to extract vessel information from Excel
  const extractVesselInfo = async (file) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileData = new Uint8Array(e.target.result);
          const workbook = XLSX.read(fileData, { type: 'array' });
          
          // Try to find header sheet with vessel info
          // First look for the first sheet
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          
          // Convert to array format with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 'A',
            defval: ''
          });
          
          // Look for Ship's Name pattern
          let shipName = '';
          for (let i = 0; i < 20; i++) { // Check first 20 rows
            if (jsonData[i]) {
              // Check if it contains "Ship's Name" or similar pattern
              if (jsonData[i].C && typeof jsonData[i].C === 'string' && 
                  (jsonData[i].C.includes("Ship") || jsonData[i].C.includes("ship") || 
                   jsonData[i].C.includes("SHIP"))) {
                // Look for the vessel name in column F
                shipName = jsonData[i].F || '';
                break;
              }
            }
          }
          
          if (!shipName) {
            // Try an alternative approach - look directly at cell values
            for (const sheetName of workbook.SheetNames) {
              const sheet = workbook.Sheets[sheetName];
              // Try common cells where ship name might be
              // The format in your example suggests F4 contains the ship name
              const possibleCells = ['F4', 'F5', 'F3', 'E4', 'D4'];
              
              for (const cell of possibleCells) {
                if (sheet[cell] && sheet[cell].v) {
                  shipName = sheet[cell].v;
                  break;
                }
              }
              
              if (shipName) break;
            }
          }
          
          if (shipName) {
            console.log("Detected ship name:", shipName);
            
            // Clean up the ship name (remove extra spaces, etc.)
            shipName = shipName.trim();
            
            // Try to match with available vessels
            let matchedVessel = null;
            
            // First try exact match
            Object.entries(vesselNames).forEach(([id, name]) => {
              if (name === shipName) {
                matchedVessel = { id, name };
              }
            });
            
            // If no exact match, try case-insensitive match
            if (!matchedVessel) {
              const shipNameLower = shipName.toLowerCase();
              Object.entries(vesselNames).forEach(([id, name]) => {
                if (name.toLowerCase() === shipNameLower) {
                  matchedVessel = { id, name };
                }
              });
            }
            
            // If still no match, try to find partial matches
            if (!matchedVessel) {
              const shipNameLower = shipName.toLowerCase();
              Object.entries(vesselNames).forEach(([id, name]) => {
                // Check if vessel name contains the ship name or vice versa
                if (name.toLowerCase().includes(shipNameLower) || 
                    shipNameLower.includes(name.toLowerCase())) {
                  matchedVessel = { id, name };
                }
              });
            }
            
            if (matchedVessel) {
              setDetectedVessel(matchedVessel);
            } else {
              // Vessel not found in system
              setDetectedVessel({ 
                id: null, 
                name: shipName, 
                notFound: true 
              });
            }
          } else {
            // No ship name found in the Excel
            setDetectedVessel(null);
          }
        } catch (error) {
          console.error("Error extracting vessel info:", error);
        }
      };
      
      reader.onerror = () => {
        console.error("Error reading file for vessel detection");
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error in extractVesselInfo:", error);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select an Excel file",
        variant: "destructive",
      });
      return;
    }

    if (!detectedVessel || !detectedVessel.id) {
      toast({
        title: "Error",
        description: "No valid vessel detected from the Excel file",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Read the Excel file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileData = new Uint8Array(e.target.result);
          const workbook = XLSX.read(fileData, { type: 'array' });
          
          // Find the defects sheet - look for sheet containing "DEFECTS" or "FOLLOW-UP" in name
          const defectsSheetName = workbook.SheetNames.find(name => 
            name.toUpperCase().includes('DEFECT') || 
            name.toUpperCase().includes('FOLLOW')
          ) || workbook.SheetNames[0];
          
          const worksheet = workbook.Sheets[defectsSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          // Filter out rows that don't have any observations (usually header rows)
          const defectsData = jsonData.filter(row => 
            row["Inspector's Observations / Remarks"] && 
            typeof row["Inspector's Observations / Remarks"] === 'string' &&
            row["Inspector's Observations / Remarks"].trim() !== ''
          );
          
          if (defectsData.length === 0) {
            throw new Error("No valid defect data found in Excel");
          }
          
          // Map Excel data to database structure
          const defectsToImport = defectsData.map(row => {
            // Create base defect object
            const defect = {
              vessel_id: detectedVessel.id,
              vessel_name: detectedVessel.name,
              'Status (Vessel)': 'OPEN',
              'Date Reported': new Date().toISOString().split('T')[0],
              external_visibility: true,
              initial_files: [],
              completion_files: []
            };
            
            // Map fields from Excel to database
            Object.entries(VIR_MAPPING).forEach(([excelField, dbField]) => {
              if (row[excelField] !== undefined) {
                let value = row[excelField];
                
                // Special handling for dates
                if (dbField === 'target_date' || dbField === 'Date Completed') {
                  if (value) {
                    try {
                      // Try to parse Excel date (could be number or string)
                      if (typeof value === 'number') {
                        const excelEpoch = new Date(1899, 11, 30);
                        const dateObj = new Date(excelEpoch.getTime() + value * 86400000);
                        value = dateObj.toISOString().split('T')[0];
                      } else if (typeof value === 'string') {
                        // Try to parse date string
                        const dateObj = new Date(value);
                        if (!isNaN(dateObj.getTime())) {
                          value = dateObj.toISOString().split('T')[0];
                        }
                      }
                    } catch (error) {
                      console.warn(`Error parsing date: ${value}`, error);
                      value = '';
                    }
                  }
                }
                
                // Map risk category to criticality
                if (dbField === 'Criticality' && typeof value === 'string') {
                  if (value.toLowerCase().includes('high')) {
                    value = 'High';
                  } else if (value.toLowerCase().includes('medium')) {
                    value = 'Medium';
                  } else if (value.toLowerCase().includes('low')) {
                    value = 'Low';
                  }
                }
                
                defect[dbField] = value;
              }
            });
            
            return defect;
          });
          
          // Insert into database
          const { data: importedDefects, error: importError } = await supabase
            .from('defects register')
            .insert(defectsToImport)
            .select();
          
          if (importError) throw importError;
          
          toast({
            title: "Success",
            description: `Successfully imported ${defectsToImport.length} defects for ${detectedVessel.name}`,
          });
          
          if (onImportComplete) {
            onImportComplete(importedDefects);
          }
          
          handleClose();
          
        } catch (error) {
          console.error("Error processing Excel:", error);
          toast({
            title: "Import Failed",
            description: error.message || "Failed to process Excel file",
            variant: "destructive",
          });
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read Excel file",
          variant: "destructive",
        });
        setLoading(false);
      };
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      console.error("Error importing VIR:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import VIR data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-[90vw] md:max-w-[450px] max-h-[90vh] overflow-hidden flex flex-col bg-[#0B1623] border border-[#3BADE5]/20"
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,173,229,0.1), 0 0 15px rgba(59,173,229,0.15) inset'
        }}
      >
        <DialogHeader className="border-b border-[#3BADE5]/20 pb-3">
          <DialogTitle className="text-sm font-medium text-white flex items-center">
            <span className="inline-block w-1 h-4 bg-gradient-to-b from-[#3BADE5] to-[#3BADE5]/50 rounded-sm mr-2"></span>
            Import VIR Excel
          </DialogTitle>
          <p className="text-xs text-white/60 ml-3">
            Import defects from Vessel Inspection Report Excel file
          </p>
        </DialogHeader>
        
        <div 
          className="overflow-y-auto custom-scrollbar pr-2 flex-1 py-4"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(59,173,229,0.3) rgba(11,22,35,0.1)',
            maxHeight: 'calc(90vh - 180px)'
          }}
        >
          <div className="grid gap-3">
            {/* File Upload */}
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-white/80">
                VIR Excel File <span className="text-red-400">*</span>
              </label>
              
              <label className="flex items-center gap-2 px-3 py-3 rounded-[4px] border border-[#3BADE5]/20 bg-[#132337] cursor-pointer hover:border-[#3BADE5]/40 transition-colors">
                <FileSpreadsheet className="h-5 w-5 text-[#3BADE5]" />
                <span className="text-xs text-white">{file ? file.name : 'Select VIR Excel file (.xlsx, .xls)'}</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                />
                {file && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFile(null);
                      setDetectedVessel(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="ml-auto p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-red-400" />
                  </button>
                )}
              </label>
            </div>
            
            {/* Detected Vessel Information */}
            {detectedVessel && (
              <div className={`rounded-md p-3 flex items-start gap-2 ${
                detectedVessel.notFound ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#3BADE5]/10 border border-[#3BADE5]/20'
              }`}>
                <div className={`${
                  detectedVessel.notFound ? 'text-red-400' : 'text-[#3BADE5]'
                } flex items-center pt-0.5`}>
                  {detectedVessel.notFound ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-white/90 font-medium">
                    {detectedVessel.notFound ? 'Vessel not found in system:' : 'Detected vessel from file:'}
                  </p>
                  <p className="text-xs text-white/80 mt-1">
                    {detectedVessel.name}
                  </p>
                  {detectedVessel.notFound && (
                    <p className="text-xs text-red-300 mt-2">
                      Please check the Excel file or contact an administrator to add this vessel.
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {!detectedVessel && file && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3 flex items-start gap-2">
                <div className="text-yellow-400 flex items-center pt-0.5">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-white/90 font-medium">
                    No vessel detected
                  </p>
                  <p className="text-xs text-white/80 mt-1">
                    Unable to find vessel information in the Excel file. Please check that the file includes the ship's name.
                  </p>
                </div>
              </div>
            )}
            
            {/* Information Box */}
            <div className="bg-[#132337]/50 rounded-[4px] p-3 mt-2 border border-[#3BADE5]/10">
              <p className="text-xs text-white/70 mb-2">
                <b className="text-[#3BADE5]">Note:</b> The system will import defects from Vessel Inspection Reports.
              </p>
              <p className="text-xs text-white/70">
                Data will be extracted from the following columns:
              </p>
              <ul className="mt-1 space-y-0.5">
                <li className="text-xs text-white/70 ml-3">• Inspector's Observations/Remarks</li>
                <li className="text-xs text-white/70 ml-3">• Corrective Action to be taken</li>
                <li className="text-xs text-white/70 ml-3">• Target date</li>
                <li className="text-xs text-white/70 ml-3">• Risk Category</li>
                <li className="text-xs text-white/70 ml-3">• Area of Concern</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-3 border-t border-[#3BADE5]/10 mt-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="h-7 px-3 text-xs font-medium rounded-[4px] border border-[#3BADE5]/20 hover:border-[#3BADE5]/40 text-white disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !file || !detectedVessel || !detectedVessel.id}
            className="h-7 px-3 text-xs font-medium rounded-[4px] bg-[#3BADE5] hover:bg-[#3BADE5]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              boxShadow: '0 2px 5px rgba(59,173,229,0.3), 0 0 0 1px rgba(59,173,229,0.4)'
            }}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="h-1 w-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-1 w-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-1 w-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              'Import Defects'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Import VIR Button Component
const ImportVIRButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-[4px]
        text-white bg-[#3BADE5] hover:bg-[#3BADE5]/80 transition-all duration-200
        shadow-[0_2px_4px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_8px_rgba(59,173,229,0.3)]
        hover:translate-y-[-1px]"
    >
      <Upload className="h-3.5 w-3.5 mr-1.5" />
      Import VIR Excel
    </button>
  );
};

export { ImportVIRDialog, ImportVIRButton };