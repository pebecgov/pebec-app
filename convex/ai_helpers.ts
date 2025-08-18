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
    }))
  },
  handler: async (ctx, args) => {
    try {
      const { excelHeaders, templateHeaders } = args;

      // Create a prompt for Gemini AI to match headers only
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

      return {
        success: true,
        headerMapping,
        matchedHeaders: Object.keys(headerMapping),
        unmatchedTemplateHeaders: templateHeaders
          .map(h => h.name)
          .filter(name => name !== "EXPECTED TIMELINE" && !Object.values(headerMapping).includes(name))
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
        matchedHeaders: [],
        unmatchedTemplateHeaders: []
      };
    }
  },
});


