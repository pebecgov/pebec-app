// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { HomeIcon, DocumentTextIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";

type SidebarProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function DmoSidebar({
  isOpen,
  setIsOpen
}: SidebarProps) {
  const pathname = usePathname();
  
  useEffect(() => {
    if (!isOpen) return;
  }, [isOpen]);
  
  const handleCloseSidebar = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };
  
  const menuSections = [
    {
      name: "Dashboard",
      icon: <HomeIcon className="w-5 h-5" />,
      path: "/dmo"
    },
    {
      name: "DMO Reports",
      icon: <DocumentTextIcon className="w-5 h-5" />,
      path: "/dmo/reports"
    },
    {
      name: "Profile",
      icon: <UserCircleIcon className="w-5 h-5" />,
      path: "/dmo/profile"
    }
  ];
  
  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col bg-white border-r border-gray-200 shadow-md transition-all duration-300
          ${isOpen ? "w-64" : "w-16"}
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} md:relative`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className={`text-lg font-bold text-gray-700 ${isOpen ? "block" : "hidden"}`}>
            DMO
          </h2>
          <button
            className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <FaAngleDoubleLeft /> : <FaAngleDoubleRight />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {menuSections.map((section) => (
            <Link href={section.path} onClick={handleCloseSidebar} key={section.path}>
              <div
                className={`flex items-center gap-3 p-3 my-1 rounded-lg cursor-pointer text-sm font-medium
                  ${pathname === section.path ? "bg-green-500 text-white" : "hover:bg-gray-100 text-gray-700"}`}
              >
                {section.icon}
                <span className={`${isOpen ? "block" : "hidden"}`}>{section.name}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-2">
          <SignOutButton redirectUrl="/">
            <button
              className={`flex items-center justify-center gap-3 rounded-lg shadow-sm font-semibold transition duration-200
                ${isOpen ? "w-full px-4 py-2 bg-red-600 text-white hover:bg-red-700" : "w-12 h-12 bg-red-100 text-red-600"}`}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className={`${isOpen ? "block" : "hidden"}`}>Logout</span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

