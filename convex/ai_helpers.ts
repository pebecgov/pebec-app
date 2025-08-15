// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  console.error("❌ GOOGLE_GENAI_API_KEY is missing from environment variables");
  throw new Error("GOOGLE_GENAI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenAI({
  apiKey: apiKey,
});

export const matchExcelHeadersWithTemplate = action({
  args: {
    excelHeaders: v.array(v.string()),
    templateHeaders: v.array(v.object({
      name: v.string(),
      type: v.union(v.literal("text"), v.literal("number"), v.literal("textarea"), v.literal("dropdown"), v.literal("checkbox"), v.literal("date")),
      options: v.optional(v.array(v.string()))
    })),
    excelData: v.array(v.any()),
    existingFormData: v.array(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    try {
      const { excelHeaders, templateHeaders, excelData, existingFormData } = args;

      // Create a prompt for Gemini AI to match headers
      const prompt = `
You are an expert at matching Excel column headers with template headers. Your task is to analyze the Excel headers and map them to the most appropriate template headers.

Template Headers:
${templateHeaders.map((header, index) => `${index + 1}. ${header.name} (Type: ${header.type})`).join('\n')}

Excel Headers:
${excelHeaders.map((header, index) => `${index + 1}. ${header}`).join('\n')}

Instructions:
1. For each Excel header, find the most similar template header
2. Consider synonyms, abbreviations, and common variations
3. If no good match is found, return null for that header
4. Return the mapping as a JSON object where keys are Excel headers and values are template header names

Examples of good matches:
- "Service" → "SERVICE PROVIDED"
- "Date" → "DATE OF SUBMISSION"
- "Timeline" → "EXPECTED TIMELINE"
- "Status" → "STATUS"
- "Notes" → "NOTES"

Return only the JSON object, no additional text.
`;

             // Add retry logic for rate limiting and service overload
       let result;
       let retries = 0;
       const maxRetries = 5;
       
       while (retries < maxRetries) {
         try {
           result = await genAI.models.generateContent({
             model: "gemini-1.5-flash",
             contents: [{ text: prompt }]
           });
           break; // Success, exit retry loop
         } catch (error: any) {
           if ((error?.error?.code === 429 || error?.error?.code === 503) && retries < maxRetries - 1) {
             // Rate limited or service overloaded, wait and retry
             retries++;
             const waitTime = 3000 * retries; // Exponential backoff: 3s, 6s, 9s, 12s
             console.log(`AI service busy (${error?.error?.code}), retrying in ${waitTime/1000}s... (attempt ${retries}/${maxRetries})`);
             await new Promise(resolve => setTimeout(resolve, waitTime));
             continue;
           }
           throw error; // Re-throw if not retryable error or max retries reached
         }
       }
      
      if (!result?.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0]) {
        throw new Error("No response generated from AI");
      }
      
      const text = result.candidates[0].content.parts[0].text || "";

      // Parse the AI response to get the header mapping
      let headerMapping: Record<string, string> = {};
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          headerMapping = JSON.parse(jsonMatch[0]);
        } else {
          headerMapping = JSON.parse(text);
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        throw new Error("Failed to parse AI header mapping response");
      }

      // Process the Excel data using the header mapping
      const processedData: string[][] = [];

      excelData.forEach((excelRow: any) => {
        const newFormRow: string[] = templateHeaders.map(() => "");

        templateHeaders.forEach((templateHeader, colIndex) => {
          // Skip EXPECTED TIMELINE column as it's automatically calculated
          if (templateHeader.name === "EXPECTED TIMELINE") {
            newFormRow[colIndex] = ""; // Leave empty for automatic calculation
            return;
          }

          // Find the Excel header that maps to this template header
          const mappedExcelHeader = Object.keys(headerMapping).find(
            excelHeader => headerMapping[excelHeader] === templateHeader.name
          );

          if (mappedExcelHeader && excelRow[mappedExcelHeader] !== undefined) {
            const excelValue = excelRow[mappedExcelHeader];
            let processedValue = String(excelValue || '');

            // Process the value based on the template header type
            if (excelValue !== undefined && excelValue !== null) {
              switch (templateHeader.type) {
                case "number":
                  processedValue = String(parseFloat(excelValue) || 0);
                  break;
                case "checkbox":
                  processedValue = (String(excelValue).toLowerCase() === 'true' || 
                                  String(excelValue) === '1' || 
                                  String(excelValue).toLowerCase() === 'yes') ? "true" : "false";
                  break;
                case "date":
                  if (typeof excelValue === 'number') {
                    // Handle Excel date numbers
                    const date = new Date(Math.round((excelValue - 25569) * 86400 * 1000));
                    processedValue = date.toISOString().split('T')[0];
                  } else {
                    const date = new Date(excelValue);
                    if (!isNaN(date.getTime())) {
                      processedValue = date.toISOString().split('T')[0];
                    } else {
                      processedValue = '';
                    }
                  }
                  break;
                default:
                  processedValue = String(excelValue);
                  break;
              }
            }
            newFormRow[colIndex] = processedValue;
          }
        });

        processedData.push(newFormRow);
      });

      // AI-powered duplicate detection with existing form data
      const duplicateAnalysis = await analyzeDuplicates(processedData, templateHeaders, existingFormData);
      
      return {
        success: true,
        headerMapping,
        processedData,
        matchedHeaders: Object.keys(headerMapping),
        unmatchedTemplateHeaders: templateHeaders
          .map(h => h.name)
          .filter(name => name !== "EXPECTED TIMELINE" && !Object.values(headerMapping).includes(name)),
        duplicateAnalysis
      };

    } catch (error: any) {
      console.error("AI header matching error:", error);
      
      // Handle specific error types
      let errorMessage = "Unknown error occurred";
      
             if (error?.error?.code === 429) {
         errorMessage = "Rate limit exceeded. Please wait a moment and try again, or upgrade your Google AI plan.";
       } else if (error?.error?.code === 503) {
         errorMessage = "AI service is temporarily overloaded. Please wait a moment and try again.";
       } else if (error?.error?.code === 400) {
         errorMessage = "Invalid request to AI service. Please check your data format.";
       } else if (error?.error?.code === 401) {
         errorMessage = "AI API key is invalid or expired. Please check your configuration.";
       } else if (error?.error?.code === 403) {
         errorMessage = "Access denied to AI service. Please check your API key permissions.";
       } else if (error?.message) {
         errorMessage = error.message;
       }
      
      return {
        success: false,
        error: errorMessage,
        headerMapping: {},
        processedData: [],
        matchedHeaders: [],
        unmatchedTemplateHeaders: []
      };
    }
  },
});

// AI-powered duplicate detection function
async function analyzeDuplicates(processedData: string[][], templateHeaders: any[], existingFormData: string[][]) {
  try {
    // Create a prompt for AI to analyze duplicates
    const newDataSample = processedData.slice(0, 5).map((row, index) => {
      const rowData = templateHeaders.map((header, colIndex) => 
        `${header.name}: "${row[colIndex] || ''}"`
      ).join(', ');
      return `New Row ${index + 1}: {${rowData}}`;
    }).join('\n');

    const existingDataSample = existingFormData.slice(0, 5).map((row, index) => {
      const rowData = templateHeaders.map((header, colIndex) => 
        `${header.name}: "${row[colIndex] || ''}"`
      ).join(', ');
      return `Existing Row ${index + 1}: {${rowData}}`;
    }).join('\n');

    const prompt = `
Analyze this data and identify potential duplicate records. You need to check for duplicates in TWO scenarios:

1. DUPLICATES WITHIN THE NEW EXCEL FILE: Check if there are duplicate rows within the new Excel data itself
2. DUPLICATES WITH EXISTING FORM DATA: Check if any new Excel rows duplicate existing form data

NEW Excel Data Sample:
${newDataSample}

EXISTING Form Data Sample:
${existingDataSample}

Template Headers: ${templateHeaders.map(h => h.name).join(', ')}

Instructions:
1. FIRST: Check for duplicates within the NEW Excel data itself
2. SECOND: Check for duplicates between NEW Excel data and EXISTING form data
3. Identify which fields are most important for determining uniqueness
4. Consider business logic (e.g., same person, same service, same date = duplicate)
5. Return a JSON object with:
   - "uniqueFields": array of field names that should be used for duplicate detection
   - "duplicateLogic": description of how to identify duplicates
   - "internalDuplicates": array of duplicate row indices within the new Excel file (0-based)
   - "externalDuplicates": array of duplicate row indices from new data that match existing data (0-based)
   - "duplicateDetails": array of objects with "newRowIndex" and "existingRowIndex" for external duplicates
   - "confidence": high/medium/low confidence in the analysis

Return only valid JSON:
`;

         // Add retry logic for duplicate analysis
     let result;
     let retries = 0;
     const maxRetries = 3;
     
     while (retries < maxRetries) {
       try {
         result = await genAI.models.generateContent({
           model: "gemini-1.5-flash",
           contents: [{ text: prompt }]
         });
         break; // Success, exit retry loop
       } catch (error: any) {
         if ((error?.error?.code === 429 || error?.error?.code === 503) && retries < maxRetries - 1) {
           // Rate limited or service overloaded, wait and retry
           retries++;
           const waitTime = 2000 * retries; // Exponential backoff: 2s, 4s, 6s
           console.log(`AI duplicate analysis busy (${error?.error?.code}), retrying in ${waitTime/1000}s... (attempt ${retries}/${maxRetries})`);
           await new Promise(resolve => setTimeout(resolve, waitTime));
           continue;
         }
         throw error; // Re-throw if not retryable error or max retries reached
       }
     }
    
    if (!result?.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0]) {
      throw new Error("No response generated from AI for duplicate analysis");
    }
    
    const text = result!.candidates[0].content.parts[0].text || "";
    
    // Parse AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return analysis;
    }
    
    return {
      uniqueFields: ["SERVICE PROVIDED", "DATE OF SUBMISSION", "NAME"],
      duplicateLogic: "Default logic: same service, date, and name = duplicate",
      internalDuplicates: [],
      externalDuplicates: [],
      duplicateDetails: [],
      confidence: "low"
    };
    
  } catch (error) {
    console.error("AI duplicate analysis failed:", error);
    return {
      uniqueFields: ["SERVICE PROVIDED", "DATE OF SUBMISSION", "NAME"],
      duplicateLogic: "Default logic due to AI analysis failure",
      internalDuplicates: [],
      externalDuplicates: [],
      duplicateDetails: [],
      confidence: "low"
    };
  }
}
