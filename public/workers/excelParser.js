// Excel Parser Web Worker
// This worker handles Excel file parsing without blocking the main UI thread

// Load XLSX library from CDN
importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

let currentBatchId = null;
let totalRows = 0;
let currentIndex = 0;
let chunkIndex = 0;
let chunkSize = 1000;
let headers = [];
let rows = [];

self.onmessage = async (event) => {
  const { type, file, chunkSize: newChunkSize, batchId } = event.data;
  
  if (type === 'start') {
    try {
      currentBatchId = batchId || `batch_${Date.now()}`;
      chunkSize = newChunkSize || 1000;
      currentIndex = 0;
      chunkIndex = 0;
      
      // Read the file as array buffer
      const arrayBuffer = await readFileAsArrayBuffer(file);
      
      // Parse Excel file
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      headers = data[0] || [];
      
      // Filter out empty rows (rows with no meaningful data)
      rows = data.slice(1).filter(row => {
        // Check if row has any non-empty, non-whitespace values
        return row.some(cell => {
          if (cell === null || cell === undefined) return false;
          const cellStr = String(cell).trim();
          return cellStr.length > 0;
        });
      });
      
      totalRows = rows.length;
      
      // Send total rows info
      const originalRowCount = data.length - 1; // Subtract header row
      const emptyRowsFiltered = originalRowCount - totalRows;
      
      let message = `Parsed ${totalRows} rows from Excel file`;
      if (emptyRowsFiltered > 0) {
        message += ` (filtered out ${emptyRowsFiltered} empty rows)`;
      }
      
      self.postMessage({ 
        type: 'progress', 
        data: { 
          total: totalRows, 
          processed: 0,
          status: 'parsing',
          message: message
        } 
      });
      
      // Start processing chunks
      processNextChunk();
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        data: { 
          message: error.message || 'Failed to parse Excel file',
          error: error.toString()
        }
      });
    }
  }
  else if (type === 'nextChunk') {
    processNextChunk();
  }
  else if (type === 'cancel') {
    // Reset state
    currentIndex = 0;
    chunkIndex = 0;
    totalRows = 0;
    headers = [];
    rows = [];
    currentBatchId = null;
  }
};

function processNextChunk() {
  if (currentIndex >= totalRows) {
    self.postMessage({ 
      type: 'complete', 
      data: { 
        totalRows,
        batchId: currentBatchId,
        message: 'All chunks processed successfully'
      } 
    });
    return;
  }
  
  const chunk = rows.slice(currentIndex, currentIndex + chunkSize);
  const chunkWithHeaders = chunk.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      // Clean header name and handle empty headers
      const cleanHeader = header ? header.toString().trim() : `Column_${index + 1}`;
      obj[cleanHeader] = row[index] || '';
    });
    return obj;
  });
  
  self.postMessage({
    type: 'chunk',
    data: {
      rows: chunkWithHeaders,
      chunkIndex: chunkIndex++,
      total: totalRows,
      batchId: currentBatchId,
      headers: headers,
      processed: currentIndex + chunk.length
    }
  });
  
  currentIndex += chunkSize;
  
  // Send progress update
  self.postMessage({
    type: 'progress',
    data: {
      total: totalRows,
      processed: Math.min(currentIndex, totalRows),
      status: 'uploading',
      message: `Processing chunk ${chunkIndex} of ${Math.ceil(totalRows / chunkSize)}`
    }
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
