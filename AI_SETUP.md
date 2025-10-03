# AI-Powered Excel Upload Setup

## Overview
This feature uses Google's Gemini AI to intelligently match Excel headers with template headers, eliminating the need for exact header matches.

## Setup Required

### 1. Get Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Add Environment Variable
Add the following to your `.env.local` file:
```
GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies
The required packages are already installed:
- `@google/genai` - For Gemini AI integration

## How It Works

### Before (Old System)
- Users had to have exact header matches
- "SERVICE PROVIDED" had to match exactly
- "DATE OF SUBMISSION" had to match exactly
- Any mismatch would cause an error

### After (AI-Powered System)
- AI intelligently matches headers
- "Service" → "SERVICE PROVIDED" ✅
- "Date" → "DATE OF SUBMISSION" ✅
- "Timeline" → "EXPECTED TIMELINE" ✅
- "Status" → "STATUS" ✅

## Features

1. **Intelligent Header Matching**: Uses Gemini AI to understand synonyms and variations
2. **Data Type Processing**: Automatically converts data types (numbers, dates, checkboxes)
3. **User Feedback**: Shows which headers were matched and which couldn't be matched
4. **Fallback Handling**: Gracefully handles cases where AI can't match headers

## Example AI Prompts

The AI receives prompts like:
```
Template Headers:
1. SERVICE PROVIDED (Type: dropdown)
2. DATE OF SUBMISSION (Type: date)
3. EXPECTED TIMELINE (Type: number)

Excel Headers:
1. Service
2. Date
3. Timeline

Instructions:
1. For each Excel header, find the most similar template header
2. Consider synonyms, abbreviations, and common variations
3. Return the mapping as a JSON object
```

## Error Handling

- If AI fails to match any headers, user gets a clear error message
- If some headers can't be matched, user gets a warning with details
- Console logs show detailed mapping for debugging

## Testing

To test the functionality:
1. Create an Excel file with headers like "Service", "Date", "Notes"
2. Upload it to a report template that expects "SERVICE PROVIDED", "DATE OF SUBMISSION", "NOTES"
3. The AI should automatically map them correctly
