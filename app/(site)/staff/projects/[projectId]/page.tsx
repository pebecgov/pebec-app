// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@clerk/nextjs";
import { useState, useRef, useLayoutEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { FaCheckCircle, FaTrash, FaArrowLeft } from "react-icons/fa";
import clsx from "clsx";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  
  const currentUser = useQuery(api.users.getUserDetail);
  const project = useQuery(api.staff_projects.getProjectById, {
    projectId: projectId as Id<"projects">
  });
  
  const toggleStep = useMutation(api.staff_projects.toggleStep);
  const addStep = useMutation(api.staff_projects.addStep);
  const addUpdate = useMutation(api.staff_projects.addUpdate);
  const deleteStep = useMutation(api.staff_projects.deleteStep);
  const deleteProject = useMutation(api.staff_projects.deleteProject);
  
  const [newStep, setNewStep] = useState("");
  const [newUpdate, setNewUpdate] = useState("");
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [confirmStepIndex, setConfirmStepIndex] = useState<number | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (detailsRef.current) {
      setDetailsHeight(detailsRef.current.offsetHeight + 100);
    }
  }, [project]);

  if (!project || !currentUser) return <p className="text-center mt-10">Loading...</p>;

  // Check user permissions
  const isOwner = project.createdBy === currentUser._id;
  const collaboration = project.collaborators?.find(c => c.userId === currentUser._id);
  const userRole = collaboration?.role || (isOwner ? "owner" : null);
  
  // Debug logging to help identify the issue
  console.log("=== PROJECT COLLABORATION DEBUG ===");
  console.log("Current user ID:", currentUser._id);
  console.log("Project creator ID:", project.createdBy);
  console.log("Is owner:", isOwner);
  console.log("Project collaborators:", project.collaborators);
  console.log("Found collaboration:", collaboration);
  console.log("Determined user role:", userRole);
  console.log("=====================================");
  
  // Permission checks
  const canEdit = userRole === "owner" || userRole === "editor";
  const canView = userRole === "owner" || userRole === "editor" || userRole === "viewer" || isOwner;
  const canDelete = userRole === "owner" || isOwner;

  console.log("Permissions - canEdit:", canEdit, "canView:", canView, "canDelete:", canDelete);

  // If user has no access, show error
  if (!canView) {
    return (
      <div className="text-center mt-10">
        <p className="text-gray-500">You don't have permission to view this project.</p>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const handleToggleStep = async (index: number) => {
    try {
      await toggleStep({
        projectId: project._id,
        index
      });
    } catch (error) {
      console.error("Error toggling step:", error);
    }
  };

  const handleAddStep = async () => {
    if (!newStep.trim()) return;
    try {
      await addStep({
        projectId: project._id,
        title: newStep
      });
      setNewStep("");
    } catch (error) {
      console.error("Error adding step:", error);
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;
    try {
      await addUpdate({
        projectId: project._id,
        text: newUpdate
      });
      setNewUpdate("");
    } catch (error) {
      console.error("Error adding update:", error);
    }
  };

  const handleDeleteStep = async (index: number) => {
    try {
      await deleteStep({
        projectId: project._id,
        index
      });
      setConfirmStepIndex(null);
    } catch (error) {
      console.error("Error deleting step:", error);
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject({
        projectId: project._id
      });
      router.push("/staff/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "px-2 py-0.5 text-xs font-medium rounded-full";
    if (status === "open") return <span className={`${base} bg-gray-100 text-gray-700`}>Open</span>;
    if (status === "in_progress") return <span className={`${base} bg-yellow-100 text-yellow-800`}>In Progress</span>;
    if (status === "completed") return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Button variant="outline" onClick={() => router.back()} className="mb-6 flex items-center gap-2">
        <FaArrowLeft /> Back to Projects
      </Button>

      {/* User role indicator */}
      {userRole && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Your role:</span>
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            userRole === "owner" ? "bg-blue-100 text-blue-800" :
            userRole === "editor" ? "bg-green-100 text-green-800" :
            "bg-gray-100 text-gray-800"
          }`}>
            {userRole}
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Project Details */}
        <div ref={detailsRef} className="relative flex-1 bg-white rounded-xl shadow border border-gray-100 p-6 min-h-[400px]">
          {canDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-3 right-3 text-red-600 hover:text-red-700" 
              onClick={() => setConfirmDeleteProject(true)}
            >
              <FaTrash />
            </Button>
          )}
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-sm text-gray-600">{project.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Status:</span>
            {getStatusBadge(project.status)}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Progress</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${project.progress}%` }} 
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(project.progress)}% completed
            </p>
          </div>
        </div>

        {/* Project Steps */}
        <div className="flex-1 bg-white rounded-lg shadow p-6 overflow-y-auto" style={{
          maxHeight: detailsHeight ?? "auto"
        }}>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <FaCheckCircle className="text-green-600" />
            Project Steps
          </h2>

          {project.steps.map((step, index) => {
            const isCompleted = step.completed;
            return (
              <div key={index} className={clsx(
                "relative p-3 mb-3 rounded border flex flex-col sm:flex-row sm:items-center sm:justify-between",
                isCompleted ? "bg-green-50 border-green-200" : "bg-gray-50"
              )}>
                <div className="flex-1">
                  <span className={clsx("text-sm", isCompleted && "line-through text-green-700")}>
                    {step.title}
                  </span>
                  {step.completedBy && step.completedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Completed {new Date(step.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Action buttons - show for editors and owners */}
                {canEdit && (
                  <div className="flex gap-2 mt-2 sm:mt-0 sm:ml-4">
                    {/* Mobile buttons */}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={clsx(
                        "sm:hidden",
                        isCompleted ? "text-yellow-500 hover:text-yellow-600" : "text-blue-600 hover:text-blue-700"
                      )} 
                      onClick={() => handleToggleStep(index)}
                    >
                      {isCompleted ? <FaArrowLeft size={16} /> : <FaCheckCircle size={16} />}
                    </Button>

                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-red-600 hover:text-red-700 sm:hidden" 
                      onClick={() => setConfirmStepIndex(index)}
                    >
                      <FaTrash size={16} />
                    </Button>

                    {/* Desktop buttons */}
                    <div className="hidden sm:flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleToggleStep(index)}>
                        {isCompleted ? "Undo" : "Complete"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setConfirmStepIndex(index)}>
                        <FaTrash />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new step - show for editors and owners */}
          {canEdit && (
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Input 
                value={newStep} 
                onChange={e => setNewStep(e.target.value)} 
                placeholder="Add a step..." 
                onKeyPress={(e) => e.key === "Enter" && handleAddStep()}
              />
              <Button onClick={handleAddStep}>
                Add Step
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Project Updates */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📝 Project Updates</h2>
        {project.updates.length === 0 ? (
          <p className="text-gray-500 text-sm">No updates yet.</p>
        ) : (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {project.updates.map((u, i) => (
              <div key={i} className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-sm text-gray-800 mb-1">{u.text}</p>
                <p className="text-xs text-gray-400">
                  {u.authorName && `${u.authorName} • `}
                  {new Date(u.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {/* Add update - all collaborators can add updates */}
        {canView && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Textarea 
              value={newUpdate} 
              onChange={e => setNewUpdate(e.target.value)} 
              placeholder="Write an update..." 
              className="flex-1" 
            />
            <Button onClick={handleAddUpdate}>
              Post
            </Button>
          </div>
        )}
      </div>

      {/* Delete Project Dialog */}
      <Dialog open={confirmDeleteProject} onOpenChange={setConfirmDeleteProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This will permanently remove the project and all associated data.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteProject(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step Dialog */}
      <Dialog open={confirmStepIndex !== null} onOpenChange={() => setConfirmStepIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this step?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This cannot be undone. Are you sure you want to delete it?
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStepIndex(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => confirmStepIndex !== null && handleDeleteStep(confirmStepIndex)}>
              Delete Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}