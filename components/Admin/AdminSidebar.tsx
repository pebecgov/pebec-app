// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { FaChevronDown, FaChevronUp, FaAngleDoubleLeft, FaAngleDoubleRight, FaFileArchive, FaRegFileArchive } from "react-icons/fa";
import { ChartAreaIcon, LogOut, NotebookPenIcon } from "lucide-react";
import { ChevronDownIcon, ChevronUpIcon, ArrowLeftCircleIcon, ArrowRightCircleIcon, HomeIcon, ClipboardDocumentIcon, PresentationChartBarIcon, UserGroupIcon, DocumentIcon, EnvelopeIcon, PuzzlePieceIcon, BookOpenIcon, UserCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
export default function Sidebar({
  isOpen,
  setIsOpen
}) {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState({});
  const currentUser = useQuery(api.users.getCurrentUsers);
  const allowedPaths = currentUser?.permissions || [];
  useEffect(() => {
    if (!isOpen) setOpenDropdowns({});
  }, [isOpen]);
  const handleCloseSidebar = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };
  const toggleDropdown = section => {
    setOpenDropdowns(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  const menuSections = [{
    name: "Dashboard",
    icon: <HomeIcon className="w-5 h-5" />,
    path: "/admin"
  }, {
    name: "Shared Tasks",
    icon: <NotebookPenIcon className="w-5 h-5" />,
    path: "/admin/kanban"
  }, {
    name: "ReportGov",
    icon: <ExclamationTriangleIcon className="w-5 h-5" />,
    path: "/admin/tickets"
  }, {
    name: "Reports & Letters",
    icon: <DocumentIcon className="w-5 h-5" />,
    items: [{
      name: "Internal Reports",
      path: "/admin/submitted-reports"
    }, {
      name: "Internal Letters",
      path: "/admin/letters"
    }, {
      name: "Business Letters",
      path: "/admin/business-letters"
    }, {
      name: "Report Templates",
      path: "/admin/internal-reports"
    }, {
      name: "Send letter",
      path: "/admin/send-letters"
    }]
  }, {
    name: "Saber Program",
    icon: <ChartAreaIcon className="w-5 h-5" />,
    items: [{
      name: "Overview",
      path: "/admin/saber-overview"
    }, {
      name: "DLIs Management - SA",
      path: "/admin/dli"
    }, {
      name: "DLI & BERAP Management",
      path: "/admin/saber-management"
    }, {
      name: "DLIs Status",
      path: "/admin/saber"
    }]
  }, {
    name: "Web Content",
    icon: <BookOpenIcon className="w-5 h-5" />,
    items: [{
      name: "Manage Articles",
      path: "/admin/posts"
    }, {
      name: "Create Articles",
      path: "/admin/create-article"
    }, {
      name: "Upload Reports",
      path: "/admin/reports"
    }, {
      name: "Manage Events",
      path: "/admin/events"
    }, {
      name: "Create Event",
      path: "/admin/create-events"
    }, {
      name: "Media Posts",
      path: "/admin/create-media-posts"
    }]
  }, {
    name: "Newsletter",
    icon: <EnvelopeIcon className="w-5 h-5" />,
    items: [{
      name: "Subscribers",
      path: "/admin/subscribers"
    }, {
      name: "Newsletter",
      path: "/admin/newsletters"
    }]
  }, {
    name: "Projects",
    icon: <ClipboardDocumentIcon className="w-5 h-5" />,
    path: "/admin/projects"
  }, {
    name: "Manage Materials",
    icon: <FaRegFileArchive className="w-5 h-5" />,
    path: "/admin/materials"
  }, {
    name: "User Management",
    icon: <UserGroupIcon className="w-5 h-5" />,
    items: [{
      name: "Manage Users",
      path: "/admin/users"
    }, {
      name: "Profile",
      path: "/admin/profile"
    }]
  }];
  return <>
      <aside className={`bg-white shadow-lg h-screen fixed transition-all duration-300 z-50 border-r border-gray-200 flex flex-col 
        ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"} 
        md:translate-x-0 md:w-${isOpen ? "64" : "16"} md:relative`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className={`text-lg font-semibold text-gray-700 ${isOpen ? "block" : "hidden"}`}>
            Admin Dashboard
          </h2>

          <button className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full shadow-md hover:bg-gray-300 transition" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaAngleDoubleLeft className="text-gray-700" /> : <FaAngleDoubleRight className="text-gray-700" />}
          </button>
        </div>

        <nav className="mt-6 flex-grow overflow-y-hidden hover:overflow-y-auto">
        {menuSections.filter(section => {
          if (!allowedPaths.length) return true;
          if (section.path) return allowedPaths.includes(section.path);
          if (section.items) {
            return section.items.some(item => allowedPaths.includes(item.path));
          }
          return false;
        }).map(section => <div key={section.name}>
              {section.items ? <div>
                  <div className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => {
              if (!isOpen) return setIsOpen(true);
              toggleDropdown(section.name);
            }} title={!isOpen ? section.name : undefined}>
                    <div className="flex items-center gap-3">
                      {section.icon}
                      <span className={`${isOpen ? "block" : "hidden"}`}>{section.name}</span>
                    </div>
                    {isOpen && (openDropdowns[section.name] ? <FaChevronUp /> : <FaChevronDown />)}
                  </div>
                  {openDropdowns[section.name] && <div className="pl-2 space-y-1">
    {section.items.filter(item => !allowedPaths.length || allowedPaths.includes(item.path)).map(item => <Link href={item.path} onClick={handleCloseSidebar} key={item.path}>
          <div className={`pl-6 py-2 rounded-md transition-colors cursor-pointer
              ${pathname === item.path ? "bg-green-100 text-green-800 font-medium" : "text-gray-700 hover:bg-gray-100"}
            `}>
            {item.name}
          </div>
        </Link>)}
  </div>}

                </div> : <Link href={section.path} onClick={handleCloseSidebar}>
                  <div className={`flex items-center p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-300 ${pathname === section.path ? "bg-green-500 text-white" : ""}`} title={!isOpen ? section.name : undefined}>
                    {section.icon}
                    <span className={`ml-4 ${isOpen ? "block" : "hidden"}`}>{section.name}</span>
                  </div>
                </Link>}
            </div>)}
        </nav>

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

      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)}></div>}
    </>;
}