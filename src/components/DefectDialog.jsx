import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const PdfReportManager = () => {
  const [defects, setDefects] = useState([]);
  const [vessels, setVessels] = useState({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [log, setLog] = useState([]);
  const [failedDefects, setFailedDefects] = useState([]);
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0 });
  const [generationStats, setGenerationStats] = useState({
    withEmbeddedImages: 0,
    withLinkedImages: 0,
    mixedMode: 0
  });

  useEffect(() => {
    fetchVessels();
  }, []);

  const addLog = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    setLog(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  // Function to clean up existing PDF files before starting a new generation run
  const cleanupExistingPdfs = async () => {
    try {
      addLog('Starting cleanup of existing PDF reports...');
      
      // First, list all files in the reports folder
      const { data: reportFiles, error: listError } = await supabase.storage
        .from('defect-files')
        .list('uploads/defect-reports');
        
      if (listError) {
        addLog(`Error listing existing reports: ${listError.message}`, 'error');
        return false;
      }
      
      if (!reportFiles || reportFiles.length === 0) {
        addLog('No existing reports found to clean up', 'success');
        return true;
      }
      
      // Filter to only include PDF files to ensure we don't touch other important files
      const pdfFiles = reportFiles.filter(file => file.name.toLowerCase().endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        addLog('No PDF files found to clean up', 'success');
        return true;
      }
      
      addLog(`Found ${pdfFiles.length} existing PDF report files to clean up`);
      
      // Delete files in small batches to avoid rate limiting
      const batchSize = 20;
      for (let i = 0; i < pdfFiles.length; i += batchSize) {
        const batch = pdfFiles.slice(i, i + batchSize);
        const filePaths = batch.map(file => `uploads/defect-reports/${file.name}`);
        
        addLog(`Deleting batch of ${filePaths.length} files (${i+1}-${Math.min(i+batchSize, pdfFiles.length)} of ${pdfFiles.length})...`);
        
        const { data: deleteData, error: deleteError } = await supabase.storage
          .from('defect-files')
          .remove(filePaths);
          
        if (deleteError) {
          addLog(`Warning: Error deleting some files: ${deleteError.message}`, 'warning');
          // Continue anyway - we'll try to recreate these files
        } else {
          addLog(`Successfully deleted batch of files`, 'success');
        }
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < pdfFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Verify cleanup
      const { data: verifyFiles, error: verifyError } = await supabase.storage
        .from('defect-files')
        .list('uploads/defect-reports');
        
      if (verifyError) {
        addLog(`Error verifying cleanup: ${verifyError.message}`, 'warning');
        return true; // Continue anyway
      }
      
      // Some placeholder files may remain, that's ok
      const remainingPdfCount = verifyFiles ? verifyFiles.filter(f => f.name.toLowerCase().endsWith('.pdf')).length : 0;
      if (remainingPdfCount > 0) {
        addLog(`Warning: ${remainingPdfCount} PDF files couldn't be deleted`, 'warning');
      } else {
        addLog('Cleanup completed successfully - all PDF files removed', 'success');
      }
      
      return true;
    } catch (error) {
      addLog(`Error during cleanup: ${error.message}`, 'error');
      return false;
    }
  };

  const fetchVessels = async () => {
    try {
      addLog('Fetching vessels...');
      const { data, error } = await supabase
        .from('vessels')
        .select('vessel_id, vessel_name');
      
      if (error) throw error;
      
      // Convert to map for easy lookup
      const vesselMap = {};
      data.forEach(v => {
        vesselMap[v.vessel_id] = v.vessel_name;
      });
      
      setVessels(vesselMap);
      addLog(`Successfully fetched ${data.length} vessels`, 'success');
    } catch (err) {
      addLog(`Error fetching vessels: ${err.message}`, 'error');
      setError('Failed to load vessels: ' + err.message);
    }
  };

  const fetchDefects = async () => {
    setLoading(true);
    setError(null);
    setDefects([]);
    setLog([]);
    
    try {
      addLog('Fetching defects...');
      const { data, error } = await supabase
        .from('defects register')
        .select('*')
        .order('id');
      
      if (error) throw error;
      
      setDefects(data || []);
      setSuccess(`Found ${data.length} defects total.`);
      addLog(`Successfully fetched ${data.length} defects`, 'success');
    } catch (err) {
      addLog(`Error fetching defects: ${err.message}`, 'error');
      setError('Failed to load defects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleDefects = async () => {
    setLoading(true);
    setError(null);
    setDefects([]);
    setLog([]);
    
    try {
      addLog('Fetching sample defects...');
      const { data, error } = await supabase
        .from('defects register')
        .select('*')
        .order('id')
        .limit(3); // Just fetch 3 defects for testing
      
      if (error) throw error;
      
      setDefects(data || []);
      setSuccess(`Found ${data.length} defects for testing.`);
      addLog(`Successfully fetched ${data.length} defects`, 'success');
    } catch (err) {
      addLog(`Error fetching defects: ${err.message}`, 'error');
      setError('Failed to load defects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ensure the uploads folder exists
  const ensureFolder = async () => {
    try {
      addLog('Checking if uploads/defect-reports folder exists...');
      
      // First check uploads folder
      const { data: uploadsData, error: uploadsError } = await supabase.storage
        .from('defect-files')
        .list('uploads');
        
      if (uploadsError) {
        addLog(`Error checking uploads folder: ${uploadsError.message}`, 'error');
        
        // Try to create uploads folder
        addLog('Attempting to create uploads folder...');
        const { error: createUploadsError } = await supabase.storage
          .from('defect-files')
          .upload('uploads/.placeholder', new Blob(['placeholder']), { upsert: true });
          
        if (createUploadsError) {
          addLog(`Failed to create uploads folder: ${createUploadsError.message}`, 'error');
          return false;
        }
        
        addLog('Successfully created uploads folder', 'success');
      } else {
        addLog(`Uploads folder exists with ${uploadsData.length} items`, 'success');
      }
      
      // Then check uploads/defect-reports subfolder
      const { data: reportsData, error: reportsError } = await supabase.storage
        .from('defect-files')
        .list('uploads/defect-reports');
        
      if (reportsError) {
        addLog(`Error checking defect-reports subfolder: ${reportsError.message}`, 'error');
        
        // Try to create defect-reports subfolder
        addLog('Attempting to create defect-reports subfolder...');
        const { error: createReportsError } = await supabase.storage
          .from('defect-files')
          .upload('uploads/defect-reports/.placeholder', new Blob(['placeholder']), { upsert: true });
          
        if (createReportsError) {
          addLog(`Failed to create defect-reports subfolder: ${createReportsError.message}`, 'error');
          return false;
        }
        
        addLog('Successfully created defect-reports subfolder', 'success');
      } else {
        addLog(`Defect-reports subfolder exists with ${reportsData.length} files`, 'success');
      }
      
      return true;
    } catch (err) {
      addLog(`Error checking/creating folders: ${err.message}`, 'error');
      return false;
    }
  };

  // Improved function to verify upload was successful
  const verifyUpload = async (path) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        addLog(`Verifying upload (attempt ${attempt + 1}/3): ${path}`);
        
        // Wait a moment before checking to allow for storage propagation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data, error } = await supabase.storage
          .from('defect-files')
          .download(path);
          
        if (error) throw error;
        
        // Check if the PDF has content
        if (data.size < 1000) {
          throw new Error(`PDF seems to be empty or corrupted (size: ${data.size} bytes)`);
        }
        
        addLog(`Upload verified: ${data.size} bytes`, 'success');
        return true;
      } catch (error) {
        addLog(`Verification attempt ${attempt + 1} failed: ${error.message}`, 'warning');
        
        // Wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (attempt === 2) {
          addLog(`All verification attempts failed for ${path}`, 'error');
          return false;
        }
      }
    }
    return false;
  };

  // Function to process signed URLs for attachments
  const processAttachmentUrls = async (defect) => {
    try {
      // Get public URLs for any attachment files (for linking)
      const publicUrls = {};
      // Get signed URLs for any attachment files (for embedding)
      const signedUrls = {};
      
      if (defect.initial_files?.length || defect.completion_files?.length) {
        const allPaths = [
          ...(defect.initial_files || [])
            .filter(f => f && f.path)
            .map(f => f.path),
          ...(defect.completion_files || [])
            .filter(f => f && f.path)
            .map(f => f.path)
        ].filter(Boolean);
        
        if (allPaths.length > 0) {
          addLog(`Getting URLs for ${allPaths.length} files...`);
          
          // Get signed URLs for embedding in the PDF
          const { data: urlsData, error: urlsError } = await supabase.storage
            .from('defect-files')
            .createSignedUrls(allPaths, 3600);
            
          if (urlsError) {
            addLog(`Warning: Could not get signed URLs: ${urlsError.message}`, 'warning');
          }
          
          if (urlsData) {
            for (const item of urlsData) {
              signedUrls[item.path] = item.signedUrl;
              
              // Also get public URL for linking
              const { data } = supabase.storage
                .from('defect-files')
                .getPublicUrl(item.path);
                
              if (data?.publicUrl) {
                publicUrls[item.path] = data.publicUrl;
              }
            }
            
            addLog(`Successfully retrieved URLs for ${Object.keys(signedUrls).length} files`, 'success');
          }
        }
      }
      
      // Verify URLs are accessible
      if (Object.keys(signedUrls).length > 0) {
        addLog(`Verifying a sample of signed URLs...`);
        // Just verify a couple of URLs to avoid too many requests
        const sampleKeys = Object.keys(signedUrls).slice(0, 2);
        
        for (const path of sampleKeys) {
          try {
            // Try a HEAD request to verify the URL is accessible
            const response = await fetch(signedUrls[path], { method: 'HEAD' });
            if (!response.ok) {
              addLog(`Warning: URL verification failed for ${path}: ${response.status}`, 'warning');
            } else {
              addLog(`Sample URL verification passed for ${path}`, 'success');
            }
          } catch (err) {
            addLog(`Warning: URL verification failed for ${path}: ${err.message}`, 'warning');
          }
        }
      }
      
      return { publicUrls, signedUrls };
    } catch (error) {
      addLog(`Error getting attachment URLs: ${error.message}`, 'warning');
      return { publicUrls: {}, signedUrls: {} };
    }
  };

  // Safer file upload function with better error handling
  const uploadPdfToStorage = async (pdfBlob, path) => {
    // Create a copy of the blob to ensure we have fresh data
    const blob = new Blob([pdfBlob], { type: 'application/pdf' });
    
    try {
      addLog(`Uploading PDF to ${path}...`);
      
      const { data, error } = await supabase.storage
        .from('defect-files')
        .upload(path, blob, { 
          upsert: true,
          contentType: 'application/pdf'
        });
        
      if (error) throw error;
      
      addLog(`Upload completed, verifying...`);
      
      // Verify the upload was successful
      const verified = await verifyUpload(path);
      if (!verified) {
        throw new Error("Upload verification failed");
      }
      
      return data;
    } catch (error) {
      // Retry with alternative upload method
      try {
        addLog(`Retrying upload with arrayBuffer method for ${path}...`, 'info');
        
        // Convert blob to arrayBuffer for more reliable upload
        const arrayBuffer = await blob.arrayBuffer();
        
        const { data, error } = await supabase.storage
          .from('defect-files')
          .upload(path, arrayBuffer, { 
            upsert: true,
            contentType: 'application/pdf'
          });
          
        if (error) throw error;
        
        addLog(`ArrayBuffer upload completed, verifying...`);
        
        // Verify the upload was successful
        const verified = await verifyUpload(path);
        if (!verified) {
          throw new Error("Upload verification failed after retry");
        }
        
        return data;
      } catch (retryError) {
        throw new Error(`Upload failed after retry: ${retryError.message}`);
      }
    }
  };

  // Function to generate PDF with embedded images (higher quality)
  const generatePDFWithEmbeddedImages = async (defect, signedUrls, compressionLevel = 'MEDIUM') => {
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
        ['Vessel', `${vessels[defect.vessel_id] || 'Unknown'}`],
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
          
          // Add the link
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
          
          // Add the link
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

    // Force finalization of the document
    doc.autoPrint();
    
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

  // Generate PDF with mixed approach - embedded for some images, links for others
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
        ['Vessel', `${vessels[defect.vessel_id] || 'Unknown'}`],
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
      
      // Handle documents
      const documentFiles = files.filter(file => {
        const isDocument = 
          file?.type === 'application/pdf' || 
          file?.type === 'application/msword' ||
          file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        return isDocument && publicUrls[file.path];
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
          
          // Add link 
          if (publicUrls[file.path]) {
            doc.link(20, currentY - 3, doc.getTextWidth(text), 5, { url: publicUrls[file.path] });
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
      
      // All files are linked as URLs
      doc.setFontSize(9);
      files.forEach((file) => {
        const prefix = file.type?.startsWith('image/') ? '[IMG] ' : getDocumentIcon(file.name);
        const text = `${prefix}${file.name}`;
        doc.setTextColor(0, 0, 255);
        currentY += 4;
        
        // Add the text
        doc.text(text, 20, currentY);
        
        // Add the link
        if (publicUrls[file.path]) {
          doc.link(20, currentY - 3, doc.getTextWidth(text), 5, { url: publicUrls[file.path] });
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

    // Force finalization of the document
    doc.autoPrint();

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

  const generatePDFForDefect = async (defect) => {
    try {
      addLog(`Processing defect ${defect.id}...`);
      
      // Get URLs for attachments
      const { publicUrls, signedUrls } = await processAttachmentUrls(defect);
      
      // Create PDF - try multiple approaches with fallbacks
      addLog('Generating PDF...');
      
      // Strategy 1: Try with embedded images first using high compression
      let pdfBlob = null;
      let pdfGenerationMethod = '';
      let uploadSuccess = false;
      const pdfPath = `uploads/defect-reports/${defect.id}.pdf`;
      
      // Store file sizes for logging
      const fileSizes = {};
      
      // Strategy 1: Embedded images with medium compression
      try {
        addLog('Attempting PDF generation with embedded images (medium compression)...');
        pdfBlob = await generatePDFWithEmbeddedImages(defect, signedUrls, 'MEDIUM');
        fileSizes.embedded = pdfBlob.size / (1024 * 1024);
        
        addLog(`PDF with embedded images (medium compression): ${fileSizes.embedded.toFixed(2)}MB`, 'info');
        
        if (fileSizes.embedded <= 50) {
          // Good to go with this version
          pdfGenerationMethod = 'embedded_images';
          
          // Try to upload
          addLog(`Uploading PDF with embedded images to ${pdfPath}...`);
          
          try {
            await uploadPdfToStorage(pdfBlob, pdfPath);
            uploadSuccess = true;
            addLog(`Successfully uploaded PDF for defect ${defect.id} using embedded images with medium compression`, 'success');
          } catch (uploadError) {
            addLog(`Upload attempt with medium compression failed: ${uploadError.message}`, 'warning');
          }
        } else {
          addLog(`PDF with embedded images exceeds 50MB limit (${fileSizes.embedded.toFixed(2)}MB)`, 'warning');
        }
      } catch (error) {
        addLog(`Error generating PDF with embedded images (medium compression): ${error.message}`, 'warning');
      }
      
      // Strategy 2: If medium compression didn't work, try high compression
      if (!uploadSuccess) {
        try {
          addLog('Attempting PDF generation with embedded images (high compression)...');
          pdfBlob = await generatePDFWithEmbeddedImages(defect, signedUrls, 'FAST');
          fileSizes.highCompression = pdfBlob.size / (1024 * 1024);
          
          addLog(`PDF with embedded images (high compression): ${fileSizes.highCompression.toFixed(2)}MB`, 'info');
          
          if (fileSizes.highCompression <= 50) {
            // Good to go with this version
            pdfGenerationMethod = 'embedded_compressed';
            
            // Try to upload
            addLog(`Uploading PDF with high compression to ${pdfPath}...`);
            
            try {
              await uploadPdfToStorage(pdfBlob, pdfPath);
              uploadSuccess = true;
              addLog(`Successfully uploaded PDF for defect ${defect.id} using embedded images with high compression`, 'success');
            } catch (uploadError) {
              addLog(`Upload attempt with high compression failed: ${uploadError.message}`, 'warning');
            }
          } else {
            addLog(`PDF with high compression still exceeds 50MB limit (${fileSizes.highCompression.toFixed(2)}MB)`, 'warning');
          }
        } catch (error) {
          addLog(`Error generating PDF with embedded images (high compression): ${error.message}`, 'warning');
        }
      }
      
      // Strategy 3: If compression didn't work, try mixed approach (embed some, link others)
      if (!uploadSuccess) {
        try {
          addLog('Attempting PDF generation with mixed approach (some embedded, some linked)...');
          pdfBlob = await generatePDFWithMixedApproach(defect, signedUrls, publicUrls);
          fileSizes.mixed = pdfBlob.size / (1024 * 1024);
          
          addLog(`PDF with mixed approach: ${fileSizes.mixed.toFixed(2)}MB`, 'info');
          
          if (fileSizes.mixed <= 50) {
            // Good to go with this version
            pdfGenerationMethod = 'mixed_approach';
            
            // Try to upload
            addLog(`Uploading PDF with mixed approach to ${pdfPath}...`);
            
            try {
              await uploadPdfToStorage(pdfBlob, pdfPath);
              uploadSuccess = true;
              addLog(`Successfully uploaded PDF for defect ${defect.id} using mixed approach`, 'success');
            } catch (uploadError) {
              addLog(`Upload attempt with mixed approach failed: ${uploadError.message}`, 'warning');
            }
          } else {
            addLog(`PDF with mixed approach still exceeds 50MB limit (${fileSizes.mixed.toFixed(2)}MB)`, 'warning');
          }
        } catch (error) {
          addLog(`Error generating PDF with mixed approach: ${error.message}`, 'warning');
        }
      }
      
      // Strategy 4: Last resort - all linked images
      if (!uploadSuccess) {
        try {
          addLog('Attempting PDF generation with all linked images (fallback)...');
          pdfBlob = await generatePDFWithLinkedImages(defect, publicUrls);
          fileSizes.linked = pdfBlob.size / (1024 * 1024);
          
          addLog(`PDF with linked images: ${fileSizes.linked.toFixed(2)}MB`, 'info');
          
          if (fileSizes.linked <= 50) {
            // Good to go with this version
            pdfGenerationMethod = 'linked_images';
            
            // Try to upload
            addLog(`Uploading PDF with linked images to ${pdfPath} (final attempt)...`);
            
            try {
              await uploadPdfToStorage(pdfBlob, pdfPath);
              uploadSuccess = true;
              addLog(`Successfully uploaded PDF for defect ${defect.id} using linked images (fallback)`, 'success');
            } catch (uploadError) {
              addLog(`Upload attempt with linked images failed: ${uploadError.message}`, 'error');
            }
          } else {
            addLog(`PDF with linked images still exceeds 50MB limit (${fileSizes.linked.toFixed(2)}MB)`, 'error');
            throw new Error(`Could not generate PDF under 50MB limit`);
          }
        } catch (error) {
          addLog(`Error generating PDF with linked images: ${error.message}`, 'error');
          throw error;
        }
      }
    
      if (!uploadSuccess) {
        throw new Error(`Failed to upload PDF after multiple attempts`);
      }
      
      return { success: true, method: pdfGenerationMethod };
    } catch (error) {
      addLog(`Failed to process defect ${defect.id}: ${error.message}`, 'error');
      console.error(`Error generating PDF for defect ${defect.id}:`, error);
      
      // Add to failed defects list
      setFailedDefects(prev => [
        ...prev,
        { 
          id: defect.id, 
          vesselName: vessels[defect.vessel_id] || 'Unknown',
          error: error.message || 'Unknown error'
        }
      ]);
      
      return { success: false, error: error.message };
    }
  };

  // Function to generate all PDFs
  const generateAllPDFs = async () => {
    if (defects.length === 0) {
      setError('No defects found. Please fetch defects first.');
      return;
    }

    // Check/create folders
    const foldersReady = await ensureFolder();
    if (!foldersReady) {
      setError('Failed to ensure storage folders exist. Check permissions.');
      return;
    }

    setProcessing(true);
    setSuccess('');
    setError(null);
    setLog([]);
    setFailedDefects([]);
    setProgress({
      total: defects.length,
      current: 0,
      success: 0,
      failed: 0
    });
    setGenerationStats({
      withEmbeddedImages: 0,
      withLinkedImages: 0,
      mixedMode: 0
    });

    // First, clean up existing PDF files
    addLog('Preparing to generate PDFs - cleaning up existing files first...');
    const cleanupSuccess = await cleanupExistingPdfs();
    if (!cleanupSuccess) {
      addLog('Continuing despite cleanup issues...', 'warning');
    }

    addLog(`Starting PDF generation for ${defects.length} defects`);

    // Use smaller batch size to avoid overwhelming Supabase
    const batchSize = 2; // Reduced from 3 to 2 for reliability
    let successCount = 0;
    let failCount = 0;
    const methodCounts = {
      embedded_images: 0,
      embedded_compressed: 0,
      mixed_approach: 0,
      linked_images: 0
    };

    for (let i = 0; i < defects.length; i += batchSize) {
      const batch = defects.slice(i, i + batchSize);
      
      // Process batch in sequence instead of parallel for better reliability
      for (const defect of batch) {
        const result = await generatePDFForDefect(defect);
        if (result.success && result.method) {
          methodCounts[result.method] = (methodCounts[result.method] || 0) + 1;
          successCount++;
        } else {
          failCount++;
        }
        
        // Update progress
        setProgress({
          total: defects.length,
          current: i + batch.indexOf(defect) + 1,
          success: successCount,
          failed: failCount
        });
        
        // Add a small delay between each defect in the batch
        if (batch.indexOf(defect) < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < defects.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Update final stats
    setGenerationStats({
      withEmbeddedImages: methodCounts.embedded_images + methodCounts.embedded_compressed,
      withLinkedImages: methodCounts.linked_images,
      mixedMode: methodCounts.mixed_approach
    });

    // Include method counts in the summary
    const summaryMessage = `PDF generation complete. Success: ${successCount} (${methodCounts.embedded_images} with standard embedded images, ${methodCounts.embedded_compressed} with high compression, ${methodCounts.mixed_approach} with mixed approach, ${methodCounts.linked_images} with linked images), Failed: ${failCount}`;
    
    addLog(summaryMessage, 'info');
    setSuccess(summaryMessage);
    setProcessing(false);
  };

  const retryFailedDefects = async () => {
    if (failedDefects.length === 0) {
      setError('No failed defects to retry.');
      return;
    }

    // Check/create folders
    const foldersReady = await ensureFolder();
    if (!foldersReady) {
      setError('Failed to ensure storage folders exist. Check permissions.');
      return;
    }

    setProcessing(true);
    addLog(`Retrying ${failedDefects.length} failed defects...`, 'info');
    
    const failedDefectIds = failedDefects.map(d => d.id);
    const defectsToRetry = defects.filter(d => failedDefectIds.includes(d.id));
    
    let successCount = 0;
    let stillFailed = [];
    const methodCounts = {
      embedded_images: 0,
      embedded_compressed: 0,
      mixed_approach: 0,
      linked_images: 0
    };
    
    // Update progress tracker
    setProgress({
      total: failedDefects.length,
      current: 0,
      success: 0,
      failed: 0
    });
    
    // Process one at a time to maximize chances of success
    for (let i = 0; i < defectsToRetry.length; i++) {
      const result = await generatePDFForDefect(defectsToRetry[i]);
      
      if (result.success) {
        successCount++;
        if (result.method) {
          methodCounts[result.method] = (methodCounts[result.method] || 0) + 1;
        }
        // Remove from failed list if successful
        setFailedDefects(prev => prev.filter(d => d.id !== defectsToRetry[i].id));
      } else {
        stillFailed.push(defectsToRetry[i].id);
      }
      
      // Update progress
      setProgress({
        total: failedDefects.length,
        current: i + 1,
        success: successCount,
        failed: i + 1 - successCount
      });
      
      // Wait between retries
      if (i < defectsToRetry.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Update generation stats
    setGenerationStats(prev => ({
      withEmbeddedImages: prev.withEmbeddedImages + methodCounts.embedded_images + methodCounts.embedded_compressed,
      withLinkedImages: prev.withLinkedImages + methodCounts.linked_images,
      mixedMode: prev.mixedMode + methodCounts.mixed_approach
    }));
    
    const message = `Retry complete. Fixed: ${successCount} (${methodCounts.embedded_images} with standard embedded, ${methodCounts.embedded_compressed} with high compression, ${methodCounts.mixed_approach} with mixed approach, ${methodCounts.linked_images} with linked images), Still failed: ${stillFailed.length}`;
    
    addLog(message, 'info');
    setSuccess(message);
    setProcessing(false);
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

  // Function to download a PDF for a specific defect directly
  const downloadPdf = async (defectId) => {
    try {
      addLog(`Downloading PDF for defect ${defectId}...`);
      
      const { data, error } = await supabase.storage
        .from('defect-files')
        .download(`uploads/defect-reports/${defectId}.pdf`);
        
      if (error) throw error;
      
      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Defect_Report_${defectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLog(`Download successful for defect ${defectId}`, 'success');
    } catch (error) {
      addLog(`Failed to download PDF: ${error.message}`, 'error');
      setError(`Failed to download PDF: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">PDF Report Manager</h2>
        
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <h3 className="text-blue-800 font-medium mb-2">Storage Information</h3>
            <p className="text-blue-700 text-sm">
              PDFs will be saved to the <code className="bg-blue-100 px-1 py-0.5 rounded">uploads/defect-reports</code> folder in the <code className="bg-blue-100 px-1 py-0.5 rounded">defect-files</code> bucket, which has the necessary permissions.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={fetchSampleDefects}
              disabled={loading}
              className={`px-4 py-2 rounded-md shadow-sm text-white font-medium ${
                loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Loading...' : 'Fetch Sample Defects (3)'}
            </button>
            
            <button
              onClick={fetchDefects}
              disabled={loading}
              className={`px-4 py-2 rounded-md shadow-sm text-white font-medium ${
                loading ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? 'Loading...' : 'Fetch All Defects'}
            </button>
            
            <button
              onClick={generateAllPDFs}
              disabled={processing || defects.length === 0}
              className={`px-4 py-2 rounded-md shadow-sm text-white font-medium ${
                processing || defects.length === 0 
                  ? 'bg-green-300' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {processing ? 'Generating...' : 'Generate PDF Reports'}
            </button>
            
            {failedDefects.length > 0 && (
              <button
                onClick={retryFailedDefects}
                disabled={processing}
                className={`px-4 py-2 rounded-md shadow-sm text-white font-medium ${
                  processing ? 'bg-orange-300' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {processing ? 'Processing...' : `Retry Failed (${failedDefects.length})`}
              </button>
            )}
          </div>
          
          {defects.length > 0 && (
            <div className="text-sm text-gray-600">
              Found {defects.length} defects in database.
            </div>
          )}
          
          {processing && (
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-sm text-gray-600">
                <span>Progress: {progress.current} of {progress.total}</span>
                <span>
                  Success: {progress.success} | Failed: {progress.failed}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${Math.min((progress.current / progress.total) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Generation Stats Summary */}
          {!processing && (generationStats.withEmbeddedImages > 0 || generationStats.withLinkedImages > 0 || generationStats.mixedMode > 0) && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Generation Statistics</h3>
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-2 bg-white rounded shadow-sm">
                    <div className="text-xl font-semibold text-blue-600">{generationStats.withEmbeddedImages}</div>
                    <div className="text-sm text-gray-600">With Embedded Images</div>
                  </div>
                  <div className="p-2 bg-white rounded shadow-sm">
                    <div className="text-xl font-semibold text-blue-600">{generationStats.mixedMode}</div>
                    <div className="text-sm text-gray-600">With Mixed Approach</div>
                  </div>
                  <div className="p-2 bg-white rounded shadow-sm">
                    <div className="text-xl font-semibold text-blue-600">{generationStats.withLinkedImages}</div>
                    <div className="text-sm text-gray-600">With Linked Images</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Failed Defects Table */}
          {failedDefects.length > 0 && !processing && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Failed Defects</h3>
              <div className="bg-red-50 p-3 rounded-md overflow-x-auto">
                <table className="min-w-full divide-y divide-red-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Vessel</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Error</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200">
                    {failedDefects.map((item, index) => (
                      <tr key={index} className="text-sm">
                        <td className="px-3 py-2 whitespace-nowrap text-red-900">{item.id}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-red-900">{item.vesselName}</td>
                        <td className="px-3 py-2 text-red-900">{item.error}</td>
                        <td className="px-3 py-2">
                          <button 
                            onClick={() => generatePDFForDefect(defects.find(d => d.id === item.id))}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-800 py-1 px-2 rounded"
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Log display */}
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Processing Log</h3>
            <div className="bg-gray-100 p-3 rounded-md h-64 overflow-y-auto">
              {log.length === 0 ? (
                <div className="text-gray-500">No logs yet. Start processing to see logs.</div>
              ) : (
                log.map((entry, index) => (
                  <div 
                    key={index} 
                    className={`mb-1 text-sm ${
                      entry.type === 'error' 
                        ? 'text-red-600' 
                        : entry.type === 'success' 
                          ? 'text-green-600' 
                          : entry.type === 'warning'
                            ? 'text-orange-600'
                            : 'text-gray-700'
                    }`}
                  >
                    <span className="text-gray-500">[{entry.time}]</span> {entry.message}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Generated PDFs List */}
          {defects.length > 0 && !processing && (generationStats.withEmbeddedImages > 0 || generationStats.withLinkedImages > 0 || generationStats.mixedMode > 0) && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Generated PDFs</h3>
              <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {defects.map((defect, index) => {
                        const isFailedDefect = failedDefects.some(fd => fd.id === defect.id);
                        return (
                          <tr key={index} className={isFailedDefect ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{defect.id}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{vessels[defect.vessel_id] || 'Unknown'}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              {isFailedDefect ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  Failed
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Generated
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              {!isFailedDefect && (
                                <button 
                                  onClick={() => downloadPdf(defect.id)}
                                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded"
                                >
                                  Download
                                </button>
                              )}
                              <button 
                                onClick={() => generatePDFForDefect(defect)}
                                className="text-xs ml-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-1 px-2 rounded"
                              >
                                Regenerate
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfReportManager;
