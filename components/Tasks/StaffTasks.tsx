// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, User, CheckCircle2, Clock, AlertCircle, Hourglass, FileText, X, Download, MessageSquare, Send, Upload, Eye, Droplets } from "lucide-react";
import { fuelDriverLabel, FUEL_DRIVERS, type FuelDriverKey } from "@/lib/fuelDrivers";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StaffTasks() {
  const [selectedTask, setSelectedTask] = useState<Id<"tasks"> | null>(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [completionDocumentFile, setCompletionDocumentFile] = useState<File | null>(null);
  const [completionDocumentId, setCompletionDocumentId] = useState<StorageId<"_storage"> | null>(null);
  const [completionDocumentName, setCompletionDocumentName] = useState<string>("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");

  const myTasks = useQuery(api.tasks.getMyTasks);
  const currentUser = useQuery(api.users.getCurrentUsers);
  const myReceptionDocuments = useQuery(
    api.tasks.listMyReceptionDocuments,
    currentUser === undefined
      ? "skip"
      : currentUser?.role === "staff" && currentUser?.staffStream === "receptionist"
        ? {}
        : "skip"
  );
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);
  const requestTaskCompletion = useMutation(api.tasks.requestTaskCompletion);
  const rejectTaskCompletionConsensus = useMutation(api.tasks.rejectTaskCompletionConsensus);
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const getCompletionDocumentUrl = useMutation(api.tasks.getCompletionDocumentUrl);
  const generateReceptionUploadUrl = useMutation(api.tasks.generateReceptionUploadUrl);
  const submitReceptionDocument = useMutation(api.tasks.submitReceptionDocument);
  const getReceptionDocumentUrl = useMutation(api.tasks.getReceptionDocumentUrl);
  const receptionFuelRequests = useQuery(
    api.fuel_requests.listFuelRequestsForReception,
    currentUser === undefined
      ? "skip"
      : currentUser?.role === "staff" && currentUser?.staffStream === "receptionist"
        ? {}
        : "skip"
  );
  const submitFuelPrice = useMutation(api.fuel_requests.submitFuelPrice);
  const createFuelRequest = useMutation(api.fuel_requests.createFuelRequest);

  const isReceptionist = currentUser?.role === "staff" && currentUser?.staffStream === "receptionist";

  const [receptionFile, setReceptionFile] = useState<File | null>(null);
  const [receptionNote, setReceptionNote] = useState("");
  const [receptionUploading, setReceptionUploading] = useState(false);
  const [fuelPriceInput, setFuelPriceInput] = useState<Record<string, string>>({});
  const [fuelStaffDriverKey, setFuelStaffDriverKey] = useState<FuelDriverKey | "">("");
  const staffTasks = (myTasks ?? []) as any[];


  const handleQuickStatusUpdate = async (taskId: Id<"tasks">, newStatus: "to_do" | "in_progress" | "done") => {
    try {
      await updateTaskStatus({ taskId, status: newStatus });
      if (newStatus === "done") {
        // Open completion request dialog instead
        const task = staffTasks.find((t: any) => t._id === taskId);
        if (task) {
          setSelectedTask(taskId);
          setIsCompletionDialogOpen(true);
        }
      } else {
        toast.success("Task status updated!");
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleOpenCompletionDialog = (task: any) => {
    setSelectedTask(task._id);
    setCompletionNotes(task.completionNotes || "");
    setCompletionDocumentId(task.completionDocumentId || null);
    setCompletionDocumentName(task.completionDocumentName || "");
    setCompletionDocumentFile(null);
    setIsCompletionDialogOpen(true);
  };

  const handleDocumentUpload = async () => {
    if (!completionDocumentFile) return;

    try {
      setUploadingDocument(true);
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": completionDocumentFile.type },
        body: completionDocumentFile
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();
      await saveUploadedFile({
        storageId: storageId as StorageId<"_storage">,
        fileName: completionDocumentFile.name
      });

      setCompletionDocumentId(storageId as StorageId<"_storage">);
      setCompletionDocumentName(completionDocumentFile.name);
      toast.success("Document uploaded successfully!");
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleReceptionSubmit = async () => {
    if (!receptionFile) {
      toast.error("Please choose a file to upload");
      return;
    }
    try {
      setReceptionUploading(true);
      const uploadUrl = await generateReceptionUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": receptionFile.type },
        body: receptionFile
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();
      await submitReceptionDocument({
        storageId,
        fileName: receptionFile.name,
        note: receptionNote.trim() || undefined
      });
      toast.success("Document sent to admin successfully.");
      setReceptionFile(null);
      setReceptionNote("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setReceptionUploading(false);
    }
  };

  const staffReceptionStatusUi = (status: "pending" | "acknowledged" | "linked" | "stashed") => {
    switch (status) {
      case "pending":
        return { label: "Awaiting Acknowledgment", className: "bg-orange-100 text-orange-800" };
      case "acknowledged":
        return { label: "Acknowledged", className: "bg-purple-100 text-purple-800" };
      case "linked":
        return { label: "Linked to task", className: "bg-blue-100 text-blue-800" };
      case "stashed":
        return { label: "Stashed", className: "bg-gray-200 text-gray-700" };
      default:
        return { label: status, className: "bg-gray-100 text-gray-600" };
    }
  };

  const handleViewMyReceptionDocument = async (receptionDocumentId: Id<"reception_admin_documents">) => {
    try {
      const url = await getReceptionDocumentUrl({ receptionDocumentId });
      if (url) window.open(url, "_blank");
      else toast.error("Could not open document");
    } catch (e: any) {
      toast.error(e.message || "Failed to open document");
    }
  };

  const handleRequestCompletion = async () => {
    if (!selectedTask) return;

    const task = staffTasks.find((t: any) => t._id === selectedTask);
    if (!task) return;

    try {
      const result = await requestTaskCompletion({
        taskId: selectedTask,
        completionNotes: completionNotes.trim() || undefined,
        completionDocumentId: completionDocumentId || undefined,
        completionDocumentName: completionDocumentName || undefined
      });

      if (result?.stage === "awaiting_consensus") {
        toast.success(`Consensus updated (${result.approvedCount}/${result.totalParticipants}). Waiting for teammates.`);
      } else {
        toast.success("Completion request submitted! Awaiting admin approval.");
      }
      setIsCompletionDialogOpen(false);
      setSelectedTask(null);
      setCompletionDocumentFile(null);
      setCompletionDocumentId(null);
      setCompletionNotes("");
    } catch (error: any) {
      console.error("Error requesting completion:", error);
      toast.error(error.message || "Failed to submit completion request");
    }
  };

  const handleRejectConsensus = async (taskId: Id<"tasks">) => {
    try {
      await rejectTaskCompletionConsensus({ taskId });
      toast.success("Consensus rejected. Submission has been reset for resubmission.");
    } catch (error: any) {
      console.error("Error rejecting consensus:", error);
      toast.error(error.message || "Failed to reject consensus");
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
    assigned: staffTasks.filter((t: any) => t.status === "assigned" || t.status === "to_do" || t.status === "in_progress"),
    in_progress: staffTasks.filter((t: any) => t.status === "in_progress"),
    done: staffTasks.filter((t: any) => t.status === "done")
  };

  // Separate active tasks from past tasks
  const activeTasks = staffTasks.filter((t: any) => t.status !== "done");
  const pastTasks = staffTasks.filter((t: any) => t.status === "done");

  const currentTask = staffTasks.find((t: any) => t._id === selectedTask);
  const isCompletionDocumentLocked =
    !!currentTask?.completionDocumentId &&
    (currentTask?.completionRequestStatus === "awaiting_consensus" ||
      currentTask?.completionRequestStatus === "pending");
  const isCompletionNotesLocked =
    !!currentTask?.completionNotes &&
    (currentTask?.completionRequestStatus === "awaiting_consensus" ||
      currentTask?.completionRequestStatus === "pending");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-1">View and update tasks assigned to you</p>
      </div>

      {isReceptionist && (
        <Card className="border-amber-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-amber-600" />
              <CardTitle>Request fuel for a driver</CardTitle>
            </div>
            <CardDescription>
              Trip date is set to today automatically. After a designated admin approves the trip, enter the purchase amount (NGN) here when the driver returns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2 min-w-[200px]">
                <span className="text-sm font-medium text-gray-700 block">Driver</span>
                <Select
                  value={fuelStaffDriverKey || undefined}
                  onValueChange={(v) => setFuelStaffDriverKey(v as FuelDriverKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_DRIVERS.map((d) => (
                      <SelectItem key={d.key} value={d.key}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!fuelStaffDriverKey}
                onClick={async () => {
                  if (!fuelStaffDriverKey) return;
                  try {
                    await createFuelRequest({ driverKey: fuelStaffDriverKey });
                    toast.success("Fuel request submitted for approval.");
                    setFuelStaffDriverKey("");
                  } catch (e: any) {
                    toast.error(e.message || "Failed to create request");
                  }
                }}
              >
                Request fuel
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Fuel requests</h3>
              {!receptionFuelRequests ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : receptionFuelRequests.length === 0 ? (
                <p className="text-sm text-gray-500">No fuel requests yet.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trip date</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount (NGN)</TableHead>
                        <TableHead className="text-right w-[220px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receptionFuelRequests.map((row) => (
                        <TableRow key={row._id}>
                          <TableCell className="whitespace-nowrap">{row.requestDate}</TableCell>
                          <TableCell>{fuelDriverLabel(row.driverKey)}</TableCell>
                          <TableCell>
                            {row.status === "pending_approval" && (
                              <Badge className="bg-yellow-100 text-yellow-800">Pending approval</Badge>
                            )}
                            {row.status === "approved" && (
                              <Badge className="bg-blue-100 text-blue-800">Enter price</Badge>
                            )}
                            {row.status === "completed" && (
                              <Badge className="bg-green-100 text-green-800">Recorded</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.priceAmount != null ? row.priceAmount.toLocaleString() : "—"}
                          </TableCell>
                          <TableCell>
                            {row.status === "approved" && row.priceAmount == null && (
                              <div className="flex flex-wrap items-center gap-2 justify-end">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="Amount"
                                  className="w-32 h-9"
                                  value={fuelPriceInput[row._id] ?? ""}
                                  onChange={(e) =>
                                    setFuelPriceInput((prev) => ({
                                      ...prev,
                                      [row._id]: e.target.value
                                    }))
                                  }
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-amber-600 hover:bg-amber-700"
                                  onClick={async () => {
                                    const raw = fuelPriceInput[row._id]?.trim();
                                    const n = raw ? parseFloat(raw) : NaN;
                                    if (!Number.isFinite(n) || n < 0) {
                                      toast.error("Enter a valid amount");
                                      return;
                                    }
                                    try {
                                      await submitFuelPrice({ requestId: row._id, priceAmount: n });
                                      toast.success("Fuel price saved.");
                                      setFuelPriceInput((prev) => {
                                        const next = { ...prev };
                                        delete next[row._id];
                                        return next;
                                      });
                                    } catch (e: any) {
                                      toast.error(e.message || "Failed to save");
                                    }
                                  }}
                                >
                                  Save
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Tasks List with Tabs */}
      <div className="space-y-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className={`grid w-full ${isReceptionist ? "max-w-2xl grid-cols-3" : "max-w-md grid-cols-2"}`}>
            <TabsTrigger value="active">Active Tasks</TabsTrigger>
            <TabsTrigger value="past">Past Tasks</TabsTrigger>
            {isReceptionist && (
              <TabsTrigger value="reception" className="gap-1">
                <Send className="w-3.5 h-3.5" />
                Upload Scanned Letters
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {!myTasks ? (
              <div className="text-center py-8 text-gray-500">Loading tasks...</div>
            ) : activeTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  You don't have any active tasks.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <Card key={task._id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status === "to_do" ? "To Do" : task.status === "in_progress" ? "In Progress" : task.status === "done" ? "Done" : "Assigned"}
                          </Badge>
                          {task.status !== "done" && task.dueDate && (
                            <CountdownTimer dueDate={task.dueDate} createdAt={task.createdAt} />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 mb-3">
                        Created: {format(new Date(task.createdAt), "PPP 'at' p")}
                      </p>
                      <div className="border-y border-gray-200 py-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Assigned By</p>
                          <p className="text-base font-medium text-gray-900 mt-1">{task.createdByName || "Admin"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Assigned To</p>
                          <p className="text-base font-medium text-gray-900 mt-1 break-words">
                            {task.assignedToName || (task.assignedStream ? `All ${task.assignedStream} Staff` : "Unassigned")}
                          </p>
                        </div>
                      </div>
                      {task.description && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Description</p>
                          <p className="text-sm text-gray-700">{task.description}</p>
                        </div>
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
                      </div>

                      {task.assignmentDocumentId && task.assignmentDocumentName && (
                        <div className="mt-3 mb-3 p-3 bg-teal-50 border border-teal-200 rounded-md">
                          <p className="text-sm font-medium text-teal-900 mb-2">Reference document (with this task):</p>
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

                      {task.taskDetails && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md mb-3">
                          <p className="text-sm font-medium text-blue-900 mb-1">Your Updates:</p>
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

                      {task.consensusTotalParticipants > 1 && task.completionRequestStatus === "awaiting_consensus" && (
                        <div className="mt-3 p-3 rounded-md mb-3 bg-amber-50 border border-amber-200">
                          <p className="text-sm font-medium text-amber-900">
                            {(task.completionRequestedByName || "A teammate")} wants to request completion, do you approve?
                          </p>
                          <p className="text-xs text-amber-800 mt-1">
                            Submission Voting: {task.consensusApprovedCount || 0}/{task.consensusTotalParticipants} assignees approved
                          </p>
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
                        {task.status !== "done" &&
                          task.completionRequestStatus !== "pending" &&
                          task.completionRequestStatus !== "rejected" &&
                          !(task.completionRequestStatus === "awaiting_consensus" && task.consensusHasCurrentUserApproved) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCompletionDialog(task)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {task.consensusTotalParticipants > 1
                              ? task.consensusHasCurrentUserApproved
                                ? "Update Completion Request"
                                : "Approve submission"
                              : "Request Completion"}
                          </Button>
                        )}
                        {task.completionRequestStatus === "awaiting_consensus" && task.consensusHasCurrentUserApproved && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="text-amber-700"
                          >
                            <Hourglass className="w-4 h-4 mr-1" />
                            Waiting for Other Assignees
                          </Button>
                        )}
                        {task.completionRequestStatus === "awaiting_consensus" &&
                          !task.consensusHasCurrentUserApproved &&
                          task.completionRequestedBy !== currentUser?._id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectConsensus(task._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject Submission
                            </Button>
                          )}
                        {task.completionRequestStatus === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="text-yellow-600"
                          >
                            <Hourglass className="w-4 h-4 mr-1" />
                            Awaiting Approval
                          </Button>
                        )}
                        {task.completionRequestStatus === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCompletionDialog(task)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Resubmit Request
                          </Button>
                        )}
                        {task.completionAdminComment && (
                          <div className={`mt-3 p-3 rounded-md mb-3 ${task.completionRequestStatus === "approved"
                            ? "bg-green-50 border border-green-200"
                            : "bg-red-50 border border-red-200"
                            }`}>
                            <p className={`text-sm font-medium mb-1 ${task.completionRequestStatus === "approved"
                              ? "text-green-900"
                              : "text-red-900"
                              }`}>
                              {task.completionRequestStatus === "approved" ? "Admin Note:" : "Rejection Reason:"}
                            </p>
                            <p className={`text-sm ${task.completionRequestStatus === "approved"
                              ? "text-green-800"
                              : "text-red-800"
                              }`}>
                              {task.completionAdminComment}
                            </p>
                          </div>
                        )}
                      </div>
                      <TaskUpdates taskId={task._id} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {!myTasks ? (
              <div className="text-center py-8 text-gray-500">Loading tasks...</div>
            ) : pastTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  You don't have any completed tasks yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastTasks.map((task) => (
                  <Card key={task._id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge className="bg-green-100 text-green-800">
                            Completed
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 mb-3">
                        Created: {format(new Date(task.createdAt), "PPP 'at' p")}
                      </p>
                      <div className="border-y border-gray-200 py-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Assigned By</p>
                          <p className="text-base font-medium text-gray-900 mt-1">{task.createdByName || "Admin"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Assigned To</p>
                          <p className="text-base font-medium text-gray-900 mt-1 break-words">
                            {task.assignedToName || (task.assignedStream ? `All ${task.assignedStream} Staff` : "Unassigned")}
                          </p>
                        </div>
                      </div>
                      {task.description && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Description</p>
                          <p className="text-sm text-gray-700">{task.description}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due: {format(new Date(task.dueDate), "PPP")}
                          </div>
                        )}
                        {task.completedAt && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Completed: {format(new Date(task.completedAt), "PPP 'at' p")}
                          </div>
                        )}
                      </div>

                      {task.assignmentDocumentId && task.assignmentDocumentName && (
                        <div className="mt-3 mb-3 p-3 bg-teal-50 border border-teal-200 rounded-md">
                          <p className="text-sm font-medium text-teal-900 mb-2">Reference document (with this task):</p>
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

                      {task.taskDetails && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md mb-3">
                          <p className="text-sm font-medium text-blue-900 mb-1">Your Updates:</p>
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

                      {task.completionAdminComment && (
                        <div className={`mt-3 p-3 rounded-md mb-3 ${task.completionRequestStatus === "approved"
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                          }`}>
                          <p className={`text-sm font-medium mb-1 ${task.completionRequestStatus === "approved"
                            ? "text-green-900"
                            : "text-red-900"
                            }`}>
                            {task.completionRequestStatus === "approved" ? "Admin Note:" : "Rejection Reason:"}
                          </p>
                          <p className={`text-sm ${task.completionRequestStatus === "approved"
                            ? "text-green-800"
                            : "text-red-800"
                            }`}>
                            {task.completionAdminComment}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {isReceptionist && (
            <TabsContent value="reception" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-teal-600" />
                    Upload documents
                  </CardTitle>
                  {/* <CardDescription>
                    Upload files for the Director General to review.
                  </CardDescription> */}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                    <Textarea
                      value={receptionNote}
                      onChange={(e) => setReceptionNote(e.target.value)}
                      placeholder="Brief context..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <input
                        type="file"
                        accept="application/pdf,image/*,.doc,.docx"
                        className="hidden"
                        id="reception-file"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setReceptionFile(f ?? null);
                        }}
                      />
                      <label htmlFor="reception-file" className="cursor-pointer flex flex-col items-center gap-2 text-sm text-gray-600">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span>{receptionFile ? receptionFile.name : "Click to choose a file"}</span>
                      </label>
                    </div>
                  </div>
                  <Button
                    onClick={handleReceptionSubmit}
                    disabled={receptionUploading || !receptionFile}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {receptionUploading ? "Uploading…" : "Upload"}
                  </Button>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Your scanned letters</h3>
                    {!myReceptionDocuments ? (
                      <p className="text-sm text-gray-500">Loading…</p>
                    ) : myReceptionDocuments.length === 0 ? (
                      <p className="text-sm text-gray-500">No uploads yet.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-md border border-gray-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                              <TableHead className="font-medium">Letter name</TableHead>
                              <TableHead className="font-medium">Date sent</TableHead>
                              <TableHead className="font-medium">Status</TableHead>
                              <TableHead className="font-medium w-[100px]">View</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {myReceptionDocuments.map((doc) => {
                              const statusUi = staffReceptionStatusUi(doc.status);
                              const canView = !!doc.storageId && doc.status !== "stashed";
                              return (
                                <TableRow key={doc._id}>
                                  <TableCell className="font-medium max-w-[240px]">
                                    <span className="block truncate" title={doc.fileName}>
                                      {doc.fileName}
                                    </span>
                                    {doc.note ? (
                                      <span className="block text-xs text-gray-500 font-normal truncate mt-0.5" title={doc.note}>
                                        {doc.note}
                                      </span>
                                    ) : null}
                                  </TableCell>
                                  <TableCell className="text-gray-700 whitespace-nowrap">
                                    {format(new Date(doc.createdAt), "PPP")}
                                  </TableCell>
                                  <TableCell>
                                    <span className={`inline-flex capitalize px-2 py-1 rounded text-xs font-medium ${statusUi.className}`}>
                                      {statusUi.label}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={!canView}
                                      onClick={() => handleViewMyReceptionDocument(doc._id)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>


      {/* Completion Request Dialog */}
      <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Task Completion: {currentTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Notes (Optional)
              </label>
              {isCompletionNotesLocked && (
                <p className="text-xs text-amber-700 mb-2">
                  {/* Completion notes are locked while consensusis in progress. They can only be changed after rejection. */}
                </p>
              )}
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any final notes or details about the task completion..."
                rows={3}
                disabled={isCompletionNotesLocked}
              />
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Supporting Document (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Upload any supporting documents related to task completion
              </p>
              {isCompletionDocumentLocked && (
                <p className="text-xs text-amber-700 mb-2">
                  Supporting document is locked while voting is in progress. It can only be changed after rejection.
                </p>
              )}
              {!completionDocumentId ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    id="completion-document"
                    className="hidden"
                    disabled={isCompletionDocumentLocked}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCompletionDocumentFile(file);
                      }
                    }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="completion-document"
                    className={`flex flex-col items-center justify-center ${isCompletionDocumentLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    <FileText className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Click to select a file or drag and drop
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 200MB)
                    </span>
                  </label>
                  {completionDocumentFile && (
                    <div className="mt-3 flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{completionDocumentFile.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleDocumentUpload}
                          disabled={uploadingDocument || isCompletionDocumentLocked}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {uploadingDocument ? "Uploading..." : "Upload"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isCompletionDocumentLocked}
                          onClick={() => {
                            setCompletionDocumentFile(null);
                            setCompletionDocumentId(null);
                            setCompletionDocumentName("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">{completionDocumentName}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isCompletionDocumentLocked}
                    onClick={() => {
                      setCompletionDocumentFile(null);
                      setCompletionDocumentId(null);
                      setCompletionDocumentName("");
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Your completion request will be sent to the admin for approval. You will be notified once a decision is made.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCompletionDialogOpen(false);
              setCompletionDocumentFile(null);
              setCompletionDocumentId(null);
              setCompletionDocumentName("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestCompletion}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit Request
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
        Add Comment or Escalation ({updates?.length || 0})
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
