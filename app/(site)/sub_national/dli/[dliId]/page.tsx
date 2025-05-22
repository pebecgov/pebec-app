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
    dliId
  } = useParams();
  const dliTemplate = useQuery(api.dli.getDliTemplate, {
    id: dliId as Id<"dli_templates">
  });
  const userProgress = useQuery(api.dli.getUserDLIProgress, {
    dliTemplateId: dliId as Id<"dli_templates">
  });
  const [completionDates, setCompletionDates] = useState<{
    [key: string]: string;
  }>({});
  useEffect(() => {
    if (userProgress?.steps) {
      const completedSteps = userProgress.steps.reduce((acc, step) => {
        acc[step.title] = step.completedAt ? new Date(step.completedAt).toLocaleString() : "N/A";
        return acc;
      }, {} as {
        [key: string]: string;
      });
      setCompletionDates(completedSteps);
    }
  }, [userProgress]);
  if (!dliTemplate || !userProgress) return <p>Loading...</p>;
  return <div className="max-w-3xl mx-auto p-4 md:p-6">
      {}
      <Button onClick={() => router.push("/sub_national/dli")} className="mb-4 flex items-center">
        <ArrowLeft className="mr-2" size={18} /> Back to DLIs
      </Button>

      <h1 className="text-2xl font-bold mb-2">{dliTemplate.title}</h1>
      <p className="text-gray-600 mb-6">{dliTemplate.description}</p>

      {}
      <Progress value={userProgress.completedSteps / userProgress.totalSteps * 100} className="mb-6" />

      <div className="relative border-l border-gray-300 pl-4 md:pl-6">
        {userProgress.steps.map((step, index) => <div key={index} className="mb-6 relative">
            <div className={`absolute top-0 left-[-22px] h-full w-1 ${step.completed ? "bg-green-600" : "bg-gray-300"}`}></div>
            <Card className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between shadow-md rounded-lg ${step.completed ? "bg-green-100 border-green-500" : "bg-gray-100 border-gray-300"}`}>
              <div className="flex items-center w-full">
                {step.completed ? <CheckCircle className="text-green-600 mr-4" size={24} /> : <Circle className="text-gray-400 mr-4" size={24} />}
                <span className="text-sm font-semibold text-gray-800">{step.title}</span>
              </div>
            </Card>
          </div>)}
      </div>
    </div>;
}