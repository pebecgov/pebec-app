// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import ReformGroup from "@/components/Reforms/ReformGroup";
import ReformHero from "@/components/Reforms/ReformHero";
import { useSearchParams } from "next/navigation";
export default function ReformsPage() {
  const searchParams = useSearchParams();
  const expand = searchParams.get("expand");
  const [searchQuery, setSearchQuery] = useState("");
  return <main className="pb-16">
      <ReformHero searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <section className="container mx-auto px-4 py-10">
        <ReformGroup searchQuery={searchQuery} defaultExpanded={expand} />
      </section>
    </main>;
}