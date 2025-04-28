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

// Mapping for VIR Excel/CSV columns to database fields
const VIR_MAPPING = {
  'observations': { dbField: 'Description', startCell: 'B36' },
  'actions': { dbField: 'Action Planned', startCell: 'F36' },
  'targetDate': { dbField: 'target_date', startCell: 'J36' },
  'riskCategory': { dbField: 'Criticality', startCell: 'Q36' },
  'areaOfConcern': { dbField: 'Equipments', startCell: 'S36' },
  'completedDate': { dbField: 'Date Completed', startCell: 'O36' },
  'slNo': { dbField: 'SNo', startCell: 'A36' }
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
      console.log("FILE SELECTED - Type:", selectedFile.type, "Name:", selectedFile.name);
      setFile(selectedFile);
      extractVesselInfo(selectedFile);
    }
  };
  
  // Function to extract vessel information from Excel/CSV
  const extractVesselInfo = async (file) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileData = new Uint8Array(e.target.result);
          let workbook;
          
          try {
            workbook = XLSX.read(fileData, { type: 'array' });
            console.log("VESSEL DETECTION - File parsed successfully");
          } catch (parseError) {
            console.error("VESSEL DETECTION - Error parsing file:", parseError);
            return;
          }
          
          console.log("VESSEL DETECTION - All sheet names:", workbook.SheetNames);
          
          // Get the first sheet
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          
          // For VIR CSV format, look specifically at cell F3 for ship name
          let shipName = '';
          
          if (worksheet['F3'] && worksheet['F3'].v) {
            shipName = worksheet['F3'].v;
            console.log("VESSEL DETECTION - Found ship name in cell F3:", shipName);
          } else {
            // If not found in F3, try other common locations
            const possibleCells = ['F4', 'F5', 'G3', 'G4', 'E3', 'E4'];
            for (const cell of possibleCells) {
              if (worksheet[cell] && worksheet[cell].v) {
                shipName = worksheet[cell].v;
                console.log(`VESSEL DETECTION - Found possible ship name in cell ${cell}:`, shipName);
                break;
              }
            }
          }
          
          if (!shipName) {
            console.log("VESSEL DETECTION - No ship name found in expected cells, scanning worksheet...");
            // Convert to array format to check more cells
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 'A',
              defval: ''
            });
            
            for (let i = 0; i < 20; i++) {
              if (jsonData[i]) {
                // Look for any cell containing "Ship's Name" or "Ship"
                for (const [key, value] of Object.entries(jsonData[i])) {
                  if (typeof value === 'string' && 
                      (value.includes("Ship's Name") || value.includes("Ship") || 
                       value.includes("ship") || value.includes("SHIP"))) {
                    // The ship name might be in this row, a few columns to the right
                    const possibleNameKeys = ['F', 'G', 'H', 'E'];
                    for (const nameKey of possibleNameKeys) {
                      if (jsonData[i][nameKey] && jsonData[i][nameKey].trim()) {
                        shipName = jsonData[i][nameKey].trim();
                        console.log(`VESSEL DETECTION - Found ship name in row ${i}, column ${nameKey}:`, shipName);
                        break;
                      }
                    }
                    if (shipName) break;
                  }
                }
                if (shipName) break;
              }
            }
          }
          
          if (shipName) {
            console.log("VESSEL DETECTION - Final detected ship name:", shipName);
            
            // Clean up the ship name (remove extra spaces, etc.)
            shipName = shipName.trim();
            
            // Try to match with available vessels
            let matchedVessel = null;
            
            console.log("VESSEL DETECTION - Available vessels:", vesselNames);
            
            // First try exact match
            Object.entries(vesselNames).forEach(([id, name]) => {
              if (name === shipName) {
                matchedVessel = { id, name };
                console.log("VESSEL DETECTION - Exact match found:", matchedVessel);
              }
            });
            
            // If no exact match, try case-insensitive match
            if (!matchedVessel) {
              const shipNameLower = shipName.toLowerCase();
              Object.entries(vesselNames).forEach(([id, name]) => {
                if (name.toLowerCase() === shipNameLower) {
                  matchedVessel = { id, name };
                  console.log("VESSEL DETECTION - Case-insensitive match found:", matchedVessel);
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
                  console.log("VESSEL DETECTION - Partial match found:", matchedVessel);
                }
              });
            }
            
            if (matchedVessel) {
              setDetectedVessel(matchedVessel);
            } else {
              // Vessel not found in system
              console.log("VESSEL DETECTION - No matching vessel found in system");
              setDetectedVessel({ 
                id: null, 
                name: shipName, 
                notFound: true 
              });
            }
          } else {
            // No ship name found in the Excel
            console.log("VESSEL DETECTION - No ship name found in Excel");
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
      console.log("IMPORT - Starting import process");
      
      // Read the Excel file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileData = new Uint8Array(e.target.result);
          const workbook = XLSX.read(fileData, { type: 'array' });
          
          console.log("IMPORT - Excel sheets available:", workbook.SheetNames);
          
          // Get the first sheet
          const firstSheet = workbook.SheetNames[0];
          console.log("IMPORT - Using sheet:", firstSheet);
          
          const worksheet = workbook.Sheets[firstSheet];
          
          // Get the range of the worksheet
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          console.log("IMPORT - Worksheet range:", range);
          
          // Look at specific cells to extract defect data
          // Instead of using XLSX.utils.sheet_to_json, we'll directly access cells
          // This is more reliable for fixed-format reports
          
          console.log("IMPORT - Extracting defects using specific cell references");
          
          // Extract data by column, starting from specific cells
          const defectsToImport = [];
          const maxRows = 200; // Set a reasonable limit to avoid infinite loops
          
          // Check if starting cells exist
          let startingCellsExist = false;
          for (const [key, mapping] of Object.entries(VIR_MAPPING)) {
            const { startCell } = mapping;
            if (worksheet[startCell]) {
              startingCellsExist = true;
              console.log(`IMPORT - Found starting cell ${startCell} for ${key}:`, worksheet[startCell].v);
            } else {
              console.log(`IMPORT - Starting cell ${startCell} for ${key} not found`);
            }
          }
          
          if (!startingCellsExist) {
            console.log("IMPORT - None of the expected starting cells found, checking for alternative format");
            
            // Try to find the defect table by looking for a row with "Sl No" in column A
            let tableRowIndex = null;
            for (let r = 1; r <= 50; r++) { // Check first 50 rows
              const cell = `A${r}`;
              if (worksheet[cell] && worksheet[cell].v === 'Sl No') {
                tableRowIndex = r;
                console.log(`IMPORT - Found defect table starting at row ${r}`);
                break;
              }
            }
            
            if (tableRowIndex) {
              // Adjust all start cells based on found row
              for (const key in VIR_MAPPING) {
                const startCol = VIR_MAPPING[key].startCell.charAt(0);
                VIR_MAPPING[key].startCell = `${startCol}${tableRowIndex + 1}`; // +1 to skip header
              }
              console.log("IMPORT - Adjusted starting cells:", Object.fromEntries(
                Object.entries(VIR_MAPPING).map(([k, v]) => [k, v.startCell])
              ));
            } else {
              throw new Error("Could not find defect table in the Excel file");
            }
          }
          
          // Process rows starting from each column's start position
          for (let rowOffset = 0; rowOffset < maxRows; rowOffset++) {
            // Create an empty defect for this row
            const defect = {
              vessel_id: detectedVessel.id,
              vessel_name: detectedVessel.name,
              'Status (Vessel)': 'OPEN',
              'Date Reported': new Date().toISOString().split('T')[0],
              external_visibility: true,
              initial_files: [],
              completion_files: [],
              'raised_by': 'VIR'
            };
            
            // Track if this row has any data
            let hasData = false;
            
            // Extract each field from its column
            for (const [key, mapping] of Object.entries(VIR_MAPPING)) {
              const { dbField, startCell } = mapping;
              
              // Calculate the cell for this row
              const startCellRef = XLSX.utils.decode_cell(startCell);
              const currentCell = XLSX.utils.encode_cell({
                c: startCellRef.c,
                r: startCellRef.r + rowOffset
              });
              
              if (worksheet[currentCell]) {
                let value = worksheet[currentCell].v;
                
                // Special handling for fields
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
                hasData = true;
              }
            }
            
            // Only add the defect if it has the key description field
            if (hasData && defect.Description && defect.Description.trim() !== '') {
              console.log(`IMPORT - Found defect at row offset ${rowOffset}:`, 
                defect.Description.substring(0, 30) + (defect.Description.length > 30 ? "..." : ""));
              defectsToImport.push(defect);
            } else if (rowOffset > 0 && !hasData) {
              // We've hit an empty row after finding some data, assume end of table
              console.log(`IMPORT - Found empty row at offset ${rowOffset}, ending search`);
              break;
            }
          }
          
          console.log("IMPORT - Total defects found:", defectsToImport.length);
          
          if (defectsToImport.length === 0) {
            throw new Error("No valid defect data found in Excel");
          }
          
          console.log("IMPORT - First defect:", defectsToImport[0]);
          
          // Insert into database
          const { data: importedDefects, error: importError } = await supabase
            .from('defects register')
            .insert(defectsToImport)
            .select();
          
          if (importError) throw importError;
          
          console.log("IMPORT - Successfully imported defects:", importedDefects?.length);
          
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
                <span className="text-xs text-white">{file ? file.name : 'Select VIR Excel file (.xlsx, .xls, .csv)'}</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
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