// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export default function ProjectsDashboard() {
  const {
    user
  } = useUser();
  const router = useRouter();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const projects = useQuery(isAdmin ? api.staff_projects.getAllProjects : api.staff_projects.getMyProjects) ?? [];
  if (!user) return <p className="text-center mt-10">Loading...</p>;
  return <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">
        {isAdmin ? "All Staff Projects" : "My Projects"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? projects.map(project => <div key={project._id} className="bg-white dark:bg-zinc-800 shadow-md rounded-lg overflow-hidden transition hover:shadow-lg">
              <div className="px-5 py-4 flex justify-between items-start">
                <div>
                  <h3 className="text-zinc-900 dark:text-white font-semibold text-lg line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 capitalize">
                    Status: {project.status}
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="focus:outline-none">
                        <svg strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-zinc-500 hover:text-zinc-700 transition" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinejoin="round" strokeLinecap="round" />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-sm p-3">
                      <p className="font-semibold mb-1">Project Status Info</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Open</strong> – No steps completed</li>
                        <li><strong>In Progress</strong> – At least 1 step completed</li>
                        <li><strong>Completed</strong> – All steps completed</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="px-5 pb-5">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-2">
                  {project.description}
                </p>

                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 mb-1">
                  <div style={{
              width: `${project.progress}%`
            }} className="bg-green-600 h-2.5 rounded-full transition-all duration-300" />
                </div>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {Math.round(project.progress)}% Complete
                  </span>
                  <Button variant="link" size="sm" className="text-green-600 text-xs p-0 h-auto" onClick={() => router.push(`/admin/projects/${project._id}`)}>
                    View Details
                  </Button>
                </div>
              </div>
            </div>) : <p className="text-sm text-zinc-500 col-span-3">
            {isAdmin ? "No projects found." : "You have no projects yet."}
          </p>}
      </div>
    </div>;
}