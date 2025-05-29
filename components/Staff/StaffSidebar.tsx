// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { FaChevronDown, FaChevronUp, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
import { FileText } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import { HomeIcon, NewspaperIcon, FolderOpenIcon, UsersIcon, ChartBarIcon, DocumentDuplicateIcon, CalendarDaysIcon, ClipboardDocumentIcon, UserCircleIcon, ArrowRightOnRectangleIcon, EnvelopeIcon, BookOpenIcon, InboxArrowDownIcon, ExclamationTriangleIcon, EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import { FaEnvelopesBulk } from "react-icons/fa6";
export default function Sidebar({
  isOpen,
  setIsOpen
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<{
    [key: string]: boolean;
  }>({});
  const user = useQuery(api.users.getCurrentUsers);
  const allowed = user?.permissions ?? [];
  const staffStream = user?.staffStream;
  useEffect(() => {
    if (!isOpen) setOpenDropdowns({});
  }, [isOpen]);
  const handleCloseSidebar = () => {
    if (window.innerWidth < 768) setIsOpen(false);
  };
  const toggleDropdown = (section: string) => {
    if (!isOpen) {
      setIsOpen(true);
      setOpenDropdowns({
        [section]: true
      });
    } else {
      setOpenDropdowns(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    }
  };
  const menuItems = [{
    name: "Dashboard",
    icon: <HomeIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff"
  }, {
    name: "Internal letters",
    icon: <HomeIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/letters"
  }, {
    name: "Kanboard",
    icon: <ClipboardDocumentIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/kanban"
  }, {
    name: "Users letters",
    icon: <EnvelopeOpenIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/business-letters"
  }, {
    name: staffStream === "innovation" ? "Innovation Tools" : 
          staffStream === "regulatory" ? "Regulatory Tools" : 
          staffStream === "sub_national" ? "Sub-National Tools" :
          staffStream === "judiciary" ? "Judiciary Tools" : 
          staffStream === "communications" ? "Comms" : 
          staffStream === "investments" ? "Investments" : 
          "Reports & Templates",
    icon: <FolderOpenIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    children: [{
      name: "Tickets",
      path: "/staff/tickets"
    }, {
      name: "Generate MDA Report",
      path: "/staff/generate-ticket-reports"
    }, {
      name: "Incoming Reports",
      path: "/staff/submitted-reports"
    }]
  }, {
    name: "Web Content",
    icon: <NewspaperIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    children: [{
      name: "Post Article",
      path: "/staff/create-article"
    }, {
      name: "Upload Reports",
      path: "/staff/reports"
    }, {
      name: "Create Event",
      path: "/staff/create-events"
    }, {
      name: "Reforms",
      path: "/staff/reforms"
    }]
  },
  ...(staffStream === "innovation" ? [{
    name: "ReportGov",
    icon: <ExclamationTriangleIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/reportgov"
  }, {
    name: "BFA Reports",
    icon: <ChartBarIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/bfa-reports"
  }] : []),
  {
    name: "Meetings",
    icon: <CalendarDaysIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/meetings"
  }, {
    name: "Deputies Reports",
    icon: <UsersIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/deputies-reports"
  }, {
    name: "Magistrates Reports",
    icon: <UsersIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/magistrates-reports"
  }, {
    name: "Newsletters",
    icon: <DocumentDuplicateIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/newsletters"
  }, {
    name: "Subscribers",
    icon: <UserCircleIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/subscribers"
  }, {
    name: "Materials",
    icon: <BookOpenIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/materials"
  }, {
    name: "Projects",
    icon: <ChartBarIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/projects"
  }, {
    name: "Letters",
    icon: <EnvelopeIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    children: [{
      name: "Assigned Letters",
      path: "/staff/assigned-letters"
    }, {
      name: "Received Letters",
      path: "/staff/received-letters"
    }, {
      name: "Send Letter",
      path: "/staff/send-letters"
    }]
  }, {
    name: "Profile",
    icon: <UserCircleIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
    path: "/staff/profile"
  }];
  const filteredMenu = menuItems.map(section => {
    if (!section.children) {
      return allowed.includes(section.path) ? section : null;
    }
    const visibleItems = section.children.filter(item => allowed.includes(item.path));
    return visibleItems.length > 0 ? {
      ...section,
      children: visibleItems
    } : null;
  }).filter(Boolean);
  return <>
      <aside className={`bg-white shadow-lg h-screen fixed transition-all duration-300 z-50 border-r border-gray-200 flex flex-col 
        ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"} 
        md:translate-x-0 md:w-${isOpen ? "64" : "16"} md:relative`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className={`text-lg font-semibold text-gray-700 ${isOpen ? "block" : "hidden"}`}>
            Staff Dashboard
          </h2>
          <button className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full shadow-md hover:bg-gray-300 transition" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaAngleDoubleLeft className="text-gray-700" /> : <FaAngleDoubleRight className="text-gray-700" />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-1">
          {filteredMenu.map((section: any) => <div key={section.name}>
              {section.children ? <>
                  <div className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => toggleDropdown(section.name)}>
                    <div className="flex items-center gap-3">
                      {section.icon}
                      <span className={`whitespace-nowrap ${isOpen ? "block" : "hidden"}`}>{section.name}</span>
                    </div>
                    {isOpen && (openDropdowns[section.name] ? <FaChevronUp /> : <FaChevronDown />)}
                  </div>
                  {openDropdowns[section.name] && <div className="pl-6">
                      {section.children.map((item: any) => <Link href={item.path} key={item.name} onClick={handleCloseSidebar}>
                          <div className={`flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all duration-300 ${pathname === item.path ? "bg-green-500 text-white" : ""}`}>
                            {item.icon || <FileText className="min-w-[20px] min-h-[20px] w-5 h-5" />}
                            <span className={`ml-4 whitespace-nowrap ${isOpen ? "block" : "hidden"}`}>{item.name}</span>
                          </div>
                        </Link>)}
                    </div>}
                </> : <Link href={section.path} onClick={handleCloseSidebar}>
                  <div className={`flex items-center p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-300 ${pathname === section.path ? "bg-green-500 text-white" : ""}`}>
                    {section.icon}
                    <span className={`ml-4 whitespace-nowrap ${isOpen ? "block" : "hidden"}`}>{section.name}</span>
                  </div>
                </Link>}
            </div>)}
        </nav>

        <div className="px-2 py-4">
          <SignOutButton redirectUrl="/">
            <button className={`flex items-center justify-center gap-3 rounded-lg shadow-sm font-semibold transition duration-200
              ${isOpen ? "w-full px-4 py-2 bg-red-600 text-white hover:bg-red-700" : "w-12 h-12 bg-red-100 text-red-600"}`}>
              <ArrowRightOnRectangleIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />
              <span className={`${isOpen ? "block" : "hidden"}`}>Logout</span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)}></div>}
    </>;
}