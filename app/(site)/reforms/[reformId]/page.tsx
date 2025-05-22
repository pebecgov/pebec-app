// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";
import { PlayCircle, CheckCircle, Globe, Briefcase, BarChart3, ShieldCheck, Users } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem } from "@/components/Accordion";
interface Reform {
  _id: Id<"reforms">;
  title: string;
  description: string;
  category: string;
  implementedDate: number;
  imageId?: Id<"_storage">;
  videoLink?: string;
  impact: string[];
  outcome: string[];
  createdAt: number;
  updatedAt?: number;
}
const impactIcons = [Globe, Briefcase, BarChart3, ShieldCheck, Users];
export default function ReformDetailPage() {
  const {
    reformId
  } = useParams();
  const reform = useQuery(api.reforms.getReformById, {
    id: reformId as Id<"reforms">
  }) || null;
  const imageUrl = useQuery(api.reforms.getImageUrl, reform?.imageId ? {
    storageId: reform.imageId
  } : "skip");
  const [open, setOpen] = useState(false);
  if (!reform) return <p className="text-center text-lg mt-6">Loading...</p>;
  return <div className="container mx-auto p-6 mt-30">
      {}
      <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden rounded-lg">
        {imageUrl && <Image src={imageUrl} alt={reform.title} layout="fill" objectFit="cover" className="rounded-lg blur-sm brightness-50" />}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4">
          <h1 className="text-3xl md:text-5xl font-bold tracking-wide">{reform.title}</h1>

          {}
          {reform.videoLink && <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="mt-4 flex items-center gap-2 bg-green-500 hover:bg-green-600 px-5 py-3 text-white rounded-lg text-lg shadow-lg transition">
                  <PlayCircle className="w-8 h-8" />
                  Watch Video
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogTitle className="text-center text-xl font-semibold">{reform.title} - Overview</DialogTitle>
                <div className="w-full">
                  <iframe className="w-full h-[400px] rounded-lg shadow-lg" src={reform.videoLink.replace("watch?v=", "embed/")} allowFullScreen></iframe>
                </div>
              </DialogContent>
            </Dialog>}
        </div>
      </div>

      {}
      <div className="mt-12">
        {}
        <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 w-full">
          <h2 className="text-2xl font-bold text-gray-900">What This Reform is About</h2>
          <p className="text-lg text-gray-700 mt-4 leading-relaxed">{reform.description}</p>
        </div>

        {}
         {}
      {reform.impact.length > 0 && <div className="mt-10 bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Key Impacts</h2>
          <Accordion>
            {reform.impact.map((impact, index) => {
            const Icon = impactIcons[index % impactIcons.length];
            return <AccordionItem key={index} title={`Impact #${index + 1}`} fullText={impact} icon={<Icon />} />;
          })}
          </Accordion>
        </div>}
      </div>

      {}
        {}
        {reform.outcome.length > 0 && <div className="mt-12 bg-green-900 text-white p-12 rounded-lg shadow-lg">
          <h2 className="text-3xl font-semibold text-center">This reform has generated the following outcomes</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reform.outcome.map((item, index) => <div key={index} className="flex items-start gap-4 bg-green-800 p-6 rounded-lg shadow-md transition hover:bg-green-700">
                {}
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" /> 
                <p className="text-lg font-medium">{item}</p>
              </div>)}
          </div>
        </div>}
    </div>;
}