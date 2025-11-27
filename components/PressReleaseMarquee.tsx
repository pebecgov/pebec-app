"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function PressReleaseMarquee() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-red-600 text-white relative overflow-hidden sticky top-0 z-50">
      <div className="flex items-center">
        <div className="flex-1 py-3">
          <div className="marquee-container">
            <div className="marquee-content">
              <span className="font-semibold text-sm md:text-base">
                Announcement: Notice of New Date for PEBEC Gala Night: Tuesday, 2nd December 2025 | Banquet Hall, State House, Abuja | 5:00 PM 
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-2 hover:bg-red-700 transition-colors duration-200 flex-shrink-0"
          aria-label="Close announcement"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      
      <style jsx>{`
        .marquee-container {
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
        }
        
        .marquee-content {
          display: inline-block;
          animation: marquee 90s linear infinite;
          padding-left: 0;
        }
        
        @keyframes marquee {
          0% {
            transform: translate3d(50%, 0, 0);
          }
          100% {
            transform: translate3d(-100%, 0, 0);
          }
        }
        
        .marquee-content:hover {
          animation-play-state: paused;
        }
        
        @media (max-width: 768px) {
          .marquee-content {
            animation-duration: 70s;
          }
        }
      `}</style>
    </div>
  );
}
