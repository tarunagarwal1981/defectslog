import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateDefectReport = async (defect, signedUrls = {}) => {
  try {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Defect Report', 105, 20, { align: 'center' });
    
    // Basic Info Table
    doc.autoTable({
      startY: 30,
      theme: 'grid',
      headStyles: { 
        fillColor: [59, 173, 229],
        textColor: [255, 255, 255],
        fontSize: 12
      },
      head: [['Basic Information']],
      body: [
        ['Vessel Name', defect.vessel_name || '-'],
        ['Equipment', defect.Equipments || '-'],
        ['Status', defect['Status (Vessel)'] || '-'],
        ['Criticality', defect.Criticality || '-'],
        ['Date Reported', defect['Date Reported'] ? new Date(defect['Date Reported']).toLocaleDateString() : '-'],
        ['Date Completed', defect['Date Completed'] ? new Date(defect['Date Completed']).toLocaleDateString() : '-']
      ],
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });

    // Initial Assessment
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      theme: 'grid',
      headStyles: { 
        fillColor: [59, 173, 229],
        textColor: [255, 255, 255],
        fontSize: 12
      },
      head: [['Initial Assessment']],
      body: [
        ['Description', defect.Description || '-'],
        ['Action Planned', defect['Action Planned'] || '-'],
        ['Initial Comments', defect.Comments || '-']
      ],
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });

    // Closure Information
    if (defect['Status (Vessel)'] === 'CLOSED') {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 173, 229],
          textColor: [255, 255, 255],
          fontSize: 12
        },
        head: [['Closure Information']],
        body: [
          ['Closure Comments', defect.closure_comments || '-']
        ],
        styles: {
          fontSize: 10,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        }
      });
    }

    // Add images with proper sizing and pagination
    const addImagesSection = (title, files, startY) => {
      if (files?.length > 0) {
        // Add section title
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(title, 14, startY + 10);
        let currentY = startY + 20;

        files.forEach((file, index) => {
          if (file.type.startsWith('image/') && signedUrls[file.path]) {
            // Check if we need a new page
            if (currentY > 230) {
              doc.addPage();
              currentY = 20;
            }

            try {
              // Add image with consistent sizing
              const imgWidth = 180;
              const imgHeight = 100;
              doc.addImage(
                signedUrls[file.path],
                'JPEG',
                14,
                currentY,
                imgWidth,
                imgHeight,
                undefined,
                'MEDIUM'
              );

              // Add file name under image
              doc.setFontSize(8);
              doc.setFont(undefined, 'normal');
              doc.text(file.name, 14, currentY + imgHeight + 5);
              
              currentY += imgHeight + 15;
            } catch (error) {
              console.error(`Error adding image ${file.name}:`, error);
            }
          }
        });
        return currentY;
      }
      return startY;
    };

    // Add documentation images
    let currentY = doc.lastAutoTable.finalY + 10;

    if (defect.initial_files?.length > 0) {
      currentY = addImagesSection('Initial Documentation:', defect.initial_files, currentY);
    }

    if (defect.completion_files?.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }
      currentY = addImagesSection('Closure Documentation:', defect.completion_files, currentY);
    }

    // Save the PDF
    doc.save(`Defect_Report_${defect.id}.pdf`);

  } catch (error) {
    console.error('Error generating defect report:', error);
    throw error;
  }
};
