// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import TicketComments from "@/components/TicketsComments";
import { toast } from "sonner";
import { FaArrowLeft, FaTrashAlt, FaFileAlt, FaDownload } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { CheckIcon, XCircleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import TicketStepper from "@/components/ui/stepper";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "@/lib/useUserRole";
import { TicketCountdown } from '@/components/ui/ticket-countdown';
import TicketInternalNotes from "@/components/TicketInternalNotes";
import Loader from "@/components/Loader";


export default function AdminTicketDetailsPage() {
  const {
    ticketId
  } = useParams();
  const router = useRouter();
  
  // Function to handle back navigation with fallback
  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to tickets page if no history
      router.push("/admin/tickets");
    }
  };
  const [isDeleted, setIsDeleted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<"resolved" | "closed">("resolved");
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [confirmStatusDialog, setConfirmStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const {
    role,
    isLoading
  } = useUserRole();
  const ticket = useQuery(api.tickets.getTicketById, ticketId && !isDeleted ? {
    ticketId: ticketId as Id<"tickets">
  } : "skip");
  const ticketUser = useQuery(api.users.getUserByClerkId, ticket?.clerkUserId ? {
    clerkUserId: ticket.clerkUserId
  } : "skip");
  const updateTicketStatus = useMutation(api.tickets.updateTicketStatus);
  const getFileUrl = useMutation(api.tickets.getStorageUrl);
  const deleteTicket = useMutation(api.tickets.deleteTicketMutation);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  useEffect(() => {
    if (ticket?.supportingDocuments?.length) {
      const fetchUrls = async () => {
        try {
          const urls = await Promise.all(ticket.supportingDocuments.map(async docId => {
            const url = await getFileUrl({
              storageId: docId
            });
            return url ?? "";
          }));
          setFileUrls(urls.filter(url => url !== ""));
        } catch (error) {
          console.error("❌ Failed to fetch file URLs:", error);
        }
      };
      fetchUrls();
    }
  }, [ticket, getFileUrl]);
  async function confirmStatusUpdate() {
    if (pendingStatus) {
      handleStatusChange(pendingStatus as any);
      setConfirmStatusDialog(false);
      setPendingStatus(null);
    }
  }
  function handleStatusDialog(status: string) {
    setPendingStatus(status);
    setConfirmStatusDialog(true);
  }
  function handleStatusChange(newStatus: "open" | "in_progress" | "resolved" | "closed") {
    setLoadingStatus(true);
    if (newStatus === "resolved" || newStatus === "closed") {
      setStatusToUpdate(newStatus);
      setIsDialogOpen(true);
      setLoadingStatus(false);
    } else {
      updateTicketStatus({
        ticketId: ticketId as Id<"tickets">,
        status: newStatus
      }).then(() => toast.success(`✅ Ticket updated to ${newStatus.replace("_", " ")}`)).catch(() => toast.error("❌ Failed to update ticket status.")).finally(() => setLoadingStatus(false));
    }
  }
  async function submitResolutionNote() {
    if (!resolutionNote.trim()) {
      toast.error("Resolution note is required.");
      return;
    }
    await updateTicketStatus({
      ticketId: ticketId as Id<"tickets">,
      status: statusToUpdate,
      resolutionNote
    });
    setIsDialogOpen(false);
    setIsLocked(true);
    toast.success(`Ticket marked as ${statusToUpdate}.`);
  }
  async function handleDeleteTicket() {
    try {
      await deleteTicket({
        ticketId: ticketId as Id<"tickets">
      });
      toast.success("Ticket deleted successfully.");
      setIsDeleted(true);
      setTimeout(() => router.replace("/admin/tickets"), 500);
    } catch (error) {
      console.error("❌ Error deleting ticket:", error);
      toast.error("Failed to delete ticket.");
    }
  }
  async function handleDownloadPDF() {
    try {
      // Get the ticket details container
      const element = document.getElementById('ticket-details');
      if (!element) return;

      // Create canvas from the element
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');

      // Initialize PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

      // Download the PDF
      pdf.save(`ticket-${ticket?.ticketNumber || 'details'}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  }
  if (ticket === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (!ticket || isDeleted) {
    return <div className="text-center text-gray-500 mt-10">
        <p>⚠ This ticket no longer exists. It may have been deleted.</p>
        <Button 
          onClick={handleBackNavigation} 
          variant="outline" 
          className="mt-4"
        >
          Back to Tickets
        </Button>
      </div>;
  }
  return (
    <div className="relative max-w-5xl mx-auto md:mt-10 p-6 mt-5 bg-white shadow-lg rounded-md">
      <div className="flex justify-between">
               <Button 
           onClick={handleBackNavigation} 
           variant="outline" 
           className="mb-6 flex items-center gap-2"
         >
           <FaArrowLeft className="w-4 h-4" /> Back to Tickets
         </Button>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF} variant="outline" className="flex items-center gap-2">
            <FaDownload className="w-4 h-4" /> Download PDF
          </Button>
          {role !== "staff" && role !== "president" && role !== "vice_president" && 
            <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive" className="flex items-center gap-2">
              <FaTrashAlt className="w-4 h-4" /> Delete Ticket
            </Button>
          }
        </div>
      </div>

      <div id="ticket-details">
        <TicketStepper currentStep={ticket.status === "open" ? 0 : ticket.status === "in_progress" ? 1 : 2} status={ticket.status} />

        <div className="mt-6">
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="text-gray-500 mt-1">
            Ticket Number: <span className="font-semibold">{ticket.ticketNumber}</span>
          </p>
          <div className="mt-4">
            <TicketCountdown 
              ticketCreatedAt={ticket.createdAt}
              ticketReassignedAt={ticket.reassignedAt}
              ticketStatus={ticket.status}
            />
          </div>
        </div>

        {ticket.resolutionNote && (
          <div className="mt-6 p-4 bg-gray-100 border rounded-lg">
            <h3 className="font-semibold text-lg">Resolution Note</h3>
            <p className="mt-2">{ticket.resolutionNote}</p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="mt-3">
              Add new resolution note
            </Button>
          </div>
        )}

        {fileUrls.length > 0 && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-lg mb-2">Uploaded Files</h3>
            <ul className="list-disc pl-5">
              {fileUrls.map((url, index) => (
                <li key={index}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                    <FaFileAlt className="text-gray-500" /> View Document {index + 1}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isLocked && (
          <div className="mt-6">
            <h3 className="font-semibold text-lg">Update Status</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button onClick={() => handleStatusDialog("in_progress")} variant="outline" className="text-yellow-600">
                <ArrowPathIcon className="w-4 h-4" /> In Progress
              </Button>
              <Button onClick={() => handleStatusDialog("resolved")} variant="outline" className="text-green-600">
                <CheckIcon className="w-4 h-4" /> Resolve Ticket
              </Button>
              <Button onClick={() => handleStatusDialog("closed")} variant="outline" className="text-red-600">
                <XCircleIcon className="w-4 h-4" /> Close Ticket
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <TicketComments ticketId={ticketId as string} />
        </div>

        {ticket.assignedMDA && (
          <div className="mt-6">
            <TicketInternalNotes ticketId={ticketId as string} />
          </div>
        )}


      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {statusToUpdate === "resolved" ? "Resolution Note" : "Closing Note"}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Enter details here..." value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={submitResolutionNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmStatusDialog} onOpenChange={setConfirmStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to perform this action?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStatusDialog(false)}>No</Button>
            <Button onClick={confirmStatusUpdate}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Ticket Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this ticket? This action cannot be undone.</p>
          <DialogFooter>
            <Button onClick={() => setIsDeleteDialogOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleDeleteTicket} variant="destructive">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}