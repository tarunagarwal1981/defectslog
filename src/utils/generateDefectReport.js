import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateDefectReport = async (defect, signedUrls = {}) => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(24);
  doc.text('Defect Report', 105, 20, { align: 'center' });
  
  // Basic Info Table
  doc.autoTable({
    startY: 30,
    headStyles: { fillColor: [52, 152, 219] },
    head: [['Basic Information']],
    body: [
      ['Vessel', defect.vessel_name || '-'],
      ['Equipment', defect.Equipments || '-'],
      ['Status', defect['Status (Vessel)'] || '-'],
      ['Criticality', defect.Criticality || '-'],
      ['Date Reported', defect['Date Reported'] ? new Date(defect['Date Reported']).toLocaleDateString() : '-'],
      ['Date Completed', defect['Date Completed'] ? new Date(defect['Date Completed']).toLocaleDateString() : '-'],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
  });

  // Initial Assessment Table
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    headStyles: { fillColor: [52, 152, 219] },
    head: [['Initial Assessment']],
    body: [
      ['Description', defect.Description || '-'],
      ['Action Planned', defect['Action Planned'] || '-'],
      ['Initial Comments', defect.Comments || '-'],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      1: { cellWidth: 120, minCellHeight: 20 }
    }
  });

  // Closure Information (if closed)
  if (defect['Status (Vessel)'] === 'CLOSED') {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      headStyles: { fillColor: [52, 152, 219] },
      head: [['Closure Information']],
      body: [
        ['Closure Comments', defect.closure_comments || '-'],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        1: { cellWidth: 120, minCellHeight: 20 }
      }
    });
  }

  // Function to add images section
  const addImagesSection = (title, files, startY) => {
    if (files?.length > 0) {
      // Add section title
      doc.text(title, 14, startY + 10);
      let currentY = startY + 20;
      
      files.forEach(file => {
        if (file.type.startsWith('image/') && signedUrls[file.path]) {
          // Check if we need a new page
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          try {
            // Add image with fixed width and proportional height
            doc.addImage(signedUrls[file.path], 'JPEG', 14, currentY, 180, 100, file.name, 'MEDIUM');
            // Add file name under image
            doc.setFontSize(8);
            doc.text(file.name, 14, currentY + 105);
            currentY += 115;
          } catch (error) {
            console.error(`Error adding image ${file.name}:`, error);
          }
        }
      });
      return currentY;
    }
    return startY;
  };

  // Add images
  let currentY = doc.lastAutoTable.finalY + 10;
  if (defect.initial_files?.length > 0) {
    currentY = addImagesSection('Initial Documentation:', defect.initial_files, currentY);
  }
  if (defect.completion_files?.length > 0) {
    currentY = addImagesSection('Closure Documentation:', defect.completion_files, currentY);
  }

  doc.save(`Defect_Report_${defect.id}.pdf`);
};
