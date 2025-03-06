import ExcelJS from 'exceljs';
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
    
    // Create a new workbook and worksheets
    const workbook = new ExcelJS.Workbook();
    const defectsSheet = workbook.addWorksheet('Defects');
    const filesSheet = workbook.addWorksheet('Files');
    
    // Set up the files worksheet
    filesSheet.columns = [
      { header: 'Defect ID', key: 'defectId', width: 15 },
      { header: 'Vessel', key: 'vessel', width: 15 },
      { header: 'Equipment', key: 'equipment', width: 20 },
      { header: 'File Type', key: 'fileType', width: 15 },
      { header: 'File Name', key: 'fileName', width: 30 },
      { header: 'Link', key: 'link', width: 40 }
    ];
    
    // Style header row for files sheet
    filesSheet.getRow(1).font = { bold: true };
    filesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    filesSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
    // Define columns for defects sheet
    defectsSheet.columns = [
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
      { header: 'Files Count', key: 'filesCount', width: 10 }
    ];
    
    // Style header row for defects sheet
    defectsSheet.getRow(1).font = { bold: true };
    defectsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    defectsSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
    // Add file references
    let fileRowIndex = 2; // Start after header
    
    // Add data rows to defects sheet
    filteredData.forEach((item, index) => {
      // Count files for reference
      const initialFilesCount = item.initial_files?.length || 0;
      const completionFilesCount = item.completion_files?.length || 0;
      const totalFilesCount = initialFilesCount + completionFilesCount;
      
      // Add primary defect data
      const row = defectsSheet.addRow({
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
        filesCount: totalFilesCount > 0 ? `${totalFilesCount} files (see Files tab)` : 'No files'
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
      
      // Add file links to files worksheet
      if (item.initial_files?.length) {
        item.initial_files.forEach(file => {
          const fileRow = filesSheet.addRow({
            defectId: item.id,
            vessel: item.vessel_name || vesselNames[item.vessel_id] || '-',
            equipment: item.Equipments || '',
            fileType: 'Initial Documentation',
            fileName: file.name,
            link: getFileUrl(file.path)
          });
          
          // Make the link clickable
          const linkCell = fileRow.getCell('link');
          linkCell.value = {
            text: file.name,
            hyperlink: getFileUrl(file.path),
            tooltip: 'Click to open file'
          };
          linkCell.font = {
            color: { argb: 'FF0000FF' },
            underline: true
          };
          
          fileRowIndex++;
        });
      }
      
      if (item.completion_files?.length) {
        item.completion_files.forEach(file => {
          const fileRow = filesSheet.addRow({
            defectId: item.id,
            vessel: item.vessel_name || vesselNames[item.vessel_id] || '-',
            equipment: item.Equipments || '',
            fileType: 'Closure Documentation',
            fileName: file.name,
            link: getFileUrl(file.path)
          });
          
          // Make the link clickable
          const linkCell = fileRow.getCell('link');
          linkCell.value = {
            text: file.name,
            hyperlink: getFileUrl(file.path),
            tooltip: 'Click to open file'
          };
          linkCell.font = {
            color: { argb: 'FF0000FF' },
            underline: true
          };
          
          fileRowIndex++;
        });
      }
      
      // Add hyperlink to files tab if there are files
      if (totalFilesCount > 0) {
        const filesCountCell = row.getCell('filesCount');
        filesCountCell.value = {
          text: `${totalFilesCount} files (see Files tab)`,
          hyperlink: `#Files!A1`, // Link to the Files sheet
          tooltip: 'Click to view files'
        };
        filesCountCell.font = {
          color: { argb: 'FF0000FF' },
          underline: true
        };
      }
    });
    
    // Auto-filter for both sheets
    defectsSheet.autoFilter = {
      from: 'A1',
      to: 'N1'
    };
    
    filesSheet.autoFilter = {
      from: 'A1',
      to: 'F1'
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
    throw error; // Re-throw to allow handling in the UI
  }
};
