// Create a new file: utils/generateDefectReport.js

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateDefectReport = async (defect, signedUrls = {}) => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text('Defect Report', 105, 15, { align: 'center' });
  
  // Add company logo if needed
  // doc.addImage(logoBase64, 'PNG', 10, 10, 30, 30);

  // Basic Info Table
  doc.autoTable({
    startY: 25,
    head: [['Basic Information']],
    body: [
      ['Vessel', defect.vessel_name],
      ['Equipment', defect.Equipments],
      ['Status', defect['Status (Vessel)']],
      ['Criticality', defect.Criticality],
      ['Date Reported', new Date(defect['Date Reported']).toLocaleDateString()],
      ['Date Completed', defect['Date Completed'] ? new Date(defect['Date Completed']).toLocaleDateString() : '-'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 173, 229] },
  });

  // Description and Initial Actions
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Initial Assessment']],
    body: [
      ['Description', defect.Description],
      ['Action Planned', defect['Action Planned']],
      ['Initial Comments', defect.Comments || '-'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 173, 229] },
  });

  // Closure Information (if closed)
  if (defect['Status (Vessel)'] === 'CLOSED') {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Closure Information']],
      body: [
        ['Closure Comments', defect.closure_comments || '-'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 173, 229] },
    });
  }

  // Add images if available
  let currentY = doc.lastAutoTable.finalY + 10;

  if (defect.initial_files?.length > 0) {
    doc.text('Initial Documentation:', 14, currentY);
    currentY += 10;

    for (const file of defect.initial_files) {
      if (file.type.startsWith('image/') && signedUrls[file.path]) {
        doc.addImage(signedUrls[file.path], 'JPEG', 14, currentY, 180, 100);
        currentY += 110;
      }
    }
  }

  if (defect.completion_files?.length > 0) {
    doc.text('Closure Documentation:', 14, currentY);
    currentY += 10;

    for (const file of defect.completion_files) {
      if (file.type.startsWith('image/') && signedUrls[file.path]) {
        doc.addImage(signedUrls[file.path], 'JPEG', 14, currentY, 180, 100);
        currentY += 110;
      }
    }
  }

  // Save the PDF
  doc.save(`Defect_Report_${defect.id}.pdf`);
};
