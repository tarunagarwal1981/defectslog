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
      
      // Add cache-busting parameter
      if (urlData?.publicUrl) {
        return `${urlData.publicUrl}?t=${Date.now()}`;
      }
      return null;
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

    // Define columns with appropriate widths
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
    
    const worksheet = workbook.addWorksheet('Defects');

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

    // Balanced row height calculation
    const calculateRowHeight = (rowData) => {
      // Simple but effective calculation based on the length of key fields
      const descriptionLength = String(rowData.description || '').length;
      const actionPlannedLength = String(rowData.actionPlanned || '').length;
      const commentsLength = String(rowData.comments || '').length;
      const closureCommentsLength = String(rowData.closureComments || '').length;
      
      // Base height
      let height = 20;
      
      // Column widths (approximate characters per line)
      const descCharsPerLine = 38; // Description column width
      const actionCharsPerLine = 38; // Action Planned column width
      const commentsCharsPerLine = 23; // Comments column width
      
      // Calculate lines for key fields
      const descLines = Math.ceil(descriptionLength / descCharsPerLine);
      const actionLines = Math.ceil(actionPlannedLength / actionCharsPerLine);
      const commentsLines = Math.ceil(commentsLength / commentsCharsPerLine);
      const closureLines = Math.ceil(closureCommentsLength / commentsCharsPerLine);
      
      // Find max lines needed
      const maxLines = Math.max(descLines, actionLines, commentsLines, closureLines, 1);
      
      // Each line is approximately 14.5 pixels high
      height = Math.max(height, maxLines * 14.5);
      
      // Add a bit of padding for readability
      height += 10;
      
      // Cap height to keep the spreadsheet manageable
      return Math.min(Math.max(25, height), 150);
    };

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
        cell.font = { size: 11 };
      });
      
      // Calculate and set row height based on content
      row.height = calculateRowHeight(rowData);

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
        } else {
          pdfCell.value = 'Link unavailable';
          pdfCell.font = { color: { argb: 'FFFF0000' }, size: 11 };
        }
      } else {
        pdfCell.value = 'No report';
        pdfCell.font = { color: { argb: 'FF808080' }, size: 11 };
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

    // Add auto filter and freeze header
    worksheet.autoFilter = {
      from: 'A1',
      to: { row: 1, column: columns.length }
    };
    
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
