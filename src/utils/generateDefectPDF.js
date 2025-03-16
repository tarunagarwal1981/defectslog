import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateDefectPDF = async (defect, signedUrls = {}) => {
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

    // Function to add images and documents section
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
        for (let i = 0; i < Math.min(imageFiles.length, 4); i += 2) { // Limit to 4 images to reduce size
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

    // Return the PDF as a blob instead of saving it
    return doc.output('blob');

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
