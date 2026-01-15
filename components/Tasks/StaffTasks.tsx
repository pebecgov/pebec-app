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
import { Edit, Calendar, User, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function StaffTasks() {
  const [selectedTask, setSelectedTask] = useState<Id<"tasks"> | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [taskDetails, setTaskDetails] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");

  const myTasks = useQuery(api.tasks.getMyTasks);
  const updateTaskDetails = useMutation(api.tasks.updateTaskDetails);
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);

  const handleOpenUpdateDialog = (task: any) => {
    setSelectedTask(task._id);
    setTaskDetails(task.taskDetails || "");
    setCompletionNotes(task.completionNotes || "");
    setProgress(task.progress || 0);
    setStatus(task.status);
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    try {
      await updateTaskDetails({
        taskId: selectedTask,
        taskDetails: taskDetails.trim() || undefined,
        completionNotes: completionNotes.trim() || undefined,
        progress: progress || undefined,
        status: status as "to_do" | "in_progress" | "done" | undefined
      });

      toast.success("Task updated successfully!");
      setIsUpdateDialogOpen(false);
      setSelectedTask(null);
      setTaskDetails("");
      setCompletionNotes("");
      setProgress(0);
      setStatus("");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task. Please try again.");
    }
  };

  const handleQuickStatusUpdate = async (taskId: Id<"tasks">, newStatus: "to_do" | "in_progress" | "done") => {
    try {
      await updateTaskStatus({ taskId, status: newStatus });
      toast.success("Task status updated!");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
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
    assigned: myTasks?.filter(t => t.status === "assigned" || t.status === "to_do") || [],
    in_progress: myTasks?.filter(t => t.status === "in_progress") || [],
    done: myTasks?.filter(t => t.status === "done") || []
  };

  const currentTask = myTasks?.find(t => t._id === selectedTask);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-1">View and update tasks assigned to you</p>
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
        <h2 className="text-xl font-semibold">Assigned Tasks</h2>
        {!myTasks ? (
          <div className="text-center py-8 text-gray-500">Loading tasks...</div>
        ) : myTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              You don't have any assigned tasks yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myTasks.map((task) => (
              <Card key={task._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Assigned by: {task.createdByName || "Admin"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status === "to_do" ? "To Do" : task.status === "in_progress" ? "In Progress" : task.status === "done" ? "Done" : "Assigned"}
                      </Badge>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority || "Medium"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {format(new Date(task.dueDate), "PPP")}
                        {new Date(task.dueDate) < new Date() && task.status !== "done" && (
                          <AlertCircle className="w-4 h-4 text-red-500 ml-1" />
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Created: {format(new Date(task.createdAt), "PPP")}
                    </div>
                  </div>

                  {task.taskDetails && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md mb-3">
                      <p className="text-sm font-medium text-blue-900 mb-1">Your Updates:</p>
                      <p className="text-sm text-blue-800">{task.taskDetails}</p>
                    </div>
                  )}

                  {task.progress !== undefined && task.progress > 0 && (
                    <div className="mt-3 mb-3">
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

                  {task.completionNotes && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md mb-3">
                      <p className="text-sm font-medium text-green-900 mb-1">Completion Notes:</p>
                      <p className="text-sm text-green-800">{task.completionNotes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    {task.status !== "to_do" && task.status !== "in_progress" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickStatusUpdate(task._id, "in_progress")}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Mark In Progress
                      </Button>
                    )}
                    {task.status !== "done" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickStatusUpdate(task._id, "done")}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Mark Done
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleOpenUpdateDialog(task)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Update Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Update Task Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Task: {currentTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_do">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
                placeholder="0-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Details / Updates
              </label>
              <Textarea
                value={taskDetails}
                onChange={(e) => setTaskDetails(e.target.value)}
                placeholder="Add updates, notes, or details about your progress on this task..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Notes (if marking as done)
              </label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add notes about task completion..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} className="bg-green-600 hover:bg-green-700">
              Save Updates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
