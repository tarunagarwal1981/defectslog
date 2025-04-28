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

// Updated mapping for VIR Excel/CSV columns to database fields
// This needs to be adjusted to match the actual CSV format
const VIR_MAPPING = {
  'Sl No': 'SNo',
  "Inspector's Observations / Remarks": 'Description',
  'Corrective Action to be taken': 'Action Planned',
  'Target date': 'target_date',
  'Risk Category': 'Criticality',
  'Area of Concern': 'Equipments',
  //'Task Assigned to': 'raised_by',
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
            console.log("VESSEL DETECTION - File parsed successfully as Excel/CSV");
          } catch (parseError) {
            console.error("VESSEL DETECTION - Error parsing file:", parseError);
            return;
          }
          
          console.log("VESSEL DETECTION - All sheet names:", workbook.SheetNames);
          
          // Try to find header sheet with vessel info
          // First look for the first sheet
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          
          // Debug: Show raw cell data from the first sheet
          console.log("VESSEL DETECTION - Raw cell data from first few cells:");
          for (let col of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
            for (let row = 1; row <= 10; row++) {
              const cellRef = `${col}${row}`;
              if (worksheet[cellRef]) {
                console.log(`Cell ${cellRef}:`, worksheet[cellRef].v);
              }
            }
          }
          
          // Convert to array format with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 'A',
            defval: ''
          });
          
          console.log("VESSEL DETECTION - First sheet data sample:", jsonData.slice(0, 10));
          
          // For CSV format, we need to look at specific cells
          // Based on your shared CSV, "Ship's Name" is in C3 and the actual name is in F3
          let shipName = '';
          
          if (worksheet['F3'] && worksheet['F3'].v) {
            shipName = worksheet['F3'].v;
            console.log("VESSEL DETECTION - Found ship name in cell F3:", shipName);
          } else {
            // Look for Ship's Name pattern in other rows
            for (let i = 0; i < 20; i++) {
              if (jsonData[i]) {
                // Look for any cell containing "Ship's Name" or "Ship"
                for (const [key, value] of Object.entries(jsonData[i])) {
                  if (typeof value === 'string' && 
                      (value.includes("Ship's Name") || value.includes("Ship") || 
                       value.includes("ship") || value.includes("SHIP"))) {
                    // The ship name might be in this row, a few columns to the right
                    const possibleNameKeys = ['F', 'G', 'H'];
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
          
          // Find the defects sheet - looking for sheet with defect data
          // For CSV this is always the first sheet
          const defectsSheetName = workbook.SheetNames[0];
          
          console.log("IMPORT - Selected sheet for defects:", defectsSheetName);
          
          const worksheet = workbook.Sheets[defectsSheetName];
          
          // Get the range of the worksheet to see where data starts and ends
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          console.log("IMPORT - Worksheet range:", range);
          
          // Log some cell values for debugging specific to your CSV structure
          console.log("IMPORT - Examining key cells from worksheet:");
          // Look for header row with column names
          let headerRowIndex = null;
          for (let i = 1; i <= 30; i++) {
            if (worksheet[`A${i}`] && worksheet[`A${i}`].v === 'Sl No') {
              headerRowIndex = i;
              console.log(`IMPORT - Found header row at index ${i} with 'Sl No'`);
              break;
            }
          }
          
          if (headerRowIndex) {
            // Log the header row to see column names
            const headerCells = {};
            for (let c = 0; c <= range.e.c; c++) {
              const cell = XLSX.utils.encode_cell({r: headerRowIndex-1, c});
              if (worksheet[cell]) {
                headerCells[cell] = worksheet[cell].v;
              }
            }
            console.log("IMPORT - Header row cells:", headerCells);
          }
          
          // Convert to JSON with proper headers
          // For your CSV, we need to skip the header metadata rows
          // Based on your sample, data starts after row 28
          let jsonData;
          
          if (headerRowIndex) {
            // Use the header row we found
            jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              range: headerRowIndex-1,
              defval: '' 
            });
          } else {
            // Fallback - try to find data starting from a specific row (28 in your example)
            jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              range: 27, // 0-based, so row 28
              defval: '' 
            });
          }
          
          console.log("IMPORT - Raw JSON data (first 3 rows):", jsonData.slice(0, 3));
          console.log("IMPORT - All column keys in first row:", jsonData[0] ? Object.keys(jsonData[0]) : "No data");
          
          // Check if the expected columns exist
          const columnCheck = {
            "Sl No": jsonData.some(row => row["Sl No"] !== undefined),
            "Inspector's Observations / Remarks": jsonData.some(row => row["Inspector's Observations / Remarks"] !== undefined),
            "Corrective Action to be taken": jsonData.some(row => row["Corrective Action to be taken"] !== undefined),
            "Risk Category": jsonData.some(row => row["Risk Category"] !== undefined),
            "Area of Concern": jsonData.some(row => row["Area of Concern"] !== undefined)
          };
          
          console.log("IMPORT - Column existence check:", columnCheck);
          
          // If columns aren't found, look for similar columns or handle accordingly
          const columnMap = {};
          
          if (!columnCheck["Inspector's Observations / Remarks"]) {
            // Look for alternative column names
            const allColumns = new Set();
            jsonData.forEach(row => {
              Object.keys(row).forEach(key => allColumns.add(key));
            });
            
            console.log("IMPORT - All column names in the data:", [...allColumns]);
            
            // Automatically map columns based on similarity
            for (const [excelField, dbField] of Object.entries(VIR_MAPPING)) {
              if (!columnCheck[excelField]) {
                // Try to find a similar column
                const possibleMatches = [...allColumns].filter(col => {
                  // Create variations of the field name to check against
                  const fieldLower = excelField.toLowerCase();
                  const colLower = col.toLowerCase();
                  
                  return colLower.includes(fieldLower.replace("'s", "s")) || 
                         colLower.includes(fieldLower.replace("'s", "")) ||
                         fieldLower.includes(colLower) ||
                         (fieldLower.includes("observation") && colLower.includes("observation")) ||
                         (fieldLower.includes("action") && colLower.includes("action")) ||
                         (fieldLower.includes("risk") && colLower.includes("risk")) ||
                         (fieldLower.includes("target") && colLower.includes("date")) ||
                         (fieldLower.includes("concern") && colLower.includes("area"));
                });
                
                if (possibleMatches.length > 0) {
                  console.log(`IMPORT - Found possible match for '${excelField}': ${possibleMatches[0]}`);
                  columnMap[excelField] = possibleMatches[0];
                }
              } else {
                columnMap[excelField] = excelField; // Use original if found
              }
            }
          } else {
            // All columns found as expected
            Object.keys(VIR_MAPPING).forEach(key => columnMap[key] = key);
          }
          
          console.log("IMPORT - Final column mapping:", columnMap);
          
          // Filter out rows that don't have any observations (usually header rows)
          const defectsData = jsonData.filter(row => {
            const obsColumn = columnMap["Inspector's Observations / Remarks"];
            const hasObservations = obsColumn && row[obsColumn] && 
              typeof row[obsColumn] === 'string' && row[obsColumn].trim() !== '';
            
            if (hasObservations) {
              console.log("IMPORT - Found row with valid observation:", 
                row[obsColumn].substring(0, 30) + (row[obsColumn].length > 30 ? "..." : ""));
            }
            
            return hasObservations;
          });
          
          console.log("IMPORT - Number of defects found after filtering:", defectsData.length);
          console.log("IMPORT - First defect data:", defectsData[0]);
          
          if (defectsData.length === 0) {
            // Try a more aggressive approach for finding data rows
            console.log("IMPORT - No defects found with standard approach, trying alternative method");
            
            // Examine rows to find any that have text in multiple columns
            const alternativeDefects = jsonData.filter(row => {
              // Count non-empty fields
              let nonEmptyFields = 0;
              for (const [key, value] of Object.entries(row)) {
                if (value && typeof value === 'string' && value.trim() !== '') {
                  nonEmptyFields++;
                }
              }
              // If at least 3 fields have content, this might be a defect row
              return nonEmptyFields >= 3;
            });
            
            console.log("IMPORT - Alternative approach found", alternativeDefects.length, "possible defects");
            console.log("IMPORT - First possible defect:", alternativeDefects[0]);
            
            if (alternativeDefects.length > 0) {
              // We found some potential data
              console.log("IMPORT - Using alternative data rows");
              
              // Try to identify key columns based on cell content
              const tempColumnMap = {};
              // Examine all column names
              const allColumns = new Set();
              alternativeDefects.forEach(row => {
                Object.keys(row).forEach(key => allColumns.add(key));
              });
              
              console.log("IMPORT - All available columns:", [...allColumns]);
              
              // Look for content patterns in each column
              [...allColumns].forEach(colName => {
                const sampleValues = alternativeDefects.slice(0, 3)
                  .map(row => row[colName])
                  .filter(val => val && typeof val === 'string')
                  .map(val => val.substring(0, 30));
                
                if (sampleValues.length > 0) {
                  console.log(`IMPORT - Column '${colName}' sample values:`, sampleValues);
                }
                
                // Try to match columns based on content
                if (tempColumnMap["Inspector's Observations / Remarks"] === undefined) {
                  // Observations often contain longer text
                  const isLongText = alternativeDefects.some(row => {
                    const val = row[colName];
                    return val && typeof val === 'string' && val.length > 20;
                  });
                  if (isLongText) {
                    tempColumnMap["Inspector's Observations / Remarks"] = colName;
                    console.log(`IMPORT - Mapped 'Inspector's Observations / Remarks' to '${colName}'`);
                  }
                }
              });
              
              // Fallback mappings if needed
              if (Object.keys(tempColumnMap).length > 0) {
                Object.assign(columnMap, tempColumnMap);
              }
            }
            
            // Try again with updated column mappings
            const secondAttemptDefects = jsonData.filter(row => {
              const obsColumn = columnMap["Inspector's Observations / Remarks"];
              return obsColumn && row[obsColumn] && 
                typeof row[obsColumn] === 'string' && row[obsColumn].trim() !== '';
            });
            
            if (secondAttemptDefects.length > 0) {
              console.log("IMPORT - Second attempt found", secondAttemptDefects.length, "defects");
              return secondAttemptDefects;
            }
            
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
              completion_files: [],
              'raised_by': 'VIR'
            };
            
            // Map fields from Excel to database using the column map
            Object.entries(VIR_MAPPING).forEach(([excelField, dbField]) => {
              const sourceColumn = columnMap[excelField];
              if (sourceColumn && row[sourceColumn] !== undefined) {
                let value = row[sourceColumn];
                
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
          
          console.log("IMPORT - Mapped defects sample:", defectsToImport[0]);
          console.log("IMPORT - Total defects to import:", defectsToImport.length);
          
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