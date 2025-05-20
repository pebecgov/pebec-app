"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useState, useEffect } from "react";

// ✅ Convert Image to Base64
const getBase64ImageFromURL = async (url: string) => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function DLICertificate({ dliTemplateId }: { dliTemplateId: Id<"dli_templates"> }) {
  const { user } = useUser();

  // ✅ Fetch DLI progress
  const dliProgress = useQuery(api.dli.getUserDLIProgress, { dliTemplateId }) || null;

  // ✅ Fetch DLI template (to get title)
  const dliTemplate = useQuery(api.dli.getDliTemplate, { id: dliTemplateId }) || null;

  // ✅ Fetch user details (state, name)
  const userData = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");

  // ✅ Use updatedAt or fallback to createdAt
  const completionDate = new Date(dliProgress?.updatedAt || dliProgress?.createdAt || Date.now()).toLocaleDateString();

  // **Base64 Image Storage**
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);

  // ✅ Load Logo Once
  useEffect(() => {
    getBase64ImageFromURL("/images/logo/logo_pebec1.PNG").then(setLogoBase64);
  }, []);

  // ✅ Generate QR Code
  useEffect(() => {
    const qrData = `Proof of Completion:\nDLI: ${dliTemplate?.title || "DLI Program"}\nState: ${
      userData?.state || "Unknown"
    }\nReform Champion: ${userData?.firstName || ""} ${userData?.lastName || ""}\nDate: ${completionDate}`;

    QRCode.toDataURL(qrData, { width: 60 }) // Slightly smaller QR
      .then(setQrBase64)
      .catch((err) => console.error("QR Code Error:", err));
  }, [dliTemplate, userData, completionDate]);

  // ❌ No certificate if DLI is not completed
  if (!dliProgress || dliProgress.status !== "completed") {
    return null;
  }

  // ✅ Generate & Download Certificate PDF
  const handleDownloadCertificate = () => {
    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // **Professional Border**
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(6);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // ✅ Prevent Undefined Errors with Default Values
    const titleText = dliTemplate?.title || "DLI Program";
    const stateText = userData?.state || "Unknown State";

    // ✅ Properly Wrap Title (Ensure Centered & No Overlap)
    const titleMaxWidth = pageWidth - 250; // Ensures it doesn’t go off-page
    const wrappedTitle = doc.splitTextToSize(titleText, titleMaxWidth);

    // **PEBEC Logo (Top Left)**
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 20, 25, 50, 20);
    }

    // **Certificate Title**
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(0, 102, 204);
    doc.text("Certificate of Completion", pageWidth / 2, 50, { align: "center" });

    // **Reform Champion Name**
    doc.setFontSize(22);
    doc.setTextColor(34, 139, 34);
    doc.text(`${userData?.firstName || ""} ${userData?.lastName || ""}`, pageWidth / 2, 95, {
      align: "center",
    });

    // **Completion Message**
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("For successfully completing", pageWidth / 2, 115, { align: "center" });

    // **DLI Title Properly Wrapped**
    const titleX = pageWidth / 2 - 50; // Keep it centered
    const titleY = 140;
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(wrappedTitle, titleX, titleY, { align: "center" });

    // **"Released by PEBEC" Properly Positioned**
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    doc.text("Released by PEBEC", 50, titleY + wrappedTitle.length * 8 + 15, { align: "left" });

    // **State Name Below Title (Higher for Better Positioning)**
    const stateY = titleY + wrappedTitle.length * 10 + 5;
    doc.setFontSize(18);
    doc.text(`for the state of ${stateText}`, pageWidth / 2, stateY - 5, { align: "center" });

    // **QR Code Properly Aligned**
    const qrX = pageWidth - 120; // Adjusted to right corner
    const qrY = stateY - 30; // Moved up slightly
    if (qrBase64) {
      doc.addImage(qrBase64, "PNG", qrX, qrY, 50, 50);
    }

    // **Completion Date Properly Positioned**
    doc.setFontSize(14);
    doc.setFont("times", "normal");
    doc.text(`Date of Completion: ${completionDate}`, qrX - 10, qrY + 60, { align: "center" });

    // **Download PDF**
    doc.save(`Certificate-${dliTemplate?.title || "DLI"}.pdf`);
  };

  return (
    <div className="flex flex-col items-center justify-center mt-6">
      {/* ✅ Download Certificate Button */}
      <Button onClick={handleDownloadCertificate} className="bg-blue-600 text-white px-4 py-2 rounded-md">
        Download Certificate
      </Button>
    </div>
  );
}
