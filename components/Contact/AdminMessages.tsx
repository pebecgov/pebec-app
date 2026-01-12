// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";

export default function AdminMessages() {
    const [refreshKey, setRefreshKey] = useState(0);
    const { toast } = useToast();
    const { user } = useUser();
    const userRole = user?.publicMetadata?.role;
    const currentUser = useQuery(api.users.getCurrentUsers);
    const staffStream = currentUser?.staffStream;
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

    const messages = useQuery(api.contact_messages.getAllContactMessages, { refreshKey }) || [];
    const users = useQuery(api.users.getUsers) || [];
    const deleteMessage = useMutation(api.contact_messages.deleteContactMessage);
    const updateMessageStatus = useMutation(api.contact_messages.updateMessageStatus);
    const assignMessagesToStaff = useMutation(api.contact_messages.assignMessagesToStaff);
    const markAsViewed = useMutation(api.contact_messages.markAsViewed);
    const replyToMessage = useMutation(api.contact_messages.replyToMessage);

    const [selectedMessageIds, setSelectedMessageIds] = useState<Id<"contact_messages">[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [replyDialogOpen, setReplyDialogOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Id<"contact_messages"> | null>(null);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const [filter, setFilter] = useState({
        email: "",
        from: "",
        to: ""
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [assigning, setAssigning] = useState(false);
    const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
    const [selectedStaffIds, setSelectedStaffIds] = useState<Id<"users">[]>([]);
    const recordsPerPage = 20;

    const filteredMessages = messages.filter(m => {
        const search = filter.email.toLowerCase();
        const matchesSearch = search === "" ||
            m.email.toLowerCase().includes(search) ||
            m.name.toLowerCase().includes(search) ||
            m.subject.toLowerCase().includes(search);
        const date = new Date(m.createdAt);
        const matchesDate = (!filter.from || new Date(filter.from) <= date) &&
            (!filter.to || date <= new Date(`${filter.to}T23:59:59`));
        return matchesSearch && matchesDate;
    }).sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    const paginatedMessages = filteredMessages.slice(
        (currentPage - 1) * recordsPerPage,
        currentPage * recordsPerPage
    );
    const totalPages = Math.ceil(filteredMessages.length / recordsPerPage);

    const handleDelete = async () => {
        if (selectedMessage) {
            await deleteMessage({ messageId: selectedMessage });
            toast({
                title: "Deleted Successfully",
                description: `The message has been successfully deleted.`
            });
            setDeleteDialogOpen(false);
            setRefreshKey(prev => prev + 1);
        }
    };

    const toggleSelection = (id: Id<"contact_messages">) => {
        setSelectedMessageIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAssignConfirm = async () => {
        const selectedStaff = users.filter(u => selectedStaffIds.includes(u._id));

        if (selectedStaff.length === 0) {
            toast({
                title: "No staff selected",
                description: "Please select at least one staff member.",
                variant: "destructive"
            });
            return;
        }

        try {
            setAssigning(true);
            await assignMessagesToStaff({
                messageIds: selectedMessageIds,
                staffIds: selectedStaff.map(s => s._id),
                staffNames: selectedStaff.map(s => `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim())
            });

            toast({
                title: "Assigned",
                description: `${selectedMessageIds.length} message(s) assigned successfully.`
            });

            setRefreshKey(prev => prev + 1);
            setSelectedMessageIds([]);
            setAssignDialogOpen(false);
            setSelectedStaffIds([]);
        } catch (error) {
            console.error("Assignment error:", error);
            toast({
                title: "Error",
                description: "Failed to assign messages.",
                variant: "destructive"
            });
        } finally {
            setAssigning(false);
        }
    };

    const handleUpdateStatus = async (messageId: Id<"contact_messages">, newStatus: "acknowledged" | "in_progress" | "resolved") => {
        try {
            await updateMessageStatus({ messageId, status: newStatus });
            toast({
                title: "Status Updated",
                description: `Message status changed to ${newStatus.replace("_", " ")}`
            });
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update status. Please ensure the status transition is valid.",
                variant: "destructive"
            });
        }
    };

    const handleViewMessage = async (messageId: Id<"contact_messages">) => {
        setSelectedMessage(messageId);
        setViewDialogOpen(true);

        // Mark as viewed
        try {
            await markAsViewed({ messageId });
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Failed to mark as viewed:", error);
        }
    };

    const handleReplyMessage = (messageId: Id<"contact_messages">) => {
        setSelectedMessage(messageId);
        setReplyText("");
        setReplyDialogOpen(true);
    };

    const handleSendReply = async () => {
        if (!selectedMessage || !replyText.trim()) {
            toast({
                title: "Error",
                description: "Please enter a reply message.",
                variant: "destructive"
            });
            return;
        }

        try {
            setSendingReply(true);
            await replyToMessage({
                messageId: selectedMessage,
                replyMessage: replyText
            });

            toast({
                title: "Reply Sent",
                description: "Your reply has been sent successfully."
            });

            setReplyDialogOpen(false);
            setReplyText("");
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Reply error:", error);
            toast({
                title: "Error",
                description: "Failed to send reply.",
                variant: "destructive"
            });
        } finally {
            setSendingReply(false);
        }
    };

    const toLocalDateString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const adjusted = new Date(date.getTime() - offset * 60000);
        return adjusted.toISOString().split("T")[0];
    };

    const handleDateFilter = (label: "today" | "week" | "month") => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const to = new Date(now);
        let from: Date;

        switch (label) {
            case "today":
                from = new Date(now);
                break;
            case "week": {
                const day = now.getDay();
                const diffToMonday = day === 0 ? 6 : day - 1;
                from = new Date(now);
                from.setDate(now.getDate() - diffToMonday);
                break;
            }
            case "month":
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                from = new Date(now);
        }

        setFilter({
            ...filter,
            from: toLocalDateString(from),
            to: toLocalDateString(to)
        });
        setActiveQuickFilter(label);
    };

    const openAssignDialog = () => {
        if (selectedMessageIds.length === 0) return;
        const selectedMessages = messages.filter(m => selectedMessageIds.includes(m._id));
        const preSelectedUsers = users.filter(user =>
            selectedMessages.some(m =>
                m.assignedTo && m.assignedTo.includes(user._id)
            )
        ).map(u => u._id);

        setSelectedStaffIds(preSelectedUsers);
        setAssignDialogOpen(true);
    };

    const currentMessage = (viewDialogOpen || replyDialogOpen) && selectedMessage
        ? messages.find(m => m._id === selectedMessage)
        : null;

    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    return (
        <div className="w-full p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
                External Messages
            </h1>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 flex-wrap">
                <Input
                    placeholder="Search by email, name or subject"
                    value={filter.email}
                    onChange={e => setFilter({ ...filter, email: e.target.value })}
                    className="w-full sm:w-64"
                />

                <div className="flex gap-2 w-full sm:w-auto items-end">
                    <Input
                        type="date"
                        value={filter.from}
                        max={filter.to || undefined}
                        onChange={e => {
                            const newFrom = e.target.value;
                            setFilter(prev => ({
                                ...prev,
                                from: newFrom,
                                to: prev.to && newFrom > prev.to ? "" : prev.to
                            }));
                        }}
                        className="w-[135px]"
                    />
                    <Input
                        type="date"
                        value={filter.to}
                        min={filter.from || undefined}
                        onChange={e => setFilter(prev => ({ ...prev, to: e.target.value }))}
                        className="w-[135px]"
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={activeQuickFilter === "today" ? "default" : "outline"}
                        className={activeQuickFilter === "today" ? "bg-green-700 text-white" : ""}
                        size="sm"
                        onClick={() => handleDateFilter("today")}
                    >
                        Today
                    </Button>

                    <Button
                        variant={activeQuickFilter === "week" ? "default" : "outline"}
                        className={activeQuickFilter === "week" ? "bg-green-700 text-white" : ""}
                        size="sm"
                        onClick={() => handleDateFilter("week")}
                    >
                        This Week
                    </Button>

                    <Button
                        variant={activeQuickFilter === "month" ? "default" : "outline"}
                        className={activeQuickFilter === "month" ? "bg-green-700 text-white" : ""}
                        size="sm"
                        onClick={() => handleDateFilter("month")}
                    >
                        This Month
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => {
                            setFilter({ email: "", from: "", to: "" });
                            setActiveQuickFilter(null);
                        }}
                    >
                        Clear Filters
                    </Button>
                </div>
            </div>

            {/* Actions and Sort */}
            {selectedMessageIds.length > 0 && (
                <div className="flex justify-end mb-4">
                    <Button onClick={openAssignDialog}>
                        {messages.some(m => selectedMessageIds.includes(m._id) && m.assignedTo?.length)
                            ? "Reassign Selected"
                            : "Assign Selected"}
                    </Button>
                </div>
            )}

            <div className="flex justify-end mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value as "newest" | "oldest")}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value="newest">Newest to Oldest</option>
                        <option value="oldest">Oldest to Newest</option>
                    </select>
                </div>
            </div>
            {/* Table */}
            <div className="w-full overflow-x-auto border rounded-md">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                            <th className="p-3"></th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Subject</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {paginatedMessages.map(message => (
                            <tr key={message._id} className="border-t">
                                <td className="p-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedMessageIds.includes(message._id)}
                                        onChange={() => toggleSelection(message._id)}
                                    />
                                </td>
                                <td className="p-3">{message.name}</td>
                                <td className="p-3">{message.email}</td>
                                <td className="p-3">{message.subject.slice(0, 30)}...</td>
                                <td className="p-3">{format(new Date(message.createdAt), "PPP")}</td>
                                <td className="p-3">
                                    <span
                                        className={`capitalize px-2 py-1 rounded text-xs font-medium ${message.status === "replied"
                                            ? "bg-teal-100 text-teal-700"
                                            : message.status === "viewed"
                                                ? "bg-cyan-100 text-cyan-700"
                                                : message.status === "resolved"
                                                    ? "bg-green-100 text-green-700"
                                                    : message.status === "in_progress"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : message.status === "acknowledged"
                                                            ? "bg-purple-100 text-purple-700"
                                                            : "bg-orange-100 text-orange-700"
                                            }`}
                                    >
                                        {message.status === "pending" && "Pending"}
                                        {message.status === "viewed" && "Viewed"}
                                        {message.status === "replied" && "Replied"}
                                        {message.status === "acknowledged" && "Acknowledged"}
                                        {message.status === "in_progress" && "In Progress"}
                                        {message.status === "resolved" && "Resolved"}
                                        {!message.status && "Pending"}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewMessage(message._id)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleReplyMessage(message._id)}
                                        >
                                            Reply
                                        </Button>
                                        {(userRole === "admin" || (userRole === "staff" && staffStream === "receptionist")) && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => {
                                                    setSelectedMessage(message._id);
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-4 mt-6">
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                        ← Previous
                    </Button>
                    <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                        Next →
                    </Button>
                </div>
            )}

            {/* Assign Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign to Staff</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="border rounded p-3 max-h-60 overflow-y-auto">
                            <p className="text-sm font-medium mb-2 text-gray-700">
                                Select Staff Members
                            </p>
                            {users
                                .filter(u => u.role === "staff" || u.role === "admin")
                                .map(staff => (
                                    <label key={staff._id} className="flex items-center space-x-2 mb-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedStaffIds.includes(staff._id)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedStaffIds(prev => [...prev, staff._id]);
                                                } else {
                                                    setSelectedStaffIds(prev => prev.filter(id => id !== staff._id));
                                                }
                                            }}
                                        />
                                        <span>{`${staff.firstName ?? ""} ${staff.lastName ?? ""}`} - {staff.role}</span>
                                    </label>
                                ))}
                        </div>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAssignConfirm} disabled={assigning || selectedStaffIds.length === 0}>
                            Assign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                    </DialogHeader>
                    <p>This will permanently delete the message.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Yes, Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Message Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Message Details</DialogTitle>
                    </DialogHeader>
                    {currentMessage && (
                        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Name:</label>
                                <p className="text-sm">{currentMessage.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Email:</label>
                                <p className="text-sm">{currentMessage.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Phone:</label>
                                <p className="text-sm">{currentMessage.phone || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Subject:</label>
                                <p className="text-sm">{currentMessage.subject}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Message:</label>
                                <p className="text-sm whitespace-pre-wrap">{currentMessage.message}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Date:</label>
                                <p className="text-sm">{format(new Date(currentMessage.createdAt), "PPP p")}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Current Status:</label>
                                <p className="text-sm capitalize">{currentMessage.status || "pending"}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reply Dialog */}
            <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Reply to Message</DialogTitle>
                    </DialogHeader>
                    {currentMessage && (
                        <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
                            <div className="bg-gray-50 p-4 rounded border">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Original Message:</p>
                                <p className="text-sm"><strong>From:</strong> {currentMessage.name} ({currentMessage.email})</p>
                                <p className="text-sm"><strong>Subject:</strong> {currentMessage.subject}</p>
                                <p className="text-sm mt-2 whitespace-pre-wrap">{currentMessage.message}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Your Reply:</label>
                                <Textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Type your reply here..."
                                    rows={8}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendReply}
                            disabled={sendingReply || !replyText.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {sendingReply ? "Sending..." : "Send Reply"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
