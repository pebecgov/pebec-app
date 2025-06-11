// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { HomeIcon, ChatBubbleLeftRightIcon, CalendarDaysIcon, DocumentTextIcon, EnvelopeIcon, BookOpenIcon, UserCircleIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
type SidebarProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function Sidebar({
  isOpen,
  setIsOpen
}: SidebarProps) {
  const pathname = usePathname();
  const handleCloseSidebar = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };
  const toggleSidebar = () => setIsOpen(prev => !prev);
  const menuItems = [{
    name: "Dashboard",
    icon: <HomeIcon className="w-5 h-5" />,
    path: "/mda"
  }, {
    name: "ReportGov",
    icon: <ExclamationTriangleIcon className="w-5 h-5" />,
    path: "/mda/tickets"
  }, {
    name: "Meetings",
    icon: <CalendarDaysIcon className="w-5 h-5" />,
    path: "/mda/meetings"
  }, 
   {
    name: "Send letter",
    icon: <EnvelopeIcon className="w-5 h-5" />,
    path: "/mda/send-letters"
  }, {
    name: "Received Letters",
    icon: <EnvelopeIcon className="w-5 h-5" />,
    path: "/mda/received-letters"
  }, 
  {name: "Profile",
    icon: <UserCircleIcon className="w-5 h-5" />,
    path: "/mda/profile"
  }];
  return <>
      <aside className={`fixed top-0 left-0 h-screen z-50 flex flex-col bg-white border-r border-gray-200 shadow-md transition-all duration-300
        ${isOpen ? "w-64" : "w-16"} 
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        md:relative`}>
        {}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className={`text-lg font-bold text-gray-700 ${isOpen ? "block" : "hidden"}`}>
            MDA Panel
          </h2>
          <button className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full" onClick={toggleSidebar}>
            {isOpen ? <FaAngleDoubleLeft className="text-gray-600" /> : <FaAngleDoubleRight className="text-gray-600" />}
          </button>
        </div>

        {}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {menuItems.map(item => <Link href={item.path} key={item.name} onClick={handleCloseSidebar}>
             <div title={!isOpen ? item.name : undefined} className={`flex items-center gap-4 p-3 my-1 rounded-lg transition duration-200 cursor-pointer text-sm font-medium
  ${pathname === item.path ? "bg-green-500 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
  {item.icon}
  <span className={`${isOpen ? "block" : "hidden"}`}>{item.name}</span>
          </div>

            </Link>)}
        </nav>

        {}
        <div className="px-2 py-4">
          <SignOutButton redirectUrl="/">
            <button className={`flex items-center justify-center gap-3 rounded-lg shadow-sm font-semibold transition duration-200
              ${isOpen ? "w-full px-4 py-2 bg-red-600 text-white hover:bg-red-700" : "w-12 h-12 bg-red-100 text-red-600"}`}>
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className={`${isOpen ? "block" : "hidden"}`}>Logout</span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden" onClick={() => setIsOpen(false)} />}
    </>;
}