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

    // Function to add images in 2 columns
    const addImagesSection = async (title, files, startY) => {
      if (!files?.length) return startY;

      // Add section title
      doc.setFontSize(11);
      doc.setTextColor(44, 123, 229);
      doc.text(title, 15, startY + 5);
      let currentY = startY + 10;

      // Calculate image width and spacing
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15; // 15mm margin on each side
      const spacing = 5; // Space between images
      const imageWidth = (pageWidth - 2 * margin - spacing) / 2; // Half width for two images

      for (let i = 0; i < files.length; i += 2) {
        // Check if a new page is needed
        if (currentY > doc.internal.pageSize.height - 60) {
          doc.addPage();
          currentY = 15;
        }

        // First image in the row
        const file1 = files[i];
        if (file1?.type.startsWith('image/') && signedUrls[file1.path]) {
          try {
            doc.addImage(
              signedUrls[file1.path],
              'JPEG',
              margin,
              currentY,
              imageWidth,
              50, // Fixed height
              file1.name,
              'MEDIUM'
            );

            // Add filename below image
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(file1.name, margin, currentY + 50 + 3);
          } catch (error) {
            console.error(`Error adding image ${file1.name}:`, error);
          }
        }

        // Second image in the row (if available)
        const file2 = files[i + 1];
        if (file2?.type.startsWith('image/') && signedUrls[file2.path]) {
          try {
            doc.addImage(
              signedUrls[file2.path],
              'JPEG',
              margin + imageWidth + spacing,
              currentY,
              imageWidth,
              50, // Fixed height
              file2.name,
              'MEDIUM'
            );

            // Add filename below image
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(file2.name, margin + imageWidth + spacing, currentY + 50 + 3);
          } catch (error) {
            console.error(`Error adding image ${file2.name}:`, error);
          }
        }

        // Update Y position for the next row
        currentY += 50 + 8; // Image height + spacing
      }

      return currentY;
    };

    // Add Initial Documentation
    let currentY = doc.lastAutoTable.finalY + 3;
    if (defect.initial_files?.length) {
      currentY = await addImagesSection('Initial Documentation:', defect.initial_files, currentY);
    }

    // Add Closure Documentation
    if (defect.completion_files?.length) {
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
