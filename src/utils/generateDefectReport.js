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
      theme: 'plain',
      headStyles: {
        fillColor: [44, 123, 229],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      head: [['Basic Information']],
      body: [
        ['Vessel:', defect.vessel_name || '-'],
        ['Equipment:', defect.Equipments || '-'],
        ['Status:', defect['Status (Vessel)'] || '-'],
        ['Criticality:', defect.Criticality || '-'],
        ['Date Reported:', defect['Date Reported'] ? new Date(defect['Date Reported']).toLocaleDateString() : '-'],
        ['Date Completed:', defect['Date Completed'] ? new Date(defect['Date Completed']).toLocaleDateString() : '-']
      ],
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { 
          cellWidth: 30,
          fontStyle: 'bold',
        },
        1: { 
          cellWidth: 'auto' 
        }
      },
      margin: { left: 15 },
    });

    // Initial Assessment
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 5,
      theme: 'plain',
      headStyles: {
        fillColor: [44, 123, 229],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      head: [['Initial Assessment']],
      body: [
        ['Description:', defect.Description || '-'],
        ['Action Planned:', defect['Action Planned'] || '-'],
        ['Initial Comments:', defect.Comments || '-']
      ],
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { 
          cellWidth: 30,
          fontStyle: 'bold',
        },
        1: { 
          cellWidth: 'auto' 
        }
      },
      margin: { left: 15 },
    });

    // Closure Information
    if (defect['Status (Vessel)'] === 'CLOSED') {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 5,
        theme: 'plain',
        headStyles: {
          fillColor: [44, 123, 229],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          cellPadding: 3,
        },
        head: [['Closure Information']],
        body: [
          ['Closure Comments:', defect.closure_comments || '-']
        ],
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        columnStyles: {
          0: { 
            cellWidth: 30,
            fontStyle: 'bold',
          },
          1: { 
            cellWidth: 'auto' 
          }
        },
        margin: { left: 15 },
      });
    }

    // Function to add images section
    const addImagesSection = async (title, files, startY) => {
      if (!files?.length) return startY;

      // Add section title
      doc.setFontSize(10);
      doc.setTextColor(44, 123, 229);
      doc.text(title, 15, startY + 10);
      let currentY = startY + 15;

      for (const file of files) {
        if (!file.type.startsWith('image/') || !signedUrls[file.path]) continue;

        try {
          // Check if we need a new page
          if (currentY > doc.internal.pageSize.height - 100) {
            doc.addPage();
            currentY = 15;
          }

          // Calculate image dimensions
          const imgWidth = doc.internal.pageSize.width - 30; // 15mm margins on each side
          const imgHeight = 70;

          // Add image
          doc.addImage(
            signedUrls[file.path],
            'JPEG',
            15,
            currentY,
            imgWidth,
            imgHeight,
            file.name,
            'MEDIUM'
          );

          // Add filename
          doc.setFontSize(8);
          doc.setTextColor(60);
          doc.text(file.name, 15, currentY + imgHeight + 3);

          currentY += imgHeight + 10;
        } catch (error) {
          console.error(`Error adding image ${file.name}:`, error);
        }
      }

      return currentY;
    };

    // Add documentation images
    let currentY = doc.lastAutoTable.finalY + 5;

    if (defect.initial_files?.length) {
      currentY = await addImagesSection('Initial Documentation:', defect.initial_files, currentY);
    }

    if (defect.completion_files?.length) {
      // Start on new page if less than 100mm space left
      if (currentY > doc.internal.pageSize.height - 100) {
        doc.addPage();
        currentY = 15;
      } else {
        currentY += 5;
      }
      await addImagesSection('Closure Documentation:', defect.completion_files, currentY);
    }

    // Save the PDF
    doc.save(`Defect_Report_${defect.vessel_name}_${defect.id}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
