import { action } from "./_generated/server";
import { v } from "convex/values";

export const uploadTicketPdf = action({
  args: { pdfBlob: v.string() }, // Base64-encoded PDF Blob
  handler: async (ctx, { pdfBlob }) => {
    console.log("📂 Generating upload URL...");
    
    // ✅ Generate Upload URL from Convex Storage
    const uploadUrl = await ctx.storage.generateUploadUrl();

    // ✅ Convert base64 to binary
    const binaryData = Buffer.from(pdfBlob, "base64");

    // ✅ Upload the PDF to Convex Storage
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: binaryData,
    });

    if (!response.ok) throw new Error("❌ Failed to upload PDF");

    // ✅ Retrieve Storage ID
    const { storageId } = await response.json();

    console.log(`✅ PDF uploaded successfully. Storage ID: ${storageId}`);

    return storageId;
  },
});
