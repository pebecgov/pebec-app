// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";

export default function WorldBankSidebar({
  isOpen,
  setIsOpen
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  
  // Get user role from metadata
  const userRole = user?.publicMetadata?.role as string;
  
  // Determine the appropriate title based on role
  const getTitle = () => {
    switch (userRole) {
      case 'ngf':
        return 'NGF Dashboard';
      case 'dmo':
        return 'DMO Dashboard';
      case 'world_bank':
      default:
        return 'World Bank DLI Dashboard';
    }
  };

  useEffect(() => {
    if (!isOpen) {}
  }, [isOpen]);

  const handleCloseSidebar = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  // Define all possible menu sections
  const allMenuSections = [
    {
      name: "DLI Status",
      icon: "/images/saber_icon.png",
      path: "/world_bank",
      showFor: ["world_bank", "ngf", "dmo"] // Show for all roles
    },
    {
      name: "SABER Documents",
      icon: "/images/saber_icon.png",
      path: "/world_bank/saber-documents",
      showFor: ["world_bank", "ngf", "dmo"] // Show for all roles
    },
    {
      name: "DMO Reports",
      icon: "/images/saber_icon.png",
      path: "/dmo/reports",
      showFor: ["dmo"] // Only show for DMO
    },
    {
      name: "Send Letters",
      icon: "/images/saber_icon.png",
      path: "/world_bank/send-letters",
      showFor: ["world_bank"] // Only show for World Bank
    },
    {
      name: "Received Letters",
      icon: "/images/saber_icon.png",
      path: "/world_bank/received-letters",
      showFor: ["world_bank"] // Only show for World Bank
    }
  ];
  
  // Filter menu sections based on user role
  const menuSections = allMenuSections.filter(section => 
    section.showFor.includes(userRole || "world_bank")
  );

  return (
    <>
      <aside className={`bg-white shadow-lg h-screen fixed z-50 border-r border-gray-200 flex flex-col transition-all duration-300 
        ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"} 
        md:translate-x-0 md:${isOpen ? "w-64" : "w-16"} md:relative`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className={`text-md font-semibold text-gray-700 ${isOpen ? "block" : "hidden"}`}>
            {getTitle()}
          </h2>
          <button 
            className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full shadow-md hover:bg-gray-300 transition" 
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <FaAngleDoubleLeft className="text-gray-700" /> : <FaAngleDoubleRight className="text-gray-700" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-grow overflow-y-hidden hover:overflow-y-auto">
          {menuSections.map(section => (
            <Link key={section.name} href={section.path} onClick={handleCloseSidebar}>
              <div className={`flex items-center p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-300 ${
                pathname === section.path ? "bg-green-500 text-white hover:text-green-600 font-semibold" : ""
              }`}>
                <img src={section.icon} alt={section.name} className="w-5 h-5 object-contain" />
                <span className={`ml-4 ${isOpen ? "block" : "hidden"}`}>{section.name}</span>
              </div>
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
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

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
} 