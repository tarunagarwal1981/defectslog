import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
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
    
    // First, generate and store PDFs for all closed defects that don't have one yet
    const closedDefects = filteredData.filter(item => 
      item['Status (Vessel)'] === 'CLOSED'
    );
    
    console.log(`Found ${closedDefects.length} closed defects for PDF reports`);
    
    // ONE-TIME REPAIR: Clear all existing PDFs and regenerate them
    // This is a temporary function and should be removed after confirming everything works
    await repairAllPDFs(closedDefects, vesselNames);
    
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
      { header: 'PDF Report', key: 'pdfReport', width: 15 }  // New column for PDF reports
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
      
      // Add PDF report link for closed defects
      if (item['Status (Vessel)'] === 'CLOSED') {
        const pdfCell = row.getCell('pdfReport');
        const pdfPath = `defect-reports/${item.vessel_id}/${item.id}.pdf`;
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

// ONE-TIME REPAIR FUNCTION
// This function will be removed after confirming everything works correctly
const repairAllPDFs = async (closedDefects, vesselNames) => {
  try {
    console.log("STARTING ONE-TIME PDF REPAIR PROCESS");
    console.log(`Repairing PDFs for ${closedDefects.length} closed defects`);
    
    // Step 1: Try to clean up any existing PDFs in the defect-reports folder
    let foldersToCheck = ['defect-reports'];
    let filesToRemove = [];
    
    // First, list the main defect-reports folder
    try {
      const { data: mainFolderData, error: mainFolderError } = await supabase.storage
        .from('defect-files')
        .list('defect-reports');
      
      if (mainFolderError) {
        console.log("Error listing main folder, might not exist yet:", mainFolderError);
        
        // Try to create the folder
        try {
          // Create an empty .keep file to ensure folder exists
          const { error: createError } = await supabase.storage
            .from('defect-files')
            .upload('defect-reports/.keep', new Blob([''], { type: 'text/plain' }));
          
          if (createError) {
            console.error("Error creating defect-reports folder:", createError);
          } else {
            console.log("Created defect-reports folder successfully");
          }
        } catch (createFolderError) {
          console.error("Exception creating folder:", createFolderError);
        }
      } else if (mainFolderData) {
        console.log(`Found ${mainFolderData.length} items in defect-reports folder`);
        
        // Check vessel subfolders
        for (const item of mainFolderData) {
          if (item.name.endsWith('/')) {
            // This is a subfolder, check its contents
            const vesselFolder = `defect-reports/${item.name}`;
            foldersToCheck.push(vesselFolder);
            
            const { data: vesselFolderData, error: vesselFolderError } = await supabase.storage
              .from('defect-files')
              .list(vesselFolder.replace(/\/$/, '')); // Remove trailing slash
              
            if (!vesselFolderError && vesselFolderData) {
              console.log(`Found ${vesselFolderData.length} files in ${vesselFolder}`);
              
              // Add all PDF files to the removal list
              for (const file of vesselFolderData) {
                if (file.name.endsWith('.pdf')) {
                  filesToRemove.push(`${vesselFolder}${file.name}`);
                }
              }
            }
          } else if (item.name.endsWith('.pdf')) {
            // Add PDF files in the root defect-reports folder
            filesToRemove.push(`defect-reports/${item.name}`);
          }
        }
      }
    } catch (error) {
      console.error("Error listing defect-reports folder:", error);
    }
    
    // Remove existing PDFs if found
    if (filesToRemove.length > 0) {
      console.log(`Removing ${filesToRemove.length} existing PDF files`);
      
      try {
        const { data: removeData, error: removeError } = await supabase.storage
          .from('defect-files')
          .remove(filesToRemove);
          
        if (removeError) {
          console.error("Error removing existing files:", removeError);
        } else {
          console.log(`Successfully removed ${removeData?.length || 0} existing files`);
        }
      } catch (removeError) {
        console.error("Exception removing files:", removeError);
      }
    } else {
      console.log("No existing PDF files found to remove");
    }
    
    // Step 2: Generate fresh PDFs for all closed defects
    console.log("Generating fresh PDFs for all closed defects");
    let successCount = 0;
    let errorCount = 0;
    
    for (const defect of closedDefects) {
      try {
        console.log(`Processing defect ${defect.id}`);
        
        // Ensure vessel folder exists
        const vesselFolder = `defect-reports/${defect.vessel_id}`;
        try {
          // Create an empty .keep file to ensure folder exists
          await supabase.storage
            .from('defect-files')
            .upload(`${vesselFolder}/.keep`, new Blob([''], { type: 'text/plain' }), { upsert: true });
        } catch (folderError) {
          // Ignore errors here, likely means folder already exists
        }
        
        // Get any file attachments
        const signedUrls = {};
        if (defect.initial_files?.length || defect.completion_files?.length) {
          const allPaths = [
            ...(defect.initial_files || []).map(f => f.path),
            ...(defect.completion_files || []).map(f => f.path)
          ].filter(Boolean);
          
          if (allPaths.length > 0) {
            const { data: urlsData } = await supabase.storage
              .from('defect-files')
              .createSignedUrls(allPaths, 60);
              
            if (urlsData) {
              urlsData.forEach(item => {
                signedUrls[item.path] = item.signedUrl;
              });
            }
          }
        }
        
        // Generate PDF
        const pdfBlob = await generateDefectPDF(
          { ...defect, vessel_name: vesselNames[defect.vessel_id] || 'Unknown Vessel' },
          signedUrls
        );
        
        // Upload to Supabase
        const pdfPath = `${vesselFolder}/${defect.id}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('defect-files')
          .upload(pdfPath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (uploadError) {
          console.error(`Error uploading PDF for defect ${defect.id}:`, uploadError);
          errorCount++;
        } else {
          // Verify the file can be accessed
          const { data: publicUrlData } = await supabase.storage
            .from('defect-files')
            .getPublicUrl(pdfPath);
            
          console.log(`Generated PDF for defect ${defect.id}: ${publicUrlData?.publicUrl}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing PDF for defect ${defect.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`REPAIR COMPLETE: Successfully generated ${successCount} PDFs, ${errorCount} errors`);
    
    return { successCount, errorCount };
  } catch (error) {
    console.error("Error in PDF repair process:", error);
    throw error;
  }
};

// Helper function to generate PDF blob
const generateDefectPDF = async (defect, signedUrls = {}) => {
  try {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.setTextColor(44, 123, 229);
    doc.text('Defect Report', doc.internal.pageSize.width / 2, 15, { align: 'center' });

    // Basic Information Table
    doc.autoTable({
      startY: 20,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: { top: 2, right: 4, bottom: 2, left: 4 },
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [44, 123, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        lineColor: [44, 123, 229]
      },
      head: [['Basic Information', '']],
      body: [
        ['Vessel', `${defect.vessel_name}`],
        ['Equipment', `${defect.Equipments}`],
        ['Status', `${defect['Status (Vessel)']}`],
        ['Criticality', `${defect.Criticality}`],
        ['Date Reported', `${defect['Date Reported'] ? formatDate(defect['Date Reported']) : '-'}`],
        ['Date Completed', `${defect['Date Completed'] ? formatDate(defect['Date Completed']) : '-'}`],
        ['Defect Source', `${defect.raised_by || '-'}`]
      ],
      columnStyles: {
        0: { 
          cellWidth: 35,
          fontStyle: 'bold',
          fillColor: [240, 248, 255]
        },
        1: { cellWidth: 'auto' }
      }
    });

    // Initial Assessment Table
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 3,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: { top: 2, right: 4, bottom: 2, left: 4 },
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [44, 123, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        lineColor: [44, 123, 229]
      },
      head: [['Initial Assessment', '']],
      body: [
        ['Description', `${defect.Description || '-'}`],
        ['Action Planned', `${defect['Action Planned'] || '-'}`],
        ['Initial Comments', `${defect.Comments || '-'}`]
      ],
      columnStyles: {
        0: { 
          cellWidth: 35,
          fontStyle: 'bold',
          fillColor: [240, 248, 255]
        },
        1: { cellWidth: 'auto' }
      }
    });

    // Closure Information
    if (defect['Status (Vessel)'] === 'CLOSED') {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 3,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: { top: 2, right: 4, bottom: 2, left: 4 },
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [44, 123, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          lineColor: [44, 123, 229]
        },
        head: [['Closure Information', '']],
        body: [
          ['Closure Comments', `${defect.closure_comments || '-'}`]
        ],
        columnStyles: {
          0: { 
            cellWidth: 35,
            fontStyle: 'bold',
            fillColor: [240, 248, 255]
          },
          1: { cellWidth: 'auto' }
        }
      });
    }

    // Helper function to filter image files
    const filterImageFiles = (files) => {
      if (!files?.length) return [];
      return files.filter(file => 
        file?.type?.startsWith('image/') && signedUrls[file.path]
      );
    };

    // Helper function to filter document files
    const filterDocumentFiles = (files) => {
      if (!files?.length) return [];
      return files.filter(file => {
        const isDocument = 
          file?.type === 'application/pdf' || 
          file?.type === 'application/msword' ||
          file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        return isDocument && signedUrls[file.path];
      });
    };

    // Function to get document icon based on file type
    const getDocumentIcon = (fileName) => {
      const ext = fileName.toLowerCase().split('.').pop();
      if (ext === 'pdf') {
        return '[PDF] ';
      } else if (ext === 'doc' || ext === 'docx') {
        return '[DOC] ';
      }
      return '[FILE] ';
    };

    // Function to add images and documents section (made synchronous)
    const addSection = (title, files, startY) => {
      let currentY = startY;
      
      // Handle images first
      const imageFiles = filterImageFiles(files);
      if (imageFiles.length > 0) {
        // Add section title
        doc.setFontSize(11);
        doc.setTextColor(44, 123, 229);
        doc.text(title, 15, currentY + 5);
        currentY += 10;

        // Calculate image layout
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        const spacing = 5;
        const imageWidth = (pageWidth - 2 * margin - spacing) / 2;
        const imageHeight = 50; // Fixed height for all images

        // Add images in rows of 2
        for (let i = 0; i < imageFiles.length; i += 2) {
          // Check if we need a new page
          if (currentY + imageHeight + 10 > doc.internal.pageSize.height) {
            doc.addPage();
            currentY = 15;
          }

          try {
            // First image
            const file1 = imageFiles[i];
            
            // Use a simplified approach to add images
            try {
              // Add first image with fixed dimensions and compression
              doc.addImage(
                signedUrls[file1.path],
                'JPEG',
                margin,
                currentY,
                imageWidth,
                imageHeight,
                undefined, // No alias needed
                'FAST',    // Use FAST compression
                0          // Rotation
              );
              
              // Add a small caption with the file name below the image
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              const filename1 = file1.name.length > 20 ? file1.name.substring(0, 17) + '...' : file1.name;
              doc.text(filename1, margin + imageWidth/2, currentY + imageHeight + 5, { align: 'center' });
            } catch (error) {
              console.error('Error adding first image:', error);
              // Show error placeholder
              doc.setFillColor(240, 240, 240);
              doc.rect(margin, currentY, imageWidth, imageHeight, 'F');
              doc.setTextColor(150, 150, 150);
              doc.setFontSize(10);
              doc.text('Image Error', margin + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
            }

            // Second image (if available)
            if (imageFiles[i + 1]) {
              const file2 = imageFiles[i + 1];
              try {
                // Add second image with fixed dimensions and compression
                doc.addImage(
                  signedUrls[file2.path],
                  'JPEG',
                  margin + imageWidth + spacing,
                  currentY,
                  imageWidth,
                  imageHeight,
                  undefined, // No alias needed
                  'FAST',    // Use FAST compression
                  0          // Rotation
                );
                
                // Add a small caption with the file name below the image
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                const filename2 = file2.name.length > 20 ? file2.name.substring(0, 17) + '...' : file2.name;
                doc.text(filename2, margin + imageWidth + spacing + imageWidth/2, currentY + imageHeight + 5, { align: 'center' });
              } catch (error) {
                console.error('Error adding second image:', error);
                // Show error placeholder
                doc.setFillColor(240, 240, 240);
                doc.rect(margin + imageWidth + spacing, currentY, imageWidth, imageHeight, 'F');
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(10);
                doc.text('Image Error', margin + imageWidth + spacing + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
              }
            }

            // Move down for the next row of images (including space for captions)
            currentY += imageHeight + 10;
          } catch (error) {
            console.error('Error processing images:', error);
            currentY += 10; // Move down a bit in case of error
          }
        }
      }
      
      // Handle documents
      const documentFiles = filterDocumentFiles(files);
      if (documentFiles.length > 0) {
        // Add title if no images were added
        if (imageFiles.length === 0) {
          doc.setFontSize(11);
          doc.setTextColor(44, 123, 229);
          doc.text(title, 15, currentY + 5);
          currentY += 10;
        }

        // Add "Attached Documents" subtitle
        doc.setFontSize(10);
        doc.setTextColor(44, 123, 229);
        doc.text('Attached Documents:', 15, currentY);
        currentY += 5;

        // Add each document as a link with icon
        doc.setFontSize(9);
        documentFiles.forEach((file) => {
          const icon = getDocumentIcon(file.name);
          const text = `${icon}${file.name}`;
          const isPdf = file.name.toLowerCase().endsWith('.pdf');
          doc.setTextColor(44, 123, 229);
          currentY += 4;
          doc.text(text, 20, currentY);
          doc.link(20, currentY - 3, doc.getTextWidth(text), 5, {
            url: signedUrls[file.path],
            target: isPdf ? '_blank' : '_self'
          });
        });
        currentY += 2;
      }

      return currentY;
    };

    // Add Initial Documentation
    let currentY = doc.lastAutoTable.finalY + 3;
    if (defect.initial_files?.length > 0) {
      currentY = addSection('Initial Documentation:', defect.initial_files, currentY);
    }

    // Add Closure Documentation
    if (defect.completion_files?.length > 0) {
      if (currentY > doc.internal.pageSize.height - 60) {
        doc.addPage();
        currentY = 15;
      }
      currentY = addSection('Closure Documentation:', defect.completion_files, currentY);
    }

    // Return PDF as blob
    return doc.output('blob');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Helper function to format date for PDF
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
