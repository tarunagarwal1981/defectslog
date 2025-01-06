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
        ['Date Reported', `${defect['Date Reported'] ? new Date(defect['Date Reported']).toLocaleDateString() : '-'}`],
        ['Date Completed', `${defect['Date Completed'] ? new Date(defect['Date Completed']).toLocaleDateString() : '-'}`]
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

    // Function to add images section
    const addImagesSection = async (title, files, startY) => {
      // Filter only image files that have signed URLs
      const imageFiles = files?.filter(file => 
        file.type.startsWith('image/') && signedUrls[file.path]
      ) || [];

      // Only proceed if there are actual images to display
      if (imageFiles.length === 0) return startY;

      // Add section title
      doc.setFontSize(11);
      doc.setTextColor(44, 123, 229);
      doc.text(title, 15, startY + 5);
      let currentY = startY + 10;

      for (const file of imageFiles) {
        try {
          // Check if need new page
          if (currentY > doc.internal.pageSize.height - 60) {
            doc.addPage();
            currentY = 15;
          }

          // Add image with fixed dimensions
          const imgWidth = doc.internal.pageSize.width - 30; // 15mm margins
          const imgHeight = 50; // Fixed height for consistency

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

          // Add filename below image
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(file.name, 15, currentY + imgHeight + 3);

          currentY += imgHeight + 8; // Space between images
        } catch (error) {
          console.error(`Error adding image ${file.name}:`, error);
          // Continue with next image if one fails
          continue;
        }
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
      // Only add new page if we have actual images and need the space
      const closureImageFiles = defect.completion_files.filter(file => 
        file.type.startsWith('image/') && signedUrls[file.path]
      );
      
      if (closureImageFiles.length > 0) {
        if (currentY > doc.internal.pageSize.height - 60) {
          doc.addPage();
          currentY = 15;
        }
        await addImagesSection('Closure Documentation:', defect.completion_files, currentY);
      }
    }

    // Save with vessel name included
    doc.save(`Defect_Report_${defect.vessel_name}_${defect.id}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
