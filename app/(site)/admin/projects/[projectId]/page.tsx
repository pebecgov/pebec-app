// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import clsx from "clsx";
export default function ProjectDetailPage() {
  const {
    projectId
  } = useParams();
  const router = useRouter();
  const project = useQuery(api.staff_projects.getProjectById, {
    projectId: projectId as any
  });
  if (!project) return <p className="text-center mt-10">Loading...</p>;
  const getStatusBadge = (status: string) => {
    const base = "px-2 py-0.5 text-xs font-medium rounded-full";
    if (status === "open") return <span className={`${base} bg-gray-100 text-gray-700`}>Open</span>;
    if (status === "in_progress") return <span className={`${base} bg-yellow-100 text-yellow-800`}>In Progress</span>;
    if (status === "completed") return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
  };
  return <div className="p-4 max-w-4xl mx-auto">
      <Button variant="outline" onClick={() => router.back()} className="mb-6 flex items-center gap-2">
        <FaArrowLeft /> Back to Projects
      </Button>

      {}
      <div className="bg-white rounded-xl shadow p-6 border mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
        <p className="text-sm text-gray-600">{project.description}</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Status:</span>
          {getStatusBadge(project.status)}
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Progress</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{
            width: `${project.progress}%`
          }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">{Math.round(project.progress)}% completed</p>
        </div>
      </div>

      {}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <FaCheckCircle className="text-green-600" />
          Project Steps
        </h2>

        {project.steps.map((step, index) => <div key={index} className={clsx("p-3 mb-3 rounded border", step.completed ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200")}>
            <span className={clsx("text-sm", step.completed && "line-through text-green-700")}>
              {step.title}
            </span>
          </div>)}
      </div>

      {}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Project Updates</h2>
        {project.updates.length === 0 ? <p className="text-gray-500 text-sm">No updates available.</p> : <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {project.updates.map((u, i) => <div key={i} className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-sm text-gray-800 mb-1">{u.text}</p>
                <p className="text-xs text-gray-400">{new Date(u.timestamp).toLocaleString()}</p>
              </div>)}
          </div>}
      </div>
    </div>;
}