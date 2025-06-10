// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Globe, Eye } from "lucide-react";
import * as FaIcons from "react-icons/fa";
import { motion } from "framer-motion";
import SpotlightCard from "@/components/SpotlightCard";
export default function SaberUserPage() {
  const dlis = useQuery(api.saber.getAllDLIs) || [];
  const beraps = useQuery(api.saber.getAllBERAPs) || [];
  const [activeTab, setActiveTab] = useState<"dli" | "">("");
  const firstBerap = beraps[0];
  useEffect(() => {
    if (dlis.length > 0 && beraps.length === 0) {
      setActiveTab("dli");
    }
  }, [dlis, beraps]);
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
      <motion.div className="bg-gray-50 border border-gray-200 text-gray-800 text-sm p-6 md:p-10 mt-10 rounded-lg leading-relaxed space-y-4" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      delay: 1.2
    }}>
        <p>
          <strong>SABER</strong> (State Action on Business Enabling Reforms) is a
          $750 million performance-based initiative implemented from 2023 to
          2025. It’s jointly coordinated by the Nigerian Federal Ministry of
          Finance, World Bank, PEBEC, and NGF Secretariat.
        </p>
        <p>
          The program incentivizes Nigerian states to deliver critical reforms
          that make doing business easier. States can only access DLI
          disbursements if they first satisfy the <strong>BERAP</strong>{" "}
          (Business-Enabling Reform Action Plan) eligibility requirements.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>gierty registration</li>
          <li>Promote private investment and PPPs</li>
          <li>Streamline tax and regulatory procedures</li>
          <li>Support transparency through budget and financial disclosures</li>
        </ul>
        <p>
          States are independently assessed by a third-party IVA. Funding is
          released only when DLI milestones are met and eligibility criteria
          confirmed.
        </p>
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