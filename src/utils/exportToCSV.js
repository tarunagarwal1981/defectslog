import ExcelJS from 'exceljs';
import { supabase } from '../supabaseClient';

export const exportToExcel = async (data, vesselNames, filters = {}) => {
  try {
    console.log("Starting Excel export with filters:", filters);

    // Helper functions
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d instanceof Date && !isNaN(d) 
        ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        : '';
    };

    const checkPDFExists = async (defectId) => {
      try {
        const pdfPath = `uploads/defect-reports/${defectId}.pdf`;
        const { data: fileList, error } = await supabase.storage
          .from('defect-files')
          .list('uploads/defect-reports', {
            search: `${defectId}.pdf`
          });

        if (error) {
          console.error(`Error checking PDF for defect ${defectId}:`, error);
          return false;
        }

        return fileList && fileList.length > 0;
      } catch (error) {
        console.error(`Error in checkPDFExists for defect ${defectId}:`, error);
        return false;
      }
    };

    const getPublicUrl = (defectId) => {
      const pdfPath = `uploads/defect-reports/${defectId}.pdf`;
      const { data: urlData } = supabase.storage
        .from('defect-files')
        .getPublicUrl(pdfPath);
      return urlData?.publicUrl || null;
    };

    // Apply filters
    let filteredData = [...data].filter(item => {
      const matchesStatus = !filters.status || item['Status (Vessel)'] === filters.status;
      const matchesCriticality = !filters.criticality || item.Criticality === filters.criticality;
      const matchesSearch = !filters.search || Object.values(item).some(val =>
        String(val).toLowerCase().includes(filters.search.toLowerCase())
      );
      return matchesStatus && matchesCriticality && matchesSearch;
    });

    console.log(`Filtered data: ${filteredData.length} records`);

    // Define columns with appropriate widths for content
    const columns = [
      { header: 'No.', key: 'no', width: 5 },
      { header: 'Vessel Name', key: 'vesselName', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Criticality', key: 'criticality', width: 12 },
      { header: 'Equipment', key: 'equipment', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Action Planned', key: 'actionPlanned', width: 40 },
      { header: 'Date Reported', key: 'dateReported', width: 12 },
      { header: 'Target Date', key: 'targetDate', width: 12 },
      { header: 'Date Completed', key: 'dateCompleted', width: 12 },
      { header: 'Comments', key: 'comments', width: 25 },
      { header: 'Closure Comments', key: 'closureComments', width: 25 },
      { header: 'Defect Source', key: 'defectSource', width: 15 },
      { header: 'PDF Report', key: 'pdfReport', width: 15 }
    ];

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Defects Manager';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Defects', {
      properties: {
        defaultRowHeight: 30, // Increased default minimum height
        defaultColWidth: 12,
        tabColor: {argb: '4F81BD'}
      }
    });

    // Ultra-generous row height calculation
    const calculateRowHeight = (rowData) => {
      // Column indices where we expect more text
      const textHeavyColumns = [5, 6, 10, 11]; // Description, Action Planned, Comments, Closure Comments
      
      let totalTextLength = 0;
      let maxSingleCellLength = 0;
      
      // Calculate total text length across all cells and find the longest single cell
      Object.entries(rowData).forEach(([key, value]) => {
        if (!value) return;
        
        const textLength = String(value).length;
        totalTextLength += textLength;
        
        // For text-heavy columns, give more weight
        if (key === 'description' || key === 'actionPlanned' || 
            key === 'comments' || key === 'closureComments') {
          maxSingleCellLength = Math.max(maxSingleCellLength, textLength);
        }
      });
      
      // Base height calculation using total text and max cell length
      let calculatedHeight = 30; // Start with minimum height
      
      // Add height based on total text in the row (1px per 5 chars)
      calculatedHeight += Math.floor(totalTextLength / 5);
      
      // Add height based on longest text-heavy cell (3px per 10 chars)
      calculatedHeight += Math.floor(maxSingleCellLength / 10) * 3;
      
      // Ensure there's always adequate minimum height
      return Math.max(60, calculatedHeight);
    };

    // Add columns to worksheet
    worksheet.columns = columns;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    headerRow.height = 30;
    
    // Apply text wrapping to header
    headerRow.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    });

    // Process data rows
    for (const [index, item] of filteredData.entries()) {
      console.log(`Processing defect ID ${item.id} (${index + 1}/${filteredData.length})`);

      // Prepare row data
      const rowData = {
        no: index + 1,
        vesselName: item.vessel_name || vesselNames[item.vessel_id] || '-',
        status: item['Status (Vessel)'] || '',
        criticality: item.Criticality || '',
        equipment: item.Equipments || '',
        description: item.Description || '',
        actionPlanned: item['Action Planned'] || '',
        dateReported: formatDate(item['Date Reported']),
        targetDate: formatDate(item.target_date),
        dateCompleted: formatDate(item['Date Completed']),
        comments: item.Comments || '',
        closureComments: item.closure_comments || '',
        defectSource: item.raised_by || ''
      };

      // Pre-calculate row height based on data
      const rowHeight = calculateRowHeight(rowData);
      
      const row = worksheet.addRow(rowData);
      row.height = rowHeight; // Apply height immediately
      
      // Apply text wrapping to ALL cells in the row
      row.eachCell((cell) => {
        if (!cell.alignment) cell.alignment = {};
        cell.alignment.wrapText = true;
        cell.alignment.vertical = 'top';
        cell.font = { size: 11 };
      });

      // Handle PDF report
      const pdfCell = row.getCell('pdfReport');
      const pdfExists = await checkPDFExists(item.id);

      if (pdfExists) {
        const publicUrl = getPublicUrl(item.id);
        if (publicUrl) {
          pdfCell.value = {
            text: 'View Report',
            hyperlink: publicUrl,
            tooltip: 'Click to view PDF report'
          };
          pdfCell.font = {
            color: { argb: 'FF0000FF' },
            underline: true,
            size: 11
          };
          console.log(`Defect ID ${item.id}: PDF link added`);
        } else {
          pdfCell.value = 'Link unavailable';
          pdfCell.font = { color: { argb: 'FFFF0000' }, size: 11 };
          console.log(`Defect ID ${item.id}: PDF exists but link generation failed`);
        }
      } else {
        pdfCell.value = 'No report';
        pdfCell.font = { color: { argb: 'FF808080' }, size: 11 };
        console.log(`Defect ID ${item.id}: No PDF found`);
      }

      // Apply criticality colors
      const criticalityCell = row.getCell('criticality');
      const criticality = item.Criticality?.toUpperCase();
      
      if (criticality === 'HIGH') {
        criticalityCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' } // Red
        };
        criticalityCell.font = { color: { argb: 'FFFFFFFF' }, size: 11 }; // White
      } 
      else if (criticality === 'MEDIUM') {
        criticalityCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Yellow 
        };
        criticalityCell.font = { color: { argb: 'FF000000' }, size: 11 }; // Black
      }
      else if (criticality === 'LOW') {
        criticalityCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF92D050' } // Green
        };
        criticalityCell.font = { color: { argb: 'FFFFFFFF' }, size: 11 }; // White
      }
      
      // Ensure text wrap is preserved for criticality cell
      if (!criticalityCell.alignment) criticalityCell.alignment = {};
      criticalityCell.alignment.wrapText = true;
      criticalityCell.alignment.vertical = 'middle';
      criticalityCell.alignment.horizontal = 'center';
    }

    // Set wider column widths for text-heavy columns and ensure text wrapping
    columns.forEach((col, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = col.width;
      column.alignment = { wrapText: true };
    });

    // Add auto filter
    worksheet.autoFilter = {
      from: 'A1',
      to: { row: 1, column: columns.length }
    };

    // Add Excel optional features
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' } // Freeze header row
    ];

    console.log("Creating Excel file buffer...");
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    // Trigger download
    const filename = `defects-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log("Excel export completed successfully");

  } catch (error) {
    console.error('Error exporting Excel:', error);
    throw error;
  }
};
