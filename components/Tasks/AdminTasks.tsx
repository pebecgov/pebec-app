// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Id as StorageId } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, Calendar, User, AlertCircle, CheckCircle2, XCircle, Hourglass, FileText, Download, MessageSquare, Clock, Inbox, Upload, MoreVertical, Eye, X, Archive } from "lucide-react";
import { formatWorkstream } from "@/lib/formatters";

export default function AdminTasks() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [customTaskId, setCustomTaskId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<Id<"users"> | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [receptionInboxIdForTask, setReceptionInboxIdForTask] = useState<Id<"reception_admin_documents"> | null>(null);
  const [prefilledReceptionFileName, setPrefilledReceptionFileName] = useState<string | null>(null);
  const [localAssignmentFile, setLocalAssignmentFile] = useState<File | null>(null);
  const [assignmentUploading, setAssignmentUploading] = useState(false);
  const [viewedPopupReceptionId, setViewedPopupReceptionId] = useState<Id<"reception_admin_documents"> | null>(null);
  const searchParams = useSearchParams();
  const [tasksMainTab, setTasksMainTab] = useState<"tasks" | "reception">("tasks");

  const allTasks = useQuery(api.tasks.getAllTasks);
  const staffUsers = useQuery(api.tasks.getUsersByRole, { role: "staff" });
  const adminUsers = useQuery(api.tasks.getUsersByRole, { role: "admin" });
  const currentUser = useQuery(api.users.getCurrentUsers);
  const createTask = useMutation(api.tasks.createTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const confirmTaskCompletion = useMutation(api.tasks.confirmTaskCompletion);
  const getCompletionDocumentUrl = useMutation(api.tasks.getCompletionDocumentUrl);
  const getReceptionDocumentUrl = useMutation(api.tasks.getReceptionDocumentUrl);
  const acknowledgeReceptionDocument = useMutation(api.tasks.acknowledgeReceptionDocument);
  const stashReceptionDocument = useMutation(api.tasks.stashReceptionDocument);
  const markReceptionDocumentViewed = useMutation(api.tasks.markReceptionDocumentViewed);
  const generateTaskAssignmentUploadUrl = useMutation(api.tasks.generateTaskAssignmentUploadUrl);


  /** Keep in sync with `AUTHORIZED_TASK_ADMIN_EMAILS` in `convex/tasks.ts`. */
  const AUTHORIZED_TASK_ADMIN_EMAILS = [
    "mickaelking2002@gmail.com",
    "zahrah.mustaphaaudu@pebec.gov.ng"
  ] as const;
  const isAuthorizedAdmin =
    !!currentUser?.email &&
    (AUTHORIZED_TASK_ADMIN_EMAILS as readonly string[]).includes(currentUser.email);

  // Only the specific admin can view pending requests
  const pendingRequestsQuery = useQuery(api.tasks.getPendingCompletionRequests);
  const receptionInboxDocuments = useQuery(
    api.tasks.listReceptionInboxDocuments,
    isAuthorizedAdmin ? {} : "skip"
  );
  // Only show pending requests if user is authorized admin
  const pendingRequests = isAuthorizedAdmin ? pendingRequestsQuery : undefined;

  const workstreams = [
    { value: "regulatory", label: "Regulatory" },
    { value: "sub_national", label: "Sub National" },
    { value: "innovation", label: "Innovation" },
    { value: "judiciary", label: "Judiciary" },
    { value: "communications", label: "Communications" },
    { value: "investments", label: "Investments" },
    { value: "receptionist", label: "Receptionist" },
    { value: "account", label: "Account" },
    { value: "auditor", label: "Auditor" },
    { value: "admin", label: "Admin" }
  ];

  const filteredStaff = selectedStream === "admin"
    ? adminUsers || []
    : selectedStream
      ? staffUsers?.filter(u => u.staffStream === selectedStream) || []
      : [];

  const allRelevantUsers = [...(staffUsers || []), ...(adminUsers || [])];

  const handleCreateTask = async () => {
    if (!title.trim() || !selectedStream) {
      toast.error("Please fill in task title and select a workstream");
      return;
    }

    if (dueDate) {
      const selectedDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        toast.error("Due date cannot be in the past");
        return;
      }
    }

    let assignedToName: string | undefined = undefined;
    if (selectedStaffId) {
      const selectedStaff = allRelevantUsers.find(u => u._id === selectedStaffId);
      if (selectedStaff) {
        assignedToName = `${selectedStaff.firstName || ""} ${selectedStaff.lastName || ""}`.trim() || selectedStaff.email;
      }
    }

    const dueMs = dueDate ? new Date(dueDate).getTime() : undefined;

    try {
      if (receptionInboxIdForTask) {
        await createTask({
          customTaskId: customTaskId.trim() || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          assignedStream: selectedStream || undefined,
          assignedTo: selectedStaffId || undefined,
          assignedToName: assignedToName,
          dueDate: dueMs,
          receptionInboxId: receptionInboxIdForTask
        });
      } else if (localAssignmentFile) {
        setAssignmentUploading(true);
        const uploadUrl = await generateTaskAssignmentUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": localAssignmentFile.type || "application/octet-stream" },
          body: localAssignmentFile
        });
        if (!response.ok) throw new Error("File upload failed");
        const { storageId } = await response.json();
        await createTask({
          customTaskId: customTaskId.trim() || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          assignedStream: selectedStream || undefined,
          assignedTo: selectedStaffId || undefined,
          assignedToName: assignedToName,
          dueDate: dueMs,
          assignmentDocumentId: storageId as StorageId<"_storage">,
          assignmentDocumentName: localAssignmentFile.name
        });
      } else {
        await createTask({
          customTaskId: customTaskId.trim() || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          assignedStream: selectedStream || undefined,
          assignedTo: selectedStaffId || undefined,
          assignedToName: assignedToName,
          dueDate: dueMs
        });
      }

      toast.success("Task assigned successfully!");
      setIsCreateDialogOpen(false);
      setCustomTaskId("");
      setTitle("");
      setDescription("");
      setSelectedStream(null);
      setSelectedStaffId(null);
      setDueDate("");
      setReceptionInboxIdForTask(null);
      setPrefilledReceptionFileName(null);
      setLocalAssignmentFile(null);
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setAssignmentUploading(false);
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

  const [selectedTaskForApproval, setSelectedTaskForApproval] = useState<Id<"tasks"> | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const handleOpenApprovalDialog = (taskId: Id<"tasks">, action: "approve" | "reject") => {
    setSelectedTaskForApproval(taskId);
    setApprovalAction(action);
    setAdminComment("");
    setIsApprovalDialogOpen(true);
  };

  const handleConfirmCompletion = async () => {
    if (!selectedTaskForApproval || !approvalAction) return;

    try {
      await confirmTaskCompletion({
        taskId: selectedTaskForApproval,
        approved: approvalAction === "approve",
        adminComment: adminComment.trim() || undefined
      });
      toast.success(approvalAction === "approve" ? "Task completion approved!" : "Task completion rejected.");
      setIsApprovalDialogOpen(false);
      setSelectedTaskForApproval(null);
      setApprovalAction(null);
      setAdminComment("");
    } catch (error: any) {
      console.error("Error confirming completion:", error);
      toast.error(error.message || "Failed to process completion request");
    }
  };

  const getDocumentUrl = async (storageId: string) => {
    try {
      const response = await fetch(`/api/storage/${storageId}`);
      // For now, we'll use a direct approach
      return null; // Will implement properly
    } catch (error) {
      return null;
    }
  };

  const getPriorityColor = (priority?: string) => {
    return "bg-gray-100 text-gray-800";
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
    assigned: allTasks?.filter(t => t.status === "assigned" || t.status === "to_do" || t.status === "in_progress") || [],
    in_progress: allTasks?.filter(t => t.status === "in_progress") || [],
    done: allTasks?.filter(t => t.status === "done") || []
  };

  const handleAssignTaskWithReceptionDoc = (doc: {
    _id: Id<"reception_admin_documents">;
    fileName: string;
    status: "pending" | "acknowledged" | "linked" | "stashed";
  }) => {
    if (doc.status !== "pending" && doc.status !== "acknowledged") {
      toast.error("This document cannot be assigned to a task");
      return;
    }
    setLocalAssignmentFile(null);
    setReceptionInboxIdForTask(doc._id);
    setPrefilledReceptionFileName(doc.fileName);
    setIsCreateDialogOpen(true);
  };

  const receptionStatusUi = (status: "pending" | "acknowledged" | "linked" | "stashed") => {
    switch (status) {
      case "pending":
        return { label: "Awaiting Action", className: "bg-orange-100 text-orange-700" };
      case "acknowledged":
        return { label: "Acknowledged", className: "bg-purple-100 text-purple-700" };
      case "linked":
        return { label: "Assigned", className: "bg-blue-100 text-blue-700" };
      case "stashed":
        return { label: "Stashed", className: "bg-gray-200 text-gray-700" };
      default:
        return { label: status, className: "bg-gray-100 text-gray-600" };
    }
  };

  const receptionAssignedLabel = (doc: {
    status: string;
    linkedTaskAssignedToName?: string;
    linkedTaskAssignedStream?: string;
  }) => {
    if (doc.status !== "linked") return "Not assigned";
    if (doc.linkedTaskAssignedToName) return doc.linkedTaskAssignedToName;
    if (doc.linkedTaskAssignedStream) {
      return `All ${formatWorkstream(doc.linkedTaskAssignedStream)} staff`;
    }
    return "Assigned";
  };

  const handleViewReceptionFile = async (receptionDocumentId: Id<"reception_admin_documents">) => {
    try {
      await markReceptionDocumentViewed({ receptionDocumentId });
      const url = await getReceptionDocumentUrl({ receptionDocumentId });
      if (url) window.open(url, "_blank");
      else toast.error("Could not open document");
    } catch (e: any) {
      toast.error(e.message || "Failed to open document");
    }
  };

  const RECEPTION_PAGE_SIZE = 20;
  const [receptionPage, setReceptionPage] = useState(0);
  const receptionTotal = receptionInboxDocuments?.length ?? 0;
  const receptionTotalPages = Math.max(1, Math.ceil(receptionTotal / RECEPTION_PAGE_SIZE));
  const receptionPageSafe = Math.min(receptionPage, receptionTotalPages - 1);
  const paginatedReceptionDocuments = useMemo(() => {
    if (!receptionInboxDocuments) return [];
    const start = receptionPageSafe * RECEPTION_PAGE_SIZE;
    return receptionInboxDocuments.slice(start, start + RECEPTION_PAGE_SIZE);
  }, [receptionInboxDocuments, receptionPageSafe]);

  useEffect(() => {
    if (receptionInboxDocuments === undefined) return;
    if (receptionPage > receptionTotalPages - 1) {
      setReceptionPage(Math.max(0, receptionTotalPages - 1));
    }
  }, [receptionInboxDocuments, receptionPage, receptionTotalPages]);

  useEffect(() => {
    if (!isAuthorizedAdmin) {
      setTasksMainTab("tasks");
      return;
    }
    if (searchParams.get("tab") === "reception") {
      setTasksMainTab("reception");
    }
  }, [isAuthorizedAdmin, searchParams]);

  return (
    <div className="p-6 space-y-6 min-w-0 w-full max-w-full">
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
      <div className={`grid grid-cols-1 gap-4 ${isAuthorizedAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
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
        {isAuthorizedAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests?.length || 0}</div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tasksByStatus.done.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tasksMainTab} onValueChange={(v) => setTasksMainTab(v as "tasks" | "reception")} className="w-full min-w-0 max-w-full">
        <TabsList className={`grid w-full ${isAuthorizedAdmin ? "max-w-lg grid-cols-2" : "max-w-xs grid-cols-1"}`}>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          {isAuthorizedAdmin && (
            <TabsTrigger value="reception" className="gap-1">
              <Inbox className="w-3.5 h-3.5" />
              Recieve Scanned Letters
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tasks" className="mt-6 space-y-6">
          {/* Pending Completion Requests - Only visible to authorized admin */}
          {isAuthorizedAdmin && pendingRequests && pendingRequests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Hourglass className="w-5 h-5 text-yellow-600" />
                <h2 className="text-xl font-semibold">Pending Completion Requests</h2>
                <Badge className="bg-yellow-100 text-yellow-800">{pendingRequests.length}</Badge>
              </div>
              <div className="space-y-3">
                {pendingRequests.map((task) => (
                  <Card key={task._id} className="border-yellow-200 bg-yellow-50/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {task.customTaskId && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {task.customTaskId}
                          </Badge>
                        )}
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        Assigned to: {task.assignedToName || (task.assignedStream ? `All ${formatWorkstream(task.assignedStream)} Staff` : "Unassigned")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Hourglass className="w-3 h-3 mr-1" />
                        Pending Approval
                      </Badge>
                      {task.dueDate && (
                        <CountdownTimer dueDate={task.dueDate} createdAt={task.createdAt} />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  )}
                  {task.taskDetails && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md mb-3">
                      <p className="text-sm font-medium text-blue-900 mb-1">Staff Update:</p>
                      <p className="text-sm text-blue-800">{task.taskDetails}</p>
                    </div>
                  )}
                  {task.completionNotes && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md mb-3">
                      <p className="text-sm font-medium text-green-900 mb-1">Completion Notes:</p>
                      <p className="text-sm text-green-800">{task.completionNotes}</p>
                    </div>
                  )}

                  {task.completionDocumentId && task.completionDocumentName && (
                    <div className="mt-3 mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <p className="text-sm font-medium text-purple-900 mb-2">Supporting Document:</p>
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-purple-800 flex-1">{task.completionDocumentName}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const url = await getCompletionDocumentUrl({
                                storageId: task.completionDocumentId!,
                                taskId: task._id
                              });
                              if (url) {
                                window.open(url, "_blank");
                              } else {
                                toast.error("Could not retrieve document");
                              }
                            } catch (error: any) {
                              toast.error(error.message || "Failed to open document");
                            }
                          }}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {format(new Date(task.dueDate), "PPP")}
                      </div>
                    )}
                    {task.completionRequestedAt && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Hourglass className="w-4 h-4" />
                        Requested: {format(new Date(task.completionRequestedAt), "PPP 'at' p")}
                      </div>
                    )}
                  </div>
                  <TaskUpdates taskId={task._id} />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleOpenApprovalDialog(task._id, "approve")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve Completion
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleOpenApprovalDialog(task._id, "reject")}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            </div>
          )}

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
                      <div className="flex items-center gap-2">
                        {task.customTaskId && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {task.customTaskId}
                          </Badge>
                        )}
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        Assigned to: {task.assignedToName || (task.assignedStream ? `All ${formatWorkstream(task.assignedStream)} Staff` : "Unassigned")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status === "to_do" ? "To Do" : task.status === "in_progress" ? "In Progress" : task.status === "done" ? "Done" : "Assigned"}
                      </Badge>
                      {task.status !== "done" && task.dueDate && (
                        <CountdownTimer dueDate={task.dueDate} createdAt={task.createdAt} />
                      )}
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
                  {task.assignmentDocumentId && task.assignmentDocumentName && (
                    <div className="mt-3 mb-3 p-3 bg-teal-50 border border-teal-200 rounded-md">
                      <p className="text-sm font-medium text-teal-900 mb-2">Reference document (assigned with task):</p>
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-600" />
                        <span className="text-sm text-teal-800 flex-1">{task.assignmentDocumentName}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const url = await getCompletionDocumentUrl({
                                storageId: task.assignmentDocumentId!,
                                taskId: task._id
                              });
                              if (url) window.open(url, "_blank");
                              else toast.error("Could not retrieve document");
                            } catch (error: any) {
                              toast.error(error.message || "Failed to open document");
                            }
                          }}
                          className="text-teal-700 hover:text-teal-800"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
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
                        Completed: {format(new Date(task.completedAt), "PPP 'at' p")}
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

                  {task.completionDocumentId && task.completionDocumentName && (
                    <div className="mt-3 mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <p className="text-sm font-medium text-purple-900 mb-2">Supporting Document:</p>
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-purple-800 flex-1">{task.completionDocumentName}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const url = await getCompletionDocumentUrl({
                                storageId: task.completionDocumentId!,
                                taskId: task._id
                              });
                              if (url) {
                                window.open(url, "_blank");
                              } else {
                                toast.error("Could not retrieve document");
                              }
                            } catch (error: any) {
                              toast.error(error.message || "Failed to open document");
                            }
                          }}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  )}
                  <TaskUpdates taskId={task._id} />
                </CardContent>
              </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {isAuthorizedAdmin && (
          <TabsContent value="reception" className="mt-6">
            <Card className="border-teal-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-teal-600" />
                  <CardTitle>Scanned Letters inbox</CardTitle>
                  <Badge className="bg-teal-100 text-teal-800">
                    {receptionInboxDocuments?.length || 0}
                  </Badge>
                </div>
                {/* <CardDescription>
                  Reception uploads and their status. View files to record first view; assign tasks or acknowledge as needed.
                </CardDescription> */}
              </CardHeader>
              <CardContent className="min-w-0">
                {!receptionInboxDocuments ? (
                  <div className="text-sm text-gray-500 py-4">Loading inbox...</div>
                ) : receptionInboxDocuments.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4">No documents yet.</div>
                ) : (
                  <div className="space-y-3 w-full min-w-0">
                  <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-gray-200 [-webkit-overflow-scrolling:touch]">
                    <table className="min-w-[1100px] w-max max-w-none text-sm whitespace-nowrap text-left">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3 font-medium">File Name</th>
                          <th className="p-3 font-medium">Uploaded By</th>
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Note</th>
                          <th className="p-3 font-medium">Files</th>
                          <th className="p-3 font-medium">Assigned To</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedReceptionDocuments.map((doc) => {
                          const statusUi = receptionStatusUi(doc.status);
                          return (
                            <tr key={doc._id} className="border-t border-gray-200">
                              <td className="p-3 font-medium max-w-[200px] truncate" title={doc.fileName}>
                                {doc.fileName}
                              </td>
                              <td className="p-3">{doc.uploaderName}</td>
                              <td className="p-3">{format(new Date(doc.createdAt), "PPP")}</td>
                              <td className="p-3 max-w-[220px]">
                                <span className="block truncate" title={doc.note || ""}>
                                  {doc.note || "—"}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!doc.storageId || doc.status === "stashed"}
                                    onClick={() => handleViewReceptionFile(doc._id)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                  {doc.viewedBy && doc.viewedByName && doc.viewedAt && (
                                    <div className="relative">
                                      <span
                                        className="text-xs text-green-600 flex items-center gap-1 cursor-pointer hover:text-green-700"
                                        title={`First viewed by ${doc.viewedByName} on ${format(new Date(doc.viewedAt), "PPP 'at' p")}`}
                                        onClick={() =>
                                          setViewedPopupReceptionId(
                                            viewedPopupReceptionId === doc._id ? null : doc._id
                                          )
                                        }
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        Viewed
                                      </span>
                                      {viewedPopupReceptionId === doc._id && (
                                        <div className="absolute left-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[250px]">
                                          <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-sm text-gray-700">First viewed by</h4>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setViewedPopupReceptionId(null);
                                              }}
                                              className="text-gray-400 hover:text-gray-600"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                          <p className="text-sm text-gray-800 font-medium">{doc.viewedByName}</p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {format(new Date(doc.viewedAt), "PPP 'at' p")}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                {doc.status === "linked" ? (
                                  <span>{receptionAssignedLabel(doc)}</span>
                                ) : (
                                  <span className="italic text-gray-400">Not assigned</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${statusUi.className}`}>
                                  {statusUi.label}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={doc.status !== "pending" && doc.status !== "acknowledged"}
                                    onClick={() => handleAssignTaskWithReceptionDoc(doc)}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Assign
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon" aria-label="More actions">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {doc.status === "pending" && (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            try {
                                              await acknowledgeReceptionDocument({ receptionDocumentId: doc._id });
                                              toast.success("Document acknowledged");
                                            } catch (e: any) {
                                              toast.error(e.message || "Failed to acknowledge document");
                                            }
                                          }}
                                        >
                                          <CheckCircle2 className="w-4 h-4 mr-2" />
                                          Acknowledge
                                        </DropdownMenuItem>
                                      )}
                                      {(doc.status === "pending" || doc.status === "acknowledged") && (
                                        <DropdownMenuItem
                                          className="text-red-600 focus:text-red-600"
                                          onClick={async () => {
                                            if (
                                              !confirm(
                                                "Stash this document? The file will be removed from storage and the row marked as stashed."
                                              )
                                            ) {
                                              return;
                                            }
                                            try {
                                              await stashReceptionDocument({ receptionDocumentId: doc._id });
                                              toast.success("Document stashed");
                                            } catch (e: any) {
                                              toast.error(e.message || "Failed to stash document");
                                            }
                                          }}
                                        >
                                          <Archive className="w-4 h-4 mr-2" />
                                          Stash
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {receptionTotalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                      <span>
                        Showing{" "}
                        <span className="font-medium text-gray-900">
                          {receptionTotal === 0 ? 0 : receptionPageSafe * RECEPTION_PAGE_SIZE + 1}
                          –
                          {Math.min(receptionPageSafe * RECEPTION_PAGE_SIZE + RECEPTION_PAGE_SIZE, receptionTotal)}
                        </span>{" "}
                        of <span className="font-medium text-gray-900">{receptionTotal}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={receptionPageSafe <= 0}
                          onClick={() => {
                            const maxP = Math.max(0, receptionTotalPages - 1);
                            setReceptionPage((p) => {
                              const cur = Math.min(p, maxP);
                              return Math.max(0, cur - 1);
                            });
                          }}
                        >
                          Previous
                        </Button>
                        <span className="tabular-nums px-1">
                          Page {receptionPageSafe + 1} of {receptionTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={receptionPageSafe >= receptionTotalPages - 1}
                          onClick={() => {
                            const maxP = Math.max(0, receptionTotalPages - 1);
                            setReceptionPage((p) => {
                              const cur = Math.min(p, maxP);
                              return Math.min(maxP, cur + 1);
                            });
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setReceptionInboxIdForTask(null);
            setPrefilledReceptionFileName(null);
            setLocalAssignmentFile(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {prefilledReceptionFileName && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-teal-900">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Attached:</span> {prefilledReceptionFileName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-teal-800"
                  onClick={() => {
                    setReceptionInboxIdForTask(null);
                    setPrefilledReceptionFileName(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            )}

            {!prefilledReceptionFileName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachment (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Upload a file to include with this assignment. Staff can download it from their task.
                </p>
                {localAssignmentFile ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-gray-800 truncate">
                      <FileText className="w-4 h-4 shrink-0 text-gray-600" />
                      {localAssignmentFile.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocalAssignmentFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      id="admin-task-attachment"
                      className="hidden"
                      accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setLocalAssignmentFile(file);
                        if (file) {
                          setReceptionInboxIdForTask(null);
                          setPrefilledReceptionFileName(null);
                        }
                        e.target.value = "";
                      }}
                    />
                    <label
                      htmlFor="admin-task-attachment"
                      className="cursor-pointer flex flex-col items-center gap-2 text-sm text-gray-600"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span>Click to choose a file</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols gap-4">
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task ID (Optional)
                </label>
                <Input
                  value={customTaskId}
                  onChange={(e) => setCustomTaskId(e.target.value)}
                  placeholder="e.g. TASK-001"
                />
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <Input
                  className="border border-gray-300 rounded-md px-3 py-2 "
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description (optional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To Workstream *
                </label>
                <Select
                  value={selectedStream || ""}
                  onValueChange={(value) => {
                    setSelectedStream(value);
                    setSelectedStaffId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workstream" />
                  </SelectTrigger>
                  <SelectContent>
                    {workstreams.map((stream) => (
                      <SelectItem key={stream.value} value={stream.value}>
                        {formatWorkstream(stream.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStream && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Staff (Optional)
                  </label>
                  <Select
                    value={selectedStaffId || "all"}
                    onValueChange={(value) => setSelectedStaffId(value === "all" ? null : value as Id<"users">)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`All ${formatWorkstream(selectedStream)} Staff`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {filteredStaff.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {`${staff.firstName || ""} ${staff.lastName || ""}`.trim() || staff.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={assignmentUploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {assignmentUploading ? "Uploading…" : "Assign Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval/Rejection Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve Task Completion" : "Reject Task Completion"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalAction === "approve" ? "Approval Note (Optional)" : "Rejection Reason (Required)"}
              </label>
              <Textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder={
                  approvalAction === "approve"
                    ? "Add any additional notes or instructions for the staff member..."
                    : "Please provide a reason for rejecting this completion request..."
                }
                rows={4}
                className={approvalAction === "reject" && !adminComment.trim() ? "border-red-300" : ""}
              />
              {approvalAction === "reject" && (
                <p className="text-xs text-gray-500 mt-1">
                  Providing a reason helps staff understand what needs to be corrected.
                </p>
              )}
              {approvalAction === "approve" && (
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Add any follow-up information or next steps for the staff member.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsApprovalDialogOpen(false);
              setSelectedTaskForApproval(null);
              setApprovalAction(null);
              setAdminComment("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCompletion}
              className={
                approvalAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              disabled={approvalAction === "reject" && !adminComment.trim()}
            >
              {approvalAction === "approve" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CountdownTimer({ dueDate, createdAt }: { dueDate: number, createdAt: number }) {
  const [now, setNow] = useState(Date.now());

  useState(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // Update every minute
    return () => clearInterval(interval);
  });

  const total = dueDate - createdAt;
  const remaining = dueDate - now;
  const ratio = remaining / total;

  let color = "bg-green-100 text-green-800";
  let label = "";

  if (remaining < 0) {
    color = "bg-red-100 text-red-800";
    label = "Overdue";
  } else {
    // Calculate days/hours remaining
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      label = `${days}d ${hours}h remaining`;
    } else {
      label = `${hours}h remaining`;
    }

    if (ratio <= 0.2) {
      color = "bg-red-100 text-red-800";
    } else if (ratio <= 0.5) {
      color = "bg-yellow-100 text-yellow-800";
    }
  }

  return (
    <Badge className={color}>
      <Clock className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function TaskUpdates({ taskId }: { taskId: Id<"tasks"> }) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);

  const updates = useQuery(api.tasks.getTaskUpdates, { taskId });
  const addTaskUpdate = useMutation(api.tasks.addTaskUpdate);

  useEffect(() => {
    const seenCount = parseInt(localStorage.getItem(`task_updates_seen_${taskId}`) || "0");
    if (updates && updates.length > seenCount && !showUpdates) {
      setHasNewUpdates(true);
    }
  }, [updates, taskId, showUpdates]);

  const handleToggleUpdates = () => {
    const newShowUpdates = !showUpdates;
    setShowUpdates(newShowUpdates);
    if (newShowUpdates && updates) {
      localStorage.setItem(`task_updates_seen_${taskId}`, updates.length.toString());
      setHasNewUpdates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addTaskUpdate({
        taskId,
        content: newComment.trim()
      });
      setNewComment("");
      toast.success("Update posted!");
      // After posting, mark as seen
      if (updates) {
        localStorage.setItem(`task_updates_seen_${taskId}`, (updates.length + 1).toString());
      }
    } catch (error) {
      console.error("Error posting update:", error);
      toast.error("Failed to post update");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <button
        onClick={handleToggleUpdates}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2 relative"
      >
        <MessageSquare className="w-4 h-4" />
        Add a Comment or Escalation ({updates?.length || 0})
        {hasNewUpdates && (
          <span className="absolute -top-1 -right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      {showUpdates && (
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-3 mb-4">
            {!updates ? (
              <p className="text-xs text-center text-gray-500 py-2">Loading updates...</p>
            ) : updates.length === 0 ? (
              <p className="text-xs text-center text-gray-500 py-2">No updates yet.</p>
            ) : (
              updates.map((update: any) => (
                <div key={update._id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-gray-900">{update.authorName}</span>
                    <span className="text-[10px] text-gray-500">{format(new Date(update.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{update.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add an update or reply..."
              className="text-sm"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              Post
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
