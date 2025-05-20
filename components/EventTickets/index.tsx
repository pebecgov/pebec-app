"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/clerk-react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import domtoimage from "dom-to-image";
import Ticket from "@/components/Ticket";
import { formatDate } from "@/lib/utils";

export default function EventTickets() {
  const { user } = useUser();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showMobileTicket, setShowMobileTicket] = useState(false);

  // ✅ Fetch User Tickets
  const tickets = useQuery(api.events.getUserTickets, user ? { clerkUserId: user.id } : "skip");
  
  const eventRegistration = useQuery(
    api.events.getEventRegistration,
    selectedTicket?.ticketNumber
      ? { ticketNumber: selectedTicket.ticketNumber }
      : "skip"
  );


  const userAnswers = eventRegistration?.questions?.map((question, index) => ({
    questionText: question.questionText,
    answer: eventRegistration?.questionnaireAnswers?.[index] ?? "No Answer",
  })) ?? [];
  
  

// Prevent undefined eventRegistration from being used



const eventQuestions = useQuery(
  api.events.getEventQuestions,
  selectedTicket?.event?._id ? { eventId: selectedTicket.event._id } : "skip"
);

  const handleGenerateTicket = async (ticket: any) => {
    try {
      // If eventRegistration is not ready, prevent execution
      if (!eventRegistration) {
        console.warn("⚠️ Event registration is still loading, waiting...");
        return;
      }
  
      console.log("✅ Event registration found:", eventRegistration);
  
      const qrCodeUrl = await QRCode.toDataURL(ticket.ticketNumber);
  
      // Ensure eventDate is available
      const eventDateRaw = eventRegistration?.event?.eventDate ?? null;
      const timestamp =
        eventDateRaw && eventDateRaw < 10000000000 ? eventDateRaw * 1000 : eventDateRaw;
  
      const eventDate = timestamp
        ? new Date(timestamp).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "No Date";
  
      const eventTime = timestamp
        ? new Date(timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "No Time Available";
  
      // Check if event details exist before setting state
      if (!eventRegistration.event) {
        console.warn("⚠️ No event details found for this ticket.");
        return;
      }
  
      // ✅ Update selectedTicket when data is available
      setSelectedTicket({
        ticketNumber: ticket.ticketNumber,
        event: {
          title: eventRegistration.event.title || "Unknown Event",
          eventDate,
          eventTime,
          location: eventRegistration.event.location || "Unknown Location",
          host: eventRegistration.event.host || "Unknown Host",
          coverImageUrl: eventRegistration.event.coverImageUrl || "/event_cover.png",
        },
        qrCodeUrl,
        userAnswers: eventRegistration.userResponses ?? [],
      });
  
      console.log("🎟️ Ticket Generated:", selectedTicket);
    } catch (error) {
      console.error("❌ Error generating ticket:", error);
    }
  };
  
  
  
  

  // ✅ Generate Ticket PDF
  const generatePDF = async (element: HTMLElement, width: number, height: number, filename: string) => {
    try {
      const scale = 3;
      const blob = await domtoimage.toBlob(element, {
        quality: 1,
        useCORS: true,
        width: width * scale,
        height: height * scale,
        style: { transform: `scale(${scale})`, transformOrigin: "top left", background: "white" },
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        const pdf = new jsPDF({
          orientation: width > height ? "landscape" : "portrait",
          unit: "px",
          format: [width * scale, height * scale],
        });

        pdf.addImage(reader.result as string, "PNG", 0, 0, width * scale, height * scale);
        pdf.save(filename);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
    }
  };

  // ✅ Desktop Ticket Download
  const handleDownloadTicketDesktop = async () => {
    const ticketElement = document.getElementById("ticket-container");
    if (!ticketElement) {
      console.error("❌ Ticket element not found for download.");
      return;
    }
    await generatePDF(ticketElement, 1200, ticketElement.clientHeight, `Event_Ticket_${selectedTicket.ticketNumber}.pdf`);
  };

  const handleDownloadTicketMobile = async () => {
    setShowMobileTicket(true); // ✅ Ensure mobile ticket is displayed
  
    setTimeout(async () => {
      const mainTicket = document.getElementById("ticket-container");
      const mobileTicket = document.getElementById("hidden-ticket-mobile");
  
      if (!mobileTicket) {
        console.error("❌ Hidden mobile ticket element not found for download.");
        return;
      }
  
      // ✅ Hide main ticket completely
      if (mainTicket) {
        mainTicket.style.display = "none";
      }
  
      // ✅ Ensure mobile ticket is visible before capturing
      mobileTicket.style.display = "block";
  
      // ✅ Capture the ticket as an image
      const scale = 3;
      const blob = await domtoimage.toBlob(mobileTicket, {
        quality: 1,
        useCORS: true,
        width: mobileTicket.clientWidth * scale,
        height: mobileTicket.clientHeight * scale,
        style: { transform: `scale(${scale})`, transformOrigin: "top left", background: "white" },
      });
  
      // ✅ Convert image to PDF (Force Portrait)
      const reader = new FileReader();
      reader.onloadend = () => {
        const pdf = new jsPDF({
          orientation: "portrait", // ✅ Force portrait mode
          unit: "px",
          format: [mobileTicket.clientWidth * scale, mobileTicket.clientHeight * scale], // ✅ Match actual size
        });
  
        pdf.addImage(reader.result as string, "PNG", 0, 0, mobileTicket.clientWidth * scale, mobileTicket.clientHeight * scale);
        pdf.save(`Event_Ticket_${selectedTicket.ticketNumber}.pdf`);
      };
      reader.readAsDataURL(blob);
  
      // ✅ Restore visibility after download
      setTimeout(() => {
        if (mainTicket) {
          mainTicket.style.display = "block";
        }
        setShowMobileTicket(false);
      }, 500);
    }, 500); // ✅ Ensure rendering is completed before capturing
  };
  
  

  // ✅ Handle Ticket Download (Detect Mobile/Desktop)
  const handleDownloadTicket = () => {
    if (window.innerWidth <= 768) {
      handleDownloadTicketMobile(); // ✅ Calls the updated function with delay
    } else {
      handleDownloadTicketDesktop();
    }
  };

 
  useEffect(() => {
    if (selectedTicket?.ticketNumber && eventRegistration) {
      console.log("🚀 Event registration data ready, updating ticket...");
      handleGenerateTicket(selectedTicket);
    }
  }, [eventRegistration]); // ✅ Only triggers when `eventRegistration` updates
  
  return (
    <div className="container mx-auto mt-10 px-4">
      <h1 className="text-2xl font-semibold mb-4">My Event Tickets</h1>
  
      {tickets && tickets.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 shadow-md rounded-lg hidden md:table">
            <thead>
              <tr className="bg-gray-100 text-left text-sm uppercase text-gray-600">
                <th className="p-4 border-b">Event Name</th>
                <th className="p-4 border-b">Event Date</th>
                <th className="p-4 border-b">Ticket Number</th>
                <th className="p-4 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket._id} className="border-b">
                  <td className="p-4">{ticket.event?.title ?? "Unknown Event"}</td>
                  <td className="p-4">
                    {ticket.event?.eventDate
                      ? new Date(ticket.event.eventDate).toLocaleDateString()
                      : "No Date"}
                  </td>
                  <td className="p-4">{ticket.ticketNumber}</td>
                  <td className="p-4">
                    {selectedTicket?.ticketNumber === ticket.ticketNumber ? (
                      <Button
                        onClick={handleDownloadTicket}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Download Ticket
                      </Button>
                    ) : (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          console.log("🟢 Generating ticket for:", ticket.ticketNumber);
                          setSelectedTicket(ticket);
                        }}
                      >
                        Generate Ticket
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
  
          {/* 📱 Mobile Layout (Cards Instead of Table) */}
          <div className="md:hidden">
            {tickets.map((ticket) => (
              <div key={ticket._id} className="bg-white border border-gray-300 shadow-md rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Event:</strong> {ticket.event?.title ?? "Unknown Event"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong>{" "}
                  {ticket.event?.eventDate
                    ? new Date(ticket.event.eventDate).toLocaleDateString()
                    : "No Date"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Ticket #:</strong> {ticket.ticketNumber}
                </p>
                <div className="mt-3">
                  {selectedTicket?.ticketNumber === ticket.ticketNumber ? (
                    <Button
                      onClick={handleDownloadTicket}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Download Ticket
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        console.log("🟢 Generating ticket for:", ticket.ticketNumber);
                        setSelectedTicket(ticket);
                      }}
                    >
                      Generate Ticket
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-gray-500 mt-4">No tickets found.</div>
      )}
  
      {/* Ticket Preview & Download */}
      {selectedTicket && (
        <div className="mt-6 flex justify-center">
          <div id="ticket-container">
            <Ticket {...selectedTicket} />
          </div>
  
          {/* Mobile Ticket Download */}
          {showMobileTicket && (
            <div id="hidden-ticket-mobile" className="block md:hidden">
              <Ticket {...selectedTicket} />
            </div>
          )}
        </div>
      )}
    </div>
  );
  

}