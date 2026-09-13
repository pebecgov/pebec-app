"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";

interface AnnouncementBarProps {
  onVisibilityChange?: (isVisible: boolean, offsetPx: number) => void;
}

const TRACKER_DISCLAIMER =
  "Disclaimer: If you find inconsistent or incorrect information on this tracker, please dispute it with PEBEC immediately by submitting counter evidence. Do not ignore errors.";

const BAR_HEIGHT_PX = 48;

const AnnouncementBar = ({ onVisibilityChange }: AnnouncementBarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("announcementDismissed");
    if (!isDismissed) {
      setIsVisible(true);
      // Green + red bars stacked
      onVisibilityChange?.(true, BAR_HEIGHT_PX * 2);
      setTimeout(() => setIsAnimating(true), 50);
    } else {
      // Disclaimer marquee still shows when the report announcement is dismissed
      onVisibilityChange?.(true, BAR_HEIGHT_PX);
    }
  }, [onVisibilityChange]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem("announcementDismissed", "true");
      onVisibilityChange?.(true, BAR_HEIGHT_PX);
    }, 300);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60]">
      {isVisible && (
        <div
          className={`bg-gradient-to-r from-[#2D8B10] to-[#228B22] text-white shadow-md transition-all duration-500 ease-out ${
            isAnimating ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
        >
          <Link
            href="/reports"
            className="block w-full py-3 px-4 hover:bg-black/10 transition-colors cursor-pointer"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <span className="inline-flex items-center gap-2 text-sm md:text-base font-medium">
                  The 2025 Subnational Ease of Doing Business and Business Facilitation Act
                  Performance Report Now Available → Download Here
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors z-10"
                aria-label="Dismiss announcement"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </Link>
        </div>
      )}

      <div
        role="alert"
        className="bg-red-700 text-white shadow-md overflow-hidden border-t border-red-800"
      >
        <div className="tracker-disclaimer-marquee py-3">
          <div className="tracker-disclaimer-marquee-track">
            <span className="font-bold text-sm md:text-base uppercase tracking-wide px-8">
              {TRACKER_DISCLAIMER}
            </span>
            <span
              className="font-bold text-sm md:text-base uppercase tracking-wide px-8"
              aria-hidden="true"
            >
              {TRACKER_DISCLAIMER}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tracker-disclaimer-marquee {
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
        }

        .tracker-disclaimer-marquee-track {
          display: inline-flex;
          width: max-content;
          animation: tracker-disclaimer-marquee 40s linear infinite;
        }

        .tracker-disclaimer-marquee-track:hover {
          animation-play-state: paused;
        }

        @keyframes tracker-disclaimer-marquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @media (max-width: 768px) {
          .tracker-disclaimer-marquee-track {
            animation-duration: 28s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tracker-disclaimer-marquee-track {
            animation: none;
            flex-wrap: wrap;
            white-space: normal;
            justify-content: center;
            width: 100%;
          }

          .tracker-disclaimer-marquee-track span[aria-hidden="true"] {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default AnnouncementBar;
