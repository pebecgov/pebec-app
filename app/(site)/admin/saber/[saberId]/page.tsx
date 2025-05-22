// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, ArrowLeft } from "lucide-react";
import { Progress } from "@material-tailwind/react";
import { Id } from "@/convex/_generated/dataModel";
export default function StateDLIProgressPage() {
  const router = useRouter();
  const {
    saberId
  } = useParams();
  const dliProgress = useQuery(api.dli.getDliProgressById, {
    id: saberId as Id<"dli_progress">
  });
  const dliTemplate = useQuery(api.dli.getDliTemplate, dliProgress?.dliTemplateId ? {
    id: dliProgress.dliTemplateId
  } : "skip");
  const [completionDates, setCompletionDates] = useState<{
    [key: string]: string;
  }>({});
  useEffect(() => {
    if (dliProgress?.steps) {
      const completedSteps = dliProgress.steps.reduce((acc, step) => {
        acc[step.title] = step.completedAt ? new Date(step.completedAt).toLocaleString() : "N/A";
        return acc;
      }, {} as {
        [key: string]: string;
      });
      setCompletionDates(completedSteps);
    }
  }, [dliProgress]);
  if (!dliProgress || !dliTemplate) return <p>Loading...</p>;
  return <div className="max-w-3xl mx-auto p-4 md:p-6">
      <Button onClick={() => router.push("/admin/saber")} className="mb-4 flex items-center">
        <ArrowLeft className="mr-2" size={18} /> Back to DLIs
      </Button>

      <h1 className="text-2xl font-bold mb-2">{dliTemplate.title}</h1>
      <p className="text-gray-600 mb-6">{dliTemplate.description}</p>

      <Progress value={dliProgress.completedSteps / dliProgress.totalSteps * 100} className="mb-6" />

      <div className="relative border-l border-gray-300 pl-4 md:pl-6">
        {dliProgress.steps.map((step, index) => <div key={index} className="mb-6 relative">
            <div className={`absolute top-0 left-[-22px] h-full w-1 ${step.completed ? "bg-green-600" : "bg-gray-300"}`}></div>
            <Card className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between shadow-md rounded-lg ${step.completed ? "bg-green-100 border-green-500" : "bg-gray-100 border-gray-300"}`}>
              <div className="flex items-center w-full">
                {step.completed ? <CheckCircle className="text-green-600 mr-4" size={24} /> : <Circle className="text-gray-400 mr-4" size={24} />}
                <span className="text-sm font-semibold text-gray-800">{step.title}</span>
              </div>
              {step.completed && <p className="text-xs text-gray-500 mt-2 md:mt-0 md:ml-4">
                  Completed on: {completionDates[step.title] || "N/A"}
                </p>}
            </Card>
          </div>)}
      </div>
    </div>;
}