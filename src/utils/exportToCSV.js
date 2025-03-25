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
      { header: 'Description', key: 'description', width: 40 }, // Wider for more text
      { header: 'Action Planned', key: 'actionPlanned', width: 40 }, // Wider for more text
      { header: 'Date Reported', key: 'dateReported', width: 12 },
      { header: 'Target Date', key: 'targetDate', width: 12 },
      { header: 'Date Completed', key: 'dateCompleted', width: 12 },
      { header: 'Comments', key: 'comments', width: 25 }, // Wider for more text
      { header: 'Closure Comments', key: 'closureComments', width: 25 }, // Wider for more text
      { header: 'Defect Source', key: 'defectSource', width: 15 },
      { header: 'PDF Report', key: 'pdfReport', width: 15 }
    ];

    // Create workbook and worksheet with optimal settings for text wrapping
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties to encourage proper text wrapping
    workbook.creator = 'Defects Manager';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Defects', {
      properties: {
        defaultRowHeight: 25, // Default minimum height
        defaultColWidth: 12,
        tabColor: {argb: '4F81BD'}
      }
    });

    // Calculate better row height based on content
    const calculateRowHeight = (row) => {
      // Improved algorithm to better handle text wrapping:
      // 1. Count number of characters in each cell
      // 2. Estimate lines based on column width and average characters per line
      // 3. Add extra lines for newlines in the text
      // 4. Apply a multiplication factor for safety
      
      let maxLines = 1;
      
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (!cell.value) return;
        
        const columnWidth = worksheet.getColumn(colNumber).width || 10;
        const text = String(cell.value);
        
        // Count explicit line breaks
        const newlines = (text.match(/\n/g) || []).length;
        
        // Average characters per line (based on font size and column width)
        const charsPerLine = columnWidth * 1.8; // Approximation
        
        // Calculate lines needed
        const textLines = Math.ceil(text.length / charsPerLine);
        
        // Total estimated lines (text wrapping + explicit breaks)
        const totalLines = textLines + newlines;
        
        // For certain columns (like description), add extra space
        if (colNumber === 6 || colNumber === 7) { // Description & Action Planned columns
          maxLines = Math.max(maxLines, totalLines * 1.2);
        } else {
          maxLines = Math.max(maxLines, totalLines);
        }
      });
      
      // Convert lines to height (pixels) - approximately 15px per line plus padding
      return Math.max(25, Math.ceil(maxLines * 15) + 10);
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
    headerRow.height = 30; // Set header row height
    
    // Apply text wrapping to header and all cells
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

      const row = worksheet.addRow(rowData);
      
      // Apply text wrapping to ALL cells in the row
      row.eachCell((cell) => {
        if (!cell.alignment) cell.alignment = {};
        cell.alignment.wrapText = true;
        cell.alignment.vertical = 'top';
        // Larger font height makes text more readable when wrapped
        cell.font = { size: 11 };
      });
      
      // Set row height based on content - Do this AFTER cell formatting
      row.height = calculateRowHeight(row);

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

    // Force Excel to recognize text wrapping by setting column widths explicitly
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

    // Add protection to help Excel preserve formatting (protection without password)
    worksheet.protect('', {
      autoFilter: true,
      selectLockedCells: true,
      selectUnlockedCells: true,
      sort: true,
      formatCells: true,
      formatColumns: true,
      formatRows: true,
    });

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
