"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import TicketComments from "@/components/TicketsComments";
import { 
  FaArrowLeft, FaFileAlt, FaUser, FaEnvelope, FaPhone, 
  FaMapMarkerAlt, FaBuilding, FaCalendarAlt, FaLock
} from "react-icons/fa";
import TicketStepper from "@/components/ui/stepper";

export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const ticket = useQuery(api.tickets.getTicketById, { ticketId: ticketId as Id<"tickets"> });

  const getFileUrl = useMutation(api.tickets.getStorageUrl);
  const [fileUrls, setFileUrls] = useState<string[]>([]);

  useEffect(() => {
    if (ticket?.supportingDocuments?.length) {
      const fetchUrls = async () => {
        try {
          const urls = await Promise.all(
            ticket.supportingDocuments.map(async (docId) => {
              const url = await getFileUrl({ storageId: docId });
              return url ?? "";
            })
          );
          setFileUrls(urls.filter((url) => url !== ""));
        } catch (error) {
          console.error("❌ Failed to fetch file URLs:", error);
        }
      };

      fetchUrls();
    }
  }, [ticket, getFileUrl]);

  if (!ticket) return <p className="text-center text-gray-500">Loading ticket details...</p>;

  const isClosedOrResolved = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="relative max-w-5xl mx-auto md:mt-30 p-6 mt-20 bg-white shadow-lg rounded-md">
       {/* 🔙 Back Button (Always Active) */}
       <Link href="/reportgov">
      
      <button
        type="button"
        className="bg-white text-center w-48 rounded-2xl h-14 relative text-black text-xl font-semibold border-4 border-white group"
      >
        <div
          className="bg-green-400 rounded-xl h-12 w-1/4 grid place-items-center absolute left-0 top-0 group-hover:w-full z-10 duration-500"
        >
          <svg
            width="25px"
            height="25px"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#000000"
              d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
            ></path>
            <path
              fill="#000000"
              d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
            ></path>
          </svg>
        </div>
        <p className="translate-x-4">Go Back</p>
      </button>
      
            </Link>
            {isClosedOrResolved && ticket.resolutionNote && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50 mb-10">
          <h3 className="font-semibold text-lg mb-2">Resolution Note</h3>
          <p>{ticket.resolutionNote}</p>
        </div>
      )}
      {/* 🔐 Overlay if ticket is closed or resolved */}
   

     

      {/* 🎫 Ticket Stepper Status */}
      <TicketStepper 
        currentStep={ticket.status === "open" ? 0 : ticket.status === "in_progress" ? 1 : 2} 
        status={ticket.status} 
      />

      {/* 📌 Ticket Header */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold">{ticket.title}</h1>
        <p className="text-gray-500 mt-1">
          Ticket Number: <span className="font-semibold">{ticket.ticketNumber}</span>
        </p>
      </div>

      {/* 📝 Ticket Description */}
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="font-semibold text-lg">Description</h3>
        <div dangerouslySetInnerHTML={{ __html: ticket.description }} />
      </div>

      {/* 📇 User Details Card */}
      <div className="mt-6 p-5 bg-white shadow-md rounded-lg border">
        <h3 className="font-semibold text-lg mb-3">User Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700 text-sm">
          <div className="flex items-center gap-2">
            <FaUser className="text-gray-600" />
            <p>{ticket.fullName}</p>
          </div>
          <div className="flex items-center gap-2">
            <FaEnvelope className="text-gray-600" />
            <p>{ticket.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <FaPhone className="text-gray-600" />
            <p>{ticket.phoneNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-gray-600" />
            <p>{new Date(ticket.incidentDate).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-gray-600" />
            <p>{ticket.state}, {ticket.address}</p>
          </div>
          <div className="flex items-center gap-2">
            <FaBuilding className="text-gray-600" />
            <p>{ticket.assignedMDAName}</p>
          </div>
        </div>
      </div>

      {/* 📂 Supporting Documents */}
      {fileUrls.length > 0 && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold text-lg mb-2">Uploaded Files</h3>
          <ul className="list-disc pl-5">
            {fileUrls.map((url, index) => (
              <li key={index}>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`text-blue-500 hover:underline flex items-center gap-1 ${isClosedOrResolved ? "pointer-events-none opacity-50" : ""}`}
                >
                  <FaFileAlt className="text-gray-500" /> View Document {index + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 📝 Resolution Note (If Resolved or Closed) */}


    {/* 💬 Ticket Comments (Disabled if Closed/Resolved) */}
       {!isClosedOrResolved && (
         <div className="mt-6">
           <TicketComments ticketId={ticketId as string} />
         </div>
       )}
    </div>
  );
}
