// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { FaChevronDown, FaChevronUp, FaAngleDoubleLeft, FaAngleDoubleRight, FaFileAlt, FaEnvelopeOpenText } from "react-icons/fa";
import { LayoutDashboard, LogOut, User } from "lucide-react";
export default function MagistratesSidebar({
  isOpen,
  setIsOpen
}) {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<{
    [key: string]: boolean;
  }>({});
  useEffect(() => {
    if (!isOpen) {
      setOpenDropdowns({});
    }
  }, [isOpen]);
  const handleCloseSidebar = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };
  const toggleDropdown = (section: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  const menuSections = [{
    name: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: "/magistrates"
  }, {
    name: "Send letter",
    icon: <FaEnvelopeOpenText className="w-5 h-5" />,
    path: "/magistrates/send-letters"
  }, {
    name: "Received letters",
    icon: <FaEnvelopeOpenText className="w-5 h-5" />,
    path: "/magistrates/received-letters"
  }, {
    name: "Reports",
    icon: <FaFileAlt className="w-5 h-5" />,
    path: "/magistrates/reports"
  }, {
    name: "Profile",
    icon: <User className="w-5 h-5" />,
    path: "/magistrates/profile"
  }];
  return <>
      {}
      <aside className={`bg-white shadow-lg h-screen fixed transition-all duration-300 z-50 border-r border-gray-200 flex flex-col 
        ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"} 
        md:translate-x-0 md:w-${isOpen ? "64" : "16"} md:relative`}>
        {}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className={`text-lg font-semibold text-gray-700 ${isOpen ? "block" : "hidden"}`}>
            Magistrates Panel
          </h2>

          {}
          <button className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full shadow-md hover:bg-gray-300 transition" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaAngleDoubleLeft className="text-gray-700" /> : <FaAngleDoubleRight className="text-gray-700" />}
          </button>
        </div>

        {}
        <nav className="mt-6 flex-grow overflow-y-hidden hover:overflow-y-auto">
          {menuSections.map(section => <Link key={section.name} href={section.path} onClick={handleCloseSidebar}>
              <div className={`flex items-center p-4 rounded-lg cursor-pointer transition-all duration-300 
    ${pathname === section.path ? "bg-green-500 text-white" : "text-gray-800 hover:bg-gray-100"}`}>

                {section.icon}
                <span className={`ml-4 ${isOpen ? "block" : "hidden"}`}>{section.name}</span>
              </div>
            </Link>)}
        </nav>

        {}
        <div className="mt-auto p-2">
          <SignOutButton redirectUrl="/">
            <button className={`flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition
                ${isOpen ? "px-4 py-2 w-40" : "w-12 h-12"}`}>
              <LogOut className={`w-${isOpen ? "5" : "7"} h-${isOpen ? "5" : "7"}`} />
              <span className={`text-base ${isOpen ? "block" : "hidden"}`}>Logout</span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)}></div>}
    </>;
}