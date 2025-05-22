// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { HomeIcon, ChartBarIcon, DocumentMagnifyingGlassIcon, EnvelopeIcon, BookOpenIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
type SidebarProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
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
  const menuItems = [{
    name: "ReportGov Overview",
    icon: <HomeIcon className="w-5 h-5" />,
    path: "/president"
  }, {
    name: "Saber Analytics",
    icon: <ChartBarIcon className="w-5 h-5" />,
    path: "/president/saber"
  }, {
    name: "Reports Overview",
    icon: <DocumentMagnifyingGlassIcon className="w-5 h-5" />,
    path: "/president/reports-overview"
  }];
  return <>
      <aside className={`bg-white shadow-lg h-screen fixed z-50 border-r border-gray-200 flex flex-col transition-all duration-300
        ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
        md:translate-x-0 md:${isOpen ? "w-64" : "w-16"} md:relative`}>
        {}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className={`text-lg font-bold text-gray-700 ${isOpen ? "block" : "hidden"}`}>
            Mr. President
          </h2>
          <button className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full shadow hover:bg-gray-300" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaAngleDoubleLeft /> : <FaAngleDoubleRight />}
          </button>
        </div>

        {}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {menuItems.map(item => <Link key={item.name} href={item.path} onClick={handleCloseSidebar}>
              <div className={`flex items-center gap-4 p-3 my-1 rounded-lg cursor-pointer text-sm font-medium transition-all
                ${pathname === item.path ? "bg-green-500 text-white font-semibold" : "hover:bg-gray-100 text-gray-700"}`}>
                {item.icon}
                <span className={`${isOpen ? "block" : "hidden"}`}>{item.name}</span>
              </div>
            </Link>)}
        </nav>

        {}
        <div className="p-2">
          <SignOutButton redirectUrl="/">
            <button className={`flex items-center justify-center gap-3 rounded-lg shadow font-semibold transition-all
              ${isOpen ? "w-full px-4 py-2 bg-red-600 text-white hover:bg-red-700" : "w-12 h-12 bg-red-100 text-red-600"}`}>
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className={`${isOpen ? "block" : "hidden"}`}>Logout</span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)} />}
    </>;
}