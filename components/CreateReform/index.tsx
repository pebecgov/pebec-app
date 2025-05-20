"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ImageUploader from "@/components/image-uploader";
import { Plus, CheckCircle, Trash } from "lucide-react";

const categories = ["Infrastructure", "Real Estate", "Business", "Finance", "Legal", "Regulations"];

export default function CreateReformPage() {
  const { toast } = useToast();
  const createReform = useMutation(api.reforms.createReform);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    implementedDate: "",
    imageId: "" as Id<"_storage"> | "",
    videoLink: "",
    impact: [""], // ✅ Initial empty impact field
    outcome: [""], // ✅ Initial empty outcome field
  });

  const handleAddItem = (field: "impact" | "outcome") => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const handleRemoveItem = (field: "impact" | "outcome", index: number) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleCreateReform = async () => {
    if (!form.title || !form.description || !form.category || !form.implementedDate) {
      toast({ title: "Error", description: "Please fill in all required fields!", variant: "destructive" });
      return;
    }

    await createReform({
      title: form.title,
      description: form.description,
      category: form.category,
      implementedDate: new Date(form.implementedDate).getTime(),
      imageId: form.imageId || undefined,
      videoLink: form.videoLink || undefined,
      impact: form.impact.filter(Boolean), // ✅ Remove empty impact items
      outcome: form.outcome.filter(Boolean), // ✅ Remove empty outcome items
    });

    toast({ title: "Success!", description: "Reform created successfully!" });

    // ✅ Reset Form After Submission
    setForm({
      title: "",
      description: "",
      category: "",
      implementedDate: "",
      imageId: "" as Id<"_storage"> | "",
      videoLink: "",
      impact: [""],
      outcome: [""],
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-center">Create New Reform</h1>

      {/* ✅ Image Uploader */}
      <ImageUploader setImageId={(storageId: Id<"_storage">) => setForm((prev) => ({ ...prev, imageId: storageId }))} />

      {/* ✅ Reform Title */}
      <Label className="mt-4">Title</Label>
      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />

      {/* ✅ Reform Description */}
      <Label className="mt-4">Description</Label>
      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />

      {/* ✅ Category Selection */}
      <Label className="mt-4">Category</Label>
      <select
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        className="border p-2 rounded-md w-full"
      >
        <option value="">Select Category</option>
        {categories.map((category, idx) => (
          <option key={idx} value={category}>
            {category}
          </option>
        ))}
      </select>

      {/* ✅ Implemented Date */}
      <Label className="mt-4">Implemented Date</Label>
      <Input type="date" value={form.implementedDate} onChange={(e) => setForm({ ...form, implementedDate: e.target.value })} required />

      {/* ✅ Video Link */}
      <Label className="mt-4">Video Link (Optional)</Label>
      <Input type="url" value={form.videoLink} onChange={(e) => setForm({ ...form, videoLink: e.target.value })} />

      {/* ✅ Impact Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Impacts</h2>
        {form.impact.map((impact, index) => (
          <div key={index} className="flex items-center gap-2 mt-2">
            <Input
              type="text"
              placeholder="Enter impact"
              value={impact}
              onChange={(e) => {
                const newImpact = [...form.impact];
                newImpact[index] = e.target.value;
                setForm({ ...form, impact: newImpact });
              }}
            />
            {index > 0 && (
              <Button type="button" variant="destructive" onClick={() => handleRemoveItem("impact", index)}>
                <Trash className="w-5 h-5" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" className="mt-2 flex items-center gap-2" onClick={() => handleAddItem("impact")}>
          <Plus className="w-5 h-5" /> Add Impact
        </Button>
      </div>

      {/* ✅ Outcome Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Outcomes</h2>
        {form.outcome.map((outcome, index) => (
          <div key={index} className="flex items-center gap-2 mt-2">
            <Input
              type="text"
              placeholder="Enter outcome"
              value={outcome}
              onChange={(e) => {
                const newOutcome = [...form.outcome];
                newOutcome[index] = e.target.value;
                setForm({ ...form, outcome: newOutcome });
              }}
            />
            {index > 0 && (
              <Button type="button" variant="destructive" onClick={() => handleRemoveItem("outcome", index)}>
                <Trash className="w-5 h-5" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" className="mt-2 flex items-center gap-2" onClick={() => handleAddItem("outcome")}>
          <Plus className="w-5 h-5" /> Add Outcome
        </Button>
      </div>

      {/* ✅ Submit Button */}
      <Button onClick={handleCreateReform} className="mt-6 w-full flex items-center gap-2">
        <CheckCircle className="w-5 h-5" /> Create Reform
      </Button>
    </div>
  );
}
