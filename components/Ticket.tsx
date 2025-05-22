// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import React from "react";
import { MapPin, Calendar, Clock, User, Hash } from "lucide-react";
interface TicketProps {
  ticketNumber: string;
  event: {
    title: string;
    host: string;
    location: string;
    eventDate: number;
    coverImageUrl?: string;
    eventTime: number;
  };
  qrCodeUrl: string;
  userAnswers: {
    questionText: string;
    answer: string;
  }[];
  ticketOwner?: string;
}
const Ticket: React.FC<TicketProps> = ({
  ticketNumber,
  event,
  qrCodeUrl,
  userAnswers,
  ticketOwner
}) => {
  return <div className="relative bg-white shadow-lg rounded-lg border border-gray-300 overflow-hidden flex flex-col md:flex-row w-full md:w-[1200px] h-auto md:h-auto p-2 md:p-4 md:mb-10">
      {}
      <div className="relative w-full md:w-1/3 flex flex-col items-center justify-center p-2 md:p-4">
        <img src="/images/logo/logo_pebec1.PNG" alt="PEBEC Logo" className="absolute top-2 left-2 md:top-4 md:left-4 md:w-[100px] md:h-[50px] w-[60px] h-[30px]" />
        <div className="relative w-full h-auto md:h-full">
          {event.coverImageUrl ? <img src={event?.coverImageUrl} crossOrigin="anonymous" referrerPolicy="no-referrer" onLoad={() => console.log("✅ Image loaded:", event?.coverImageUrl)} onError={() => console.error("❌ Image failed to load:", event?.coverImageUrl)} alt="Event Cover" className="w-full h-full object-cover md:rounded-l-lg opacity-80" /> : <div className="w-full h-full flex items-center justify-center bg-gray-300">
              <span className="text-gray-600 text-xs md:text-sm">No Cover Image</span>
            </div>}
        </div>
      </div>

      {}
      <div className="flex flex-col justify-between p-4 bg-gray-900 text-white w-full md:w-2/3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-2xl font-bold">Event Ticket</h1>
            <p className="text-xs md:text-sm text-gray-400 flex items-center">
              <Hash className="w-4 h-4 mr-1 text-green-400" /> Ticket Number: {ticketNumber}
            </p>
            {}
            
          </div>
          {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="rounded-md w-[80px] h-[80px] md:w-[112px] md:h-[112px]" />}
        </div>

        {}
        <div className="mt-2 text-xs md:text-sm">
          <h2 className="text-lg md:text-xl font-semibold">{event.title}</h2>
          <div className="flex items-center mt-2">
            <User className="w-4 h-4 md:w-5 md:h-5 text-green-400 mr-2" />
            <p className="text-gray-300">Host: {event.host}</p>
          </div>
          <div className="flex items-center mt-2">
            <MapPin className="w-4 h-4 md:w-5 md:h-5 text-green-400 mr-2" />
            <p className="text-gray-300">Location: {event.location}</p>
          </div>
          <div className="flex items-center mt-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-400 mr-2" />
            <p className="text-gray-300">Date: {new Date(event.eventDate).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center mt-2">
  <Clock className="w-4 h-4 md:w-5 md:h-5 text-green-400 mr-2" />
  <p className="text-gray-300">
    Time: {new Date(event.eventDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
  </p>
        </div>


        </div>

        {}
        <div className="mt-4 text-xs md:text-sm">
          <h3 className="text-sm md:text-lg font-semibold">Your ticket details:</h3>
          <ul className="mt-2 space-y-1">
  {(userAnswers ?? []).map((qa, index) => <li key={index} className="text-gray-300">
      <strong>{qa.questionText}:</strong> {qa.answer}
    </li>)}
        </ul>
        </div>

        {}
        <div className="text-center text-gray-400 text-xs md:text-sm mt-4 border-t pt-2">
          This ticket is valid only for the person to whom it was issued.
        </div>
      </div>
    </div>;
};
export default Ticket;