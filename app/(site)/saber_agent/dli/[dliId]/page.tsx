// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, ArrowLeft, User, MapPin } from "lucide-react";
import { Progress } from "@material-tailwind/react";
export default function DLIProgressPage() {
  const router = useRouter();
  const {
    dliId
  } = useParams();
  const dliTemplate = useQuery(api.dli.getDliTemplate, {
    id: dliId as Id<"dli_templates">
  });
  const user = useQuery(api.users.getCurrentUsers);
  const userProgress = useQuery(api.dli.getUserDLIProgress, {
    dliTemplateId: dliId as Id<"dli_templates">
  });
  const completeStep = useMutation(api.dli.completeStep);
  const [activeStep, setActiveStep] = useState(0);
  const [completionDates, setCompletionDates] = useState<{
    [key: string]: string;
  }>({});
  useEffect(() => {
    if (userProgress?.steps) {
      setActiveStep(userProgress.completedSteps || 0);
      const completedSteps = userProgress.steps.reduce((acc, step) => {
        acc[step.title] = step.completedAt ? new Date(step.completedAt).toLocaleString() : "N/A";
        return acc;
      }, {} as {
        [key: string]: string;
      });
      setCompletionDates(completedSteps);
    }
  }, [userProgress]);
  const handleStepClick = async (index: number, stepTitle: string) => {
    if (!userProgress?.steps || userProgress.steps[index]?.completed) return;
    const timestamp = Date.now();
    await completeStep({
      dliTemplateId: dliId as Id<"dli_templates">,
      stepTitle
    });
    setActiveStep(index + 1);
    setCompletionDates(prev => ({
      ...prev,
      [stepTitle]: new Date(timestamp).toLocaleString()
    }));
    router.refresh();
  };
  if (!dliTemplate || !userProgress?.steps || !user) return <p>Loading...</p>;
  return <div className="max-w-4xl mx-auto p-4 md:p-6">
      {}
      <Button onClick={() => router.push("/saber_agent/dli")} className="mb-6 flex items-center">
        <ArrowLeft className="mr-2" size={18} /> Back to DLIs
      </Button>

      {}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{dliTemplate.title}</h1>
        <p className="text-gray-600 mb-4">{dliTemplate.description}</p>

        <div className="flex items-center gap-6 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <User size={16} />
            <span className="font-medium">{user.firstName} {user.lastName}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{user.state}</span>
          </div>
        </div>
      </div>

      {}
      <div className="mb-8">
        <Progress value={userProgress.completedSteps / userProgress.totalSteps * 100} color="green" />
        <div className="mt-1 text-sm text-gray-600">
          {userProgress.completedSteps} of {userProgress.totalSteps} steps completed
        </div>
      </div>

      {}
      <div className="space-y-6">
        {userProgress.steps.map((step, index) => {
        const isCompleted = step.completed;
        const isActive = index === activeStep;
        return <div key={index} className="relative">
              <div className="absolute left-4 top-5 h-full w-px bg-gray-300 z-0" />

              <Card onClick={() => handleStepClick(index, step.title)} className={`relative z-10 p-4 shadow-sm cursor-pointer rounded-xl transition-all
    ${isCompleted ? "bg-green-50 border-l-4 border-green-500" : isActive ? "bg-blue-50 border-l-4 border-blue-500" : "bg-white border border-gray-200"}
    hover:shadow-md`}>
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
    {}
    <div className="flex items-start gap-3 w-full sm:w-auto">
      {isCompleted ? <CheckCircle size={20} className="text-green-600 mt-1 flex-shrink-0" /> : <Circle size={20} className="text-gray-400 mt-1 flex-shrink-0" />}
      <div className="text-sm text-gray-800 break-words whitespace-pre-wrap">
        <span className="font-semibold">Step {index + 1}:</span> {step.title}
      </div>
    </div>

    {}
    {isCompleted && <div className="text-xs text-gray-500 sm:text-right">
        Completed on:<br />
        {completionDates[step.title]}
      </div>}
  </div>
          </Card>

            </div>;
      })}
      </div>
    </div>;
}