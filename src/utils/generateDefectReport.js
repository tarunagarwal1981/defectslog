import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateDefectReport = async (defect, signedUrls = {}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(52, 152, 219);
  doc.text('Defect Report', 105, 20, { align: 'center' });
  
  // Basic Info Table
  doc.autoTable({
    startY: 30,
    theme: 'striped',
    headStyles: { 
      fillColor: [52, 152, 219],
      textColor: [255, 255, 255],
      fontSize: 12,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [74, 85, 104] },
      1: { cellWidth: 'auto', textColor: [45, 55, 72] }
    },
    head: [['Basic Information', '']],
    body: [
      ['Vessel', defect.vessel_name],
      ['Equipment', defect.Equipments],
      ['Status', defect['Status (Vessel)']],
      ['Criticality', defect.Criticality],
      ['Date Reported', defect['Date Reported'] ? new Date(defect['Date Reported']).toLocaleDateString() : '-'],
      ['Date Completed', defect['Date Completed'] ? new Date(defect['Date Completed']).toLocaleDateString() : '-']
    ],
    styles: { fontSize: 10, cellPadding: 8 },
    alternateRowStyles: {
      fillColor: [247, 250, 252]
    }
  });

  // Initial Assessment Table
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    theme: 'striped',
    headStyles: { 
      fillColor: [52, 152, 219],
      textColor: [255, 255, 255],
      fontSize: 12,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [74, 85, 104] },
      1: { cellWidth: 'auto', textColor: [45, 55, 72] }
    },
    head: [['Initial Assessment', '']],
    body: [
      ['Description', defect.Description || '-'],
      ['Action Planned', defect['Action Planned'] || '-'],
      ['Initial Comments', defect.Comments || '-']
    ],
    styles: { fontSize: 10, cellPadding: 8 },
    alternateRowStyles: {
      fillColor: [247, 250, 252]
    }
  });

  // Closure Information
  if (defect['Status (Vessel)'] === 'CLOSED') {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 15,
      theme: 'striped',
      headStyles: { 
        fillColor: [52, 152, 219],
        textColor: [255, 255, 255],
        fontSize: 12,
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', textColor: [74, 85, 104] },
        1: { cellWidth: 'auto', textColor: [45, 55, 72] }
      },
      head: [['Closure Information', '']],
      body: [
        ['Closure Comments', defect.closure_comments || '-']
      ],
      styles: { fontSize: 10, cellPadding: 8 },
      alternateRowStyles: {
        fillColor: [247, 250, 252]
      }
    });
  }

  // Function to add images with better formatting
  const addImagesSection = async (title, files, startY) => {
    if (files?.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(52, 152, 219);
      doc.text(title, 14, startY + 10);
      let currentY = startY + 20;

      for (const file of files) {
        if (file.type.startsWith('image/') && signedUrls[file.path]) {
          // Check if need new page
          if (currentY > 230) {
            doc.addPage();
            currentY = 20;
          }

          try {
            const imgWidth = 180;
            const imgHeight = 90;

            // Add image
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

            // Add filename with background
            doc.setFillColor(247, 250, 252);
            doc.rect(14, currentY + imgHeight, imgWidth, 8, 'F');
            doc.setFontSize(8);
            doc.setTextColor(74, 85, 104);
            doc.text(file.name, 16, currentY + imgHeight + 5);

            currentY += imgHeight + 15;
          } catch (error) {
            console.error(`Error adding image ${file.name}:`, error);
          }
        }
      }
      return currentY;
    }
    return startY;
  };

  // Add images
  let currentY = doc.lastAutoTable.finalY + 15;
  
  if (defect.initial_files?.length > 0) {
    currentY = await addImagesSection('Initial Documentation', defect.initial_files, currentY);
  }
  
  if (defect.completion_files?.length > 0) {
    currentY = await addImagesSection('Closure Documentation', defect.completion_files, currentY);
  }

  doc.save(`Defect_Report_${defect.id}.pdf`);
};
