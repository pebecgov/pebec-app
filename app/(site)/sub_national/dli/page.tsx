"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@material-tailwind/react";
import { Info } from "lucide-react";

export default function StateDLIsPage() {
  const router = useRouter();
  const { user } = useUser();

  // ✅ Fetch user data
  const userData = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");

  // ✅ Fetch DLIs for users in the same state
  const stateDLIs = useQuery(api.dli.getStateDLIs, userData?.state ? { state: userData.state } : "skip");

  if (!userData) return <p>Loading user data...</p>;
  if (!stateDLIs) return <p>Loading DLIs...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">State-wide DLI Progress</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {stateDLIs.map((dli) => {
          const progressPercentage = Math.round((dli.completedSteps / dli.totalSteps) * 100);

          return (
            <Card key={dli._id} className="p-4 rounded-lg shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{dli.dliTitle}</h3>
                <Info className="text-gray-500" size={20} />
              </div>
              <p className="text-sm text-gray-500">Started by: {dli.startedBy}</p>
              
              <div className="mt-4">
                <Progress value={progressPercentage} className="w-full" />
                <p className="text-xs text-gray-600 text-right mt-1">{progressPercentage}% Completed</p>
              </div>

              <Button 
                onClick={() => router.push(`/sub_national/dli/${dli._id}`)} 
                className="mt-4 w-full bg-blue-600 text-white rounded-md"
              >
                View Progress
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
