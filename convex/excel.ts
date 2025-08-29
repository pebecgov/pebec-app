import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const uploadChunk = mutation({
  args: {
    data: v.array(v.any()),
    chunkIndex: v.number(),
    batchId: v.optional(v.string()),
    headers: v.optional(v.array(v.string())),
    templateId: v.optional(v.id("report_templates")),
  },
  handler: async (ctx, args) => {
    const { data, chunkIndex, batchId, headers, templateId } = args;
    
    // Process each row in the chunk
    for (const row of data) {
      // Validate row data if needed
      if (!row || typeof row !== 'object') {
        continue; // Skip invalid rows
      }
      
      // Insert into database
      await ctx.db.insert("excelData", {
        data: row,
        headers: headers || [],
        chunkIndex,
        batchId: batchId || `batch_${Date.now()}`,
        templateId: templateId || undefined,
        uploadedAt: Date.now(),
        processed: false,
      });
    }
    
    return { success: true, processed: data.length };
  },
});

export const processBatch = mutation({
  args: {
    batchId: v.string(),
    templateId: v.optional(v.id("report_templates")),
  },
  handler: async (ctx, args) => {
    const { batchId, templateId } = args;
    
    // Get all data for this batch
    const batchData = await ctx.db
      .query("excelData")
      .filter(q => q.eq(q.field("batchId"), batchId))
      .collect();
    
    // Process each item (you can add your business logic here)
    for (const item of batchData) {
      // Example: Transform and store in a more structured table
      await ctx.db.insert("processedExcelData", {
        originalData: item.data,
        processedAt: Date.now(),
        batchId: item.batchId,
        templateId: templateId || item.templateId,
        // Add your specific fields based on the Excel structure
        // For example:
        // name: item.data.name,
        // email: item.data.email,
        // phone: item.data.phone,
      });
      
      // Mark as processed
      await ctx.db.patch(item._id, { processed: true });
    }
    
    return { processed: batchData.length };
  },
});

export const getUploadStats = query({
  args: {
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { batchId } = args;
    
    let query = ctx.db.query("excelData");
    
    if (batchId) {
      query = query.filter(q => q.eq(q.field("batchId"), batchId));
    }
    
    const allData = await query.collect();
    
    const totalRows = allData.length;
    const processedRows = allData.filter(item => item.processed).length;
    const pendingRows = totalRows - processedRows;
    
    return {
      totalRows,
      processedRows,
      pendingRows,
      progress: totalRows > 0 ? (processedRows / totalRows) * 100 : 0,
    };
  },
});

export const getBatchData = query({
  args: {
    batchId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { batchId, limit = 50, offset = 0 } = args;
    
    const data = await ctx.db
      .query("excelData")
      .filter(q => q.eq(q.field("batchId"), batchId))
      .order("desc")
      .paginate({ numItems: limit, cursor: null });
    
    return data;
  },
});

// Function to get processed data for a specific template
export const getProcessedDataForTemplate = query({
  args: {
    templateId: v.id("report_templates"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { templateId, limit = 100, offset = 0 } = args;
    
    const data = await ctx.db
      .query("processedExcelData")
      .filter(q => q.eq(q.field("templateId"), templateId))
      .order("desc")
      .paginate({ numItems: limit, cursor: null });
    
    return data;
  },
});

// Function for processing very large batches in the background
export const processLargeBatch = mutation({
  args: {
    batchId: v.string(),
    startIndex: v.number(),
    endIndex: v.number(),
    templateId: v.optional(v.id("report_templates")),
  },
  handler: async (ctx, args) => {
    const { batchId, startIndex, endIndex, templateId } = args;
    
    // Get the raw data for this batch range
    const batchData = await ctx.db
      .query("excelData")
      .filter(q => q.eq(q.field("batchId"), batchId))
      .order("asc")
      .collect();
    
    // Apply range filtering in memory
    const rangeData = batchData.slice(startIndex, endIndex);
    
    // Process each item in the batch
    for (const item of rangeData) {
      // Transform and store in processed table
      await ctx.db.insert("processedExcelData", {
        originalData: item.data,
        processedAt: Date.now(),
        batchId: item.batchId,
        templateId: templateId || item.templateId,
      });
      
      // Mark as processed
      await ctx.db.patch(item._id, { processed: true });
    }
    
    return { processed: batchData.length };
  },
});

// Function to get batch processing status
export const getBatchStatus = query({
  args: {
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const { batchId } = args;
    
    const allBatchData = await ctx.db
      .query("excelData")
      .filter(q => q.eq(q.field("batchId"), batchId))
      .collect();
    
    const totalItems = allBatchData.length;
    const processedItems = allBatchData.filter(item => item.processed).length;
    const pendingItems = totalItems - processedItems;
    
    return {
      batchId,
      totalItems,
      processedItems,
      pendingItems,
      progress: totalItems > 0 ? (processedItems / totalItems) * 100 : 0,
      isComplete: pendingItems === 0,
    };
  },
});
