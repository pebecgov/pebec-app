// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
export default function OverviewBanner() {
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const scrollToAbout = () => {
    if (aboutSectionRef.current) {
      aboutSectionRef.current.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  return <section className="relative bg-gradient-to-r from-green-600 via-green-500 to-green-700 text-white py-20">
      <div className="container mx-auto px-6 flex flex-col-reverse md:flex-row items-center justify-between gap-10">
        
        {}
        <div className="w-full md:w-1/2 text-center md:text-left">
          <h3 className="text-lg font-semibold uppercase tracking-wide opacity-90">
            Overview
          </h3>
          <h1 className="text-5xl font-extrabold mt-3 leading-tight">
            PEBEC Works! <br />
            <span className="text-black">Making Business Easier</span>
          </h1>
          <p className="text-lg opacity-90 mt-5 max-w-xl leading-relaxed">
            The Presidential Enabling Business Environment Council (PEBEC) is dedicated to
            simplifying business operations in Nigeria. With strategic reforms and seamless
            policy enhancements, PEBEC ensures businesses flourish in an efficient and
            transparent regulatory ecosystem.
          </p>
          <Button onClick={scrollToAbout} className="mt-6 bg-green-800 hover:bg-green-900 text-white font-semibold py-3 px-6 rounded-lg text-lg transition-transform duration-300 transform hover:scale-105">
            Why PEBEC?
          </Button>
        </div>

        {}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="relative w-full max-w-md rounded-xl overflow-hidden shadow-lg border-4 border-white/20">
            <Image src="/images/overview_about.jpg" alt="Overview About Us" width={500} height={500} className="object-cover w-full h-full rounded-xl" priority />
          </div>
        </div>
      </div>

      {}
      <div ref={aboutSectionRef}></div>
    </section>;
}