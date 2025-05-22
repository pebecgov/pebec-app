// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FileUploader from "@/components/file-uploader";
import { Plus, Trash2, X } from "lucide-react";
interface Props {
  onClose?: () => void;
  existingDli?: {
    _id: Id<"dli_templates">;
    title: string;
    description?: string;
    guideFileId: Id<"_storage">;
    guideFileUrl: string;
    guideFileName: string;
    steps: string[];
  };
}
export default function CreateDLIForm({
  onClose,
  existingDli
}: Props) {
  const createDliTemplate = useMutation(api.dli.createDliTemplate);
  const updateDliTemplate = useMutation(api.dli.updateDliTemplate);
  const [title, setTitle] = useState(existingDli?.title || "");
  const [description, setDescription] = useState(existingDli?.description || "");
  const [fileId, setFileId] = useState<Id<"_storage"> | null>(existingDli?.guideFileId || null);
  const [fileUrl, setFileUrl] = useState<string | null>(existingDli?.guideFileUrl || null);
  const [fileName, setFileName] = useState<string | null>(existingDli?.guideFileName || null);
  const [steps, setSteps] = useState<string[]>(existingDli?.steps || [""]);
  const handleFileUpload = (id: Id<"_storage">, url: string, name: string) => {
    setFileId(id);
    setFileUrl(url);
    setFileName(name);
  };
  const addStep = () => setSteps([...steps, ""]);
  const removeStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));
  const handleSubmit = async () => {
    if (!title.trim() || !fileId || !fileUrl || !fileName || steps.some(s => !s.trim())) {
      alert("Please complete all required fields.");
      return;
    }
    if (existingDli) {
      await updateDliTemplate({
        id: existingDli._id,
        title,
        description,
        guideFileId: fileId,
        guideFileName: fileName,
        guideFileUrl: fileUrl,
        steps
      });
      alert("✅ DLI updated successfully.");
    } else {
      await createDliTemplate({
        title,
        description,
        guideFileId: fileId,
        guideFileName: fileName,
        guideFileUrl: fileUrl,
        steps
      });
      alert("✅ DLI created successfully.");
    }
    onClose?.();
  };
  return <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-4">
          {existingDli ? "Edit DLI Report" : "Create New DLI"}
        </h2>

        <Input placeholder="DLI Title" value={title} onChange={e => setTitle(e.target.value)} className="mb-3" />
        <Textarea placeholder="DLI Description (Optional)" value={description} onChange={e => setDescription(e.target.value)} className="mb-4" />

        <FileUploader setFileId={(id, name) => {
        handleFileUpload(id as Id<"_storage">, "temporary-url", name);
      }} />

        {fileName && <p className="text-sm text-gray-600 mt-2 mb-4">Attached file: {fileName}</p>}

        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Steps</h3>
          {steps.map((step, index) => <div key={index} className="flex items-center gap-2 mb-2">
              <Input value={step} onChange={e => setSteps([...steps.slice(0, index), e.target.value, ...steps.slice(index + 1)])} placeholder={`Step ${index + 1}`} className="flex-grow" />
              {steps.length > 1 && <Button type="button" onClick={() => removeStep(index)} className="bg-red-500 text-white p-2">
                  <Trash2 size={16} />
                </Button>}
            </div>)}
          <Button onClick={addStep} className="bg-blue-500 text-white w-full mt-2">
            <Plus size={16} className="mr-2" /> Add Step
          </Button>
        </div>

        <div className="flex justify-between mt-6">
          <Button onClick={onClose} className="bg-gray-400 text-white">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-green-600 text-white">
            {existingDli ? "Update" : "Save DLI"}
          </Button>
        </div>
      </div>
    </div>;
}