// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useState, useEffect } from "react";
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
export default function DLICertificate({
  dliTemplateId
}: {
  dliTemplateId: Id<"dli_templates">;
}) {
  const {
    user
  } = useUser();
  const dliProgress = useQuery(api.dli.getUserDLIProgress, {
    dliTemplateId
  }) || null;
  const dliTemplate = useQuery(api.dli.getDliTemplate, {
    id: dliTemplateId
  }) || null;
  const userData = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user.id
  } : "skip");
  const completionDate = new Date(dliProgress?.updatedAt || dliProgress?.createdAt || Date.now()).toLocaleDateString();
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  useEffect(() => {
    getBase64ImageFromURL("/images/logo/logo_pebec1.PNG").then(setLogoBase64);
  }, []);
  useEffect(() => {
    const qrData = `Proof of Completion:\nDLI: ${dliTemplate?.title || "DLI Program"}\nState: ${userData?.state || "Unknown"}\nReform Champion: ${userData?.firstName || ""} ${userData?.lastName || ""}\nDate: ${completionDate}`;
    QRCode.toDataURL(qrData, {
      width: 60
    }).then(setQrBase64).catch(err => console.error("QR Code Error:", err));
  }, [dliTemplate, userData, completionDate]);
  if (!dliProgress || dliProgress.status !== "completed") {
    return null;
  }
  const handleDownloadCertificate = () => {
    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(6);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
    const titleText = dliTemplate?.title || "DLI Program";
    const stateText = userData?.state || "Unknown State";
    const titleMaxWidth = pageWidth - 250;
    const wrappedTitle = doc.splitTextToSize(titleText, titleMaxWidth);
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 20, 25, 50, 20);
    }
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(0, 102, 204);
    doc.text("Certificate of Completion", pageWidth / 2, 50, {
      align: "center"
    });
    doc.setFontSize(22);
    doc.setTextColor(34, 139, 34);
    doc.text(`${userData?.firstName || ""} ${userData?.lastName || ""}`, pageWidth / 2, 95, {
      align: "center"
    });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("For successfully completing", pageWidth / 2, 115, {
      align: "center"
    });
    const titleX = pageWidth / 2 - 50;
    const titleY = 140;
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(wrappedTitle, titleX, titleY, {
      align: "center"
    });
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    doc.text("Released by PEBEC", 50, titleY + wrappedTitle.length * 8 + 15, {
      align: "left"
    });
    const stateY = titleY + wrappedTitle.length * 10 + 5;
    doc.setFontSize(18);
    doc.text(`for the state of ${stateText}`, pageWidth / 2, stateY - 5, {
      align: "center"
    });
    const qrX = pageWidth - 120;
    const qrY = stateY - 30;
    if (qrBase64) {
      doc.addImage(qrBase64, "PNG", qrX, qrY, 50, 50);
    }
    doc.setFontSize(14);
    doc.setFont("times", "normal");
    doc.text(`Date of Completion: ${completionDate}`, qrX - 10, qrY + 60, {
      align: "center"
    });
    doc.save(`Certificate-${dliTemplate?.title || "DLI"}.pdf`);
  };
  return <div className="flex flex-col items-center justify-center mt-6">
      {}
      <Button onClick={handleDownloadCertificate} className="bg-blue-600 text-white px-4 py-2 rounded-md">
        Download Certificate
      </Button>
    </div>;
}