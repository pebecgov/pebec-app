// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, Calendar, User, AlertCircle } from "lucide-react";
import { formatWorkstream } from "@/lib/formatters";

export default function AdminTasks() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<Id<"users"> | null>(null);
  const [priority, setPriority] = useState<string>("Medium");
  const [dueDate, setDueDate] = useState("");

  const allTasks = useQuery(api.tasks.getAllTasks);
  const staffUsers = useQuery(api.tasks.getUsersByRole, { role: "staff" });
  const createTask = useMutation(api.tasks.createTask);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const handleCreateTask = async () => {
    if (!title.trim() || !selectedStaffId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const selectedStaff = staffUsers?.find(u => u._id === selectedStaffId);
    if (!selectedStaff) {
      toast.error("Selected staff member not found");
      return;
    }

    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assignedTo: selectedStaffId,
        assignedToName: `${selectedStaff.firstName || ""} ${selectedStaff.lastName || ""}`.trim() || "Staff Member",
        priority: priority || "Medium",
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined
      });

      toast.success("Task assigned successfully!");
      setIsCreateDialogOpen(false);
      setTitle("");
      setDescription("");
      setSelectedStaffId(null);
      setPriority("Medium");
      setDueDate("");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId: Id<"tasks">) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await deleteTask({ taskId });
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "assigned":
      case "to_do":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const tasksByStatus = {
    assigned: allTasks?.filter(t => t.status === "assigned" || t.status === "to_do") || [],
    in_progress: allTasks?.filter(t => t.status === "in_progress") || [],
    done: allTasks?.filter(t => t.status === "done") || []
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-600 mt-1">Assign and manage tasks for staff members</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Assign New Task
        </Button>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Assigned/To Do</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasksByStatus.assigned.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{tasksByStatus.in_progress.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tasksByStatus.done.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Tasks</h2>
        {!allTasks ? (
          <div className="text-center py-8 text-gray-500">Loading tasks...</div>
        ) : allTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No tasks yet. Create your first task to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {allTasks.map((task) => (
              <Card key={task._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Assigned to: {task.assignedToName || "Unassigned"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status === "to_do" ? "To Do" : task.status === "in_progress" ? "In Progress" : task.status === "done" ? "Done" : "Assigned"}
                      </Badge>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority || "Medium"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {format(new Date(task.dueDate), "PPP")}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Created by: {task.createdByName || "Admin"}
                    </div>
                    {task.completedAt && (
                      <div className="flex items-center gap-1 text-green-600">
                        Completed: {format(new Date(task.completedAt), "PPP")}
                      </div>
                    )}
                  </div>
                  {task.taskDetails && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-medium text-blue-900 mb-1">Staff Update:</p>
                      <p className="text-sm text-blue-800">{task.taskDetails}</p>
                    </div>
                  )}
                  {task.completionNotes && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md">
                      <p className="text-sm font-medium text-green-900 mb-1">Completion Notes:</p>
                      <p className="text-sm text-green-800">{task.completionNotes}</p>
                    </div>
                  )}
                  {task.progress !== undefined && task.progress > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description (optional)"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign To (Staff Member) *
              </label>
              <Select
                value={selectedStaffId || ""}
                onValueChange={(value) => setSelectedStaffId(value as Id<"users">)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers?.map((staff) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      {`${staff.firstName || ""} ${staff.lastName || ""}`.trim() || staff.email}
                      {staff.staffStream && ` (${formatWorkstream(staff.staffStream)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} className="bg-green-600 hover:bg-green-700">
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
