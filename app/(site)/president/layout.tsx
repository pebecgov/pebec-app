// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import NotificationBadge from "@/components/NotificationBadge";
import Image from "next/image";
import Link from "next/link";
import { FaBars } from "react-icons/fa";
import Sidebar from "@/components/PresidentDashboard/PresidentDashboard";
export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isSidebarOpen && event.target instanceof HTMLElement && !event.target.closest("aside")) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isSidebarOpen]);
  return <div className="flex h-screen overflow-hidden">
      {}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {}
      <div className="flex flex-col flex-1 overflow-auto">
        {}
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white shadow-md">
          {}
          <div className="md:hidden">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <FaBars className="text-2xl text-gray-700" />
            </button>
          </div>

          {}
          <div className="flex-1 flex justify-center md:justify-start">
            <Link href="/">
              <Image src="/images/logo/logo_pebec1.PNG" alt="PEBEC Logo" width={120} height={50} className="cursor-pointer" />
            </Link>
          </div>

          {}
          <div className="flex items-center gap-4">
            <NotificationBadge />
          </div>
        </header>

        {}
        <main className="p-6 bg-gray-100 flex-1">{children}</main>
      </div>
    </div>;
}