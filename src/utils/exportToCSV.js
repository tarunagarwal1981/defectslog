import ExcelJS from 'exceljs';
import { supabase } from '../supabaseClient';

export const exportToExcel = async (data, vesselNames, filters = {}) => {
  try {
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
    
    // Helper function to format date as ddmmyyyy
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Helper function to generate Supabase public file URL
    const getFileUrl = (filePath) => {
      if (!filePath) return '';
      const { data } = supabase.storage
        .from('defect-files')
        .getPublicUrl(filePath);
      return data?.publicUrl || '';
    };
    
    // Define columns with specific widths
    const baseColumns = [
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
      { header: 'PDF Report', key: 'pdfReport', width: 15 }  // PDF reports column
    ];
    
    // Find the maximum number of initial and completion files
    const maxInitialFiles = Math.min(5, Math.max(0, ...filteredData.map(item => item.initial_files?.length || 0)));
    const maxCompletionFiles = Math.min(5, Math.max(0, ...filteredData.map(item => item.completion_files?.length || 0)));
    
    // Add initial file columns
    const initialFilesColumns = [];
    for (let i = 0; i < maxInitialFiles; i++) {
      initialFilesColumns.push({
        header: `Initial File ${i + 1}`,
        key: `initialFile${i}`,
        width: 25
      });
    }
    
    // Add completion file columns
    const completionFilesColumns = [];
    for (let i = 0; i < maxCompletionFiles; i++) {
      completionFilesColumns.push({
        header: `Closure File ${i + 1}`,
        key: `completionFile${i}`,
        width: 25
      });
    }
    
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Defects');
    
    // Combine all columns with wrap text enabled
    worksheet.columns = [
      ...baseColumns, 
      ...initialFilesColumns, 
      ...completionFilesColumns
    ].map(col => ({
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
      
      // Add PDF report link for any defect (not just closed)
      const pdfCell = row.getCell('pdfReport');
      const pdfPath = `defect-reports/${item.id}.pdf`;
      const { data: pdfUrlData } = supabase.storage
        .from('defect-files')
        .getPublicUrl(pdfPath);
      
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
      } else {
        pdfCell.value = 'Report unavailable';
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
      
      // Add initial file links
      if (item.initial_files?.length) {
        item.initial_files.slice(0, maxInitialFiles).forEach((file, i) => {
          const fileCell = row.getCell(`initialFile${i}`);
          const fileUrl = getFileUrl(file.path);
          
          if (fileUrl) {
            fileCell.value = {
              text: file.name,
              hyperlink: fileUrl,
              tooltip: 'Click to open file'
            };
            
            fileCell.font = {
              color: { argb: 'FF0000FF' },
              underline: true
            };
          } else {
            fileCell.value = file.name;
          }
        });
        
        // Add indicator if there are more files than shown
        if (item.initial_files.length > maxInitialFiles) {
          const lastFileCell = row.getCell(`initialFile${maxInitialFiles - 1}`);
          const lastFile = item.initial_files[maxInitialFiles - 1];
          const fileUrl = getFileUrl(lastFile.path);
          
          if (fileUrl) {
            lastFileCell.value = {
              text: `${lastFile.name} (+${item.initial_files.length - maxInitialFiles} more)`,
              hyperlink: fileUrl,
              tooltip: 'Click to open file - there are more files not shown'
            };
          } else {
            lastFileCell.value = `${lastFile.name} (+${item.initial_files.length - maxInitialFiles} more)`;
          }
        }
      }
      
      // Add completion file links
      if (item.completion_files?.length) {
        item.completion_files.slice(0, maxCompletionFiles).forEach((file, i) => {
          const fileCell = row.getCell(`completionFile${i}`);
          const fileUrl = getFileUrl(file.path);
          
          if (fileUrl) {
            fileCell.value = {
              text: file.name,
              hyperlink: fileUrl,
              tooltip: 'Click to open file'
            };
            
            fileCell.font = {
              color: { argb: 'FF0000FF' },
              underline: true
            };
          } else {
            fileCell.value = file.name;
          }
        });
        
        // Add indicator if there are more files than shown
        if (item.completion_files.length > maxCompletionFiles) {
          const lastFileCell = row.getCell(`completionFile${maxCompletionFiles - 1}`);
          const lastFile = item.completion_files[maxCompletionFiles - 1];
          const fileUrl = getFileUrl(lastFile.path);
          
          if (fileUrl) {
            lastFileCell.value = {
              text: `${lastFile.name} (+${item.completion_files.length - maxCompletionFiles} more)`,
              hyperlink: fileUrl,
              tooltip: 'Click to open file - there are more files not shown'
            };
          } else {
            lastFileCell.value = `${lastFile.name} (+${item.completion_files.length - maxCompletionFiles} more)`;
          }
        }
      }
    });
    
    // Add auto filter
    worksheet.autoFilter = {
      from: 'A1',
      to: {
        row: 1,
        column: baseColumns.length + initialFilesColumns.length + completionFilesColumns.length
      }
    };
    
    // Create a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create a blob and download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `defects-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error exporting Excel:', error);
    throw error;
  }
};
