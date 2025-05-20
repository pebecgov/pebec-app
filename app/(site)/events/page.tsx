
import React from "react";
import Events from "@/components/Events";

export const metadata = {
  title: "Upcoming Events",
  description: "Discover and join our upcoming events!"
};

const EventPage = () => {
  return (
    <div className="pb-20 mt-25 bg-gray-50">
      {/* Title and Subtitle Section */}
     

      {/* Events List Section */}
      <Events />
    </div>
  );
};

export default EventPage;
