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
        ['Date Completed', `${defect['Date Completed'] ? formatDate(defect['Date Completed']) : '-'}`]
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

    // Function to filter image files and check if they have signed URLs
    const filterImageFiles = (files) => {
      if (!files?.length) return [];
      return files.filter(file => 
        file?.type?.startsWith('image/') && signedUrls[file.path]
      );
    };

    // Function to add images in 2 columns
    const addImagesSection = async (title, files, startY) => {
      // Filter for only valid image files with signed URLs
      const imageFiles = filterImageFiles(files);
      
      // If no valid images, return current Y position without adding section
      if (!imageFiles.length) return startY;

      // Add section title
      doc.setFontSize(11);
      doc.setTextColor(44, 123, 229);
      doc.text(title, 15, startY + 5);
      let currentY = startY + 10;

      // Calculate image width and spacing
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const spacing = 5;
      const imageWidth = (pageWidth - 2 * margin - spacing) / 2;

      for (let i = 0; i < imageFiles.length; i += 2) {
        // Check if a new page is needed
        if (currentY > doc.internal.pageSize.height - 60) {
          doc.addPage();
          currentY = 15;
        }

        // Add first image in row
        try {
          const file1 = imageFiles[i];
          doc.addImage(
            signedUrls[file1.path],
            'JPEG',
            margin,
            currentY,
            imageWidth,
            50,
            file1.name,
            'MEDIUM'
          );
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(file1.name, margin, currentY + 50 + 3);
        } catch (error) {
          console.error('Error adding first image:', error);
        }

        // Add second image if available
        if (imageFiles[i + 1]) {
          try {
            const file2 = imageFiles[i + 1];
            doc.addImage(
              signedUrls[file2.path],
              'JPEG',
              margin + imageWidth + spacing,
              currentY,
              imageWidth,
              50,
              file2.name,
              'MEDIUM'
            );
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(file2.name, margin + imageWidth + spacing, currentY + 50 + 3);
          } catch (error) {
            console.error('Error adding second image:', error);
          }
        }

        currentY += 50 + 8; // Image height + spacing
      }

      return currentY;
    };

    // Add Initial Documentation (only if there are valid images)
    let currentY = doc.lastAutoTable.finalY + 3;
    if (filterImageFiles(defect.initial_files).length > 0) {
      currentY = await addImagesSection('Initial Documentation:', defect.initial_files, currentY);
    }

    // Add Closure Documentation (only if there are valid images)
    if (filterImageFiles(defect.completion_files).length > 0) {
      if (currentY > doc.internal.pageSize.height - 60) {
        doc.addPage();
        currentY = 15;
      }
      await addImagesSection('Closure Documentation:', defect.completion_files, currentY);
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
