"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, ArrowLeft, User, MapPin } from "lucide-react";
import { Progress } from "@material-tailwind/react";
import { Id } from "@/convex/_generated/dataModel";

export default function StateDLIProgressPage() {
  const router = useRouter();
  const { dliId } = useParams(); // dli_progress ID

  const dliProgress = useQuery(api.dli.getDliProgressById, {
    id: dliId as Id<"dli_progress">,
  });

  const dliTemplate = useQuery(
    api.dli.getDliTemplate,
    dliProgress?.dliTemplateId ? { id: dliProgress.dliTemplateId } : "skip"
  );

  const user = useQuery(api.users.getUserByIds, dliProgress?.userId ? { id: dliProgress.userId } : "skip");

  const [completionDates, setCompletionDates] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (dliProgress?.steps) {
      const completedSteps = dliProgress.steps.reduce((acc, step) => {
        acc[step.title] = step.completedAt
          ? new Date(step.completedAt).toLocaleString()
          : "N/A";
        return acc;
      }, {} as { [key: string]: string });

      setCompletionDates(completedSteps);
    }
  }, [dliProgress]);

  if (!dliProgress || !dliTemplate || !user) return <p>Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Back Button */}
      <Button onClick={() => router.push("/state_governor")} className="mb-6 flex items-center">
        <ArrowLeft className="mr-2" size={18} /> Back to DLIs
      </Button>

      {/* Header Info */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{dliTemplate.title}</h1>
        <p className="text-gray-600 mb-4">{dliTemplate.description}</p>

        <div className="flex items-center gap-6 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <User size={16} />
            <span className="font-medium">
              {user.firstName} {user.lastName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{user.state}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={(dliProgress.completedSteps / dliProgress.totalSteps) * 100} color="green" />
        <div className="mt-1 text-sm text-gray-600">
          {dliProgress.completedSteps} of {dliProgress.totalSteps} steps completed
        </div>
      </div>

      {/* Stepper (Read-only) */}
      <div className="space-y-6">
        {dliProgress.steps.map((step, index) => {
          const isCompleted = step.completed;

          return (
            <div key={index} className="relative">
              <div className="absolute left-4 top-5 h-full w-px bg-gray-300 z-0" />

              <Card
                className={`relative z-10 p-4 shadow-sm rounded-xl transition-all
                ${isCompleted
                    ? "bg-green-50 border-l-4 border-green-500"
                    : "bg-white border border-gray-200"
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-start gap-3 w-full sm:w-auto">
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-600 mt-1 flex-shrink-0" />
                    ) : (
                      <Circle size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                    )}
                    <div className="text-sm text-gray-800 break-words whitespace-pre-wrap">
                      <span className="font-semibold">Step {index + 1}:</span> {step.title}
                    </div>
                  </div>

                  {isCompleted && (
                    <div className="text-xs text-gray-500 sm:text-right">
                      Completed on:<br />
                      {completionDates[step.title]}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
