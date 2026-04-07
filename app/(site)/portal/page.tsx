// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FaNewspaper, FaCode, FaCalendarAlt, FaMapMarkedAlt } from "react-icons/fa";
import RecentPosts from "@/components/recent-posts";
import RecommendedTopics from "@/components/recommended-topics";
import WhoToFollow from "@/components/who-to-follow";
import Posts from "@/components/posts";
import TaxCalculator from "@/components/TaxCalculator/TaxCalculator";
import UsefulLinks from "@/components/UsefulLinks/UsefulLinks";
import MDAServicesRoadmap from "@/components/MDAServicesRoadmap";
import { Building2, ChevronDown, ShieldCheck, Layers } from "lucide-react";
import { SECTORS, getSubsectorsBySector } from "@/components/data/sectorsData";

const TABS = [
  { id: "news", label: "News & Articles", icon: <FaNewspaper className="text-xl" /> },
  { id: "taxcalculator", label: "Tax Calculator", icon: <FaCode className="text-xl" /> },
  { id: "useful-links", label: "Useful Links", icon: <FaCalendarAlt className="text-xl" /> },
  // { id: "business-roadmap", label: "Business Registration Roadmap", icon: <FaMapMarkedAlt className="text-xl" /> },
] as const;

export default function Portal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("news");

  // Sector/roadmap state (only used when activeTab === "business-roadmap")
  const [selectedSector, setSelectedSector] = useState<string>("");
  const [selectedSubsector, setSelectedSubsector] = useState<string>("");
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
  const [isSubsectorDropdownOpen, setIsSubsectorDropdownOpen] = useState(false);

  const availableSubsectors = selectedSector ? getSubsectorsBySector(selectedSector) : [];

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    setSelectedSubsector("");
  }, [selectedSector]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sectorDropdown = document.getElementById("sector-dropdown-button");
      const subsectorDropdown = document.getElementById("subsector-dropdown-button");
      const sectorMenu = document.getElementById("sector-dropdown-menu");
      const subsectorMenu = document.getElementById("subsector-dropdown-menu");
      if (
        sectorDropdown &&
        !sectorDropdown.contains(event.target as Node) &&
        sectorMenu &&
        !sectorMenu.contains(event.target as Node)
      ) {
        setIsSectorDropdownOpen(false);
      }
      if (
        subsectorDropdown &&
        !subsectorDropdown.contains(event.target as Node) &&
        subsectorMenu &&
        !subsectorMenu.contains(event.target as Node)
      ) {
        setIsSubsectorDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/portal?tab=${tabId}`);
  };

  const handleSectorSelect = (sector: string) => {
    setSelectedSector(sector);
    setIsSectorDropdownOpen(false);
  };

  const handleSubsectorSelect = (subsector: string) => {
    setSelectedSubsector(subsector);
    setIsSubsectorDropdownOpen(false);
  };

  return (
    <section className="pb-20 mt-25">
      <section className="relative pb-20 pt-32 lg:pt-40 overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full">
          <Image
            src="/images/eportal.jpg"
            alt="Hero Background Pattern"
            fill
            className="object-cover object-center opacity-80"
            quality={100}
          />
          <div className="absolute inset-0 bg-white/50" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 mb-12">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-10">
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-green-900 leading-tight">
                Welcome to the PEBEC E-Portal
              </h1>
              <p className="mt-4 text-gray-600 text-base md:text-lg max-w-xl mx-auto lg:mx-0">
                Your one-stop hub for news, tools, resources and government
                services to help businesses thrive in Nigeria.
              </p>
            </div>

            <div className="w-full lg:w-1/2">
              <Image
                src="/images/eportal.svg"
                alt="PEBEC ePortal"
                width={500}
                height={400}
                className="mx-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex justify-between w-full whitespace-nowrap overflow-x-auto px-2 sm:px-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center flex-1 min-w-0 py-4 px-2 font-medium ${
                activeTab === tab.id
                  ? "text-[#2D8B10] border-b-2 border-[#2D8B10] font-semibold"
                  : "text-gray-500"
              }`}
            >
              {tab.icon}
              <span
                className={`text-xs sm:text-sm transition-opacity ${
                  activeTab === tab.id ? "opacity-100" : "opacity-0 sm:opacity-100"
                }`}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-10 xl:flex-row xl:items-start max-w-7xl mx-auto px-4 md:px-8">
        <main className="flex-1 xl:py-20">
          {activeTab === "news" && (
            <div className="mt-6">
              <Posts />
            </div>
          )}
          {activeTab === "taxcalculator" && (
            <div className="mt-6">
              <TaxCalculator />
            </div>
          )}
          {activeTab === "useful-links" && (
            <div className="mt-6">
              <UsefulLinks />
            </div>
          )}
          {/* {activeTab === "business-roadmap" && (
            <div className="mt-6">
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Select Your Business Sector
                  </h2>
                  <p className="text-slate-500">
                    Choose your sector and subsector to view the required MDA services and registration steps
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <button
                      id="sector-dropdown-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSectorDropdownOpen(!isSectorDropdownOpen);
                        setIsSubsectorDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 bg-white text-slate-900 border-2 border-slate-200 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm justify-between"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Building2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="truncate">
                          {selectedSector || "Choose a sector..."}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          isSectorDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isSectorDropdownOpen && (
                      <div
                        id="sector-dropdown-menu"
                        className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto"
                      >
                        {SECTORS.map((sector) => (
                          <button
                            key={sector.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSectorSelect(sector.name);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                              selectedSector === sector.name
                                ? "bg-green-50 text-green-700"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {sector.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedSector && (
                    <div className="relative flex-1">
                      <button
                        id="subsector-dropdown-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSubsectorDropdownOpen(!isSubsectorDropdownOpen);
                          setIsSectorDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 bg-white text-slate-900 border-2 border-slate-200 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm justify-between"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Layers className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <span className="truncate">
                            {selectedSubsector || "Choose a subsector..."}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform ${
                            isSubsectorDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isSubsectorDropdownOpen && (
                        <div
                          id="subsector-dropdown-menu"
                          className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto"
                        >
                          {availableSubsectors.map((subsector) => (
                            <button
                              key={subsector}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubsectorSelect(subsector);
                              }}
                              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                                selectedSubsector === subsector
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {subsector}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedSector ? (
                <MDAServicesRoadmap
                  sector={selectedSector}
                  subsector={selectedSubsector}
                />
              ) : (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      No Sector Selected
                    </h3>
                    <p className="text-slate-500">
                      Please select your business sector from the dropdown above to view your personalized MDA services roadmap.
                    </p>
                  </div>
                </div>
              )}

              {selectedSector && (
                <div className="mt-8 bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-green-100">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">Need Assistance?</h2>
                    <p className="text-green-100 mb-6 max-w-lg">
                      Our PEBEC support team is here to help you navigate the registration process and resolve any challenges you may encounter.
                    </p>
                    <button className="bg-white text-green-600 px-6 py-3 rounded-xl font-bold hover:bg-green-50 transition-all">
                      Contact Support
                    </button>
                  </div>
                  <ShieldCheck className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10" />
                </div>
              )}
            </div>
          )} */}
        </main>

        <aside className="flex w-full flex-col gap-6 md:flex-row xl:sticky xl:top-[80px] xl:w-[350px] xl:flex-col xl:py-20">
          <RecentPosts />
          <RecommendedTopics />
          <WhoToFollow />
        </aside>
      </div>
    </section>
  );
}
