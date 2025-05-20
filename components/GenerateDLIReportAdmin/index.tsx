"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

type Step = {
  title: string;
  completed: boolean;
  completedAt?: number;
};

type DLIData = {
  dliTitle: string;
  startedBy: string;
  userState: string;
  status: "in_progress" | "completed" | "not_started";
  completedSteps: number;
  totalSteps: number;
  steps: Step[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  dliTitles: string[];
  states: string[];
  allDLIs: DLIData[];
};

export function GenerateReportModal({
  open,
  onClose,
  dliTitles,
  states,
  allDLIs,
}: Props) {
  const [step, setStep] = useState(1);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDLIs, setSelectedDLIs] = useState<string[]>([]);
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
    if (!selectedState || selectedDLIs.length === 0) return;
  
    setLoading(true);
  
    const doc = new jsPDF("landscape", "pt", "a4");
    const marginX = 40;
    const contentWidth = doc.internal.pageSize.getWidth() - marginX * 2;
    let cursorY = 60;
    const lineHeight = 16;
    const sectionGap = 30;
  
    try {
      const logo = await getImageBase64("/images/logo/pebec_logo1.PNG");
      doc.addImage(logo, "PNG", marginX, cursorY, 60, 60);
    } catch (err) {
      console.warn("Logo failed to load:", err);
    }
  
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("DLI Status Report", marginX + 80, cursorY + 30);
  
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`State: ${selectedState}`, doc.internal.pageSize.getWidth() - 140, cursorY + 30);
  
    cursorY += 80;
  
    const selectedRecords = selectedDLIs.includes("ALL")
      ? allDLIs.filter((d) => d.userState === selectedState)
      : allDLIs.filter(
          (d) => d.userState === selectedState && selectedDLIs.includes(d.dliTitle)
        );
  
    selectedRecords.forEach((dli) => {
      if (cursorY > 460) {
        doc.addPage();
        cursorY = 60;
      }
  
      const percentage = Math.round((dli.completedSteps / dli.totalSteps) * 100);
  
      let statusColor = "#999999";
      if (dli.status === "completed") statusColor = "#28a745";
      else if (dli.status === "in_progress") statusColor = "#ffc107";
  
      const statusLabel =
        dli.status === "completed"
          ? "Completed"
          : dli.status === "in_progress"
          ? "In Progress"
          : "Not Started";
  
      // DLI Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor("#000000");
      const dliText = doc.splitTextToSize(`DLI: ${dli.dliTitle}`, contentWidth);
      doc.text(dliText, marginX, cursorY);
      cursorY += dliText.length * lineHeight;
  
      // Meta
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#000000");
      doc.text(`Reform Champion: ${dli.startedBy}`, marginX, cursorY);
  
      doc.setTextColor(statusColor);
      doc.text(`Status: ${statusLabel}`, marginX + 300, cursorY);
  
      doc.setTextColor("#000000");
      doc.text(`Progress: ${percentage}%`, marginX + 460, cursorY);
      cursorY += lineHeight;
  
      // Steps
      dli.steps.forEach((step) => {
        const stepLabel = step.completed ? "Completed" : "Pending";
        const date = step.completedAt
          ? new Date(step.completedAt).toLocaleString()
          : "-";
  
        const color = step.completed ? "#28a745" : "#999999";
        doc.setTextColor(color);
  
        const fullStep = `• ${step.title} — ${stepLabel}${step.completedAt ? ` (${date})` : ""}`;
        const wrappedLines = doc.splitTextToSize(fullStep, contentWidth - 40);
        doc.text(wrappedLines, marginX + 20, cursorY);
        cursorY += wrappedLines.length * lineHeight;
  
        if (cursorY > 500) {
          doc.addPage();
          cursorY = 60;
        }
      });
  
      cursorY += 6;
      doc.setDrawColor(210);
      doc.line(marginX, cursorY, doc.internal.pageSize.getWidth() - marginX, cursorY);
      cursorY += sectionGap;
    });
  
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 40;
    doc.setFontSize(10);
    doc.setTextColor("#999");
    doc.text("Generated by PEBEC • www.pebec.gov.ng", marginX, footerY);
    doc.text(
      `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      marginX + 400,
      footerY
    );
  
    doc.save(`${selectedState}_DLI_Report.pdf`);
  
    setSelectedState(null);
    setSelectedDLIs([]);
    setStep(1);
    setLoading(false);
    onClose();
  };
  
  

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate DLI Status Report</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p>Select a State:</p>
            <Select
              onValueChange={(val) => setSelectedState(val)}
              value={selectedState || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button onClick={() => setStep(2)} disabled={!selectedState}>
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p>Select DLIs (or choose all):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
              <Card
                onClick={() => setSelectedDLIs(["ALL"])}
                className={`p-4 cursor-pointer border ${
                  selectedDLIs.includes("ALL")
                    ? "border-blue-500"
                    : "hover:border-gray-400"
                }`}
              >
                All DLIs
              </Card>
              {dliTitles.map((title) => (
                <Card
                  key={title}
                  onClick={() =>
                    setSelectedDLIs((prev) =>
                      prev.includes(title)
                        ? prev.filter((t) => t !== title)
                        : [...prev.filter((t) => t !== "ALL"), title]
                    )
                  }
                  className={`p-4 cursor-pointer border ${
                    selectedDLIs.includes(title)
                      ? "border-blue-500"
                      : "hover:border-gray-400"
                  }`}
                >
                  {title}
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedDLIs.length || loading}
              >
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
