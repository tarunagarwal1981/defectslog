import ExcelJS from 'exceljs';
import { supabase } from '../supabaseClient';

export const exportToExcel = async (data, vesselNames, filters = {}) => {
  try {
    console.log("Starting Excel export with filters:", filters);
    
    // Apply filters
    let filteredData = [...data];
    
    if (filters.status) {
      filteredData = filteredData.filter(item => 
        item['Status (Vessel)'] === filters.status
      );
    }
    
    if (filters.criticality) {
      filteredData = filteredData.filter(item => 
        item.Criticality === filters.criticality
      );
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredData = filteredData.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(searchLower)
        )
      );
    }
    
    console.log(`Filtered data: ${filteredData.length} records`);
    
    // Helper function to format date as dd/mm/yyyy
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Define columns with specific widths
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
    
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Defects');
    
    // Set columns with wrap text enabled
    worksheet.columns = columns.map(col => ({
      ...col,
      width: col.width,
      style: { wrapText: true }  // Enable text wrapping for all columns
    }));
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
    // Add data rows
    filteredData.forEach((item, index) => {
      console.log(`Processing defect ID ${item.id} (${index + 1}/${filteredData.length})`);
      
      // Prepare row data
      const rowData = {
        no: index + 1,
        vesselName: item.vessel_name || vesselNames[item.vessel_id] || '-',
        status: item['Status (Vessel)'],
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
      
      // Add row
      const row = worksheet.addRow(rowData);
      
      // Add PDF report link
      const pdfCell = row.getCell('pdfReport');
      const pdfPath = `uploads/defect-reports/${item.id}.pdf`;
      console.log(`Defect ID ${item.id}: Looking for PDF at path: ${pdfPath}`);
      
      const { data: pdfUrlData } = supabase.storage
        .from('defect-files')
        .getPublicUrl(pdfPath);
      
      console.log(`Defect ID ${item.id}: Generated PDF URL:`, pdfUrlData?.publicUrl || 'No URL generated');
      
      if (pdfUrlData?.publicUrl) {
        pdfCell.value = {
          text: 'View Report',
          hyperlink: pdfUrlData.publicUrl,
          tooltip: 'Click to view PDF report'
        };
        
        pdfCell.font = {
          color: { argb: 'FF0000FF' },
          underline: true
        };
        console.log(`Defect ID ${item.id}: PDF link added to Excel`);
      } else {
        pdfCell.value = 'Report unavailable';
        console.log(`Defect ID ${item.id}: PDF report unavailable`);
      }
      
      // Color code criticality
      if (item.Criticality) {
        const criticalityCell = row.getCell('criticality');
        
        switch(item.Criticality) {
          case 'HIGH':
            criticalityCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFF0000' } // Red
            };
            break;
          case 'MEDIUM':
            criticalityCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFF00' } // Yellow
            };
            break;
          case 'LOW':
            criticalityCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF92D050' } // Green
            };
            break;
        }
      }
    });
    
    // Add auto filter
    worksheet.autoFilter = {
      from: 'A1',
      to: {
        row: 1,
        column: columns.length
      }
    };
    
    console.log("Creating Excel file buffer...");
    // Create a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create a blob and download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const filename = `defects-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    
    console.log(`Download initiated for file: ${filename}`);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("Excel export completed successfully");
    
  } catch (error) {
    console.error('Error exporting Excel:', error);
    throw error;
  }
};
