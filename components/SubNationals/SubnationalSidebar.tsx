// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import Image from "next/image";
import { FaChevronDown, FaChevronUp, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
export default function GovernorSidebar({
  isOpen,
  setIsOpen
}) {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState({});
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
  const toggleDropdown = section => {
    if (!isOpen) setIsOpen(true);
    setOpenDropdowns(prev => {
      const newState = {};
      for (const key in prev) newState[key] = false;
      return {
        ...newState,
        [section]: !prev[section]
      };
    });
  };
  const menuSections = [{
    name: "Dashboard",
    icon: "/images/dashboard.png",
    path: "/state_governor"
  }, {
    name: "Saber",
    icon: "/images/saber_icon.png",
    items: [{
      name: "Overview",
      path: "/state_governor/saber-overview"
    }, {
      name: "Materials",
      path: "/state_governor/materials"
    }]
  }, {
    name: "Profile",
    icon: "/images/profile.png",
    path: "/state_governor/profile"
  }];
  return <>
      <aside className={`bg-white shadow-lg h-screen fixed transition-all duration-300 z-50 border-r border-gray-200 flex flex-col
          ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
          md:translate-x-0 ${isOpen ? "md:w-64" : "md:w-16"} md:relative`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className={`text-lg font-semibold text-gray-700 ${isOpen ? "block" : "hidden"}`}>
            State Governor
          </h2>
          <button className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full shadow-md hover:bg-gray-300 transition" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaAngleDoubleLeft className="text-gray-700" /> : <FaAngleDoubleRight className="text-gray-700" />}
          </button>
        </div>

        <nav className="mt-6 flex-grow overflow-y-hidden hover:overflow-y-auto">
          {menuSections.map(section => <div key={section.name}>
              {section.items ? <>
                  <div className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => toggleDropdown(section.name)}>
                    <div className="flex items-center gap-3">
                      <Image src={section.icon} alt={section.name} width={20} height={20} className="object-contain" />
                      <span className={`${isOpen ? "block" : "hidden"}`}>
                        {section.name}
                      </span>
                    </div>
                    {isOpen && (openDropdowns[section.name] ? <FaChevronUp /> : <FaChevronDown />)}
                  </div>
                  {openDropdowns[section.name] && <div className="pl-6">
                      {section.items.map(item => <Link key={item.name} href={item.path} onClick={handleCloseSidebar}>
                          <div className={`p-3 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer transition-all duration-300 ${pathname === item.path ? "bg-green-500 text-white" : ""}`}>
                            {item.name}
                          </div>
                        </Link>)}
                    </div>}
                </> : <Link href={section.path} onClick={handleCloseSidebar}>
                  <div className={`flex items-center p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration-300 ${pathname === section.path ? "bg-green-500 text-white" : ""}`}>
                    <Image src={section.icon} alt={section.name} width={20} height={20} className="object-contain" />
                    <span className={`ml-4 ${isOpen ? "block" : "hidden"}`}>
                      {section.name}
                    </span>
                  </div>
                </Link>}
            </div>)}
        </nav>

        {}
        <div className="mt-auto p-2">
          <SignOutButton redirectUrl="/">
            <button className={`flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition
              ${isOpen ? "px-4 py-2 w-40" : "w-12 h-12"}`}>
              <Image src="/images/logout.png" alt="Logout" width={20} height={20} />
              <span className={`text-base ${isOpen ? "block" : "hidden"}`}>
                Logout
              </span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      {}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)} />}
    </>;
}