# Excel Uploader System

This system provides a robust, scalable solution for uploading and processing Excel files with the following features:

## 🚀 Features

### ✅ Client-Side Validation
- File type validation (.xlsx, .xls)
- File size limits (configurable, default 100MB)
- Real-time validation feedback
- **Smart Empty Row Filtering**: Automatically removes empty rows from Excel files

### ⚡ Web Worker Processing
- Non-blocking UI during file parsing
- Uses XLSX library loaded from CDN
- Processes files in background threads

### 📦 Chunked Uploading
- Configurable chunk sizes (default 1000 rows)
- Prevents overwhelming backend
- Real-time progress tracking

### 🎯 Efficient Backend Processing
- Convex backend with optimized data storage
- Batch processing for large datasets
- Progress tracking and statistics

### 📊 Progress Feedback
- Real-time progress bars
- Detailed statistics (total, processed, pending)
- Status messages and error handling

### 📄 Smart Pagination
- 500 rows per page for optimal performance
- Multiple navigation methods (dropdown, buttons, keyboard)
- Keyboard shortcuts (Ctrl+←/→, Ctrl+Home/End)
- Real-time page information and row counts
- Automatic page reset when data changes
- **Important**: Submit/Save operations process ALL data, not just current page

## 📁 File Structure

```
├── convex/
│   ├── excel.ts                    # Backend functions for Excel processing
│   └── schema.ts                   # Database schema (Excel tables added)
├── public/
│   └── workers/
│       └── excelParser.js          # Web worker for Excel parsing
├── components/
│   ├── ExcelUploader.tsx           # Main uploader component
│   └── ExcelUploaderDemo.tsx       # Demo/example usage
└── app/(site)/reform_champion/reports/fill/[fillId]/page.tsx  # Enhanced existing form
```

## 🛠️ Database Schema

The system adds two new tables to your Convex schema:

### `excelData` Table
```typescript
excelData: defineTable({
  data: v.any(),                    // Raw Excel row data
  headers: v.array(v.string()),     // Column headers from Excel
  chunkIndex: v.number(),           // Which chunk this data belongs to
  batchId: v.string(),              // Unique identifier for the upload batch
  templateId: v.optional(v.id("report_templates")), // Reference to report template
  uploadedAt: v.number(),           // When this chunk was uploaded
  processed: v.boolean(),           // Whether this data has been processed
})
```

### `processedExcelData` Table
```typescript
processedExcelData: defineTable({
  originalData: v.any(),            // Original Excel data
  processedAt: v.number(),          // When this data was processed
  batchId: v.string(),              // Reference to the original batch
  templateId: v.optional(v.id("report_templates")), // Reference to report template
})
```

## 🎯 Usage Examples

### Basic Usage

```tsx
import ExcelUploader from '@/components/ExcelUploader';

function MyComponent() {
  const handleUploadComplete = (batchId: string, processedData: any[]) => {
    console.log('Upload completed:', batchId, processedData);
  };

  return (
    <ExcelUploader
      onUploadComplete={handleUploadComplete}
      templateId="your_template_id"
      maxFileSize={50 * 1024 * 1024} // 50MB
      chunkSize={500}
      showStats={true}
    />
  );
}
```

### Pagination Features

The system automatically implements pagination when data exceeds 500 rows:

- **Automatic Detection**: Pagination appears when data > 500 rows
- **Multiple Navigation Methods**:
  - Dropdown selector for direct page access
  - Arrow buttons for sequential navigation
  - First/Last page buttons
  - Keyboard shortcuts (Ctrl+←/→, Ctrl+Home/End)
- **Real-time Information**: Shows current page, total pages, and row range
- **Performance Optimized**: Only renders current page data for smooth scrolling
- **Complete Data Submission**: Submit/Save operations include ALL data across all pages

```tsx
// Pagination state is automatically managed
const [currentPage, setCurrentPage] = useState(1);
const [rowsPerPage] = useState(500);
const [totalPages, setTotalPages] = useState(1);

// Get current page data (for display only)
const getCurrentPageData = () => {
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  return formData.slice(startIndex, endIndex);
};

// Submit/Save operations use the complete formData array
const handleSubmit = async () => {
  // This submits ALL data, not just current page
  await submitReport({
    templateId: template._id,
    data: formData, // Complete dataset
    // ... other fields
  });
};
```

### Integration with Existing Report System

The existing report form has been enhanced to use the new web worker approach with **optimized AI header matching**:

```tsx
// In your report form component
const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !template) return;

  // Step 1: Parse Excel file once to get headers
  const excelData = await parseExcelFile(file);
  const excelHeaders = Object.keys(excelData[0] || {});
  
  // Step 2: Use AI to match headers ONCE (not per chunk)
  const aiResult = await matchHeadersWithAI({
    excelHeaders,
    templateHeaders: template.headers
  });
  
  const { headerMapping } = aiResult;
  
  // Step 3: Create web worker for processing data (no more AI calls)
  const worker = new Worker('/workers/excelParser.js');
  
  worker.onmessage = async (event) => {
    const { type, data } = event.data;
    
    if (type === 'chunk') {
      // Process chunk using pre-matched headers (no AI calls)
      const processedData = processChunkData(data.rows, headerMapping);
      setFormData(prev => [...prev, ...processedData]);
      
      // Request next chunk
      worker.postMessage({ type: 'nextChunk' });
    }
    else if (type === 'complete') {
      worker.terminate();
      toast.success('Upload complete!');
    }
  };

  // Start processing with pre-matched headers
  worker.postMessage({ 
    type: 'start', 
    file,
    chunkSize: 50,
    batchId: `batch_${Date.now()}`,
    headerMapping: headerMapping // Pass pre-matched headers
  });
};
```

**Key Optimization**: AI header matching now happens **only once** at the beginning, not per chunk. This dramatically improves performance and reduces AI costs.

## 🔧 Configuration Options

### ExcelUploader Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onUploadComplete` | `(batchId: string, data: any[]) => void` | - | Callback when upload completes |
| `maxFileSize` | `number` | `100 * 1024 * 1024` | Maximum file size in bytes |
| `allowedExtensions` | `string[]` | `['.xlsx', '.xls']` | Allowed file extensions |
| `chunkSize` | `number` | `1000` | Number of rows per chunk |
| `showStats` | `boolean` | `true` | Show upload statistics |
| `templateId` | `string` | - | Template ID for data association |
| `className` | `string` | `""` | Additional CSS classes |

### Backend Functions

#### `uploadChunk`
Uploads a chunk of Excel data to the database.

#### `processBatch`
Processes a complete batch of uploaded data.

#### `getUploadStats`
Gets statistics for a specific batch or all uploads.

#### `getBatchData`
Retrieves data for a specific batch with pagination.

#### `processLargeBatch`
Processes very large batches in the background.

## 🚀 Performance Features

### Web Worker Benefits
- **Non-blocking UI**: File parsing happens in background
- **Better responsiveness**: Main thread stays free
- **Large file support**: Can handle files up to 100MB+

### Chunked Processing
- **Memory efficient**: Processes data in small chunks
- **Progress tracking**: Real-time feedback on processing
- **Error recovery**: Can resume from failed chunks
- **Scalable**: Handles datasets of any size

### Backend Optimization
- **Batch operations**: Efficient database operations
- **Indexed queries**: Fast data retrieval
- **Progress tracking**: Real-time status updates

## 🔒 Security & Validation

### Client-Side Validation
- File type checking
- File size limits
- Extension validation

### Smart Empty Row Filtering
The system automatically detects and filters out empty rows from Excel files:

```typescript
// Empty row detection logic
const filteredRows = rows.filter(row => {
  return Object.values(row).some(value => {
    if (value === null || value === undefined) return false;
    const valueStr = String(value).trim();
    return valueStr.length > 0;
  });
});
```

**Benefits:**
- **Accurate Row Counts**: Only processes rows with actual data
- **Performance**: Reduces processing time by skipping empty rows
- **User Feedback**: Shows how many empty rows were filtered out
- **Handles Excel Deletions**: Works correctly when users delete rows in Excel

### Backend Validation
- Data type validation
- Malicious file detection
- Rate limiting (can be added)

## 📈 Monitoring & Analytics

### Upload Statistics
- Total rows processed
- Processing time
- Success/failure rates
- Batch completion status

### Progress Tracking
- Real-time progress bars
- Chunk-by-chunk updates
- Error reporting
- Completion notifications

## 🛠️ Customization

### Custom Data Processing
You can extend the system by modifying the `processBatch` function:

```typescript
// In convex/excel.ts
export const processBatch = mutation({
  args: { batchId: v.string(), templateId: v.optional(v.id("report_templates")) },
  handler: async (ctx, args) => {
    const batchData = await ctx.db
      .query("excelData")
      .filter(q => q.eq(q.field("batchId"), args.batchId))
      .collect();
    
    for (const item of batchData) {
      // Add your custom processing logic here
      await ctx.db.insert("processedExcelData", {
        originalData: item.data,
        processedAt: Date.now(),
        batchId: item.batchId,
        templateId: args.templateId,
        // Add custom fields based on your needs
        customField: processCustomData(item.data),
      });
      
      await ctx.db.patch(item._id, { processed: true });
    }
    
    return { processed: batchData.length };
  },
});
```

### Custom UI Components
The `ExcelUploader` component is fully customizable with props and can be styled to match your design system.

## 🐛 Troubleshooting

### Common Issues

1. **Web Worker not loading**
   - Ensure `/public/workers/excelParser.js` exists
   - Check browser console for errors

2. **Large file uploads failing**
   - Increase `maxFileSize` prop
   - Reduce `chunkSize` for better memory management

3. **Progress not updating**
   - Check that `showStats` prop is true
   - Verify Convex queries are working

4. **Data not processing**
   - Check Convex function logs
   - Verify database schema is deployed

### Debug Mode
Add debug logging to the web worker:

```javascript
// In public/workers/excelParser.js
self.onmessage = async (event) => {
  console.log('Worker received message:', event.data);
  // ... rest of the code
};
```

## 📚 API Reference

### Web Worker Messages

#### From Main Thread to Worker
```typescript
{
  type: 'start',
  file: File,
  chunkSize: number,
  batchId: string
}

{
  type: 'nextChunk'
}

{
  type: 'cancel'
}
```

#### From Worker to Main Thread
```typescript
{
  type: 'progress',
  data: {
    total: number,
    processed: number,
    status: string,
    message: string
  }
}

{
  type: 'chunk',
  data: {
    rows: any[],
    chunkIndex: number,
    total: number,
    batchId: string,
    headers: string[],
    processed: number
  }
}

{
  type: 'complete',
  data: {
    totalRows: number,
    batchId: string,
    message: string
  }
}

{
  type: 'error',
  data: {
    message: string,
    error: string
  }
}
```

## 🎉 Getting Started

1. **Deploy the schema changes** to Convex
2. **Add the web worker file** to your public directory
3. **Import and use the ExcelUploader component**
4. **Configure the uploader** with your specific requirements
5. **Test with sample Excel files**

The system is now ready to handle Excel uploads efficiently and scalably!
