// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { action } from "./_generated/server";
import { v } from "convex/values";
export const uploadTicketPdf = action({
  args: {
    pdfBlob: v.string()
  },
  handler: async (ctx, {
    pdfBlob
  }) => {
    console.log("📂 Generating upload URL...");
    const uploadUrl = await ctx.storage.generateUploadUrl();
    const binaryData = Buffer.from(pdfBlob, "base64");
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf"
      },
      body: binaryData
    });
    if (!response.ok) throw new Error("❌ Failed to upload PDF");
    const {
      storageId
    } = await response.json();
    console.log(`✅ PDF uploaded successfully. Storage ID: ${storageId}`);
    return storageId;
  }
});