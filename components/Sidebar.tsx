"use client";

import { useState } from "react";
import Link from "next/link";
import { FiMenu, FiX } from "react-icons/fi";
import Image from "next/image";

const tabs = [
  { id: "company-registration", label: "Company Registration Guide" },
  { id: "tax-compliance", label: "Tax Compliance Assistance" },
  { id: "regulatory-requirements", label: "Regulatory Requirements" },
  { id: "regulatory-changes", label: "Regulatory Changes" },
  { id: "downloadable-docs", label: "Downloadable Documents" },
  { id: "frameworks", label: "Frameworks" },
  { id: "list-of-reforms", label: "List of Reforms" },
  { id: "ongoing-reforms", label: "Ongoing Reforms" },
];

const quickLinks = [
  { id: "reform-updates", label: "Reform Updates" },
  { id: "investment-guide", label: "Investment Guide" },
  { id: "pebec-overview", label: "Overview of PEBEC" },
];

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (id: string) => void }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar Toggle Button */}
      <button
        className="fixed top-20 left-4 z-50 bg-green-700 p-3 rounded-full text-white xl:hidden shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 h-screen w-72 bg-white dark:bg-gray-900 shadow-lg overflow-y-auto transform transition-transform xl:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } xl:block`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center py-6 border-b">
          <Image
            src="/images/logo/logo_pebec.jpg" 
            alt="PEBEC Logo"
            width={100}
            height={50}
            className="mr-2"
          />
          <span className="text-green-700 text-2xl font-bold">PEBEC</span>
        </div>

        {/* Navigation Tabs */}
        <h2 className="text-md font-semibold text-gray-900 dark:text-white px-6 py-3 border-b">
          E-Portal Sections
        </h2>
        <ul className="p-4 space-y-2">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full text-left p-3 rounded-md transition-all duration-200 font-medium ${
                  activeTab === tab.id
                    ? "bg-green-600 text-white shadow-md"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Quick Links */}
        <div className="mt-4 px-6 border-t pt-4 hidden xl:block">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Quick Links
          </h2>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.id}>
                <Link
                  href={`#${link.id}`}
                  className="block p-3 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
