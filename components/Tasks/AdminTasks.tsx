// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
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
import { Plus, Trash2, Calendar, User, AlertCircle, CheckCircle2, XCircle, Hourglass, FileText, Download, MessageSquare, Clock, Inbox, Upload, MoreVertical, Eye, X, File, Droplets, Search, Users } from "lucide-react";
import { formatWorkstream } from "@/lib/formatters";
import { isAuthorizedTaskAdmin as isAuthorizedTaskAdminClient } from "@/lib/authorizedTaskAdmins";
import { fuelDriverLabel } from "@/lib/fuelDrivers";
import { fuelCarLabel } from "@/lib/fuelCars";
import { getCompletionDocumentsFromTask } from "@/lib/taskCompletionDocuments";
import { TaskCompletionDocumentsPanel } from "@/components/Tasks/TaskCompletionDocumentsPanel";

type TaskParticipant = { type: "workstream" | "staff"; id: string; name: string };

type TaskStatusFilter =
  | "all"
  | "assigned_todo"
  | "in_progress"
  | "pending_approval"
  | "not_requested_approval"
  | "completed";

const TASK_STATUS_TABS: { label: string; value: TaskStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Assigned / To Do", value: "assigned_todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Pending Approval", value: "pending_approval" },
  { label: "Not Requested Approval", value: "not_requested_approval" },
  { label: "Completed", value: "completed" }
];

export default function AdminTasks() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [customTaskId, setCustomTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [taskParticipants, setTaskParticipants] = useState<TaskParticipant[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [receptionInboxIdForTask, setReceptionInboxIdForTask] = useState<Id<"reception_admin_documents"> | null>(null);
  const [prefilledReceptionFileName, setPrefilledReceptionFileName] = useState<string | null>(null);
  const [localAssignmentFile, setLocalAssignmentFile] = useState<File | null>(null);
  const [assignmentUploading, setAssignmentUploading] = useState(false);
  const [viewedPopupReceptionId, setViewedPopupReceptionId] = useState<Id<"reception_admin_documents"> | null>(null);
  const searchParams = useSearchParams();
  const [tasksMainTab, setTasksMainTab] = useState<"tasks" | "reception" | "fuel">("tasks");
  const [editAssigneesTaskId, setEditAssigneesTaskId] = useState<Id<"tasks"> | null>(null);
  const [isEditAssigneesDialogOpen, setIsEditAssigneesDialogOpen] = useState(false);
  const [editTaskParticipants, setEditTaskParticipants] = useState<TaskParticipant[]>([]);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [savingAssignees, setSavingAssignees] = useState(false);
  const assigneesHydratedForTaskRef = useRef<Id<"tasks"> | null>(null);

  const taskAssigneesData = useQuery(
    api.tasks.getTaskAssignees,
    editAssigneesTaskId ? { taskId: editAssigneesTaskId } : "skip"
  );

  const allTasks = useQuery(api.tasks.getAllTasks);
  const staffUsers = useQuery(api.tasks.getUsersByRole, { role: "staff" });
  const adminUsers = useQuery(api.tasks.getUsersByRole, { role: "admin" });
  const currentUser = useQuery(api.users.getCurrentUsers);
  const createTasks = useMutation(api.tasks.createTasks);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const updateTaskAssignees = useMutation(api.tasks.updateTaskAssignees);
  const confirmTaskCompletion = useMutation(api.tasks.confirmTaskCompletion);
  const getCompletionDocumentUrl = useMutation(api.tasks.getCompletionDocumentUrl);
  const getReceptionDocumentUrl = useMutation(api.tasks.getReceptionDocumentUrl);
  const acknowledgeReceptionDocument = useMutation(api.tasks.acknowledgeReceptionDocument);
  const fileReceptionDocument = useMutation(api.tasks.fileReceptionDocument);
  const markReceptionDocumentViewed = useMutation(api.tasks.markReceptionDocumentViewed);
  const generateTaskAssignmentUploadUrl = useMutation(api.tasks.generateTaskAssignmentUploadUrl);
  const isAuthorizedAdmin = isAuthorizedTaskAdminClient(currentUser ?? null);
  const fuelRequests = useQuery(api.fuel_requests.listFuelRequests, isAuthorizedAdmin ? {} : "skip");
  const approveFuelRequest = useMutation(api.fuel_requests.approveFuelRequest);

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
    { value: "logistics", label: "Logistics" },
    { value: "admin", label: "Admin" }
  ];

  const WORKSTREAM_IDS = workstreams.map((w) => w.value);

  const staffMembers = useMemo(() => {
    const list = [...(staffUsers ?? []), ...(adminUsers ?? [])];
    return list.sort((a, b) => {
      const nameA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.toLowerCase();
      const nameB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [staffUsers, adminUsers]);

  const getCompletionRequesterName = (task: any) => {
    if (!task.completionRequestedBy) return null;
    const requester = staffMembers.find((member) => member._id === task.completionRequestedBy);
    if (!requester) return "Staff member";
    return `${requester.firstName ?? ""} ${requester.lastName ?? ""}`.trim() || requester.email || "Staff member";
  };

  /** Convex requires `title`; derive it from description and/or attachment name. */
  const buildTaskTitle = (
    desc: string,
    attachmentName: string | null | undefined
  ): string => {
    const t = desc.trim();
    if (t) {
      const firstLine = t.split(/\r?\n/).find((line) => line.trim())?.trim() ?? t;
      return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
    }
    const name = attachmentName?.trim();
    if (name) return name.length > 120 ? `${name.slice(0, 117)}...` : name;
    return "Task assignment";
  };

  const handleCreateTask = async () => {
    const descTrim = description.trim();
    const attachmentLabel =
      prefilledReceptionFileName ?? localAssignmentFile?.name ?? null;
    if (!descTrim && !attachmentLabel) {
      toast.error("Add a description or attach a document");
      return;
    }

    if (taskParticipants.length === 0) {
      toast.error("Add at least one workstream or staff member");
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

    const dueMs = dueDate ? new Date(dueDate).getTime() : undefined;

    const resolvedTitle = buildTaskTitle(description, attachmentLabel);

    const participants = taskParticipants.map((p) =>
      p.type === "workstream"
        ? { type: "workstream" as const, id: p.id }
        : { type: "staff" as const, userId: p.id as Id<"users"> }
    );

    const basePayload = {
      customTaskId: customTaskId.trim() || undefined,
      title: resolvedTitle,
      description: descTrim || undefined,
      dueDate: dueMs,
      participants
    };

    try {
      if (receptionInboxIdForTask) {
        await createTasks({
          ...basePayload,
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
        await createTasks({
          ...basePayload,
          assignmentDocumentId: storageId as StorageId<"_storage">,
          assignmentDocumentName: localAssignmentFile.name
        });
      } else {
        await createTasks(basePayload);
      }

      toast.success("Task assigned successfully!");
      setIsCreateDialogOpen(false);
      setCustomTaskId("");
      setDescription("");
      setTaskParticipants([]);
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

  const handleOpenEditAssignees = (task: { _id: Id<"tasks">; title: string }) => {
    assigneesHydratedForTaskRef.current = null;
    setEditAssigneesTaskId(task._id);
    setEditingTaskTitle(task.title);
    setEditTaskParticipants([]);
    setIsEditAssigneesDialogOpen(true);
  };

  useEffect(() => {
    if (!isEditAssigneesDialogOpen || !editAssigneesTaskId || !taskAssigneesData) return;
    if (assigneesHydratedForTaskRef.current === editAssigneesTaskId) return;

    assigneesHydratedForTaskRef.current = editAssigneesTaskId;
    setEditTaskParticipants(
      taskAssigneesData.participants.map((participant) =>
        participant.type === "workstream"
          ? { type: "workstream", id: participant.id, name: participant.id }
          : { type: "staff", id: participant.userId, name: participant.name }
      )
    );
  }, [isEditAssigneesDialogOpen, editAssigneesTaskId, taskAssigneesData]);

  const handleSaveAssignees = async () => {
    if (!editAssigneesTaskId) return;

    if (editTaskParticipants.length === 0) {
      const confirmed = window.confirm(
        "Remove all assignees from this task? It will be unassigned until you add someone again."
      );
      if (!confirmed) return;
    }

    const participants = editTaskParticipants.map((p) =>
      p.type === "workstream"
        ? { type: "workstream" as const, id: p.id }
        : { type: "staff" as const, userId: p.id as Id<"users"> }
    );

    try {
      setSavingAssignees(true);
      const result = await updateTaskAssignees({
        taskId: editAssigneesTaskId,
        participants
      });
      toast.success(
        result.totalAssignees === 0
          ? "All assignees removed."
          : `Assignees updated (${result.totalAssignees} total).`
      );
      setIsEditAssigneesDialogOpen(false);
      setEditAssigneesTaskId(null);
      setEditTaskParticipants([]);
      assigneesHydratedForTaskRef.current = null;
    } catch (error: any) {
      console.error("Error updating assignees:", error);
      toast.error(error.message || "Failed to update assignees");
    } finally {
      setSavingAssignees(false);
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
    status: "pending" | "acknowledged" | "linked" | "file" | "stashed";
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

  const receptionStatusUi = (status: "pending" | "acknowledged" | "linked" | "file" | "stashed") => {
    switch (status) {
      case "pending":
        return { label: "Awaiting Action", className: "bg-orange-100 text-orange-700" };
      case "acknowledged":
        return { label: "Acknowledged", className: "bg-purple-100 text-purple-700" };
      case "linked":
        return { label: "Assigned", className: "bg-blue-100 text-blue-700" };
      case "file":
      case "stashed":
        return { label: "File", className: "bg-gray-200 text-gray-700" };
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

  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [tasksListTab, setTasksListTab] = useState<"active" | "completed">("active");
  const TASK_PAGE_SIZE = 20;
  const [activeTasksPage, setActiveTasksPage] = useState(0);
  const [completedTasksPage, setCompletedTasksPage] = useState(0);
  const [tasksSearch, setTasksSearch] = useState("");
  const tasksListRef = useRef<HTMLDivElement>(null);

  const staffSearchIndex = useMemo(() => {
    return staffMembers.map((member) => ({
      _id: member._id,
      staffStream: member.staffStream,
      searchText: [
        member.firstName,
        member.lastName,
        `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim(),
        member.email
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
    }));
  }, [staffMembers]);

  const applyStatusFilter = (filter: TaskStatusFilter) => {
    setStatusFilter((prev) => {
      const next = prev === filter && filter !== "all" ? "all" : filter;
      if (next === "completed") {
        setTasksListTab("completed");
      } else if (next !== "all") {
        setTasksListTab("active");
      }
      if (next !== "all") {
        setTimeout(() => {
          tasksListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
      return next;
    });
  };

  const resetTaskFilters = () => {
    setTasksSearch("");
    setStatusFilter("all");
    setDateRange({ start: "", end: "" });
    setTasksListTab("active");
  };

  const filterTasksBySearch = useMemo(() => {
    const term = tasksSearch.trim().toLowerCase();
    if (!term) {
      return (tasks: any[]) => tasks;
    }

    const matchingStaffIds = new Set(
      staffSearchIndex.filter((member) => member.searchText.includes(term)).map((member) => member._id)
    );

    return (tasks: any[]) =>
      tasks.filter((task) =>
        taskMatchesAdminSearch(task, term, matchingStaffIds, staffSearchIndex)
      );
  }, [tasksSearch, staffSearchIndex]);

  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(
      (task) =>
        taskMatchesStatusFilter(task, statusFilter) &&
        taskMatchesDateRange(task, dateRange) &&
        filterTasksBySearch([task]).length > 0
    );
  }, [allTasks, statusFilter, dateRange, filterTasksBySearch]);

  const activeTabTasks = useMemo(() => {
    if (statusFilter === "completed") return [];
    if (statusFilter !== "all") return filteredTasks;
    return filteredTasks.filter((t) => t.status !== "done");
  }, [filteredTasks, statusFilter]);

  const completedTabTasks = useMemo(() => {
    if (statusFilter !== "all" && statusFilter !== "completed") return [];
    if (statusFilter === "completed") return filteredTasks;
    return filteredTasks.filter((t) => t.status === "done");
  }, [filteredTasks, statusFilter]);

  const activeTasksTotalPages = Math.max(1, Math.ceil(activeTabTasks.length / TASK_PAGE_SIZE));
  const activeTasksPageSafe = Math.min(activeTasksPage, activeTasksTotalPages - 1);
  const paginatedActiveTasks = useMemo(() => {
    const start = activeTasksPageSafe * TASK_PAGE_SIZE;
    return activeTabTasks.slice(start, start + TASK_PAGE_SIZE);
  }, [activeTabTasks, activeTasksPageSafe]);

  const completedTasksTotalPages = Math.max(1, Math.ceil(completedTabTasks.length / TASK_PAGE_SIZE));
  const completedTasksPageSafe = Math.min(completedTasksPage, completedTasksTotalPages - 1);
  const paginatedCompletedTasks = useMemo(() => {
    const start = completedTasksPageSafe * TASK_PAGE_SIZE;
    return completedTabTasks.slice(start, start + TASK_PAGE_SIZE);
  }, [completedTabTasks, completedTasksPageSafe]);

  const handleExportTasksExcel = () => {
    const tasksToExport = tasksListTab === "completed" ? completedTabTasks : activeTabTasks;
    if (tasksToExport.length === 0) {
      toast.error("No tasks to export with the current filters.");
      return;
    }

    const data = tasksToExport.map((task) => ({
      Title: task.title,
      Status: getTaskStatusLabel(task),
      "Assigned To":
        task.assignedToName ||
        (task.assignedStream ? `All ${formatWorkstream(task.assignedStream)} Staff` : "Unassigned"),
      "Due Date": task.dueDate ? format(new Date(task.dueDate), "PPP") : "—",
      "Created At": format(new Date(task.createdAt), "PPP 'at' p"),
      "Created By": task.createdByName || "Admin",
      "Completed At": task.completedAt ? format(new Date(task.completedAt), "PPP 'at' p") : "—",
      Description: task.description ?? "—"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    XLSX.writeFile(workbook, `tasks-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success(`Exported ${tasksToExport.length} task(s) to Excel.`);
  };

  useEffect(() => {
    setActiveTasksPage(0);
    setCompletedTasksPage(0);
  }, [statusFilter, tasksListTab, tasksSearch, dateRange]);

  useEffect(() => {
    if (activeTasksPage > activeTasksTotalPages - 1) {
      setActiveTasksPage(Math.max(0, activeTasksTotalPages - 1));
    }
  }, [activeTabTasks, activeTasksPage, activeTasksTotalPages]);

  useEffect(() => {
    if (completedTasksPage > completedTasksTotalPages - 1) {
      setCompletedTasksPage(Math.max(0, completedTasksTotalPages - 1));
    }
  }, [completedTabTasks, completedTasksPage, completedTasksTotalPages]);

  const RECEPTION_PAGE_SIZE = 20;
  const [receptionPage, setReceptionPage] = useState(0);
  const [receptionSearch, setReceptionSearch] = useState("");
  const filteredReceptionDocuments = useMemo(() => {
    if (!receptionInboxDocuments) return [];
    const term = receptionSearch.trim().toLowerCase();
    if (!term) return receptionInboxDocuments;
    return receptionInboxDocuments.filter((doc) =>
      doc.fileName.toLowerCase().includes(term)
    );
  }, [receptionInboxDocuments, receptionSearch]);
  const receptionTotal = filteredReceptionDocuments.length;
  const receptionTotalPages = Math.max(1, Math.ceil(receptionTotal / RECEPTION_PAGE_SIZE));
  const receptionPageSafe = Math.min(receptionPage, receptionTotalPages - 1);
  const paginatedReceptionDocuments = useMemo(() => {
    const start = receptionPageSafe * RECEPTION_PAGE_SIZE;
    return filteredReceptionDocuments.slice(start, start + RECEPTION_PAGE_SIZE);
  }, [filteredReceptionDocuments, receptionPageSafe]);

  useEffect(() => {
    setReceptionPage(0);
  }, [receptionSearch]);

  useEffect(() => {
    if (receptionInboxDocuments === undefined) return;
    if (receptionPage > receptionTotalPages - 1) {
      setReceptionPage(Math.max(0, receptionTotalPages - 1));
    }
  }, [receptionInboxDocuments, filteredReceptionDocuments, receptionPage, receptionTotalPages]);

  useEffect(() => {
    if (!isAuthorizedAdmin) {
      setTasksMainTab("tasks");
      return;
    }
    if (searchParams.get("tab") === "reception") {
      setTasksMainTab("reception");
    }
    if (searchParams.get("tab") === "fuel") {
      setTasksMainTab("fuel");
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
        <button
          type="button"
          onClick={() => applyStatusFilter("assigned_todo")}
          className={`text-left rounded-lg border bg-card shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusFilter === "assigned_todo" ? "ring-2 ring-gray-800 border-gray-800" : "hover:border-gray-400"}`}
        >
          <div className="p-6 pb-3">
            <p className="text-sm font-medium text-gray-600">Assigned/To Do</p>
          </div>
          <div className="px-6 pb-6">
            <div className="text-2xl font-bold">{tasksByStatus.assigned.length}</div>
            {statusFilter === "assigned_todo" && <p className="text-xs text-gray-500 mt-1">Filtering active</p>}
          </div>
        </button>
        <button
          type="button"
          onClick={() => applyStatusFilter("in_progress")}
          className={`text-left rounded-lg border bg-card shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusFilter === "in_progress" ? "ring-2 ring-blue-600 border-blue-600" : "hover:border-gray-400"}`}
        >
          <div className="p-6 pb-3">
            <p className="text-sm font-medium text-gray-600">In Progress</p>
          </div>
          <div className="px-6 pb-6">
            <div className="text-2xl font-bold text-blue-600">{tasksByStatus.in_progress.length}</div>
            {statusFilter === "in_progress" && <p className="text-xs text-blue-500 mt-1">Filtering active</p>}
          </div>
        </button>
        {isAuthorizedAdmin && (
          <button
            type="button"
            onClick={() => applyStatusFilter("pending_approval")}
            className={`text-left rounded-lg border bg-card shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusFilter === "pending_approval" ? "ring-2 ring-yellow-500 border-yellow-500" : "hover:border-gray-400"}`}
          >
            <div className="p-6 pb-3">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
            </div>
            <div className="px-6 pb-6">
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests?.length || 0}</div>
              {statusFilter === "pending_approval" && <p className="text-xs text-yellow-600 mt-1">Filtering active</p>}
            </div>
          </button>
        )}
        <button
          type="button"
          onClick={() => applyStatusFilter("completed")}
          className={`text-left rounded-lg border bg-card shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusFilter === "completed" || (statusFilter === "all" && tasksListTab === "completed") ? "ring-2 ring-green-600 border-green-600" : "hover:border-gray-400"}`}
        >
          <div className="p-6 pb-3">
            <p className="text-sm font-medium text-gray-600">Completed</p>
          </div>
          <div className="px-6 pb-6">
            <div className="text-2xl font-bold text-green-600">{tasksByStatus.done.length}</div>
            {(statusFilter === "completed" || (statusFilter === "all" && tasksListTab === "completed")) && (
              <p className="text-xs text-green-600 mt-1">Viewing completed</p>
            )}
          </div>
        </button>
      </div>

      <Tabs value={tasksMainTab} onValueChange={(v) => setTasksMainTab(v as "tasks" | "reception" | "fuel")} className="w-full min-w-0 max-w-full">
        <TabsList className={`grid w-full ${isAuthorizedAdmin ? "max-w-2xl grid-cols-3" : "max-w-xs grid-cols-1"}`}>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          {isAuthorizedAdmin && (
            <TabsTrigger value="reception" className="gap-1">
              <Inbox className="w-3.5 h-3.5" />
              Recieve Scanned Letters
            </TabsTrigger>
          )}
          {isAuthorizedAdmin && (
            <TabsTrigger value="fuel" className="gap-1">
              <Droplets className="w-3.5 h-3.5" />
              Fuel
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditAssignees(task)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Manage assignees"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
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
                      {getCompletionRequesterName(task) && (
                        <p className="text-xs text-green-700 mb-1">
                          Submitted by: {getCompletionRequesterName(task)}
                        </p>
                      )}
                      <p className="text-sm text-green-800">{task.completionNotes}</p>
                    </div>
                  )}

                  <AdminTaskCompletionDocuments
                    task={task}
                    getCompletionDocumentUrl={getCompletionDocumentUrl}
                  />
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
          <div className="space-y-4" ref={tasksListRef}>
            <div className="bg-zinc-800 text-white p-4 rounded-xl shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-end sm:flex-wrap gap-4">
                <div className="flex-1 min-w-[250px] sm:max-w-xs">
                  <div className="relative h-12">
                    <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={tasksSearch}
                      onChange={(e) => setTasksSearch(e.target.value)}
                      className="pl-10 pr-3 py-2 w-full h-full bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      placeholder="Search by task title or assignee name"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-56 h-12">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      const filter = value as TaskStatusFilter;
                      setStatusFilter(filter);
                      if (filter === "completed") {
                        setTasksListTab("completed");
                      } else if (filter !== "all") {
                        setTasksListTab("active");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-full bg-zinc-700 text-white border-zinc-600">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 text-white">
                      {TASK_STATUS_TABS.filter(
                        (tab) => tab.value !== "pending_approval" || isAuthorizedAdmin
                      ).map((tab) => (
                        <SelectItem key={tab.value} value={tab.value}>
                          {tab.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex flex-col w-full sm:w-40">
                    <label className="text-xs text-zinc-300 mb-1">From</label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setDateRange((prev) => ({
                          ...prev,
                          start: newStart,
                          end: prev.end && prev.end < newStart ? "" : prev.end
                        }));
                      }}
                      className="bg-zinc-700 text-white border border-zinc-600 h-12"
                    />
                  </div>
                  <div className="flex flex-col w-full sm:w-40">
                    <label className="text-xs text-zinc-300 mb-1">To</label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      min={dateRange.start || undefined}
                      onChange={(e) => {
                        setDateRange((prev) => ({ ...prev, end: e.target.value }));
                      }}
                      className="bg-zinc-700 text-white border border-zinc-600 h-12"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <Button
                    onClick={resetTaskFilters}
                    variant="outline"
                    className="bg-white text-black hover:bg-zinc-100 h-12"
                  >
                    Reset
                  </Button>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700 h-12"
                    onClick={handleExportTasksExcel}
                  >
                    Export Excel
                  </Button>
                </div>
              </div>
            </div>
            {(tasksSearch.trim() || statusFilter !== "all" || dateRange.start || dateRange.end) && (
              <p className="text-sm text-gray-500">
                Showing filtered results
                {tasksSearch.trim() && (
                  <>
                    {" "}
                    matching <span className="font-medium text-gray-800">&quot;{tasksSearch.trim()}&quot;</span>
                  </>
                )}
                {" "}
                in {tasksListTab === "active" ? "active" : "completed"} tasks.
              </p>
            )}
            <Tabs
              value={tasksListTab}
              onValueChange={(value) => {
                setTasksListTab(value as "active" | "completed");
                if (value === "completed" && statusFilter !== "completed") {
                  setStatusFilter("all");
                }
                if (value === "active" && statusFilter === "completed") {
                  setStatusFilter("all");
                }
              }}
              className="w-full"
            >
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="active">Active Tasks</TabsTrigger>
                <TabsTrigger value="completed">Completed Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {statusFilter === "assigned_todo" && "Assigned / To Do Tasks"}
                    {statusFilter === "in_progress" && "In Progress Tasks"}
                    {statusFilter === "pending_approval" && "Pending Approval Tasks"}
                    {statusFilter === "not_requested_approval" && "Not Requested Approval Tasks"}
                    {statusFilter === "all" && "Active Tasks"}
                    {statusFilter === "completed" && "Completed Tasks"}
                  </h2>
                  {statusFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear filter
                    </button>
                  )}
                </div>
                {!allTasks ? (
                  <div className="text-center py-8 text-gray-500">Loading tasks...</div>
                ) : activeTabTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      {tasksSearch.trim() || statusFilter !== "all" || dateRange.start || dateRange.end
                        ? "No active tasks match your filters."
                        : "No active tasks yet. Create your first task to get started."}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedActiveTasks.map((task) => (
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
                        onClick={() => handleOpenEditAssignees(task)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Manage assignees"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
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
                      Created by: {task.createdByName || "Admin"} • {format(new Date(task.createdAt), "PPP 'at' p")}
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
                      {getCompletionRequesterName(task) && (
                        <p className="text-xs text-green-700 mb-1">
                          Submitted by: {getCompletionRequesterName(task)}
                        </p>
                      )}
                      <p className="text-sm text-green-800">{task.completionNotes}</p>
                    </div>
                  )}

                  <AdminTaskCompletionDocuments
                    task={task}
                    getCompletionDocumentUrl={getCompletionDocumentUrl}
                  />
                  <TaskUpdates taskId={task._id} />
                </CardContent>
              </Card>
                      ))}
                    </div>
                    <TaskListPagination
                      page={activeTasksPageSafe}
                      totalPages={activeTasksTotalPages}
                      total={activeTabTasks.length}
                      pageSize={TASK_PAGE_SIZE}
                      onPrevious={() => {
                        const maxP = Math.max(0, activeTasksTotalPages - 1);
                        setActiveTasksPage((p) => Math.max(0, Math.min(p, maxP) - 1));
                      }}
                      onNext={() => {
                        const maxP = Math.max(0, activeTasksTotalPages - 1);
                        setActiveTasksPage((p) => Math.min(maxP, Math.min(p, maxP) + 1));
                      }}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-4 space-y-4">
                <h2 className="text-xl font-semibold">Completed Tasks</h2>
                {!allTasks ? (
                  <div className="text-center py-8 text-gray-500">Loading tasks...</div>
                ) : completedTabTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      {tasksSearch.trim() || statusFilter !== "all" || dateRange.start || dateRange.end
                        ? "No completed tasks match your filters."
                        : "No completed tasks yet."}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedCompletedTasks.map((task) => (
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
                                <Badge className="bg-green-100 text-green-800">Done</Badge>
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
                                Created by: {task.createdByName || "Admin"} • {format(new Date(task.createdAt), "PPP 'at' p")}
                              </div>
                              {task.completedAt && (
                                <div className="flex items-center gap-1 text-green-600">
                                  Completed: {format(new Date(task.completedAt), "PPP 'at' p")}
                                </div>
                              )}
                            </div>
                            {task.completionNotes && (
                              <div className="mt-3 p-3 bg-green-50 rounded-md">
                                <p className="text-sm font-medium text-green-900 mb-1">Completion Notes:</p>
                                {getCompletionRequesterName(task) && (
                                  <p className="text-xs text-green-700 mb-1">
                                    Submitted by: {getCompletionRequesterName(task)}
                                  </p>
                                )}
                                <p className="text-sm text-green-800">{task.completionNotes}</p>
                              </div>
                            )}
                            <TaskUpdates taskId={task._id} />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <TaskListPagination
                      page={completedTasksPageSafe}
                      totalPages={completedTasksTotalPages}
                      total={completedTabTasks.length}
                      pageSize={TASK_PAGE_SIZE}
                      onPrevious={() => {
                        const maxP = Math.max(0, completedTasksTotalPages - 1);
                        setCompletedTasksPage((p) => Math.max(0, Math.min(p, maxP) - 1));
                      }}
                      onNext={() => {
                        const maxP = Math.max(0, completedTasksTotalPages - 1);
                        setCompletedTasksPage((p) => Math.min(maxP, Math.min(p, maxP) + 1));
                      }}
                    />
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {isAuthorizedAdmin && (
          <>
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
                <div className="relative mb-4 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="search"
                    value={receptionSearch}
                    onChange={(e) => setReceptionSearch(e.target.value)}
                    placeholder="Search by letter name…"
                    className="pl-9"
                    aria-label="Search letters by name"
                  />
                </div>
                {!receptionInboxDocuments ? (
                  <div className="text-sm text-gray-500 py-4">Loading inbox...</div>
                ) : receptionInboxDocuments.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4">No documents yet.</div>
                ) : filteredReceptionDocuments.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4">No letters match your search.</div>
                ) : (
                  <div className="space-y-3 w-full min-w-0">
                  <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-gray-200 [-webkit-overflow-scrolling:touch]">
                    <table className="w-full min-w-[1100px] text-sm whitespace-nowrap text-left">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3 font-medium">File Name</th>
                          <th className="p-3 font-medium">Uploaded By</th>
                          <th className="p-3 font-medium">Uploaded</th>
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
                              <td className="p-3 whitespace-normal">
                                {format(new Date(doc.createdAt), "PPP 'at' p")}
                              </td>
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
                                    disabled={!doc.storageId}
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
                                          onClick={async () => {
                                            if (
                                              !confirm(
                                                "File this document? Its status will change to File and it will remain available for viewing."
                                              )
                                            ) {
                                              return;
                                            }
                                            try {
                                              await fileReceptionDocument({ receptionDocumentId: doc._id });
                                              toast.success("Document filed");
                                            } catch (e: any) {
                                              toast.error(e.message || "Failed to file document");
                                            }
                                          }}
                                        >
                                          <File className="w-4 h-4 mr-2" />
                                          File
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

          <TabsContent value="fuel" className="mt-6">
            <Card className="border-amber-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-amber-600" />
                  <CardTitle>Driver fuel</CardTitle>
                </div>
                <CardDescription>
                  Reception staff create requests from <span className="font-medium">My Tasks</span> and enter the purchase amount after approval when the driver returns. Trip date is set to today automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 min-w-0">
                {!fuelRequests ? (
                  <p className="text-gray-500">Loading…</p>
                ) : fuelRequests.length === 0 ? (
                  <p className="text-gray-500 text-sm">No fuel requests yet.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Trip date</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Car</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount (NGN)</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fuelRequests.map((row) => (
                          <TableRow key={row._id}>
                            <TableCell>{row.requestDate}</TableCell>
                            <TableCell>{fuelDriverLabel(row.driverKey)}</TableCell>
                            <TableCell>{fuelCarLabel(row.carKey)}</TableCell>
                            <TableCell>
                              {row.status === "pending_approval" && (
                                <Badge className="bg-yellow-100 text-yellow-800">Pending approval</Badge>
                              )}
                              {row.status === "approved" && (
                                <Badge className="bg-blue-100 text-blue-800">Awaiting price</Badge>
                              )}
                              {row.status === "completed" && (
                                <Badge className="bg-green-100 text-green-800">Completed</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.priceAmount != null ? row.priceAmount.toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.status === "pending_approval" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await approveFuelRequest({ requestId: row._id });
                                      toast.success("Request approved.");
                                    } catch (e: any) {
                                      toast.error(e.message || "Failed to approve");
                                    }
                                  }}
                                >
                                  Approve
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </>
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
            setTaskParticipants([]);
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description {!(prefilledReceptionFileName || localAssignmentFile) ? "*" : ""}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  prefilledReceptionFileName || localAssignmentFile
                    ? "Optional details (title is taken from the attachment if left blank)"
                    : "Describe the task — this is shown as the task name in lists"
                }
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                {prefilledReceptionFileName || localAssignmentFile
                  ? "If empty, the attachment file name is used as the task name."
                  : "Required when no attachment is included."}
              </p>
            </div>

            <TaskParticipantPicker
              participants={taskParticipants}
              setParticipants={setTaskParticipants}
              staffMembers={staffMembers}
              workstreamIds={WORKSTREAM_IDS}
            />

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

      <Dialog
        open={isEditAssigneesDialogOpen}
        onOpenChange={(open) => {
          setIsEditAssigneesDialogOpen(open);
          if (!open) {
            setEditAssigneesTaskId(null);
            setEditTaskParticipants([]);
            setEditingTaskTitle("");
            assigneesHydratedForTaskRef.current = null;
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Assignees: {editingTaskTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!taskAssigneesData && editAssigneesTaskId ? (
              <p className="text-sm text-gray-500">Loading current assignees…</p>
            ) : (
              <>
                <TaskParticipantPicker
                  participants={editTaskParticipants}
                  setParticipants={setEditTaskParticipants}
                  staffMembers={staffMembers}
                  workstreamIds={WORKSTREAM_IDS}
                  allowEmpty
                />
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  Removing assignees or changing the list will reset any in-progress completion request for this task.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditAssigneesDialogOpen(false);
                setEditAssigneesTaskId(null);
                setEditTaskParticipants([]);
                assigneesHydratedForTaskRef.current = null;
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssignees}
              disabled={savingAssignees || !taskAssigneesData}
              className="bg-green-600 hover:bg-green-700"
            >
              {savingAssignees ? "Saving…" : "Save Assignees"}
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

function AdminTaskCompletionDocuments({
  task,
  getCompletionDocumentUrl
}: {
  task: {
    _id: Id<"tasks">;
    completionDocuments?: {
      storageId: Id<"_storage">;
      fileName: string;
      uploadedBy?: Id<"users">;
      uploadedByName?: string;
    }[];
    completionDocumentId?: Id<"_storage">;
    completionDocumentName?: string;
  };
  getCompletionDocumentUrl: (args: { storageId: Id<"_storage">; taskId: Id<"tasks"> }) => Promise<string | null>;
}) {
  return (
    <TaskCompletionDocumentsPanel
      documents={getCompletionDocumentsFromTask(task)}
      taskId={task._id}
      getCompletionDocumentUrl={getCompletionDocumentUrl}
    />
  );
}

function getTaskStatusLabel(task: {
  status: string;
  completionRequestStatus?: string;
}): string {
  if (task.completionRequestStatus === "pending") return "Pending Approval";
  if (task.status === "done") return "Completed";
  if (task.status === "in_progress") return "In Progress";
  if (task.status === "to_do") return "To Do";
  if (task.status === "assigned") return "Assigned";
  return task.status;
}

function taskMatchesStatusFilter(
  task: { status: string; completionRequestStatus?: string },
  filter: TaskStatusFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "completed") return task.status === "done";
  if (filter === "assigned_todo") {
    return task.status === "assigned" || task.status === "to_do" || task.status === "in_progress";
  }
  if (filter === "in_progress") return task.status === "in_progress";
  if (filter === "pending_approval") return task.completionRequestStatus === "pending";
  if (filter === "not_requested_approval") {
    return task.status !== "done" && !task.completionRequestStatus;
  }
  return true;
}

function taskMatchesDateRange(
  task: { createdAt: number },
  dateRange: { start: string; end: string }
): boolean {
  const taskDate = new Date(task.createdAt);
  const startDate = dateRange.start ? new Date(dateRange.start) : null;
  const endDate = dateRange.end ? new Date(dateRange.end) : null;

  if (startDate) {
    startDate.setHours(0, 0, 0, 0);
    if (taskDate < startDate) return false;
  }
  if (endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    if (taskDate > endOfDay) return false;
  }
  return true;
}

function taskMatchesAdminSearch(
  task: {
    title: string;
    description?: string;
    customTaskId?: string;
    assignedToName?: string;
    assignedTo?: Id<"users">;
    assignedStream?: string;
    createdByName?: string;
    assigneeUserIds?: Id<"users">[];
  },
  term: string,
  matchingStaffIds: Set<Id<"users">>,
  staffSearchIndex: Array<{ _id: Id<"users">; staffStream?: string; searchText: string }>
) {
  const taskText = [
    task.title,
    task.description,
    task.customTaskId,
    task.assignedToName,
    task.createdByName,
    task.assignedStream ? formatWorkstream(task.assignedStream) : ""
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (taskText.includes(term)) {
    return true;
  }

  const assigneeIds = new Set<Id<"users">>(task.assigneeUserIds ?? []);
  if (task.assignedTo) {
    assigneeIds.add(task.assignedTo);
  }

  for (const staffId of matchingStaffIds) {
    if (assigneeIds.has(staffId)) {
      return true;
    }

    const staff = staffSearchIndex.find((member) => member._id === staffId);
    if (staff?.staffStream && task.assignedStream === staff.staffStream) {
      return true;
    }
  }

  return false;
}

function TaskListPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPrevious,
  onNext
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (total <= pageSize) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 pt-2">
      <span>
        Showing{" "}
        <span className="font-medium text-gray-900">
          {total === 0 ? 0 : page * pageSize + 1}–{Math.min(page * pageSize + pageSize, total)}
        </span>{" "}
        of <span className="font-medium text-gray-900">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={onPrevious}>
          Previous
        </Button>
        <span className="tabular-nums px-1">
          Page {page + 1} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function TaskParticipantPicker({
  participants,
  setParticipants,
  staffMembers,
  workstreamIds,
  allowEmpty = false
}: {
  participants: TaskParticipant[];
  setParticipants: React.Dispatch<React.SetStateAction<TaskParticipant[]>>;
  staffMembers: Array<{ _id: Id<"users">; firstName?: string; lastName?: string; email?: string }>;
  workstreamIds: string[];
  allowEmpty?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Assign to (workstreams &amp; staff){allowEmpty ? "" : " *"}
      </label>
      <div className="space-y-3 border border-gray-200 rounded-md p-3">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Workstreams &amp; staff
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
            {workstreamIds.map((ws) => (
              <label
                key={ws}
                className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-blue-600 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={participants.some((p) => p.type === "workstream" && p.id === ws)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setParticipants([...participants, { type: "workstream", id: ws, name: ws }]);
                    } else {
                      setParticipants(participants.filter((p) => !(p.type === "workstream" && p.id === ws)));
                    }
                  }}
                  className="h-3 w-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="truncate">{formatWorkstream(ws)}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <select
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
              onChange={(e) => {
                const staffId = e.target.value as Id<"users">;
                if (!staffId) return;
                const staff = staffMembers.find((s) => s._id === staffId);
                if (staff && !participants.some((p) => p.type === "staff" && p.id === staffId)) {
                  setParticipants([
                    ...participants,
                    {
                      type: "staff",
                      id: staffId,
                      name: `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim() || staff.email || ""
                    }
                  ]);
                }
                e.target.value = "";
              }}
            >
              <option value="">Select individual staff…</option>
              {staffMembers
                .filter((s) => !participants.some((p) => p.type === "staff" && p.id === s._id))
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
            </select>

            <div className="flex flex-wrap gap-1.5 mt-2 min-h-[28px]">
              {participants.length === 0 ? (
                <span className="text-xs text-gray-400 italic">
                  {allowEmpty ? "No assignees selected." : "Add at least one assignee."}
                </span>
              ) : (
                participants.map((p, i) => (
                  <span
                    key={`${p.type}-${p.id}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-tighter"
                  >
                    {p.type === "workstream" ? ` ${formatWorkstream(p.name)}` : p.name}
                    <button
                      type="button"
                      onClick={() => setParticipants(participants.filter((_, idx) => idx !== i))}
                      className="hover:text-red-500"
                      aria-label="Remove"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Everyone selected shares one task. Whole workstreams include all staff in that stream; add
        individuals by name as needed.
        {allowEmpty ? " Remove all assignees to leave the task unassigned." : ""}
      </p>
    </div>
  );
}
