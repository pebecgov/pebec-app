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
                PRESS RELEASE 26 November 2025 | PEBEC Announces Change of Venue for the 2025 PEBEC Awards & Gala Night | 
                Originally scheduled at the Banquet Hall, State House, Abuja, the event will now take place at the Bola Ahmed Tinubu Conference Center (Former International Conference Center), Abuja | 
                Event Date: Friday, 28th November 2025 by 5pm | Dress code: Afro-Glam or Black-Tie | 
                This decision follows an overwhelming level of interest and confirmation from stakeholders across government, the private sector, the diplomatic community, and development partners | 
                For further details or confirmation, please contact: 0803 362 0898 or 0701 244 4706 | 
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
