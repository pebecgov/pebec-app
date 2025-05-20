import React from "react";
import { Metadata } from "next";
import About1 from "@/components/Overview/Hero";
import OverviewBanner from "@/components/Overview/Overview";
import PEBECSection from "@/components/Overview/Section1";
import Members from "@/components/Overview/Members";
import ReformSlider from "@/components/Overview/Agenda";
import ReformAgendaSlider from "@/components/Overview/Agenda";

// Metadata for SEO
export const metadata: Metadata = {
  title: "PEBEC - Overview",
  description: "All about PEBEC",
};

const Overview = async () => {
  return (
    <div className="py-20 ">
     <OverviewBanner/>
     <About1/>
     <PEBECSection/>
     <Members/>
     
    </div>
  );
};

export default Overview;
