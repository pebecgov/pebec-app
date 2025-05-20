"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function UserDLIReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useQuery(api.users.getCurrentUsers);
  const allTemplates = useQuery(api.dli.getAllDliTemplates);
  const userState = user?.state || "";
  const userFullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`;

  const allProgressByState = useQuery(api.dli.getStateDLIsReformChampion, { state: userState });
  const userDLIs = useMemo(() => {
    if (!user || !allProgressByState) return [];
  
    const isGovernor = user.role === "state_governor";
    const isOwner = (d) => d.userId === user._id;
    const sameState = (d) => d.state === user.state;
  
    return allProgressByState.filter(
      (d) =>
        (isOwner(d) || (isGovernor && sameState(d))) &&
        (d.status === "in_progress" || d.status === "completed")
    );
  }, [allProgressByState, user]);
  

  const templateMap = useMemo(() => {
    return new Map(allTemplates?.map((t) => [t._id, t.title]) || []);
  }, [allTemplates]);

  const [selectedDLIs, setSelectedDLIs] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const getImageBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  };

  const handleGenerate = async () => {
    if (!selectedDLIs.length || !user) return;

    setLoading(true);

    const doc = new jsPDF("landscape", "pt", "a4");
    const marginX = 40;
    let cursorY = 60;
    const lineHeight = 16;
    const sectionGap = 30;
    const maxHeight = doc.internal.pageSize.getHeight() - 60;

    try {
      const logo = await getImageBase64("/images/logo/pebec_logo1.PNG");
      doc.addImage(logo, "PNG", marginX, cursorY, 60, 60);
    } catch (err) {
      console.warn("Logo failed to load:", err);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("My DLI Report", marginX + 80, cursorY + 30);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`User: ${userFullName}`, marginX + 400, cursorY + 30);
    doc.text(`State: ${userState}`, marginX + 400, cursorY + 50);

    cursorY += 80;

    const records = selectedDLIs.includes("ALL")
      ? userDLIs
      : userDLIs.filter((d) => selectedDLIs.includes(d.dliTemplateId));

    for (const dli of records) {
      if (cursorY > maxHeight - 100) {
        doc.addPage();
        cursorY = 60;
      }

      const percentage = Math.round((dli.completedSteps / dli.totalSteps) * 100);
      const statusColor = dli.status === "completed" ? "#28a745" : dli.status === "in_progress" ? "#ffc107" : "#999";
      const statusLabel = dli.status === "completed" ? "Completed" : dli.status === "in_progress" ? "In Progress" : "Not Started";
      const title = templateMap.get(dli.dliTemplateId) || "Untitled DLI";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor("#000000");
      doc.text(`DLI: ${title}`, marginX, cursorY);
      cursorY += lineHeight;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor("#000000");
      doc.text(`Status: `, marginX, cursorY);
      doc.setTextColor(statusColor);
      doc.text(statusLabel, marginX + 50, cursorY);
      doc.setTextColor("#000000");
      doc.text(`Progress: ${percentage}%`, marginX + 300, cursorY);
      cursorY += lineHeight;

      for (const step of dli.steps) {
        const stepLabel = step.completed ? "Completed" : "Pending";
        const date = step.completedAt ? new Date(step.completedAt).toLocaleString() : "";
        const color = step.completed ? "#28a745" : "#999";

        const fullText = `• ${step.title} — ${stepLabel}${date ? ` (${date})` : ""}`;
        const wrappedLines = doc.splitTextToSize(fullText, doc.internal.pageSize.getWidth() - marginX * 2);

        doc.setTextColor(color);
        for (const line of wrappedLines) {
          if (cursorY > maxHeight) {
            doc.addPage();
            cursorY = 60;
          }
          doc.text(line, marginX + 20, cursorY);
          cursorY += lineHeight;
        }
      }

      doc.setDrawColor(210);
      doc.line(marginX, cursorY, doc.internal.pageSize.getWidth() - marginX, cursorY);
      cursorY += sectionGap;
    }

    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(10);
    doc.setTextColor("#999");
    doc.text("Generated by PEBEC • www.pebec.gov.ng", marginX, footerY);
    doc.text(`Date: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() - 250, footerY);

    doc.save(`${userState}_UserDLI_Report.pdf`);

    setStep(1);
    setSelectedDLIs([]);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate My DLI Report</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p>Select DLIs:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
              <Card
                onClick={() => setSelectedDLIs(["ALL"])}
                className={`p-4 cursor-pointer border ${
                  selectedDLIs.includes("ALL") ? "border-blue-500" : "hover:border-gray-400"
                }`}
              >
                All My DLIs
              </Card>
              {userDLIs.map((p) => (
                <Card
                  key={p.dliTemplateId}
                  onClick={() =>
                    setSelectedDLIs((prev) =>
                      prev.includes(p.dliTemplateId)
                        ? prev.filter((id) => id !== p.dliTemplateId)
                        : [...prev.filter((id) => id !== "ALL"), p.dliTemplateId]
                    )
                  }
                  className={`p-4 cursor-pointer border ${
                    selectedDLIs.includes(p.dliTemplateId)
                      ? "border-blue-500"
                      : "hover:border-gray-400"
                  }`}
                >
                  {templateMap.get(p.dliTemplateId) || "Untitled DLI"}
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button onClick={handleGenerate} disabled={!selectedDLIs.length || loading}>
                {loading ? "Generating..." : "Generate PDF"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
