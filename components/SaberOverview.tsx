"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  FaLandmark,
  FaNetworkWired,
  FaHandshake,
  FaBusinessTime,
  FaRegListAlt,
  FaBalanceScale,
  FaTools,
  FaBookOpen,
  FaChartBar,
} from "react-icons/fa";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const dliCards = [
  {
    id: 1,
    title: "DLI 1: Land Administration",
    summary:
      "Improve land transparency through publication of requirements, digitization of land titles, and adoption of FRILIA principles.",
    link: "/dli/1",
    icon: <FaLandmark className="text-blue-600 w-6 h-6" />,
  },
  {
    id: 2,
    title: "DLI 2: Fiber Optic Infrastructure",
    summary:
      "Facilitate private investment by capping RoW charges, streamlining processes, and expanding fiber deployment.",
    link: "/dli/2",
    icon: <FaNetworkWired className="text-purple-600 w-6 h-6" />,
  },
  {
    id: 3,
    title: "DLI 3: PPP & Investment Promotion",
    summary:
      "Strengthen legal frameworks and publish transparent pipelines for Public-Private Partnerships.",
    link: "/dli/3",
    icon: <FaHandshake className="text-green-600 w-6 h-6" />,
  },
  {
    id: 4,
    title: "DLI 4: Business Enabling Environment",
    summary:
      "Reduce regulatory burden and enhance service delivery for businesses through reform tracking.",
    link: "/dli/4",
    icon: <FaBusinessTime className="text-yellow-600 w-6 h-6" />,
  },
  {
    id: 5,
    title: "DLI 5: Regulatory Reform Action Plan",
    summary:
      "Implement and monitor state-specific Business Enabling Reform Action Plans (BERAPs).",
    link: "/dli/5",
    icon: <FaRegListAlt className="text-indigo-600 w-6 h-6" />,
  },
  {
    id: 6,
    title: "DLI 6: Transparency in Tax Processes",
    summary:
      "Publish tax procedures and promote voluntary tax compliance via improved systems.",
    link: "/dli/6",
    icon: <FaBalanceScale className="text-rose-600 w-6 h-6" />,
  },
  {
    id: 7,
    title: "DLI 7: Service Efficiency",
    summary:
      "Digitize and streamline business registration and licensing services.",
    link: "/dli/7",
    icon: <FaTools className="text-gray-700 w-6 h-6" />,
  },
  {
    id: 8,
    title: "DLI 8: Improved Public Access",
    summary:
      "Ensure the public can easily access business-related regulations and policies.",
    link: "/dli/8",
    icon: <FaBookOpen className="text-teal-600 w-6 h-6" />,
  },
];

export default function SaberOverviewPage() {
  const user = useQuery(api.users.getCurrentUsers);
  const role = user?.role;

  // ✅ Determine path based on role
  const materialsPath =
    role === "admin" ? "/saber/materials" : `/${role ?? "staff"}/materials`;

  return (
    <div className="bg-[#f9fafb] min-h-screen px-6 py-10 max-w-7xl mx-auto font-sans text-gray-800">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <FaChartBar className="text-blue-700 w-10 h-10" />
        <div>
          <h1 className="text-3xl font-bold">SABER Program Overview</h1>
          <p className="text-sm text-gray-600 mt-1">
            State Action on Business Enabling Reforms (2023–2025)
          </p>
        </div>
      </div>

      {/* Intro */}
      <section className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-2">What is SABER?</h2>
        <p className="text-sm text-gray-700">
          The State Action on Business Enabling Reforms (SABER) is a US$20 million, 3-year
          (2023–2025) performance-based initiative coordinated by the Ministry of Budget and
          Planning, in collaboration with State Ease of Doing Business MDAs. The program seeks
          to incentivize business-enabling reforms across Land, Infrastructure, PPP frameworks,
          Investment Promotion, Tax, and Regulatory Services.
        </p>
      </section>

      {/* Eligibility Criteria */}
      <section className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-2">Eligibility Criteria</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
          <li>States must have a designated Ease of Doing Business (EoDB) reform team in place.</li>
          <li>States must sign the Participation Agreement to be eligible for results-based disbursement.</li>
          <li>Baseline assessments must be completed as per the SABER Protocol.</li>
          <li>Each state must maintain a reform portal with published deliverables and progress indicators.</li>
          <li>Compliance with verification protocols and independent assessments is mandatory.</li>
        </ul>
      </section>

      {/* DLIs Grid */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Key Disbursement Linked Indicators (DLIs)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dliCards.map((dli) => (
            <div
              key={dli.id}
              className="bg-white p-6 rounded-xl shadow hover:shadow-md transition border flex flex-col"
            >
              <div className="flex items-center mb-4 gap-3">
                {dli.icon}
                <h3 className="text-md font-semibold text-gray-800">{dli.title}</h3>
              </div>
              <p className="text-sm text-gray-600 flex-grow">{dli.summary}</p>
              <div className="mt-4">
                <Link
                  href={dli.link}
                  className="inline-flex items-center text-blue-600 text-sm hover:underline"
                >
                  Read more <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Materials Section */}
      <section className="bg-white p-6 rounded-xl shadow mb-16 text-center">
        <h2 className="text-lg font-semibold mb-2">Want to dive deeper?</h2>
        <p className="text-sm text-gray-700 mb-4">
          You can check out full SABER documentation and program details in the materials section.
        </p>
        <Link
          href={materialsPath}
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          📁 Go to Materials
        </Link>
      </section>
    </div>
  );
}
