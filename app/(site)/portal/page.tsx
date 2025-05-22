// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FaNewspaper, FaCode, FaCalendarAlt } from "react-icons/fa";
import RecentPosts from "@/components/recent-posts";
import RecommendedTopics from "@/components/recommended-topics";
import WhoToFollow from "@/components/who-to-follow";
import Posts from "@/components/posts";
import TaxCalculator from "@/components/TaxCalculator/TaxCalculator";
import UsefulLinks from "@/components/UsefulLinks/UsefulLinks";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
export default function Portal() {
  const {
    isSignedIn,
    user
  } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = user?.publicMetadata?.role || "dashboard";
  const userRole = user?.publicMetadata?.role as string | undefined;
  const [activeTab, setActiveTab] = useState("news");
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/portal?tab=${tabId}`);
  };
  return <section className="pb-20 mt-25">
      <section className="relative pb-20 pt-32 lg:pt-40 overflow-hidden">
        {}
        <div className="absolute inset-0 -z-10 h-full w-full">
          <Image src="/images/eportal.jpg" alt="Hero Background Pattern" fill className="object-cover object-center opacity-80" quality={100} />
          <div className="absolute inset-0 bg-white/50" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 mb-12">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-10">
            {}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-green-900 leading-tight">
                Welcome to the PEBEC E-Portal
              </h1>
              <p className="mt-4 text-gray-600 text-base md:text-lg max-w-xl mx-auto lg:mx-0">
                Your one-stop hub for news, tools, resources and government
                services to help businesses thrive in Nigeria.
              </p>

              {}
            </div>

            {}
            <div className="w-full lg:w-1/2">
              <Image src="/images/eportal.svg" alt="PEBEC ePortal" width={500} height={400} className="mx-auto" priority />
            </div>
          </div>
        </div>
      </section>

      {}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex justify-between w-full whitespace-nowrap overflow-x-auto px-2 sm:px-0">
          {[{
          id: "news",
          label: "News & Articles",
          icon: <FaNewspaper className="text-xl" />
        }, {
          id: "taxcalculator",
          label: "Tax Calculator",
          icon: <FaCode className="text-xl" />
        }, {
          id: "useful-links",
          label: "Useful Links",
          icon: <FaCalendarAlt className="text-xl" />
        }].map(tab => <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex flex-col items-center w-1/3 py-4 px-2 font-medium ${activeTab === tab.id ? "text-[#2D8B10] border-b-2 border-[#2D8B10] font-semibold" : "text-gray-500"}`}>
              {tab.icon}
              <span className={`text-xs sm:text-sm transition-opacity ${activeTab === tab.id ? "opacity-100" : "opacity-0 sm:opacity-100"}`}>
                {tab.label}
              </span>
            </button>)}
        </nav>
      </div>

      {}
      <div className="flex flex-col gap-10 xl:flex-row xl:items-start max-w-7xl mx-auto px-4 md:px-8">
        <main className="flex-1 xl:py-20">
          {activeTab === "news" && <div className="mt-6">
              <Posts />
            </div>}
          {activeTab === "taxcalculator" && <div className="mt-6">
              <TaxCalculator />
            </div>}
          {activeTab === "useful-links" && <div className="mt-6">
              <UsefulLinks />
            </div>}
        </main>

        <aside className="flex w-full flex-col gap-6 md:flex-row xl:sticky xl:top-[80px] xl:w-[350px] xl:flex-col xl:py-20">
          <RecentPosts />
          <RecommendedTopics />
          <WhoToFollow />
        </aside>
      </div>
    </section>;
}