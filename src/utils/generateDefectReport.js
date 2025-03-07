import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateDefectReport = async (defect, signedUrls = {}) => {
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

    // Function to load and get image dimensions
    const getImageDimensions = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = url;
      });
    };

    // Function to calculate dimensions while maintaining aspect ratio
    const calculateDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
      let width = originalWidth;
      let height = originalHeight;
      
      // Calculate aspect ratio
      const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
      
      // Set new dimensions
      width = originalWidth * ratio;
      height = originalHeight * ratio;
      
      return { width, height };
    };

    // Function to add images and documents section
    const addSection = async (title, files, startY) => {
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
        const maxImageWidth = (pageWidth - 2 * margin - spacing) / 2;
        const maxImageHeight = 50; // Fixed height container

        for (let i = 0; i < imageFiles.length; i += 2) {
          if (currentY > doc.internal.pageSize.height - 60) {
            doc.addPage();
            currentY = 15;
          }

          try {
            // First image
            const file1 = imageFiles[i];
            const url1 = signedUrls[file1.path];
            
            try {
              // Get image dimensions - we'll simulate this since we can't actually load the image in this context
              let dims;
              try {
                // Try to get actual dimensions (in a browser environment)
                dims = await getImageDimensions(url1);
              } catch (e) {
                // If we can't load the image (e.g., Node environment), use default dimensions
                dims = { width: 800, height: 600 };
              }
              
              // Calculate scaled dimensions to fit container while maintaining aspect ratio
              const scaledDims = calculateDimensions(
                dims.width, 
                dims.height, 
                maxImageWidth, 
                maxImageHeight
              );
              
              // Center the image within its container
              const xOffset = margin + (maxImageWidth - scaledDims.width) / 2;
              const yOffset = currentY + (maxImageHeight - scaledDims.height) / 2;
              
              doc.addImage(
                url1,
                'JPEG',
                xOffset,
                yOffset,
                scaledDims.width,
                scaledDims.height,
                file1.name,
                'MEDIUM',
                90 // Quality compression level (0-100)
              );
            } catch (imgError) {
              console.error('Error processing image:', imgError);
              // Fallback to basic rendering if dimensions can't be determined
              doc.addImage(
                url1,
                'JPEG',
                margin,
                currentY,
                maxImageWidth,
                maxImageHeight,
                file1.name,
                'MEDIUM', 
                90
              );
            }

            // Second image (if available)
            if (imageFiles[i + 1]) {
              const file2 = imageFiles[i + 1];
              const url2 = signedUrls[file2.path];
              
              try {
                // Get image dimensions
                let dims;
                try {
                  dims = await getImageDimensions(url2);
                } catch (e) {
                  dims = { width: 800, height: 600 };
                }
                
                // Calculate scaled dimensions
                const scaledDims = calculateDimensions(
                  dims.width, 
                  dims.height, 
                  maxImageWidth, 
                  maxImageHeight
                );
                
                // Center the image
                const xOffset = margin + maxImageWidth + spacing + (maxImageWidth - scaledDims.width) / 2;
                const yOffset = currentY + (maxImageHeight - scaledDims.height) / 2;
                
                doc.addImage(
                  url2,
                  'JPEG',
                  xOffset,
                  yOffset,
                  scaledDims.width,
                  scaledDims.height,
                  file2.name,
                  'MEDIUM',
                  90
                );
              } catch (imgError) {
                console.error('Error processing second image:', imgError);
                // Fallback
                doc.addImage(
                  url2,
                  'JPEG',
                  margin + maxImageWidth + spacing,
                  currentY,
                  maxImageWidth,
                  maxImageHeight,
                  file2.name,
                  'MEDIUM',
                  90
                );
              }
            }

            currentY += maxImageHeight + 8; // Fixed height plus spacing
          } catch (error) {
            console.error('Error adding images:', error);
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
      currentY = await addSection('Initial Documentation:', defect.initial_files, currentY);
    }

    // Add Closure Documentation
    if (defect.completion_files?.length > 0) {
      if (currentY > doc.internal.pageSize.height - 60) {
        doc.addPage();
        currentY = 15;
      }
      await addSection('Closure Documentation:', defect.completion_files, currentY);
    }

    // Save with vessel name included
    doc.save(`Defect_Report_${defect.vessel_name}_${defect.id}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Helper function to format date as dd/mm/yyyy
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
