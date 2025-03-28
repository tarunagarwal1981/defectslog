import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a PDF report for a defect with multiple strategies based on file size
 * @param {Object} defect - The defect data object
 * @param {Object} signedUrls - Map of file paths to signed URLs
 * @param {Object} publicUrls - Map of file paths to public URLs (optional)
 * @returns {Blob} - PDF as a blob
 */
export const generateDefectPDF = async (defect, signedUrls = {}, publicUrls = {}) => {
  try {
    console.log('Generating PDF for defect:', defect.id);
    
    // If publicUrls isn't provided, use signedUrls as fallback
    if (!publicUrls || Object.keys(publicUrls).length === 0) {
      publicUrls = { ...signedUrls };
    }
    
    // Strategy 1: Try with embedded images first using medium compression
    try {
      console.log('Attempting PDF generation with embedded images (medium compression)...');
      const pdfBlob = await generatePDFWithEmbeddedImages(defect, signedUrls, publicUrls, 'MEDIUM');
      const fileSizeMB = pdfBlob.size / (1024 * 1024);
      
      console.log(`PDF with embedded images (medium compression): ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB <= 10) {
        // Good size, return this version
        console.log('Using embedded images with medium compression strategy');
        return pdfBlob;
      }
    } catch (error) {
      console.error('Error generating PDF with embedded images (medium compression):', error);
      // Continue to next strategy
    }
    
    // Strategy 2: Try with embedded images with high compression
    try {
      console.log('Attempting PDF generation with embedded images (high compression)...');
      const pdfBlob = await generatePDFWithEmbeddedImages(defect, signedUrls, publicUrls, 'FAST');
      const fileSizeMB = pdfBlob.size / (1024 * 1024);
      
      console.log(`PDF with embedded images (high compression): ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB <= 10) {
        // Good size, return this version
        console.log('Using embedded images with high compression strategy');
        return pdfBlob;
      }
    } catch (error) {
      console.error('Error generating PDF with embedded images (high compression):', error);
      // Continue to next strategy
    }
    
    // Strategy 3: Use mixed approach (embed some, link others)
    try {
      console.log('Attempting PDF generation with mixed approach...');
      const pdfBlob = await generatePDFWithMixedApproach(defect, signedUrls, publicUrls);
      const fileSizeMB = pdfBlob.size / (1024 * 1024);
      
      console.log(`PDF with mixed approach: ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB <= 10) {
        // Good size, return this version
        console.log('Using mixed approach strategy');
        return pdfBlob;
      }
    } catch (error) {
      console.error('Error generating PDF with mixed approach:', error);
      // Continue to next strategy
    }
    
    // Strategy 4: Last resort - all linked images
    try {
      console.log('Attempting PDF generation with all linked images (fallback)...');
      const pdfBlob = await generatePDFWithLinkedImages(defect, publicUrls);
      console.log(`PDF with linked images generated, size: ${(pdfBlob.size / (1024 * 1024)).toFixed(2)}MB`);
      console.log('Using linked images strategy (fallback)');
      return pdfBlob;
    } catch (error) {
      console.error('Error generating PDF with linked images:', error);
      // All strategies failed, throw error
      throw new Error(`Failed to generate PDF with any strategy: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in generateDefectPDF:', error);
    throw error;
  }
};

/**
 * Generate PDF with embedded images
 */
const generatePDFWithEmbeddedImages = async (defect, signedUrls, publicUrls, compressionLevel = 'MEDIUM') => {
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
      ['Vessel', `${defect.vessel_name || defect.vesselName || 'Unknown'}`],
      ['Equipment', `${defect.Equipments || '-'}`],
      ['Status', `${defect['Status (Vessel)'] || '-'}`],
      ['Criticality', `${defect.Criticality || '-'}`],
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
      return isDocument && (signedUrls[file.path] || publicUrls[file.path]);
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
      const imageHeight = 50;

      // Add images in rows of 2
      for (let i = 0; i < imageFiles.length; i += 2) {
        // Check if we need a new page
        if (currentY + imageHeight + 10 > doc.internal.pageSize.height) {
          doc.addPage();
          currentY = 15;
        }

        try {
          // First image
          const file1 = imageFiles[i];
          
          try {
            // Add placeholder while waiting for image
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, currentY, imageWidth, imageHeight, 'F');
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.text("Loading image...", margin + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
            
            // Try to add the image with fallback handling
            try {
              doc.addImage(
                signedUrls[file1.path],
                'JPEG',
                margin,
                currentY,
                imageWidth,
                imageHeight,
                undefined,
                compressionLevel,
                0
              );
            } catch (imgError) {
              console.error('Could not add image directly, using placeholder:', imgError);
              // Keep placeholder if image fails
              doc.setFillColor(240, 240, 240);
              doc.rect(margin, currentY, imageWidth, imageHeight, 'F');
              doc.setTextColor(150, 150, 150);
              doc.setFontSize(10);
              doc.text("Image Unavailable", margin + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
            }
            
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
              // Add placeholder while waiting for image
              doc.setFillColor(240, 240, 240);
              doc.rect(margin + imageWidth + spacing, currentY, imageWidth, imageHeight, 'F');
              doc.setTextColor(100, 100, 100);
              doc.setFontSize(8);
              doc.text("Loading image...", margin + imageWidth + spacing + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
              
              // Try to add the image with fallback handling
              try {
                doc.addImage(
                  signedUrls[file2.path],
                  'JPEG',
                  margin + imageWidth + spacing,
                  currentY,
                  imageWidth,
                  imageHeight,
                  undefined,
                  compressionLevel,
                  0
                );
              } catch (imgError) {
                console.error('Could not add second image directly, using placeholder:', imgError);
                // Keep placeholder if image fails
                doc.setFillColor(240, 240, 240);
                doc.rect(margin + imageWidth + spacing, currentY, imageWidth, imageHeight, 'F');
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(10);
                doc.text("Image Unavailable", margin + imageWidth + spacing + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
              }
              
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

      // Add each document as text with link
      doc.setFontSize(9);
      documentFiles.forEach((file) => {
        const icon = getDocumentIcon(file.name);
        const text = `${icon}${file.name}`;
        doc.setTextColor(44, 123, 229);
        currentY += 4;
        doc.text(text, 20, currentY);
        
        // Use permanent public URL for document links if available
        const url = publicUrls[file.path] || signedUrls[file.path];
        if (url) {
          doc.link(20, currentY - 3, doc.getTextWidth(text), 5, { url });
        }
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

  // Get the PDF as a blob
  return new Promise((resolve, reject) => {
    try {
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF with linked images (fallback for large defects)
 */
const generatePDFWithLinkedImages = async (defect, publicUrls) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.setTextColor(44, 123, 229);
  doc.text('Defect Report', doc.internal.pageSize.width / 2, 15, { align: 'center' });
  
  // Add note about linked images
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Note: Images available via links due to file size constraints', doc.internal.pageSize.width / 2, 22, { align: 'center' });

  // Basic Information Table
  doc.autoTable({
    startY: 26,
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
      ['Vessel', `${defect.vessel_name || defect.vesselName || 'Unknown'}`],
      ['Equipment', `${defect.Equipments || '-'}`],
      ['Status', `${defect['Status (Vessel)'] || '-'}`],
      ['Criticality', `${defect.Criticality || '-'}`],
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
      file?.type?.startsWith('image/') && publicUrls[file.path]
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
      return isDocument && publicUrls[file.path];
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

  // Function to add file section with links
  const addLinkedSection = (title, files, startY) => {
    let currentY = startY;
    
    // Add section title
    doc.setFontSize(12);
    doc.setTextColor(44, 123, 229);
    doc.text(title, 15, currentY);
    currentY += 10;
    
    // Process image files
    const imageFiles = filterImageFiles(files);
    if (imageFiles.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(44, 123, 229);
      doc.text('Images:', 15, currentY);
      currentY += 5;
      
      doc.setFontSize(9);
      imageFiles.forEach((file) => {
        const text = `[IMG] ${file.name}`;
        doc.setTextColor(0, 0, 255);
        currentY += 4;
        
        // Add the text
        doc.text(text, 20, currentY);
        
        // Add the link using public permanent URL
        const url = publicUrls[file.path];
        if (url) {
          doc.link(20, currentY - 3, doc.getTextWidth(text), 5, { url });
        }
      });
      currentY += 5;
    }
    
    // Process document files
    const documentFiles = filterDocumentFiles(files);
    if (documentFiles.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(44, 123, 229);
      doc.text('Documents:', 15, currentY);
      currentY += 5;
      
      doc.setFontSize(9);
      documentFiles.forEach((file) => {
        const icon = getDocumentIcon(file.name);
        const text = `${icon}${file.name}`;
        doc.setTextColor(0, 0, 255);
        currentY += 4;
        
        // Add the text
        doc.text(text, 20, currentY);
        
        // Add the link using public permanent URL
        const url = publicUrls[file.path];
        if (url) {
          doc.link(20, currentY - 3, doc.getTextWidth(text), 5, { url });
        }
      });
      currentY += 5;
    }
    
    return currentY;
  };

  // Add Initial Documentation with links
  let currentY = doc.lastAutoTable.finalY + 3;
  if (defect.initial_files?.length > 0) {
    currentY = addLinkedSection('Initial Documentation:', defect.initial_files, currentY);
  }

  // Add Closure Documentation with links
  if (defect.completion_files?.length > 0) {
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      currentY = 15;
    }
    currentY = addLinkedSection('Closure Documentation:', defect.completion_files, currentY);
  }
  
  // Get the PDF as a blob
  return new Promise((resolve, reject) => {
    try {
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF with mixed approach - embedded for some images, links for others
 */
const generatePDFWithMixedApproach = async (defect, signedUrls, publicUrls) => {
  const MAX_IMAGES_TO_EMBED = 4; // Limit number of embedded images
  const doc = new jsPDF();

  // Helper function to make shallow copies and limit embedded images
  const limitEmbeddedImages = (files) => {
    if (!files?.length) return { embeddedFiles: [], linkedFiles: [] };
    
    const imageFiles = files.filter(file => file?.type?.startsWith('image/'));
    const documentFiles = files.filter(file => {
      const isDocument = 
        file?.type === 'application/pdf' || 
        file?.type === 'application/msword' ||
        file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      return isDocument;
    });
    
    // Take only the first MAX_IMAGES_TO_EMBED images to embed
    const embeddedImageFiles = imageFiles.slice(0, MAX_IMAGES_TO_EMBED);
    // The rest will be linked
    const linkedImageFiles = imageFiles.slice(MAX_IMAGES_TO_EMBED);
    
    return {
      embeddedFiles: [...embeddedImageFiles, ...documentFiles], 
      linkedFiles: linkedImageFiles
    };
  };

  // Process files to divide between embedded and linked
  const processInitialFiles = defect.initial_files?.length ? 
    limitEmbeddedImages(defect.initial_files) : 
    { embeddedFiles: [], linkedFiles: [] };
    
  const processCompletionFiles = defect.completion_files?.length ? 
    limitEmbeddedImages(defect.completion_files) : 
    { embeddedFiles: [], linkedFiles: [] };

  // Header
  doc.setFontSize(16);
  doc.setTextColor(44, 123, 229);
  doc.text('Defect Report', doc.internal.pageSize.width / 2, 15, { align: 'center' });
  
  if (processInitialFiles.linkedFiles.length > 0 || processCompletionFiles.linkedFiles.length > 0) {
    // Add note about linked images
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Note: Some images are available via links due to file size constraints', doc.internal.pageSize.width / 2, 22, { align: 'center' });
  }

  // Basic Information Table
  doc.autoTable({
    startY: 26,
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
      ['Vessel', `${defect.vessel_name || defect.vesselName || 'Unknown'}`],
      ['Equipment', `${defect.Equipments || '-'}`],
      ['Status', `${defect['Status (Vessel)'] || '-'}`],
      ['Criticality', `${defect.Criticality || '-'}`],
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

  // Function to add embedded images and documents section
  const addEmbeddedSection = (title, files, startY) => {
    let currentY = startY;
    
    if (!files || files.length === 0) return currentY;
    
    // Add section title
    doc.setFontSize(11);
    doc.setTextColor(44, 123, 229);
    doc.text(title, 15, currentY + 5);
    currentY += 10;

    // Handle images
    const imageFiles = files.filter(file => file?.type?.startsWith('image/') && signedUrls[file.path]);
    
    if (imageFiles.length > 0) {
      // Calculate image layout
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const spacing = 5;
      const imageWidth = (pageWidth - 2 * margin - spacing) / 2;
      const imageHeight = 50;

      // Add images in rows of 2
      for (let i = 0; i < imageFiles.length; i += 2) {
        // Check if we need a new page
        if (currentY + imageHeight + 10 > doc.internal.pageSize.height) {
          doc.addPage();
          currentY = 15;
        }

        try {
          // First image
          const file1 = imageFiles[i];
          
          try {
            // Add placeholder while waiting for image
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, currentY, imageWidth, imageHeight, 'F');
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.text("Loading image...", margin + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
            
            // Try to add the image with fallback handling
            try {
              doc.addImage(
                signedUrls[file1.path],
                'JPEG',
                margin,
                currentY,
                imageWidth,
                imageHeight,
                undefined,
                'FAST', // Use FAST compression to reduce file size
                0
              );
            } catch (imgError) {
              console.error('Could not add image directly, using placeholder:', imgError);
              // Keep placeholder if image fails
              doc.setFillColor(240, 240, 240);
              doc.rect(margin, currentY, imageWidth, imageHeight, 'F');
              doc.setTextColor(150, 150, 150);
              doc.setFontSize(10);
              doc.text("Image Unavailable", margin + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
            }
            
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
              // Add placeholder while waiting for image
              doc.setFillColor(240, 240, 240);
              doc.rect(margin + imageWidth + spacing, currentY, imageWidth, imageHeight, 'F');
              doc.setTextColor(100, 100, 100);
              doc.setFontSize(8);
              doc.text("Loading image...", margin + imageWidth + spacing + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
              
              // Try to add the image with fallback handling
              try {
                doc.addImage(
                  signedUrls[file2.path],
                  'JPEG',
                  margin + imageWidth + spacing,
                  currentY,
                  imageWidth,
                  imageHeight,
                  undefined,
                  'FAST',
                  0
                );
              } catch (imgError) {
                console.error('Could not add second image directly, using placeholder:', imgError);
                // Keep placeholder if image fails
                doc.setFillColor(240, 240, 240);
                doc.rect(margin + imageWidth + spacing, currentY, imageWidth, imageHeight, 'F');
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(10);
                doc.text("Image Unavailable", margin + imageWidth + spacing + imageWidth/2, currentY + imageHeight/2, { align: 'center' });
              }
              
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
    
    // Handle documents - using publicUrls for permanent links
    const documentFiles = files.filter(file => {
      const isDocument = 
        file?.type === 'application/pdf' || 
        file?.type === 'application/msword' ||
        file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      return isDocument && (publicUrls[file.path] || signedUrls[file.path]);
    });
    
    if (documentFiles.length > 0) {
      // Add "Attached Documents" subtitle if there were images
      if (imageFiles.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(44, 123, 229);
        doc.text('Attached Documents:', 15, currentY);
        currentY += 5;
      }

      // Add each document as a link
      doc.setFontSize(9);
      documentFiles.forEach((file) => {
        const icon = getDocumentIcon(file.name);
        const text = `${icon}${file.name}`;
        doc.setTextColor(44, 123, 229);
        currentY += 4;
        doc.text(text, 20, currentY);
        
        // Add link using permanent public URL or fallback to signed URL
        const url = publicUrls[file.path] || signedUrls[file.path];
        if (url) {
          doc.link(20, currentY - 3, doc.getTextWidth(text), 5, { url });
        }
      });
      currentY += 5;
    }

    return currentY;
  };

  // Function to add linked files section
  const addLinkedSection = (title, files, startY) => {
    let currentY = startY;
    
    if (!files || files.length === 0) return currentY;
    
    // Add section title
    doc.setFontSize(10);
    doc.setTextColor(44, 123, 229);
    doc.text(`${title} (Additional Files)`, 15, currentY);
    currentY += 6;
    
    // All files are linked as URLs using permanent public URLs
    doc.setFontSize(9);
    files.forEach((file) => {
      const prefix = file.type?.startsWith('image/') ? '[IMG] ' : getDocumentIcon(file.name);
      const text = `${prefix}${file.name}`;
      doc.setTextColor(0, 0, 255);
      currentY += 4;
      
      // Add the text
      doc.text(text, 20, currentY);
      
      // Add the link using permanent public URL or fall back to signed URL
      const url = publicUrls[file.path] || signedUrls[file.path];
      if (url) {
        doc.link(20, currentY - 3, doc.getTextWidth(text), 5, { url });
      }
    });
    
    return currentY + 5;
  };

  // Add Initial Documentation with embedded content
  let currentY = doc.lastAutoTable.finalY + 3;
  if (processInitialFiles.embeddedFiles.length > 0) {
    currentY = addEmbeddedSection('Initial Documentation:', processInitialFiles.embeddedFiles, currentY);
  }
  
  // Add Initial Documentation with linked content
  if (processInitialFiles.linkedFiles.length > 0) {
    if (currentY > doc.internal.pageSize.height - 30) {
      doc.addPage();
      currentY = 15;
    }
    currentY = addLinkedSection('Initial Documentation', processInitialFiles.linkedFiles, currentY);
  }

  // Add Closure Documentation with embedded content
  if (processCompletionFiles.embeddedFiles.length > 0) {
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      currentY = 15;
    }
    currentY = addEmbeddedSection('Closure Documentation:', processCompletionFiles.embeddedFiles, currentY);
  }
  
  // Add Closure Documentation with linked content
  if (processCompletionFiles.linkedFiles.length > 0) {
    if (currentY > doc.internal.pageSize.height - 30) {
      doc.addPage();
      currentY = 15;
    }
    currentY = addLinkedSection('Closure Documentation', processCompletionFiles.linkedFiles, currentY);
  }

  // Get the PDF as a blob
  return new Promise((resolve, reject) => {
    try {
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to format date as dd/mm/yyyy
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '-';
  }
};
    
    
