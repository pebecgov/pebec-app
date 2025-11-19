/**
 * Script to transform export_import_facilitation Excel file to correct format
 * 
 * Transforms from:
 * - Column A: State
 * - Column B: Combined "export_imp total_numb" or "export_imp state_cham"
 * - Column C: Numeric values (0, 1, 2, 3)
 * - Column D: Link to Source (optional)
 * 
 * To:
 * - Column A: State
 * - Column B: Indicator Key ("export_import_facilitation")
 * - Column C: SubIndicator Key ("totalExporters_perState" or "StateChamberOfCommerce")
 * - Column D: Value (">=1000", "500-999", "100-499", "0-99", "yes", "no")
 * - Column E: Link to Source (optional)
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const inputFilePath = '/Users/david/Downloads/export_import_facilitation_scores.xlsx';
const outputFilePath = '/Users/david/Downloads/export_import_facilitation_scores_fixed.xlsx';

// Value mapping for totalExporters_perState
const exporterValueMap: Record<number, string> = {
  3: '>=1000',
  2: '500-999',
  1: '100-499',
  0: '0-99'
};

// Value mapping for StateChamberOfCommerce
const chamberValueMap: Record<number, string> = {
  1: 'yes',
  0: 'no'
};

function transformExcelFile() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(inputFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read all rows
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    if (rows.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row');
    }

    console.log(`Found ${rows.length - 1} data rows`);
    
    // Transform rows
    const transformedRows: any[][] = [];
    
    // Check if Link to Source column exists (check first data row)
    const firstDataRow = rows[1] || [];
    const hasLinkColumn = firstDataRow.length > 4 && (firstDataRow[4] || '').toString().trim() !== '';
    
    // Add header row (only include Link to Source if it exists)
    const headers = ['State', 'Indicator Key', 'SubIndicator Key', 'Value'];
    if (hasLinkColumn) {
      headers.push('Link to Source');
    }
    transformedRows.push(headers);

    let transformedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row || row.every((cell: any) => !cell || String(cell).trim() === '')) {
        skippedCount++;
        continue;
      }

      const state = String(row[0] || '').trim();
      const combinedIndicator = String(row[1] || '').trim();
      const numericValue = row[2] !== undefined && row[2] !== null ? Number(row[2]) : null;
      // Link to Source is in column 4 (index 4) if it exists, otherwise empty
      const linkToSource = row.length > 4 && row[4] ? String(row[4]).trim() : '';

      if (!state || !combinedIndicator || numericValue === null) {
        console.warn(`Skipping row ${i + 1}: Missing required data`);
        skippedCount++;
        continue;
      }

      // Parse the combined indicator - handle multiple formats
      let subIndicator: string;
      let value: string;

      // Check if it's already in the correct format (has sub-indicator in column 2)
      if (combinedIndicator === 'export_import_facilitation') {
        // Format: Column B = indicator, Column C = sub-indicator (need to check column C)
        const subIndicatorFromFile = String(row[2] || '').trim();
        const valueFromFile = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : '';
        
        if (subIndicatorFromFile === 'totalExporters_perState' || subIndicatorFromFile === 'total_numb' || subIndicatorFromFile.includes('total')) {
          subIndicator = 'totalExporters_perState';
          // Try to parse value - could be numeric or string
          const numValue = isNaN(Number(valueFromFile)) ? null : Number(valueFromFile);
          if (numValue !== null) {
            value = exporterValueMap[numValue] || valueFromFile;
          } else {
            value = valueFromFile; // Already a string like ">=1000"
          }
        } else if (subIndicatorFromFile === 'StateChamberOfCommerce' || subIndicatorFromFile === 'state_cham' || subIndicatorFromFile.includes('cham')) {
          subIndicator = 'StateChamberOfCommerce';
          const numValue = isNaN(Number(valueFromFile)) ? null : Number(valueFromFile);
          if (numValue !== null) {
            value = chamberValueMap[numValue] || valueFromFile;
          } else {
            value = valueFromFile; // Already a string like "yes"
          }
        } else {
          console.warn(`Row ${i + 1}: Unknown sub-indicator "${subIndicatorFromFile}"`);
          skippedCount++;
          continue;
        }
      } else if (combinedIndicator.includes('total_numb')) {
        subIndicator = 'totalExporters_perState';
        value = exporterValueMap[numericValue] || '';
        
        if (!value) {
          console.warn(`Row ${i + 1}: Unknown numeric value ${numericValue} for total_numb`);
          skippedCount++;
          continue;
        }
      } else if (combinedIndicator.includes('state_cham')) {
        subIndicator = 'StateChamberOfCommerce';
        value = chamberValueMap[numericValue] || '';
        
        if (!value) {
          console.warn(`Row ${i + 1}: Unknown numeric value ${numericValue} for state_cham`);
          skippedCount++;
          continue;
        }
      } else {
        // Debug: print first few rows to understand structure
        if (i <= 5) {
          console.log(`Row ${i + 1} structure:`, {
            state,
            col1: row[0],
            col2: row[1],
            col3: row[2],
            col4: row[3],
            col5: row[4]
          });
        }
        console.warn(`Row ${i + 1}: Unknown indicator type "${combinedIndicator}"`);
        skippedCount++;
        continue;
      }

      // Create transformed row (only include Link to Source if it exists)
      const transformedRow: any[] = [
        state,
        'export_import_facilitation',
        subIndicator,
        value
      ];
      if (hasLinkColumn) {
        transformedRow.push(linkToSource);
      }
      transformedRows.push(transformedRow);

      transformedCount++;
    }

    console.log(`\nTransformation complete:`);
    console.log(`  - Transformed: ${transformedCount} rows`);
    console.log(`  - Skipped: ${skippedCount} rows`);
    console.log(`  - Total output rows: ${transformedRows.length - 1} (excluding header)`);

    // Create new workbook
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.aoa_to_sheet(transformedRows);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // State
      { wch: 30 }, // Indicator Key
      { wch: 30 }, // SubIndicator Key
      { wch: 15 }  // Value
    ];
    if (hasLinkColumn) {
      colWidths.push({ wch: 30 }); // Link to Source
    }
    newWorksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');

    // Write to file
    XLSX.writeFile(newWorkbook, outputFilePath);
    
    console.log(`\n✅ Transformed file saved to: ${outputFilePath}`);
    console.log('\nThe file is now ready for bulk import!');
    
  } catch (error) {
    console.error('Error transforming Excel file:', error);
    process.exit(1);
  }
}

// Run the transformation
transformExcelFile();

