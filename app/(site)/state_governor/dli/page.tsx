// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import Image from "next/image";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
export default function StateDLIsPage() {
  const router = useRouter();
  const {
    user
  } = useUser();
  const userData = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user.id
  } : "skip");
  const stateDLIs = useQuery(api.dli.getStateDLIs, userData?.state ? {
    state: userData.state
  } : "skip");
  if (!userData) return <p>Loading user data...</p>;
  if (!stateDLIs) return <p>Loading DLIs...</p>;
  return <div className="p-6 max-w-7xl mx-auto">
      {}
      <div className="text-center mb-6">
        {userData.state && <span className="bg-green-100 text-blue-800 text-sm font-semibold px-4 py-1 rounded-full shadow inline-block mb-2">
            {userData.state} State
          </span>}
        <h1 className="text-3xl font-bold">State-wide DLI Progress</h1>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stateDLIs.map(dli => {
        const progressPercentage = Math.round(dli.completedSteps / dli.totalSteps * 100);
        return <div key={dli._id} className="bg-white shadow-xl rounded-2xl p-6 flex flex-col h-full relative">
              {}
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src="/images/DLI.jpg" alt="DLI" width={64} height={64} className="object-cover rounded-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-md font-semibold text-gray-900 break-words leading-tight">
                    {dli.dliTitle}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Reform Champion: {dli.startedBy}
                  </p>
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Info className="w-5 h-5 text-gray-600 cursor-pointer hover:text-blue-500" />
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="bg-white text-black p-3 rounded-md shadow-md w-72 text-sm">
                    <p>ℹ️ You can see all the steps by going to "View Progress"</p>
                  </PopoverContent>
                </Popover>
              </div>

              {}
            {}
          <div className="mt-4">
  <div className="flex items-center justify-between gap-2">
    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
      <div className="bg-green-600 h-full transition-all duration-300" style={{
                  width: `${progressPercentage}%`
                }} />
    </div>
    <span className="text-gray-800 text-sm ml-2 whitespace-nowrap">
      {progressPercentage}%
    </span>
  </div>
          </div>


              {}
              <div className="flex-grow" />

              {}
              <div className="mt-6">
                <Button onClick={() => router.push(`/state_governor/dli/${dli._id}`)} className="w-full bg-green-600 text-white rounded-xl">
                  View Progress
                </Button>
              </div>
            </div>;
      })}
      </div>
    </div>;
}