// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import React from "react";
import ReportGov from "@/components/ReportGov";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ReportGov.ng - Report Issues & Track Progress | PEBEC",
  description: "Report and track issues with government services in Nigeria. ReportGov.ng is your platform for submitting complaints, tracking resolution progress, and contributing to improved public service delivery.",
  openGraph: {
    title: "ReportGov.ng - Report Issues & Track Progress | PEBEC",
    description: "Report and track issues with government services in Nigeria. ReportGov.ng is your platform for submitting complaints, tracking resolution progress, and contributing to improved public service delivery.",
    images: [
      {
        url: "/images/reportgov-preview.PNG",
        width: 1200,
        height: 630,
        alt: "ReportGov.ng - PEBEC's Complaint Management Platform"
      }
    ],
    type: "website",
    locale: "en_NG",
    url: "https://www.pebec.gov.ng/reportgov-ng"
  },
  twitter: {
    card: "summary_large_image",
    title: "ReportGov.ng - Report Issues & Track Progress | PEBEC",
    description: "Report and track issues with government services in Nigeria. ReportGov.ng is your platform for submitting complaints, tracking resolution progress, and contributing to improved public service delivery.",
    images: ["/images/reportgov-preview.PNG"],
    creator: "@reportgovng"
  }
};

export default function ReportGovPage() {
  return <ReportGov />;
}