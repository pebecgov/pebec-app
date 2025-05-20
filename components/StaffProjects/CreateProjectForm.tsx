"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CreateProjectForm() {
  const { user } = useUser();
  const router = useRouter();
  const createProject = useMutation(api.staff_projects.createProject);

  // 🔍 Fetch the Convex user based on Clerk ID
  const convexUser = useQuery(api.users.getUserByClerkId, {
    clerkUserId: user?.id ?? "",
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState([{ title: "", completed: false }]);

  const handleStepChange = (index: number, value: string) => {
    const updated = [...steps];
    updated[index].title = value;
    setSteps(updated);
  };

  const addStep = () => {
    setSteps([...steps, { title: "", completed: false }]);
  };

  const handleSubmit = async () => {
    if (!convexUser?._id) {
      console.error("User ID missing from Convex user lookup.");
      return;
    }

    await createProject({
      name,
      description,
      createdBy: convexUser._id,
      steps,
    });

    router.push("/staff/projects");
  };

  if (!user || !convexUser) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Create New Project</h2>

      <label className="block font-medium mb-1">Project Name</label>
      <Input value={name} onChange={(e) => setName(e.target.value)} className="mb-4" />

      <label className="block font-medium mb-1">Description</label>
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mb-4" />

      <label className="block font-medium mb-2">Steps</label>
      {steps.map((step, idx) => (
        <Input
          key={idx}
          value={step.title}
          onChange={(e) => handleStepChange(idx, e.target.value)}
          placeholder={`Step ${idx + 1}`}
          className="mb-2"
        />
      ))}
      <Button onClick={addStep} variant="outline" className="mb-4">
        + Add Step
      </Button>

      <Button onClick={handleSubmit} disabled={!name || !description}>
        Create Project
      </Button>
    </div>
  );
}
