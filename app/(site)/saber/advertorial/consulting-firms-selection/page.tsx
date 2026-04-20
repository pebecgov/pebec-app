// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConsultingFirmsSelectionAdvertorialPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 mt-30 space-y-8">
      <div className="space-y-3">
        <Link
          href="/saber"
          className="inline-flex items-center text-sky-700 font-medium hover:underline text-sm"
        >
          ← Back to Saber
        </Link>
        <div className="rounded-lg border bg-white p-6 text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/images/federal-coat-of-arms.png"
              alt="Federal Republic of Nigeria Coat of Arms"
              width={110}
              height={92}
              className="h-auto w-auto"
              priority
            />
          </div>
          <p className="text-xs font-semibold tracking-widest text-gray-700">FEDERAL REPUBLIC OF NIGERIA</p>
          <p className="text-xl md:text-2xl font-extrabold text-gray-900">FEDERAL MINISTRY OF FINANCE</p>
          <p className="text-xs uppercase text-gray-600">Department of Home Finance, Federal Ministry of Finance</p>
          <p className="text-xs text-gray-600">Central Business District, Area 1, Abuja, FCT, Nigeria</p>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
          Request for Expressions of Interest (Consulting Services - Firms Selection)
        </h1>
        <p className="text-gray-600">
          Federal Ministry of Finance (Nigeria) - State Action on Business Enabling Reforms (SABER)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>At a Glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-700">
          <p>
            The Federal Ministry of Finance seeks eligible consulting firms to support verification of
            selected results under the SABER operation in line with the Disbursement Linked Indicator (DLI) matrix.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md bg-gray-50 border p-3">
              <p className="font-semibold text-gray-900">Client</p>
              <p>Federal Ministry of Finance (Nigeria)</p>
            </div>
            <div className="rounded-md bg-gray-50 border p-3">
              <p className="font-semibold text-gray-900">Program</p>
              <p>SABER - Investment Project Financing (IPF) Component</p>
            </div>
            <div className="rounded-md bg-gray-50 border p-3">
              <p className="font-semibold text-gray-900">Project</p>
              <p>State Action on Business Enabling Reforms (SABER)</p>
            </div>
            <div className="rounded-md bg-gray-50 border p-3">
              <p className="font-semibold text-gray-900">Assignment Title</p>
              <p>Engagement of Social Audit Firm</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scope and Expectations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            The selected consulting firm is expected to assess and verify achievement of specific DLI results
            and verification protocols through reviews, key informant interviews, and physical inspection.
          </p>
          <p>
            The assignment is expected to commence in Q2 2026 and run for all states participating in the DLI.
          </p>
          <p className="font-medium text-gray-900">
            Note: Expected timeline is subject to confirmation by the PCU and may be updated at any time.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Core Eligibility Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
            <li>Minimum of 10 years operational existence as an organization.</li>
            <li>Minimum of two similar assignments completed in the last 7 years.</li>
            <li>Demonstrated experience in social audits and field verification methods.</li>
            <li>Capacity to deploy teams across multiple regions in Nigeria.</li>
            <li>Fluency in English, with local language capability as an advantage.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submission and Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            Expressions of interest should be delivered in writing to the official address indicated by the
            Federal Ministry of Finance for this procurement.
          </p>
          <p>
            For further information, contact the office of the Project Coordinating Unit (PCU),
            Federal Ministry of Finance, Abuja.
          </p>
          <p className="font-medium text-gray-900">
            Please rely on the official advertorial document for final submission requirements,
            timelines, and procurement conditions.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/saber">
          <Button variant="outline">Back to SABER</Button>
        </Link>
      </div>
    </div>
  );
}
