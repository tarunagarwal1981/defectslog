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
        const imageWidth = (pageWidth - 2 * margin - spacing) / 2;

        for (let i = 0; i < imageFiles.length; i += 2) {
          if (currentY > doc.internal.pageSize.height - 60) {
            doc.addPage();
            currentY = 15;
          }

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

            if (imageFiles[i + 1]) {
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
            }

            currentY += 50 + 8;
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
          doc.setTextColor(44, 123, 229);
          currentY += 4;
          doc.text(text, 20, currentY);
          doc.link(20, currentY - 3, doc.getTextWidth(text), 5, {
            url: signedUrls[file.path]
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
