export const exportToCSV = (data, vesselNames, filters = {}) => {
  try {
    // Apply filters
    let filteredData = [...data];
    
    if (filters.status) {
      filteredData = filteredData.filter(item => 
        item['Status (Vessel)'] === filters.status
      );
    }
    
    if (filters.criticality) {
      filteredData = filteredData.filter(item => 
        item.Criticality === filters.criticality
      );
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredData = filteredData.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(searchLower)
        )
      );
    }

    // Helper function to format date as ddmmyyyy
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Format data for CSV
    const csvData = filteredData.map((item, index) => {
      return {
        'No.': index + 1,
        'Vessel Name': item.vessel_name || vesselNames[item.vessel_id] || '-',
        'Status': item['Status (Vessel)'],
        'Criticality': item.Criticality || '',
        'Equipment': item.Equipments || '',
        'Description': item.Description || '',
        'Action Planned': item['Action Planned'] || '',
        'Date Reported': formatDate(item['Date Reported']),
        'Date Completed': formatDate(item['Date Completed']),
        'Comments': item.Comments || '',
        'Closure Comments': item.closure_comments || '',  
        'Raised By': item.raised_by || ''
      };
    });

    // Convert to CSV string
    const headers = Object.keys(csvData[0]);
    const csvRows = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => {
          let cell = row[header] || '';
          // Escape quotes and commas
          if (cell.toString().includes(',') || cell.toString().includes('"') || cell.toString().includes('\n')) {
            cell = `"${cell.toString().replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
    ];

    // Create and download file
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `defects-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    // You might want to add a toast notification here
  }
};
