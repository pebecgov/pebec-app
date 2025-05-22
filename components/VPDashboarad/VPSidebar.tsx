// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
export default function Sidebar({
  isOpen,
  setIsOpen
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}) {
  const pathname = usePathname();
  useEffect(() => {
    if (!isOpen) {}
  }, [isOpen]);
  const handleCloseSidebar = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };
  const menuSections = [{
    name: "ReportGov Overview",
    icon: "/images/reportgov.png",
    path: "/vice_president"
  }, {
    name: "Saber Analytics",
    icon: "/images/saber_icon.png",
    path: "/vice_president/saber"
  }, {
    name: "Reports Overview",
    icon: "/images/report_overview.png",
    path: "/vice_president/reports-overview"
  }];
  return <>
      <aside className={`bg-white shadow-lg h-screen fixed z-50 border-r border-gray-200 flex flex-col transition-all duration-300 
        ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"} 
        md:translate-x-0 md:${isOpen ? "w-64" : "w-16"} md:relative`}>
        {}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className={`text-md font-semibold text-gray-700 ${isOpen ? "block" : "hidden"}`}>His Excellency <br /> Mr. Vice President</h2>
          <button className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full shadow-md hover:bg-gray-300 transition" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaAngleDoubleLeft className="text-gray-700" /> : <FaAngleDoubleRight className="text-gray-700" />}
          </button>
        </div>

        {}
        <nav className="mt-6 flex-grow overflow-y-hidden hover:overflow-y-auto">
          {menuSections.map(section => <Link key={section.name} href={section.path} onClick={handleCloseSidebar}>
              <div className={`flex items-center p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-300 ${pathname === section.path ? "bg-green-500 text-white font-semibold" : ""}`}>
                <img src={section.icon} alt={section.name} className="w-5 h-5 object-contain" />
                <span className={`ml-4 ${isOpen ? "block" : "hidden"}`}>{section.name}</span>
              </div>
            </Link>)}
        </nav>

        {}
        <div className="mt-auto p-2">
          <SignOutButton redirectUrl="/">
            <button className={`flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition
              ${isOpen ? "px-4 py-2 w-40" : "w-12 h-12"}`}>
              <img src="/images/logout.png" alt="Logout" className={`object-contain ${isOpen ? "w-5 h-5" : "w-6 h-6"}`} />
              <span className={`text-base ${isOpen ? "block" : "hidden"}`}>Logout</span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)} />}
    </>;
}