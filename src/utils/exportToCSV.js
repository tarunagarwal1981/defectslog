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

    // Define columns
    const columns = [
      { header: 'No.', key: 'no', width: 5 },
      { header: 'Vessel Name', key: 'vesselName', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Criticality', key: 'criticality', width: 12 },
      { header: 'Equipment', key: 'equipment', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Action Planned', key: 'actionPlanned', width: 30 },
      { header: 'Date Reported', key: 'dateReported', width: 12 },
      { header: 'Target Date', key: 'targetDate', width: 12 },
      { header: 'Date Completed', key: 'dateCompleted', width: 12 },
      { header: 'Comments', key: 'comments', width: 20 },
      { header: 'Closure Comments', key: 'closureComments', width: 20 },
      { header: 'Defect Source', key: 'defectSource', width: 15 },
      { header: 'PDF Report', key: 'pdfReport', width: 15 }
    ];

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Defects');

    // Add columns to worksheet
    worksheet.columns = columns;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    
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

      const row = worksheet.addRow(rowData);
      
      // Apply text wrapping to ALL cells in the row - this is crucial
      row.eachCell((cell) => {
        // Always preserve text wrapping regardless of other formatting
        if (!cell.alignment) cell.alignment = {};
        cell.alignment.wrapText = true;
        cell.alignment.vertical = 'top';
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
            underline: true
          };
          console.log(`Defect ID ${item.id}: PDF link added`);
        } else {
          pdfCell.value = 'Link unavailable';
          pdfCell.font = { color: { argb: 'FFFF0000' } };
          console.log(`Defect ID ${item.id}: PDF exists but link generation failed`);
        }
      } else {
        pdfCell.value = 'No report';
        pdfCell.font = { color: { argb: 'FF808080' } };
        console.log(`Defect ID ${item.id}: No PDF found`);
      }

      // Apply criticality colors - fixed implementation
      // Important: Need to get cell AFTER all other formatting is done
      const criticalityCell = row.getCell(columns.findIndex(col => col.key === 'criticality') + 1);
      const criticality = item.Criticality?.toUpperCase();
      
      // Set fill while preserving the existing alignment
      if (criticality === 'HIGH') {
        criticalityCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' } // Red
        };
        criticalityCell.font = { color: { argb: 'FFFFFFFF' } }; // White
      } 
      else if (criticality === 'MEDIUM') {
        criticalityCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Yellow 
        };
        criticalityCell.font = { color: { argb: 'FF000000' } }; // Black
      }
      else if (criticality === 'LOW') {
        criticalityCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF92D050' } // Green
        };
        criticalityCell.font = { color: { argb: 'FFFFFFFF' } }; // White
      }
      
      // Ensure text wrap is preserved for criticality cell
      if (!criticalityCell.alignment) criticalityCell.alignment = {};
      criticalityCell.alignment.wrapText = true;
      criticalityCell.alignment.vertical = 'middle';
      criticalityCell.alignment.horizontal = 'center';
    }

    // Ensure all rows have appropriate height for wrapped text
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex > 1) { // Skip header
        // Set a minimum height that works well for wrapped text
        row.height = 30;
      }
    });

    // Add auto filter
    worksheet.autoFilter = {
      from: 'A1',
      to: { row: 1, column: columns.length }
    };

    // Force Excel to recognize text wrapping by setting column widths explicitly
    columns.forEach((col, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = col.width;
      column.alignment = { wrapText: true };
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
