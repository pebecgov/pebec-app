// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import Ticket from "@/components/Ticket";
import html2canvas from "html2canvas";
import ReactDOMServer from "react-dom/server";
export default function EventPage() {
  const {
    eventId
  } = useParams();
  const [ticketData, setTicketData] = useState<any>(null);
  const [isTicketReady, setIsTicketReady] = useState(false);
  const [answers, setAnswers] = useState<{
    questionId: Id<"event_questions">;
    answer: string;
  }[]>([]);
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [vipCode, setVipCode] = useState("");
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const [isClient, setIsClient] = useState(false);
  const event = useQuery(api.events.getEventById, isClient ? {
    eventId: eventId as Id<"events">
  } : "skip");
  const questions = useQuery(api.events.getEventQuestions, isClient ? {
    eventId: eventId as Id<"events">
  } : "skip");
  const currentUser = useQuery(api.users.getCurrentUsers) || null;
  const [vipCodeError, setVipCodeError] = useState<string | null>(null);
  const [vipCodeValid, setVipCodeValid] = useState(false);
  const userEmail = (currentUser as any)?.email ?? "";
  const userPhone = (currentUser as any)?.phoneNumber ?? "";
  const convex = useConvex();
  const storageId = event?.coverImageId ? event.coverImageId as Id<"_storage"> : undefined;
  const coverImageUrlQuery = useQuery(api.images.getImageUrl, storageId ? {
    storageId
  } : "skip");
  const coverImageUrl = storageId ? coverImageUrlQuery : "";
  const rsvpEventMutation = useMutation(api.events.rsvpEvent);
  const isPastEvent = event ? new Date(event.eventDate) < new Date() : false;
  const [ticketsLeft, setTicketsLeft] = useState<{
    vip: number | null;
    general: number | null;
  }>({
    vip: null,
    general: null
  });
  const registrations = useQuery(api.events.getEventRegistrations, isClient ? {
    eventId: eventId as Id<"events">
  } : "skip");
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || "");
      setLastName(currentUser.lastName || "");
      setEmail((currentUser as any)?.email || "");
      setPhone((currentUser as any)?.phoneNumber || "");
    }
  }, [currentUser]);
  useEffect(() => {
    if (event && registrations) {
      const vipCount = registrations.filter(r => r.isVip).length;
      const generalCount = registrations.filter(r => !r.isVip).length;
      setTicketsLeft({
        vip: event.vipTicketLimit != null ? event.vipTicketLimit - vipCount : null,
        general: event.generalTicketLimit != null ? event.generalTicketLimit - generalCount : null
      });
    }
  }, [event, registrations]);
  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!isClient) {
    return <p className="text-center text-gray-500">Loading...</p>;
  }
  if (!eventId || typeof eventId !== "string") {
    return <p className="text-red-500">Invalid Event ID</p>;
  }
  const generateStyledPdfBlobFromTicket = async ticketObject => {
    console.log("🎟️ Generating Professional Ticket PDF...");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [210, 80]
    });
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(5, 5, 200, 70, 15, 15, "F");
    pdf.setFillColor(235, 235, 235);
    pdf.roundedRect(10, 10, 55, 60, 10, 10, "F");
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(70, 10, 70, 60, 10, 10, "F");
    pdf.setFillColor(0, 85, 50);
    pdf.roundedRect(145, 10, 55, 60, 10, 10, "F");
    pdf.setDrawColor(150);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.line(67, 10, 67, 70);
    const logoPath = "/images/logo/logo_pebec1.PNG";
    pdf.addImage(logoPath, "PNG", 88, 12, 30, 12);
    pdf.setFontSize(14);
    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "bold");
    const eventTitleLines = pdf.splitTextToSize(ticketObject.event.title.toUpperCase(), 65);
    pdf.text(eventTitleLines, 105, 35, {
      align: "center"
    });
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    const ticketNumberLines = pdf.splitTextToSize(`Ticket #: ${ticketObject.ticketNumber}`, 65);
    pdf.text(ticketNumberLines, 105, 65, {
      align: "center"
    });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`Access: ${ticketObject.isVip ? "VIP" : "General"}`, 105, 55, {
      align: "center"
    });
    const formattedType = ticketObject.eventType === "vip_and_general" ? "VIP & General" : ticketObject.eventType;
    pdf.text(`Event Type: ${formattedType}`, 105, 60, {
      align: "center"
    });
    if (ticketObject.qrCodeUrl) {
      pdf.addImage(ticketObject.qrCodeUrl, "PNG", 20, 20, 35, 35);
    }
    const eventDate = new Date();
    const barcodeDate = eventDate.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(/[\/,: ]/g, "");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(50, 50, 50);
    pdf.text("Generated on", 23, 58);
    pdf.setFont("courier", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(30, 30, 30);
    pdf.text(eventDate.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }), 15, 63);
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.text("Location:", 150, 20);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const locationLines = pdf.splitTextToSize(ticketObject.event.location, 50);
    pdf.text(locationLines, 150, 27);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Date & Time:", 150, 40);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const dateTimeLines = pdf.splitTextToSize(ticketObject.eventDate, 50);
    pdf.text(dateTimeLines, 150, 47);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Full Name:", 150, 60);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const ownerLines = pdf.splitTextToSize(ticketObject.ticketOwner, 50);
    pdf.text(ownerLines, 150, 67);
    console.log("✅ Professionally Styled Ticket PDF generated.");
    return pdf.output("blob");
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !questions) {
      console.error("🚨 Event not found or questions still loading");
      return;
    }
    const allAnswered = questions.every(q => answers.some(a => a.questionId === q._id && a.answer.trim() !== ""));
    if (!currentUser && (!email.trim() || !firstName.trim() || !lastName.trim() || !phone.trim())) {
      setError("❌ Please enter your full name, email, and phone number.");
      return;
    }
    if (event.eventType === "vip_and_general") {
      if (isVip && event.vipTicketLimit != null && ticketsLeft.vip !== null && ticketsLeft.vip <= 0) {
        setError("❌ VIP tickets are sold out.");
        return;
      }
      if (!isVip && event.generalTicketLimit != null && ticketsLeft.general !== null && ticketsLeft.general <= 0) {
        setError("❌ General tickets are sold out.");
        return;
      }
    }
    if (isVip && event.vipAccessCode && vipCode.trim() !== event.vipAccessCode.trim()) {
      setError("❌ Invalid VIP access code.");
      return;
    }
    if (!allAnswered) {
      setError("❌ You must fill all the fields before getting your ticket.");
      return;
    }
    if (!currentUser) {
      const existing = await convex.query(api.events.getRegistrationByEmail, {
        eventId: eventId as Id<"events">,
        email: email.trim().toLowerCase()
      });
      if (existing) {
        setError("❌ You already have a ticket for this event. Please download it from your mailbox. Check spam if not found.");
        setLoading(false);
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      console.log("🎟️ Generating Ticket...");
      const count = registrations?.length ?? 0;
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const index = String(count + 1).padStart(3, "0");
      const ticketNumber = `PEBEC-EV-${day}${month}${year}-${index}`;
      const qrCodeUrl = await QRCode.toDataURL(ticketNumber);
      const ticketOwner = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : `${firstName} ${lastName}`;
      const userAnswers = answers.map(a => ({
        questionText: questions.find(q => q._id === a.questionId)?.questionText || "Unknown Question",
        answer: a.answer
      }));
      const ticketObject = {
        ticketNumber,
        event: {
          ...event,
          coverImageUrl: coverImageUrl || ""
        },
        qrCodeUrl,
        eventDate: new Date(event.eventDate).toLocaleString(),
        userAnswers,
        ticketOwner,
        isVip,
        eventType: event.eventType
      };
      const ticketPdfBlob = await generateStyledPdfBlobFromTicket(ticketObject);
      if (!ticketPdfBlob) {
        console.error("❌ Failed to generate ticket PDF.");
        setLoading(false);
        return;
      }
      const pdfUrl = URL.createObjectURL(ticketPdfBlob);
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `Event_Ticket_${ticketNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf"
        },
        body: ticketPdfBlob
      });
      if (!response.ok) {
        throw new Error(`❌ Failed to upload PDF (Status: ${response.status})`);
      }
      const {
        storageId
      } = await response.json();
      await rsvpEventMutation({
        eventId: eventId as Id<"events">,
        answers,
        userId: currentUser?._id ?? undefined,
        email: !currentUser ? email : undefined,
        firstName: !currentUser ? firstName : undefined,
        lastName: !currentUser ? lastName : undefined,
        phone: !currentUser ? phone : undefined,
        qrCode: qrCodeUrl,
        ticketPdfId: storageId as Id<"_storage">,
        isVip
      });
      console.log("✅ RSVP Successful!");
      setTimeout(() => {
        setLoading(false);
        setIsTicketReady(true);
        setAnswers([]);
        setEmail("");
      }, 1500);
    } catch (error) {
      console.error("❌ Error generating ticket:", error);
      setLoading(false);
    }
  };
  const handleChange = (questionId: Id<"event_questions">, value: string) => {
    setAnswers(prevAnswers => {
      const existingAnswer = prevAnswers.find(answer => answer.questionId === questionId);
      if (existingAnswer) {
        existingAnswer.answer = value;
        return [...prevAnswers];
      }
      return [...prevAnswers, {
        questionId,
        answer: value
      }];
    });
  };
  const generatePdfFromTicket = async () => {
    const ticketElement = document.getElementById("ticket-container");
    if (!ticketElement) {
      console.error("❌ Ticket container not found");
      return;
    }
    ticketElement.style.display = "block";
    ticketElement.style.position = "relative";
    ticketElement.style.width = "fit-content";
    ticketElement.style.height = "auto";
    ticketElement.style.minHeight = "fit-content";
    ticketElement.style.padding = "20px";
    ticketElement.style.backgroundColor = "#ffffff";
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: ticketElement.scrollWidth,
        height: ticketElement.scrollHeight
      });
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save(`Event_Ticket_${ticketData.ticketNumber}.pdf`);
      console.log("✅ Ticket PDF generated and downloaded.");
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
    } finally {
      ticketElement.style.display = "none";
      setTicketData(null);
    }
  };
  const isFormIncomplete = Boolean(!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim() || questions?.some(q => !answers.find(a => a.questionId === q._id)?.answer.trim()) || (event?.eventType === "vip" || event?.eventType === "vip_and_general" && isVip) && event?.vipAccessCode && vipCode.trim() !== event.vipAccessCode.trim());
  return <div className="relative mx-auto w-full bg-white pt-12 mt-30 px-10 md:px-30 lg:px-30 md:mb-20  ">
      <div className="flex flex-col md:flex-row gap-8">


        {}
        <div className="md:w-1/2 w-full">
  {event?.signUpsDisabled ? <div className="bg-red-100 border border-red-300 text-red-700 p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-2">⚠️ Sign-Ups Disabled</h2>
      <p>You cannot sign up for this event anymore.</p>
    </div> : <>
     

      <h1 className="text-2xl font-medium text-green-700 sm:text-3xl">
        Sign Up for this Event
        <span className="mt-2 block h-1 w-10 bg-green-600"></span>
      </h1>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {event?.eventType === "vip" && <div>
          <label className="text-sm font-medium">Enter Your Access Code</label>
          <input type="text" value={vipCode} onChange={e => {
              const code = e.target.value;
              setVipCode(code);
              if (!event?.vipAccessCode || !code.trim()) {
                setVipCodeError(null);
                setVipCodeValid(false);
                return;
              }
              if (code.trim() !== event.vipAccessCode.trim()) {
                setVipCodeError("❌ Invalid VIP code");
                setVipCodeValid(false);
              } else {
                setVipCodeError(null);
                setVipCodeValid(true);
              }
            }} className={`mt-1 block w-full border p-2 rounded-md ${vipCodeError ? "border-red-500" : "border-gray-300"}`} placeholder="Enter VIP code" />
          {vipCodeError && <p className="text-sm text-red-500 mt-1">{vipCodeError}</p>}
          {vipCodeValid && <p className="text-sm text-green-600 mt-1">✅ The code you entered is correct</p>}
        </div>}

      {event?.eventType === "vip_and_general" && <>
          <div>
            <label className="text-sm font-medium">Select access type</label>
            <select className="mt-1 w-full border p-2 rounded-md" value={isVip ? "vip" : "general"} onChange={e => setIsVip(e.target.value === "vip")}>
              <option value="general">General - Regular attendee</option>
              <option value="vip">VIP attendee</option>
            </select>
          </div>

          {isVip && event.vipAccessCode && <div>
              <label className="text-sm font-medium">Enter VIP Access Code</label>
              <input type="text" value={vipCode} onChange={e => setVipCode(e.target.value)} className="mt-1 block w-full border p-2 rounded-md" placeholder="Enter VIP code" />
            </div>}
        </>}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500">First Name</label>
          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 block w-full rounded border-gray-300 bg-gray-50 py-3 px-4 text-sm shadow-sm focus:ring-2 focus:ring-green-500" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Last Name</label>
          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 block w-full rounded border-gray-300 bg-gray-50 py-3 px-4 text-sm shadow-sm focus:ring-2 focus:ring-green-500" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Phone Number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded border-gray-300 bg-gray-50 py-3 px-4 text-sm shadow-sm focus:ring-2 focus:ring-green-500" required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded border-gray-300 bg-gray-50 py-3 px-4 text-sm shadow-sm focus:ring-2 focus:ring-green-500" required />
        </div>

        {questions?.map(question => <div key={question._id}>
            <label className="text-xs font-semibold text-gray-500">{question.questionText}</label>
            <input type={question.questionType} onChange={e => handleChange(question._id as Id<"event_questions">, e.target.value)} className="mt-1 block w-full rounded border-gray-300 bg-gray-50 py-3 px-4 text-sm shadow-sm focus:ring-2 focus:ring-green-500" />
          </div>)}

        <Button type="submit" disabled={loading || isPastEvent || isFormIncomplete} className={`w-full text-white ${isPastEvent || isFormIncomplete ? "bg-gray-400 cursor-not-allowed" : loading ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}>
          {isPastEvent ? "Event Closed" : loading ? "Generating Ticket..." : "Sign Up & Get Ticket"}
        </Button>
      </form>
    </>}
      </div>

        {}
        <div className="md:w-1/2 w-full">
  {}
  <div className="relative mb-6 h-64 rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white">
    {coverImageUrl ? <Image src={coverImageUrl} alt={event?.title ?? "Event"} fill className="object-contain object-center" crossOrigin="anonymous" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
        No Image Available
      </div>}
  </div>

  {}
  <div className="bg-green-800 text-white p-6 rounded-xl shadow-lg space-y-5">
    <h2 className="text-2xl font-bold">{event?.title ?? "Event Title"}</h2>
    <p className="text-base opacity-90">{event?.description ?? "No description available."}</p>

    <div className="border-t border-white/20 pt-4">
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="text-blue-300">📅</span>
          <span className="font-medium">Date:</span>
          <span>
            {event?.eventDate ? new Date(event.eventDate).toLocaleDateString() : "TBD"}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="text-yellow-300">⏰</span>
          <span className="font-medium">Time:</span>
          <span>
            {event?.eventDate ? new Date(event.eventDate).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  }) : "TBD"}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="text-purple-300">👤</span>
          <span className="font-medium">Host:</span>
          <span>{event?.host || "PEBEC"}</span>
        </li>
      </ul>
    </div>
  </div>
      </div>

      </div>

    {}
    {ticketData && <div className="flex flex-col items-center mb-10">
          {}
          <div id="ticket-container" className="hidden md:block md:mt-10">
            <Ticket {...ticketData} />
          </div>

          {}
          <Button onClick={generatePdfFromTicket} className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition">
            Download Your Ticket
          </Button>
          {}
         
        </div>}
    </div>;
}