// AddDLIModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import {
  FaLandmark,
  FaNetworkWired,
  FaHandshake,
  FaBusinessTime,
  FaRegListAlt,
  FaBalanceScale,
  FaTools,
  FaBookOpen,
} from "react-icons/fa";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

const ICON_OPTIONS = [
  { label: "DLI 1: Land Administration", value: "FaLandmark", icon: <FaLandmark className="text-blue-600" /> },
  { label: "DLI 2: Fiber Optic Infrastructure", value: "FaNetworkWired", icon: <FaNetworkWired className="text-purple-600" /> },
  { label: "DLI 3: PPP & Investment Promotion", value: "FaHandshake", icon: <FaHandshake className="text-green-600" /> },
  { label: "DLI 4: Business Enabling Environment", value: "FaBusinessTime", icon: <FaBusinessTime className="text-yellow-600" /> },
  { label: "DLI 5: Regulatory Reform Action Plan", value: "FaRegListAlt", icon: <FaRegListAlt className="text-indigo-600" /> },
  { label: "DLI 6: Transparency in Tax Processes", value: "FaBalanceScale", icon: <FaBalanceScale className="text-rose-600" /> },
  { label: "DLI 7: Service Efficiency", value: "FaTools", icon: <FaTools className="text-gray-700" /> },
  { label: "DLI 8: Improved Public Access", value: "FaBookOpen", icon: <FaBookOpen className="text-teal-600" /> },
];

export function AddDLIModal({
  open,
  onClose,
  existingDLI
}: {
  open: boolean;
  onClose: () => void;
  existingDLI?: {
    _id: Id<"dli">;
    number: number;
    title: string;
    summary: string;
    icon: string;
    content: string;
  };
}) {
  const [number, setNumber] = useState<number | undefined>();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [icon, setIcon] = useState("FaLandmark");
  const [content, setContent] = useState("");

  const createDLI = useMutation(api.saber.createDLI);
  const updateDLI = useMutation(api.saber.updateDLI); // <-- must be defined in convex

  useEffect(() => {
    if (existingDLI) {
      setNumber(existingDLI.number);
      setTitle(existingDLI.title);
      setSummary(existingDLI.summary);
      setIcon(existingDLI.icon);
      setContent(existingDLI.content);
    } else {
      setNumber(undefined);
      setTitle("");
      setSummary("");
      setIcon("FaLandmark");
      setContent("");
    }
  }, [existingDLI, open]);

  const handleSave = async () => {
    if (!number || !title) {
      alert("Number and Title are required.");
      return;
    }

    if (existingDLI) {
      await updateDLI({
        id: existingDLI._id,
        number,
        title,
        summary,
        icon,
        content
      });
    } else {
      await createDLI({
        number,
        title,
        summary,
        icon,
        content
      });
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
  <DialogHeader>
    <DialogTitle className="text-xl">{existingDLI ? "Edit DLI" : "Add New DLI"}</DialogTitle>
  </DialogHeader>

  {/* Form Inputs */}
  <div className="space-y-4">
    <Input
      type="number"
      placeholder="DLI Number"
      value={number ?? ""}
      onChange={(e) => setNumber(parseInt(e.target.value))}
    />
    <Input
      placeholder="Title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />
    <Input
      placeholder="Short summary"
      value={summary}
      onChange={(e) => setSummary(e.target.value)}
    />
    <select
      value={icon}
      onChange={(e) => setIcon(e.target.value)}
      className="w-full border px-3 py-2 rounded"
    >
      {ICON_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">DLI Content</label>
      <RichTextEditor value={content} onChange={setContent} />
    </div>
  </div>

  <DialogFooter className="pt-4">
    <Button onClick={handleSave}>
      {existingDLI ? "Update DLI" : "Save DLI"}
    </Button>
  </DialogFooter>
</DialogContent>

    </Dialog>
  );
}
