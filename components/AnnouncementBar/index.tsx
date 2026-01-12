"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";

interface AnnouncementBarProps {
    onVisibilityChange?: (isVisible: boolean) => void;
}

const AnnouncementBar = ({ onVisibilityChange }: AnnouncementBarProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Check if the announcement has been dismissed
        const isDismissed = localStorage.getItem("announcementDismissed");
        if (!isDismissed) {
            setIsVisible(true);
            onVisibilityChange?.(true);
            // Trigger animation after component mounts
            setTimeout(() => setIsAnimating(true), 50);
        } else {
            onVisibilityChange?.(false);
        }
    }, [onVisibilityChange]);

    const handleDismiss = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Slide up animation before hiding
        setIsAnimating(false);
        setTimeout(() => {
            setIsVisible(false);
            localStorage.setItem("announcementDismissed", "true");
            onVisibilityChange?.(false);
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-[#2D8B10] to-[#228B22] text-white shadow-md transition-all duration-500 ease-out ${isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                }`}
        >
            <Link
                href="/reports"
                className="block w-full py-3 px-4 hover:bg-black/10 transition-colors cursor-pointer"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex-1 text-center">
                        <span className="inline-flex items-center gap-2 text-sm md:text-base font-medium">
                            The 2025 Subnational Ease of Doing Business and Business Facilitation Act Performance Report Now Available → Download Here
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
    );
};

export default AnnouncementBar;
