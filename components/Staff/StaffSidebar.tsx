// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React, { useState, useEffect } from "react";
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

// Type definitions for menu items
interface MenuItemChild {
  name: string;
  path: string;
  icon?: React.ReactElement;
}

interface MenuItem {
  name: string;
  icon: React.ReactElement;
  path?: string;
  children?: MenuItemChild[];
}

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
  const menuItems: MenuItem[] = [{
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
          staffStream === "sub_national" ? "Sub National Tools" :
          staffStream === "judiciary" ? "Judicial Tools" : 
          staffStream === "communications" ? "Comms" : 
          staffStream === "investments" ? "High-Impact Investments" : 
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
    name: "Sherrifs Reports",
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

  // Add admin features if user has admin permissions
  const adminPermissions = allowed.filter(permission => permission.startsWith('/admin'));
  if (adminPermissions.length > 0) {
    // Add admin features section before profile
    const adminMenuItems: MenuItem[] = [];
    
    // Saber Program section
    const saberPermissions = adminPermissions.filter(p => 
      p.includes('saber') || p.includes('dli')
    );
    if (saberPermissions.length > 0) {
      const saberItems: MenuItemChild[] = [];
      if (allowed.includes('/admin/saber-overview')) {
        saberItems.push({ name: "Saber Overview", path: "/admin/saber-overview" });
      }
      if (allowed.includes('/admin/saber-reports')) {
        saberItems.push({ name: "Saber Reports", path: "/admin/saber-reports" });
      }
      if (allowed.includes('/admin/dli')) {
        saberItems.push({ name: "DLI Management", path: "/admin/dli" });
      }
      if (allowed.includes('/admin/saber-management')) {
        saberItems.push({ name: "Saber Management", path: "/admin/saber-management" });
      }
      if (allowed.includes('/admin/saber')) {
        saberItems.push({ name: "DLIs Status", path: "/admin/saber" });
      }
      
      if (saberItems.length > 0) {
        adminMenuItems.push({
          name: "Saber Program",
          icon: <ChartBarIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
          children: saberItems
        });
      }
    }

    // Reports & Analytics section
    const reportsPermissions = adminPermissions.filter(p => 
      p.includes('reports') || p.includes('tickets') || p.includes('analytics') || p === '/admin'
    );
    if (reportsPermissions.length > 0) {
      const reportsItems: MenuItemChild[] = [];
      if (allowed.includes('/admin')) {
        reportsItems.push({ name: "Admin Dashboard", path: "/admin" });
      }
      if (allowed.includes('/admin/submitted-reports')) {
        reportsItems.push({ name: "All Submitted Reports", path: "/admin/submitted-reports" });
      }
      if (allowed.includes('/admin/tickets')) {
        reportsItems.push({ name: "All Tickets", path: "/admin/tickets" });
      }
      if (allowed.includes('/admin/analytics')) {
        reportsItems.push({ name: "Analytics", path: "/admin/analytics" });
      }
      if (allowed.includes('/admin/generate-ticket-reports')) {
        reportsItems.push({ name: "Generate Reports", path: "/admin/generate-ticket-reports" });
      }
      
      if (reportsItems.length > 0) {
        adminMenuItems.push({
          name: "📊 Admin Reports",
          icon: <DocumentDuplicateIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
          children: reportsItems
        });
      }
    }

    // User Management section
    if (allowed.includes('/admin/users')) {
      adminMenuItems.push({
        name: "👥 User Management",
        icon: <UsersIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
        path: "/admin/users"
      });
    }

    // Content Management section
    const contentPermissions = adminPermissions.filter(p => 
      p.includes('posts') || p.includes('events') || p.includes('create-article') || p.includes('create-media')
    );
    if (contentPermissions.length > 0) {
      const contentItems: MenuItemChild[] = [];
      if (allowed.includes('/admin/posts')) {
        contentItems.push({ name: "Manage Articles", path: "/admin/posts" });
      }
      if (allowed.includes('/admin/create-article')) {
        contentItems.push({ name: "Create Articles", path: "/admin/create-article" });
      }
      if (allowed.includes('/admin/events')) {
        contentItems.push({ name: "Manage Events", path: "/admin/events" });
      }
      if (allowed.includes('/admin/create-events')) {
        contentItems.push({ name: "Create Events", path: "/admin/create-events" });
      }
      if (allowed.includes('/admin/create-media-posts')) {
        contentItems.push({ name: "Media Posts", path: "/admin/create-media-posts" });
      }
      
      if (contentItems.length > 0) {
        adminMenuItems.push({
          name: "📝 Content Management",
          icon: <NewspaperIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
          children: contentItems
        });
      }
    }

    // Materials & Projects section  
    const resourcePermissions = adminPermissions.filter(p => 
      p.includes('materials') || p.includes('projects') || p.includes('kanban')
    );
    if (resourcePermissions.length > 0) {
      const resourceItems: MenuItemChild[] = [];
      if (allowed.includes('/admin/projects')) {
        resourceItems.push({ name: "All Projects", path: "/admin/projects" });
      }
      if (allowed.includes('/admin/materials')) {
        resourceItems.push({ name: "Material Management", path: "/admin/materials" });
      }
      if (allowed.includes('/admin/saber-materials')) {
        resourceItems.push({ name: "Saber Materials", path: "/admin/saber-materials" });
      }
      if (allowed.includes('/admin/kanban')) {
        resourceItems.push({ name: "Shared Tasks", path: "/admin/kanban" });
      }
      
      if (resourceItems.length > 0) {
        adminMenuItems.push({
          name: "🎯 Admin Resources",
          icon: <FolderOpenIcon className="min-w-[20px] min-h-[20px] w-5 h-5" />,
          children: resourceItems
        });
      }
    }

    // Add admin items to menu before profile
    menuItems.splice(-1, 0, ...adminMenuItems);
  }

  const filteredMenu = menuItems.map(section => {
    if (!section.children) {
      return allowed.includes(section.path!) ? section : null;
    }
    const visibleItems = section.children.filter(item => allowed.includes(item.path));
    return visibleItems.length > 0 ? {
      ...section,
      children: visibleItems
    } : null;
  }).filter(Boolean) as MenuItem[];
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