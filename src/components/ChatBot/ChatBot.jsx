import React, { useState } from 'react';
import { MessageCircle, X, FileDown } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const ChatBot = ({ data, vesselName, filters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    try {
      setLoading(true);
      
      // Create PDF document in landscape orientation
      const pdfDoc = await PDFDocument.create();
      let currentPage = pdfDoc.addPage([842, 595]); // A4 landscape
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Page margins and dimensions
      const margin = {
        top: 540,
        left: 20,
        right: 20,
        bottom: 20
      };
      const pageWidth = 842 - margin.left - margin.right;

      // Draw header section
      currentPage.drawText('Defects List', {
        x: margin.left,
        y: margin.top,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Draw vessel and date info
      currentPage.drawText(`Vessel: ${vesselName}`, {
        x: margin.left,
        y: margin.top - 30,
        size: 12,
        font: helveticaFont,
      });

      currentPage.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: margin.left,
        y: margin.top - 50,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Table configuration
      const tableConfig = {
        startY: margin.top - 90,
        columns: [
          { header: '#', width: 40 },
          { header: 'Status', width: 80 },
          { header: 'Equipment', width: 120 },
          { header: 'Description', width: 180 },
          { header: 'Action Planned', width: 180 },
          { header: 'Criticality', width: 70 },
          { header: 'Reported', width: 70 },
          { header: 'Completed', width: 70 }
        ],
        lineHeight: 25,
      };

      // Draw table header
      currentPage.drawRectangle({
        x: margin.left,
        y: tableConfig.startY - 5,
        width: pageWidth,
        height: 30,
        color: rgb(0.95, 0.95, 0.95),
      });

      let currentX = margin.left;
      tableConfig.columns.forEach(column => {
        currentPage.drawText(column.header, {
          x: currentX + 5,
          y: tableConfig.startY,
          size: 10,
          font: boldFont,
        });
        currentX += column.width;
      });

      // Draw table content
      let currentY = tableConfig.startY - tableConfig.lineHeight;

      // Draw separator line after header
      currentPage.drawLine({
        start: { x: margin.left, y: tableConfig.startY - 8 },
        end: { x: margin.left + pageWidth, y: tableConfig.startY - 8 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      // Process each row
      data.forEach((item, index) => {
        // Add new page if needed
        if (currentY < margin.bottom + 30) {
          currentPage = pdfDoc.addPage([842, 595]);
          currentY = tableConfig.startY;
        }

        // Draw alternating row background
        if (index % 2 === 0) {
          currentPage.drawRectangle({
            x: margin.left,
            y: currentY - 5,
            width: pageWidth,
            height: tableConfig.lineHeight,
            color: rgb(0.97, 0.97, 0.97),
          });
        }

        // Prepare row data
        const rowData = [
          (index + 1).toString(),
          item['Status (Vessel)'] || '-',
          item.Equipments || '-',
          item.Description || '-',
          item['Action Planned'] || '-',
          item.Criticality || '-',
          item['Date Reported'] ? new Date(item['Date Reported']).toLocaleDateString() : '-',
          item['Date Completed'] ? new Date(item['Date Completed']).toLocaleDateString() : '-',
        ];

        // Draw row data
        currentX = margin.left;
        tableConfig.columns.forEach((column, colIndex) => {
          const text = rowData[colIndex];
          const maxWidth = column.width - 10;
          let displayText = text.toString();

          // Handle text overflow
          if (helveticaFont.widthOfTextAtSize(displayText, 9) > maxWidth) {
            displayText = displayText.slice(0, 20) + '...';
          }

          currentPage.drawText(displayText, {
            x: currentX + 5,
            y: currentY,
            size: 9,
            font: helveticaFont,
          });
          currentX += column.width;
        });

        // Draw row separator
        currentPage.drawLine({
          start: { x: margin.left, y: currentY - 8 },
          end: { x: margin.left + pageWidth, y: currentY - 8 },
          thickness: 0.5,
          color: rgb(0.9, 0.9, 0.9),
        });

        currentY -= tableConfig.lineHeight;
      });

      // Draw footer
      currentPage.drawText('Generated by Defects Manager', {
        x: 842/2 - 70, // Centered
        y: margin.bottom + 10,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Generate and download PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `defects-report-${vesselName}-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setLoading(false);
      setIsOpen(false); // Close chat after successful download
    } catch (error) {
      console.error('Error generating PDF:', error);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 p-3 rounded-full bg-orange-500 text-white shadow-lg 
        hover:bg-orange-600 transition-all ${isOpen ? 'scale-0' : 'scale-100'} z-50`}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Ask AI</span>
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-80 bg-[#132337] rounded-lg shadow-xl border border-white/10 z-50">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Ask AI</h3>
                <p className="text-xs text-white/60">Report Generator</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Content */}
          <div className="p-4">
            <div className="mb-4">
              <p className="text-sm text-white/80 mb-2">
                Hello! I can help you generate a PDF report of your defects list.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={generatePDF}
              disabled={loading}
              className="w-full py-2 px-4 bg-orange-500 text-white text-sm rounded-md
              hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
            >
              {loading ? (
                'Generating PDF...'
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Generate Defects Report
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
