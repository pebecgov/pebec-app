"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { FaCalendarAlt, FaUsers, FaClock, FaTag } from "react-icons/fa";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const EventAnalyticsDashboard = () => {
  const events = useQuery(api.events.getAllEventsWithStats);

  if (!events) return <div>Loading...</div>;

  const sortedEvents = [...events].sort((a, b) => a.eventDate! - b.eventDate!);

  const attendeesOverTimeData = {
    labels: sortedEvents.map((event) =>
      new Date(event.eventDate).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Attendees",
        data: sortedEvents.map((event) => event.totalAttendees),
        fill: false,
        borderColor: "#3b82f6",
        tension: 0.1,
      },
    ],
  };

  const eventTypeCounts = sortedEvents.reduce((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const eventTypeDistributionData = {
    labels: Object.keys(eventTypeCounts),
    datasets: [
      {
        label: "Event Types",
        data: Object.values(eventTypeCounts),
        backgroundColor: ["#f87171", "#34d399", "#60a5fa", "#fbbf24"],
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div className="flex flex-col md:flex-row p-4 gap-4">
      {/* Upcoming Events Scrollable List */}
      <div className="md:w-1/2 bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[80vh]">
        <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event._id} className="border-b pb-2">
              <h3 className="text-lg font-medium">{event.title}</h3>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <FaCalendarAlt className="mr-2" />
                {new Date(event.eventDate!).toLocaleDateString()}
              </div>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <FaClock className="mr-2" />
                {new Date(event.eventDate!).toLocaleTimeString()}
              </div>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <FaUsers className="mr-2" />
                {event.totalAttendees} Attendees
              </div>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <FaTag className="mr-2" />
                {event.eventType}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Charts Section */}
      <div className="md:w-1/2 flex flex-col gap-4 w-full">
        {/* Line Chart */}
        <div className="bg-white rounded-lg shadow p-4 w-full">
          <h2 className="text-xl font-semibold mb-4">Attendees Over Time</h2>
          <div className="h-64">
            <Line
              data={attendeesOverTimeData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow p-4 w-full">
          <h2 className="text-xl font-semibold mb-4">Event Type Distribution</h2>
          <div className="h-64">
            <Pie
              data={eventTypeDistributionData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventAnalyticsDashboard;
