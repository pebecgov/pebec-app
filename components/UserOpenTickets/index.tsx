// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import Link from "next/link";
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaBell, FaBuilding, FaTicketAlt } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
export default function UserOpenTickets() {
  const tickets = useQuery(api.tickets.getUserTickets);
  const mdaUsers = useQuery(api.users.getUsersWithRole, {
    role: "mda"
  }) || [];
  const adminUsers = useQuery(api.users.getAdmins);
  const adminEmails = adminUsers?.map(admin => admin.email) ?? [];
  const markAsRead = useMutation(api.notifications.markNotificationsAsRead);
  const mdas = useQuery(api.users.getMDAs) || [];
  const cancelTicket = useMutation(api.tickets.cancelTicket);
  const reopenTicket = useMutation(api.tickets.reopenTicket);
  const sendEmail = useAction(api.sendEmail.sendEmail);
  const notifications = useQuery(api.notifications.getUserNotifications) || [];
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState<Id<"tickets"> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Id<"tickets"> | null>(null);
  if (!tickets) return <div className="text-gray-500 text-center py-6">Loading tickets...</div>;
  if (tickets.length === 0) return <div className="text-gray-500 text-center py-6">No open tickets found.</div>;
  const hasUnreadNotifications = (ticketId: string) => {
    return notifications.some(notif => notif.ticketId === ticketId && !notif.isRead);
  };
  const getStatusDetails = (status: string) => {
    switch (status) {
      case "open":
        return {
          text: "Open",
          color: "bg-green-500",
          progress: 30,
          icon: <FaClock className="text-white w-3 h-3" />
        };
      case "in_progress":
        return {
          text: "In Progress",
          color: "bg-yellow-500",
          progress: 65,
          icon: <FaExclamationTriangle className="text-white w-3 h-3" />
        };
      case "resolved":
        return {
          text: "Resolved",
          color: "bg-blue-500",
          progress: 100,
          icon: <FaCheckCircle className="text-white w-3 h-3" />
        };
      case "closed":
        return {
          text: "Closed",
          color: "bg-red-500",
          progress: 100,
          icon: <FaTimesCircle className="text-white w-3 h-3" />
        };
      default:
        return {
          text: "Unknown",
          color: "bg-gray-500",
          progress: 0,
          icon: <FaClock className="text-white w-3 h-3" />
        };
    }
  };
  const getMdaName = (mdaId: string | undefined) => {
    if (!mdaId) return "Not Assigned";
    const mda = mdas.find(m => m._id === mdaId);
    return mda ? mda.name : "Unknown MDA";
  };
  const confirmCancelTicket = (ticketId: Id<"tickets">) => {
    setSelectedTicket(ticketId);
    setModalOpen(true);
  };
  const handleCancelTicket = async () => {
    if (!selectedTicket) return;
    setLoading(selectedTicket);
    setModalOpen(false);
    try {
      const ticket = tickets.find(t => t._id === selectedTicket);
      if (!ticket) throw new Error("Ticket not found.");
      await cancelTicket({
        ticketId: selectedTicket
      });
      toast({
        title: "Ticket Canceled",
        description: "Your ticket will be deleted in 24 hours."
      });
      await sendEmails(ticket, "cancel", mdaUsers);
    } catch (error) {
      console.error("Error canceling ticket:", error);
      toast({
        title: "Error",
        description: "Failed to cancel the ticket.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
      setSelectedTicket(null);
    }
  };
  const handleReopenTicket = async (ticketId: Id<"tickets">) => {
    setLoading(ticketId);
    try {
      const ticket = tickets.find(t => t._id === ticketId);
      if (!ticket) throw new Error("Ticket not found.");
      await reopenTicket({
        ticketId
      });
      toast({
        title: "Ticket Reopened",
        description: "Your ticket is now active again."
      });
      await sendEmails(ticket, "reopen", mdaUsers);
    } catch (error) {
      console.error("Error reopening ticket:", error);
      toast({
        title: "Error",
        description: "Failed to reopen the ticket.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };
  async function sendEmails(ticket, action, mdaUsers) {
    const subject = action === "cancel" ? `Ticket #${ticket.ticketNumber} Canceled` : `Ticket #${ticket.ticketNumber} Reopened`;
    const message = action === "cancel" ? `<p>Your ticket <strong>#${ticket.ticketNumber}</strong> has been canceled.</p>` : `<p>Your ticket <strong>#${ticket.ticketNumber}</strong> has been reopened.</p>`;
    await sendEmail({
      to: ticket.email,
      subject,
      html: message
    });
    await Promise.all(adminEmails.map(adminEmail => sendEmail({
      to: adminEmail,
      subject,
      html: `<p>A ticket (#${ticket.ticketNumber}) was ${action}.</p>`
    })));
    if (ticket.assignedMDA) {
      const assignedMDAUser = mdaUsers.find(user => user.mdaId === ticket.assignedMDA);
      if (!assignedMDAUser || !assignedMDAUser.email) {
        console.error("🚨 No MDA user found with assigned MDA ID:", ticket.assignedMDA);
        return;
      }
      console.log(`📧 Sending email to MDA: ${assignedMDAUser.email}`);
      await sendEmail({
        to: assignedMDAUser.email,
        subject,
        html: `<p>A ticket assigned to your MDA (#${ticket.ticketNumber}) was ${action}.</p>`
      });
    }
  }
  return <section className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Your Open Tickets</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickets.map(ticket => {
        const {
          text,
          color,
          progress,
          icon
        } = getStatusDetails(ticket.status);
        const hasUnread = hasUnreadNotifications(ticket._id);
        const assignedMdaName = getMdaName(ticket.assignedMDA);
        return <div key={ticket._id} className="relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-transform duration-300 hover:-translate-y-1 p-6">
                
                 {}
              {hasUnread && <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  New Updates
                </div>}
                {}
                <div className="absolute top-3 right-4 z-10">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-white text-xs font-medium ${color}`}>
                    {icon}
                    <span>{text}</span>
                  </div>
                </div>

                {}
                <div className="flex items-center gap-4 mt-10"> {}
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-30"></div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gray-200">
                      <FaTicketAlt className="h-6 w-6 text-green-500" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800">Ticket #{ticket.ticketNumber}</h3>
                    <p className="text-sm text-gray-500">Date: {format(new Date(ticket.createdAt), "dd MMM yyyy")}</p>
                  </div>
                </div>

                {}
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl bg-gray-100 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                        <FaCheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {ticket.status === "open" ? "Ticket is currently open." : ticket.status === "closed" ? "Your ticket has been cancelled and will be deleted within 24 hours" : ticket.status === "in_progress" ? "Ticket is being processed." : "Ticket has been resolved."}
                      </p>
                    </div>
                  </div>

                  {}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800">Progress</span>
                      <span className="text-gray-500">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-500" style={{
                  width: `${progress}%`
                }} />
                    </div>
                  </div>

                  {}

                  <div className="flex gap-3 mt-4">

                    <button className="w-full py-2 rounded-lg text-white bg-green-500 hover:bg-green-600 transition">
                    <Link key={ticket._id} href={`reportgov/tickets/${ticket._id}`} className="group block">View Report → </Link>
                      
                    </button>
                    
                    {}

                  </div>
                </div>


              <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <FaBuilding className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Assgined MDA</p>
                    <p className="text-sm font-semibold mt-1 text-gray-700">{assignedMdaName}</p>
                    </div>
                </div>
             
              </div>
            </div>;
      })}
      </div>

       {}
       <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Canceling this ticket will move it to "Closed" status and delete it in 24 hours.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>No</Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={handleCancelTicket}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </section>;
}