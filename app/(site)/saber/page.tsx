// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Globe, Eye, Megaphone } from "lucide-react";
import * as FaIcons from "react-icons/fa";
import { motion } from "framer-motion";
import SpotlightCard from "@/components/SpotlightCard";
export default function SaberUserPage() {
  const dlis = useQuery(api.saber.getAllDLIs) || [];
  const beraps = useQuery(api.saber.getAllBERAPs) || [];
  const [activeTab, setActiveTab] = useState<"dli" | "">("");
  const firstBerap = beraps[0];
  
  // Reset activeTab to show cards when component mounts or when navigating back
  useEffect(() => {
    setActiveTab("");
  }, []);
  
  // Only auto-show DLIs if there are DLIs but no BERAPs
  useEffect(() => {
    if (dlis.length > 0 && beraps.length === 0 && activeTab === "") {
      setActiveTab("dli");
    }
  }, [dlis, beraps, activeTab]);
  return <div className="max-w-7xl mx-auto mt-30">
      {}
      <div className="relative w-full h-[300px]">
        <Image src="/images/saber_cover.png" alt="SABER Cover" layout="fill" objectFit="cover" priority className="rounded-b-lg" />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-4 md:px-10">
          <div className="flex items-center gap-3">
            <Globe className="w-10 h-10 text-white" />
            <motion.h1 className="text-5xl md:text-6xl font-extrabold tracking-widest text-white drop-shadow-md" initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            delay: 0.5,
            staggerChildren: 0.1
          }}>
              {"SABER".split("").map((letter, i) => <motion.span key={i} initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: i * 0.1
            }}>
                  {letter}
                </motion.span>)}
            </motion.h1>
          </div>
          <motion.p className="text-lg md:text-xl text-white/90 mt-2" initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 1
        }}>
            State Action on Business Enabling Reforms
          </motion.p>
        </div>
      </div>

      {}
      <motion.div className="bg-gray-50 border border-gray-200 text-gray-800 text-sm p-6 md:p-10 mt-10 rounded-lg leading-relaxed space-y-8" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      delay: 1.2
    }}>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Introduction - Background</h2>
          <div className="bg-[#edf3ea] rounded-xl p-5">
            <p>
              The State Action on Business Enabling Reforms (SABER) Program is a $750 million 3-year (2023-2025)
              performance-based intervention designed by the World Bank Technical team and the PEBEC Secretariat
              with support from the Federal Ministry of Finance, Home Finance Department (HFD), and the Nigeria
              Governors&apos; Forum (NGF) Secretariat.
            </p>
          </div>
          <div className="bg-[#edf3ea] rounded-xl p-5">
            <p>
              SABER seeks to incentivize and strengthen the implementation of business enabling reforms covering
              land administration, the regulatory framework for private investment in fiber optic infrastructure,
              public private partnership and investment promotion frameworks, tax administration and the business
              enabling regulatory environment.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Program Features</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg text-gray-900 mb-3">ELIGIBILITY</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Open to ALL states and the FCT.</li>
                <li>State must indicate EX-ANTE which (sub)DLIs it aims to achieve.</li>
                <li>AND each YEAR, each state must satisfy the ANNUAL ELIGIBILITY CRITERIA to participate.</li>
              </ul>
            </div>
            <div className="lg:col-span-4 bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg text-gray-900 mb-3">PRIOR RESULTS</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  To allow for states to obtain a head-start at improving their business-enabling environment before
                  the approval of SABER and the signing of the financing agreement (FA), a set of 4 Prior Results were
                  defined.
                </li>
                <li>These were locked in at Negotiations on 30 August 2022.</li>
                <li>
                  States that achieved Prior Results as of June 1, 2022, and before the signing of the FA (January 6,
                  2023) are eligible for disbursements against these results.
                </li>
                <li>23 States met the Prior Results EC and 1-4 of the Prior Results.</li>
              </ul>
            </div>
            <div className="lg:col-span-5 bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg text-gray-900 mb-3">BASIC DESIGN OF DISBURSEMENT-LINKED INDICATORS (DLIs)</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  The DLIs focus on concrete steps towards enhancing land administration, business-enabling
                  infrastructure, PPP and investment promotion frameworks, and business enabling regulatory environment.
                </li>
                <li>
                  Under each DLI, a set of Disbursement-Linked Results (DLRs) are specified with target dates for
                  completion and specific disbursement amounts associated with each DLR.
                </li>
                <li>
                  Should a state choose to participate and achieve all DLRs it would potentially receive a total
                  disbursement of USD 52.5 million between 2022 and 2025.
                </li>
                <li>
                  Depending on actual state participation and achievement of DLIs, additional program financing and
                  restructuring may be required.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Programme Eligibility Criteria (EC)</h2>
          <div className="overflow-x-auto border rounded-lg bg-white">
            <table className="min-w-full text-left">
              <thead className="bg-[#ecf4e8]">
                <tr>
                  <th className="p-3 border font-semibold">Result Area</th>
                  <th className="p-3 border font-semibold">Description</th>
                  <th className="p-3 border font-semibold">Recent/Upcoming deadlines</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="p-3 border font-semibold">Improved planning and accountability of business enabling reforms</td>
                  <td className="p-3 border">
                    <ul className="list-disc pl-5 space-y-2">
                      <li>
                        Annual State Business Enabling Reforms Action Plan (BERAP) prepared with private sector
                        participation (with records), approved by the State Executive Council and published online.
                        (For the 2023 report, private sector participation not required).
                      </li>
                      <li>Previous year&apos;s progress report submitted to the State Executive Council and published online.</li>
                    </ul>
                  </td>
                  <td className="p-3 border space-y-1">
                    <p>YEAR 1 (2023): BERAP 2023 by Jan-31, 2023</p>
                    <p>YEAR 1 (2023): BERAP 2024 by Dec-31, 2023</p>
                    <p>YEAR 2 (2024): 2023 progress report by Jul 30,2024</p>
                    <p><strong>YEAR 2 (2024): BERAP 2025 by Dec-31, 2024</strong></p>
                  </td>
                </tr>
                <tr className="align-top">
                  <td className="p-3 border font-semibold">
                    Continuation of selected criteria from SFTAS: Continued transparency of annual State Budget and
                    Audited Financial Statements AND Strengthened and transparent debt management
                  </td>
                  <td className="p-3 border">
                    <ul className="list-disc pl-5 space-y-2">
                      <li>
                        Annual State budget, prepared under national Chart of Accounts, approved by the State Assembly
                        and published online by end January the next year (Former SFTAS EC).
                      </li>
                      <li>
                        Annual audited financial statement (AFS), prepared in accordance with IPSAS, submitted to the
                        State Assembly and published by July the next year (Former SFTAS EC).
                      </li>
                      <li>
                        Annual State Debt Sustainability Analysis and Debt Management Strategy Report (SDSA-DMSR)
                        published end-December as per the criteria set in the verification protocol (former SFTAS DLI).
                      </li>
                    </ul>
                  </td>
                  <td className="p-3 border space-y-1">
                    <p>YEAR 1 (2023): FY23 Budget by Jan-31, 2023</p>
                    <p>YEAR 2 (2024): FY24 Budget by Jan-31, 2024</p>
                    <p><strong>YEAR 3 (2025): FY25 Budget by Jan-31,2025</strong></p>
                    <p className="pt-2">Prior Results: FY21 AFS by Oct-31, 2022</p>
                    <p>YEAR 1 (2023): FY22 AFS by Jul-31, 2023</p>
                    <p>YEAR 2 (2024): FY23 AFS by Jul-31, 2024</p>
                    <p className="pt-2">YEAR 1 (2023): SDSA-DMSR by Dec-31, 2022</p>
                    <p>YEAR 2 (2024): SDSA-DMSR by Dec-31, 2023</p>
                    <p><strong>YEAR 3 (2025): SDSA-DMSR by Dec-31, 2024.</strong></p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Program Disbursement Linked Indicators (DLIs) &amp; Anchor States MDAs</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <p className="font-semibold text-[#6b8f3e]">Results Area 1: Improved Land Administration and Land-based Investment Process</p>
              <ul className="list-disc pl-5 mb-2">
                <li>DLI 1: Improved efficiency in property registration and sustainability of the land-based investment</li>
              </ul>

              <p className="font-semibold text-[#6b8f3e]">Results Area 2: Improved regulatory framework for private investment in fiber optic infrastructure</p>
              <ul className="list-disc pl-5 mb-2">
                <li>DLI 2: Improved regulatory framework for private investment in fiber optic infrastructure.</li>
              </ul>

              <p className="font-semibold text-[#6b8f3e]">Results Area 3: Improved services provided by investment promotion agencies (IPAs) and public-private partnership (PPP) units.</p>
              <ul className="list-disc pl-5 mb-2">
                <li>DLI 3: Development of an effective PPP framework</li>
                <li>DLI 4: Improved investment promotion environment</li>
              </ul>

              <p className="font-semibold text-[#6b8f3e]">Results Area 4: Improved efficiency and transparency of government-to-business services.</p>
              <ul className="list-disc pl-5">
                <li>DLI 5: Increased transparency of official fees and procedures</li>
                <li>DLI 6: Increased transparency of fees and levies for inter-state trade and increased exporter certification.</li>
                <li>DLI 7: Simplified state and local business tax regimes</li>
                <li>DLI 8: Quick determination of commercial disputes</li>
              </ul>
            </div>
            <div className="lg:col-span-5">
              <div className="overflow-x-auto border rounded-lg bg-white">
                <table className="min-w-full">
                  <thead className="bg-[#f4d8c5]">
                    <tr>
                      <th className="p-3 border text-left">Key State MDAs</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border">Ministries of Finance, Budget and Economic Planning (DLI 3*) (DLI 4) (DLI 7*)</td></tr>
                    <tr><td className="p-2 border">Governor&apos;s offices (DLI 2*) (DLI 3*) (DLI 5*)</td></tr>
                    <tr><td className="p-2 border">Ministries of Trade and Investment / Commerce and Industry, or equivalent (DLI 4*) (DLI 6*)</td></tr>
                    <tr><td className="p-2 border">Ministries of Land and Urban Planning, or equivalent (DLI 1*) (DLI 2*)</td></tr>
                    <tr><td className="p-2 border">Investment Promotion Offices/Agencies (DLI 2) (DLI 4) (DLI 3*) (DLI 4) (DLI 6)</td></tr>
                    <tr><td className="p-2 border">Ministry of ICT/Digital Economy (DLI 1) (DLI 2*)</td></tr>
                    <tr><td className="p-2 border">State Internal Revenue Service (DLI 1) (DLI 3) (DLI 7*)</td></tr>
                    <tr><td className="p-2 border">Ministry of Justice (DLI 1) (DLI 2) (DLI 3) (DLI 7)</td></tr>
                    <tr><td className="p-2 border">Judiciary (DLI 8*)</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[#b2543f] font-semibold text-sm">
                *Key State MDAs will have to collaborate with other state MDAs to achieve the results
              </p>
            </div>
          </div>
        </section>
      </motion.div>

      {}
      <div className="p-6 md:p-10 space-y-10">
        {!activeTab && <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 1.4
      }}>
            <SpotlightCard spotlightColor="rgba(0, 229, 255, 0.2)">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-200">DLIs</h2>
                <p className="text-sm text-gray-300">
                  Explore all Disbursement Linked Indicators (DLIs) published
                  under SABER.
                </p>
                <Button className="mt-2" onClick={() => setActiveTab("dli")}>
                  View DLIs
                </Button>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(0, 229, 255, 0.2)">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-200">BERAP</h2>
                <p className="text-sm text-gray-300">
                  Learn about the annual reform plan required for state
                  eligibility.
                </p>
                <Link href={`/saber/berap/${firstBerap?._id}`}>
                  <Button className="mt-2" disabled={!firstBerap}>
                    View BERAP
                  </Button>
                </Link>
              </div>
            </SpotlightCard>
          </motion.div>}

          {/* SABER Events and Materials Cards for Public View */}
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6" initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            delay: 1.6
          }}>
            <SpotlightCard spotlightColor="rgba(0, 229, 255, 0.2)">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-200 flex items-center gap-2">
                  <Megaphone className="w-6 h-6" />
                  Latest Opportunity
                </h2>
                <p className="text-sm text-gray-300">
                  Request for Expressions of Interest (Consulting Firms Selection) under the SABER program.
                </p>
                <Link href="/saber/advertorial/consulting-firms-selection">
                  <Button className="mt-2">
                    Read Advertorial
                  </Button>
                </Link>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(0, 229, 255, 0.2)">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-200">Events</h2>
                <p className="text-sm text-gray-300">
                  Stay updated with SABER-related events, workshops, and activities.
                </p>
                <Link href="/saber/events">
                  <Button className="mt-2">
                    View Events
                  </Button>
                </Link>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(0, 229, 255, 0.2)">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-sky-200">Materials</h2>
                <p className="text-sm text-gray-300">
                  Access SABER documents, guides, and resources for public use.
                </p>
                <Link href="/saber/materials">
                  <Button className="mt-2">
                    View Materials
                  </Button>
                </Link>
              </div>
            </SpotlightCard>
          </motion.div>

        {}
        {activeTab === "dli" && <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-sky-700">
                Disbursement Linked Indicators (DLIs)
              </h2>
              <Button variant="ghost" onClick={() => setActiveTab("")}>
                ⬅ Back
              </Button>
            </div>

            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.3
        }}>
              {[...dlis].sort((a, b) => a.number - b.number).map(dli => {
            const Icon = (FaIcons as any)[dli.icon?.replace("Fa", "Fa")] || FaIcons.FaRegCircle;
            return <motion.div key={dli._id} whileHover={{
              scale: 1.02
            }} className="h-full flex flex-col justify-between border shadow-sm hover:shadow-md rounded-lg p-5 bg-white">
                    <div className="flex flex-col h-full justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="text-3xl text-sky-700">
                          <Icon />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          DLI {dli.number}: {dli.title}
                        </h3>
                      </div>
                      <Link href={`/saber/${dli._id}`} className="mt-auto">
                        <Button size="sm" variant="outline" className="w-full flex items-center justify-center gap-2">
                          <Eye className="w-4 h-4" /> View Details
                        </Button>
                      </Link>
                    </div>
                  </motion.div>;
          })}
            </motion.div>
          </div>}
      </div>
    </div>;
}