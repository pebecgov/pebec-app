// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { FaArrowLeft, FaFileAlt, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding, FaCalendarAlt } from "react-icons/fa";
import TicketStepper from "@/components/ui/stepper";
export default function GuestTicketDetailsPage() {
  const {
    ticketId
  } = useParams();
  const ticket = useQuery(api.tickets.getTicketById, {
    ticketId: ticketId as Id<"tickets">
  });
  const getFileUrl = useMutation(api.tickets.getStorageUrl);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  useEffect(() => {
    if (ticket?.supportingDocuments?.length) {
      const fetchUrls = async () => {
        const urls = await Promise.all(ticket.supportingDocuments.map(async docId => {
          const url = await getFileUrl({
            storageId: docId
          });
          return url ?? "";
        }));
        setFileUrls(urls.filter(url => url !== ""));
      };
      fetchUrls();
    }
  }, [ticket, getFileUrl]);
  if (!ticket) return <p className="text-center text-gray-500">Loading ticket details...</p>;
  return <div className="max-w-5xl mx-auto mt-20 p-6 bg-white shadow-lg rounded-md">
      <Link href="/reportgov-check-status">
        <Button variant="outline" className="mb-6">
          <FaArrowLeft className="mr-2" /> Back to Status Checker
        </Button>
      </Link>

      <TicketStepper currentStep={ticket.status === "open" ? 0 : ticket.status === "in_progress" ? 1 : 2} status={ticket.status} />

      <div className="mt-6">
        <h1 className="text-2xl font-bold">{ticket.title}</h1>
        <p className="text-gray-500 mt-1">
          Ticket Number: <span className="font-semibold">{ticket.ticketNumber}</span>
        </p>
      </div>

      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="font-semibold text-lg">Description</h3>
        <div dangerouslySetInnerHTML={{
        __html: ticket.description
      }} />
      </div>

      <div className="mt-6 p-5 bg-white shadow-md rounded-lg border">
        <h3 className="font-semibold text-lg mb-3">Submitted By</h3>
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

      {ticket.resolutionNote && (ticket.status === "closed" || ticket.status === "resolved") && <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold text-lg">Resolution Note</h3>
          <p>{ticket.resolutionNote}</p>
        </div>}

      {fileUrls.length > 0 && <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold text-lg mb-2">Uploaded Files</h3>
          <ul className="list-disc pl-5">
            {fileUrls.map((url, index) => <li key={index}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                  <FaFileAlt className="text-gray-500" /> View Document {index + 1}
                </a>
              </li>)}
          </ul>
        </div>}
    </div>;
}