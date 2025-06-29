// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useUser } from "@clerk/nextjs";
import { useState, useRef, useLayoutEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { FaCheckCircle, FaTrash, FaArrowLeft, FaUser, FaClock, FaGripVertical } from "react-icons/fa";
import clsx from "clsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Drag and Drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Task Component
function SortableTask({ 
  step, 
  index, 
  project, 
  canEdit, 
  isOwner, 
  onToggleStep, 
  onDeleteStep, 
  onUpdateAssignment, 
  onUpdateDueDate,
  collaborators 
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task-${index}` });

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDueDateDialog, setShowDueDateDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<Id<"users"> | undefined>(step.assignedTo);
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(
    step.dueDate ? new Date(step.dueDate) : null
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCompleted = step.completed;
  const isOverdue = step.dueDate && !isCompleted && new Date() > new Date(step.dueDate);

  const handleAssignmentSave = () => {
    const assignedUser = collaborators.find((c: any) => c.userId === selectedAssignee);
    onUpdateAssignment(index, selectedAssignee, assignedUser?.userName || assignedUser?.firstName + " " + assignedUser?.lastName);
    setShowAssignDialog(false);
  };

  const handleDueDateSave = () => {
    onUpdateDueDate(index, selectedDueDate?.getTime());
    setShowDueDateDialog(false);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className={clsx(
        "relative p-4 mb-3 rounded-lg border transition-all",
        isCompleted ? "bg-green-50 border-green-200" : 
        isOverdue ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200",
        isDragging && "shadow-lg"
      )}>
        {/* Drag Handle */}
        {canEdit && (
          <div {...listeners} className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab text-gray-400 hover:text-gray-600">
            <FaGripVertical />
          </div>
        )}

        <div className="ml-6">
          {/* Task Title and Status */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={clsx("font-medium", isCompleted && "line-through text-green-700")}>
                {step.title}
              </h3>
              
              {/* Task Metadata */}
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                {/* Assignment */}
                <div className="flex items-center gap-1">
                  <FaUser size={12} />
                  <span>
                    {step.assignedToName ? step.assignedToName : "Unassigned"}
                  </span>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-blue-600 hover:text-blue-800"
                      onClick={() => setShowAssignDialog(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-1">
                  <FaClock size={12} />
                  <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                    {step.dueDate ? new Date(step.dueDate).toLocaleDateString() : "No due date"}
                  </span>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-blue-600 hover:text-blue-800"
                      onClick={() => setShowDueDateDialog(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Completion Info */}
              {step.completedBy && step.completedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Completed {new Date(step.completedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && (
              <div className="flex gap-2 ml-4">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onToggleStep(index)}
                  className={isCompleted ? "text-yellow-600" : "text-green-600"}
                >
                  {isCompleted ? "Undo" : "Complete"}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onDeleteStep(index)}
                >
                  <FaTrash />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Assign to:</Label>
                <Select value={selectedAssignee} onValueChange={(value) => setSelectedAssignee(value as Id<"users">)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collaborator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {collaborators.map((collab: any) => (
                      <SelectItem key={collab.userId} value={collab.userId}>
                        {collab.userName || `${collab.firstName} ${collab.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignmentSave}>
                Save Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Due Date Dialog */}
        <Dialog open={showDueDateDialog} onOpenChange={setShowDueDateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Due Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Due Date:</Label>
                <div className="mt-2">
                  <DatePicker
                    selected={selectedDueDate}
                    onChange={(date) => setSelectedDueDate(date)}
                    className="w-full p-2 border rounded-md"
                    placeholderText="Select due date"
                    dateFormat="MMM d, yyyy"
                    minDate={new Date()}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDueDateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setSelectedDueDate(null);
                handleDueDateSave();
              }} variant="outline">
                Clear Date
              </Button>
              <Button onClick={handleDueDateSave}>
                Save Due Date
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  
  const currentUser = useQuery(api.users.getUserDetail);
  const project = useQuery(api.staff_projects.getProjectById, {
    projectId: projectId as Id<"projects">
  });
  
  // Get all users for assignment
  const allUsers = useQuery(api.users.getAllUsers) || [];
  
  const toggleStep = useMutation(api.staff_projects.toggleStep);
  const addStep = useMutation(api.staff_projects.addStep);
  const addUpdate = useMutation(api.staff_projects.addUpdate);
  const deleteStep = useMutation(api.staff_projects.deleteStep);
  const deleteProject = useMutation(api.staff_projects.deleteProject);
  const updateStepAssignment = useMutation(api.staff_projects.updateStepAssignment);
  const updateStepDueDate = useMutation(api.staff_projects.updateStepDueDate);
  const reorderSteps = useMutation(api.staff_projects.reorderSteps);
  
  const [newStep, setNewStep] = useState("");
  const [newUpdate, setNewUpdate] = useState("");
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [confirmStepIndex, setConfirmStepIndex] = useState<number | null>(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  
  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<Id<"users"> | undefined>();
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | null>(null);
  
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
  
  // Permission checks
  const canEdit = userRole === "owner" || userRole === "editor";
  const canView = userRole === "owner" || userRole === "editor" || userRole === "viewer" || isOwner;
  const canDelete = userRole === "owner" || isOwner;

  // If user has no access, show error
  if (!canView) {
    return (
      <div className="text-center mt-10">
        <p className="text-gray-500">You don't have permission to view this project.</p>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Get project collaborators with user details
  const collaborators = project.collaborators?.map(collab => {
    const userDetail = allUsers.find(u => u._id === collab.userId);
    return {
      ...collab,
      userName: userDetail ? `${userDetail.firstName} ${userDetail.lastName}` : "Unknown User",
      firstName: userDetail?.firstName,
      lastName: userDetail?.lastName
    };
  }) || [];

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
    if (!newTaskTitle.trim()) return;
    
    const assignedUser = collaborators.find(c => c.userId === newTaskAssignee);
    
    try {
      await addStep({
        projectId: project._id,
        title: newTaskTitle,
        assignedTo: newTaskAssignee === "unassigned" ? undefined : newTaskAssignee,
        assignedToName: assignedUser ? assignedUser.userName : undefined,
        dueDate: newTaskDueDate?.getTime()
      });
      
      setNewTaskTitle("");
      setNewTaskAssignee(undefined);
      setNewTaskDueDate(null);
      setShowAddTaskDialog(false);
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

  const handleUpdateAssignment = async (stepIndex: number, assignedTo?: Id<"users">, assignedToName?: string) => {
    try {
      await updateStepAssignment({
        projectId: project._id,
        stepIndex,
        assignedTo: assignedTo === "unassigned" ? undefined : assignedTo,
        assignedToName
      });
    } catch (error) {
      console.error("Error updating assignment:", error);
    }
  };

  const handleUpdateDueDate = async (stepIndex: number, dueDate?: number) => {
    try {
      await updateStepDueDate({
        projectId: project._id,
        stepIndex,
        dueDate
      });
    } catch (error) {
      console.error("Error updating due date:", error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = project.steps.findIndex((_: any, index: number) => `task-${index}` === active.id);
      const newIndex = project.steps.findIndex((_: any, index: number) => `task-${index}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(Array.from({ length: project.steps.length }, (_, i) => i), oldIndex, newIndex);
        
        try {
          await reorderSteps({
            projectId: project._id,
            newOrder
          });
        } catch (error) {
          console.error("Error reordering steps:", error);
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "px-2 py-0.5 text-xs font-medium rounded-full";
    if (status === "open") return <span className={`${base} bg-gray-100 text-gray-700`}>Open</span>;
    if (status === "in_progress") return <span className={`${base} bg-yellow-100 text-yellow-800`}>In Progress</span>;
    if (status === "completed") return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
  };

  // Sort steps by order
  const sortedSteps = [...project.steps].sort((a, b) => (a.order || 0) - (b.order || 0));

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

        {/* Project Tasks */}
        <div className="flex-1 bg-white rounded-lg shadow p-6 overflow-y-auto" style={{
          maxHeight: detailsHeight ?? "auto"
        }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaCheckCircle className="text-green-600" />
              Project Tasks
            </h2>
            
            {/* Add Task Button - only owners can add tasks */}
            {isOwner && (
              <Button onClick={() => setShowAddTaskDialog(true)}>
                Add Task
              </Button>
            )}
          </div>

          {/* Sortable Task List */}
          {sortedSteps.length > 0 ? (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={sortedSteps.map((_, index) => `task-${index}`)}
                strategy={verticalListSortingStrategy}
              >
                {sortedSteps.map((step, index) => (
                  <SortableTask
                    key={`task-${index}`}
                    step={step}
                    index={index}
                    project={project}
                    canEdit={canEdit}
                    isOwner={isOwner}
                    onToggleStep={handleToggleStep}
                    onDeleteStep={() => setConfirmStepIndex(index)}
                    onUpdateAssignment={handleUpdateAssignment}
                    onUpdateDueDate={handleUpdateDueDate}
                    collaborators={collaborators}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-gray-500 text-center py-8">No tasks yet. Add your first task to get started!</p>
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

      {/* Add Task Dialog */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Title *</Label>
              <Input
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Assign to:</Label>
              <Select value={newTaskAssignee} onValueChange={(value) => setNewTaskAssignee(value as Id<"users">)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a collaborator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {collaborators.map((collab) => (
                    <SelectItem key={collab.userId} value={collab.userId}>
                      {collab.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date:</Label>
              <div className="mt-1">
                <DatePicker
                  selected={newTaskDueDate}
                  onChange={(date) => setNewTaskDueDate(date)}
                  className="w-full p-2 border rounded-md"
                  placeholderText="Select due date (optional)"
                  dateFormat="MMM d, yyyy"
                  minDate={new Date()}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStep} disabled={!newTaskTitle.trim()}>
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Delete Task Dialog */}
      <Dialog open={confirmStepIndex !== null} onOpenChange={() => setConfirmStepIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this task?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This cannot be undone. Are you sure you want to delete it?
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStepIndex(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => confirmStepIndex !== null && handleDeleteStep(confirmStepIndex)}>
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}