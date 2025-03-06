import ExcelJS from 'exceljs';

export const exportToCSV = (data, vesselNames, filters = {}) => {
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
    // Format data for CSV
    const csvData = filteredData.map((item, index) => {
      return {
        'No.': index + 1,
        'Vessel Name': item.vessel_name || vesselNames[item.vessel_id] || '-',
        'Status': item['Status (Vessel)'],
        'Criticality': item.Criticality || '',
        'Equipment': item.Equipments || '',
        'Description': item.Description || '',
        'Action Planned': item['Action Planned'] || '',
        'Date Reported': formatDate(item['Date Reported']),
        'Target Date': formatDate(item.target_date),
        'Date Completed': formatDate(item['Date Completed']),
        'Comments': item.Comments || '',
        'Closure Comments': item.closure_comments || '',  
        'Defect Source': item.raised_by || ''
      };
    });
    // Convert to CSV string
    const headers = Object.keys(csvData[0]);
    const csvRows = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => {
          let cell = row[header] || '';
          // Escape quotes and commas
          if (cell.toString().includes(',') || cell.toString().includes('"') || cell.toString().includes('\n')) {
            cell = `"${cell.toString().replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
    ];
    // Create and download file
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `defects-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    // You might want to add a toast notification here
  }
};

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
      return `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/defect-files/${filePath}`;
    };
    
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Defects');
    
    // Define columns
    worksheet.columns = [
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
      { header: 'Before Files', key: 'beforeFiles', width: 30 },
      { header: 'After Files', key: 'afterFiles', width: 30 }
    ];
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
    // Add data rows
    filteredData.forEach((item, index) => {
      const row = worksheet.addRow({
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
        defectSource: item.raised_by || '',
        // Leave file cells empty initially
        beforeFiles: '',
        afterFiles: ''
      });
      
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
      
      // Add hyperlinks for Before Files
      if (item.initial_files?.length) {
        const beforeFilesCell = row.getCell('beforeFiles');
        
        if (item.initial_files.length === 1) {
          const file = item.initial_files[0];
          beforeFilesCell.value = {
            text: file.name,
            hyperlink: getFileUrl(file.path),
            tooltip: file.name
          };
          beforeFilesCell.font = {
            color: { argb: 'FF0000FF' },
            underline: true
          };
        } else {
          // Create a text representation with multiple links not supported directly
          let fileText = '';
          item.initial_files.forEach((file, i) => {
            if (i === 0) {
              // Make just the first link clickable
              beforeFilesCell.value = {
                text: file.name,
                hyperlink: getFileUrl(file.path),
                tooltip: 'Click to open file'
              };
              beforeFilesCell.font = {
                color: { argb: 'FF0000FF' },
                underline: true
              };
              fileText = `${file.name} `;
            } else {
              fileText += `| ${file.name} `;
            }
          });
          
          // Note: Excel can't have multiple hyperlinks in one cell
          beforeFilesCell.value = `${fileText} (${item.initial_files.length} files)`;
        }
      }
      
      // Add hyperlinks for After Files
      if (item.completion_files?.length) {
        const afterFilesCell = row.getCell('afterFiles');
        
        if (item.completion_files.length === 1) {
          const file = item.completion_files[0];
          afterFilesCell.value = {
            text: file.name,
            hyperlink: getFileUrl(file.path),
            tooltip: file.name
          };
          afterFilesCell.font = {
            color: { argb: 'FF0000FF' },
            underline: true
          };
        } else {
          // Create a text representation with multiple links not supported directly
          let fileText = '';
          item.completion_files.forEach((file, i) => {
            if (i === 0) {
              // Make just the first link clickable
              afterFilesCell.value = {
                text: file.name,
                hyperlink: getFileUrl(file.path),
                tooltip: 'Click to open file'
              };
              afterFilesCell.font = {
                color: { argb: 'FF0000FF' },
                underline: true
              };
              fileText = `${file.name} `;
            } else {
              fileText += `| ${file.name} `;
            }
          });
          
          // Note: Excel can't have multiple hyperlinks in one cell
          afterFilesCell.value = `${fileText} (${item.completion_files.length} files)`;
        }
      }
    });
    
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
    // You might want to add a toast notification here
  }
};
