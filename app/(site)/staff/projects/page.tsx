// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users, Eye, Shield, Calendar, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";



const workstreams = [
  "regulatory", "innovation", "judiciary", "communications",
  "investments", "receptionist", "account", "auditor", "sub_national", "logistics"
];

const formatWorkstream = (workstream: string | undefined) => {
  if (!workstream) return "Unknown";
  return workstream.charAt(0).toUpperCase() + workstream.slice(1).replace("_", " ");
};

export default function ProjectsPage() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workstreamFilter, setWorkstreamFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("my");

  const convexUser = useQuery(api.users.getUserByClerkId, {
    clerkUserId: user?.id ?? ""
  });



  // Get different types of projects
  const myProjects = useQuery(api.staff_projects.getMyProjects) || [];
  const workstreamProjects = useQuery(api.staff_projects.getWorkstreamProjects, {
    workstream: convexUser?.staffStream
  }) || [];
  const publicProjects = useQuery(api.staff_projects.getPublicProjects) || [];
  const searchResults = useQuery(api.staff_projects.searchProjects, {
    searchTerm,
    workstreamFilter: workstreamFilter === "all" ? undefined : workstreamFilter,
    statusFilter: statusFilter === "all" ? undefined : statusFilter,
    tagFilter: tagFilter === "all" ? undefined : tagFilter
  }) || [];

  // Get all unique tags from all projects
  const allTags = new Set<string>();
  [...myProjects, ...workstreamProjects, ...publicProjects].forEach(project => {
    project.tags?.forEach(tag => allTags.add(tag));
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "open": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "private": return <Shield className="h-3 w-3" />;
      case "workstream": return <Users className="h-3 w-3" />;
      case "cross_workstream": return <Users className="h-3 w-3" />;
      case "public": return <Eye className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getUserRole = (project: any) => {
    const collaboration = project.collaborators?.find((c: any) => c.userId === convexUser?._id);
    return collaboration?.role || "viewer";
  };

  const ProjectCard = ({ project }: { project: any }) => {
    const userRole = getUserRole(project);
    const isOwner = userRole === "owner";
    const canEdit = userRole === "owner" || userRole === "editor";

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link href={`/staff/projects/${project._id}`} className="hover:underline">
                  {project.name}
                </Link>
                {getVisibilityIcon(project.visibility)}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{project.description}</p>
            </div>
            <Badge className={getStatusColor(project.status)}>
              {project.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{Math.round(project.progress)}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          {/* Steps */}
          <div className="text-sm flex justify-between items-center">
            <span className="text-gray-600">
              {project.steps?.filter((s: any) => s.completed).length || 0} of {project.steps?.length || 0} steps completed
            </span>
            {project.collaborators && project.collaborators.length > 1 && (
              <span className="text-gray-500 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {project.collaborators.length} members
              </span>
            )}
          </div>



          {/* Workstream & Tags */}
          <div className="flex items-center w-full flex-col gap-3 justify-between">
            <div className="flex gap-1 items-center justify-between w-full">
              <Badge variant="outline" className="text-xs">
                {formatWorkstream(project.primaryWorkstream)}
              </Badge>
            </div>
            <div className="flex gap-1 flex-col items-start  w-full">
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{project.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>


          </div>

          {/* Role indicator */}
          <div className="flex justify-between items-center">
            <Badge variant={isOwner ? "default" : "outline"} className="text-xs">
              {userRole}
            </Badge>
            {canEdit && (
              <Link href={`/staff/projects/${project._id}`}>
                <Button variant="outline" size="sm">
                  {userRole === "owner" ? "Manage" : "Edit"}
                </Button>
              </Link>
            )}
          </div>
          {/* Creator Information */}
          <div className="flex items-center w-full justify-between text-sm">
            <div className="flex gap-1 w-full px-4 justify-between items-center">
              <span className="font-medium text-xs">{project.creator?.name || "Unknown User"}</span>
              <div className="flex gap-1 items-center text-xs">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!user || !convexUser) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-gray-600">Manage your collaborative projects across workstreams</p>
        </div>
        <Link href="/staff/projects/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>




      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workstreamFilter} onValueChange={setWorkstreamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by workstream" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workstreams</SelectItem>
                {workstreams.map((ws) => (
                  <SelectItem key={ws} value={ws}>
                    {ws.charAt(0).toUpperCase() + ws.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {Array.from(allTags).map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="my">My Projects ({myProjects.length})</TabsTrigger>
          <TabsTrigger value="workstream">
            {formatWorkstream(convexUser.staffStream)} ({workstreamProjects.length})
          </TabsTrigger>
          <TabsTrigger value="public">Public ({publicProjects.length})</TabsTrigger>
          <TabsTrigger value="search">Search Results ({searchResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
            {myProjects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 mb-4">You haven't created any projects yet</p>
                <Link href="/staff/projects/create">
                  <Button>Create Your First Project</Button>
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="workstream" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workstreamProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
            {workstreamProjects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No projects found for your workstream</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="public" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
            {publicProjects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No public projects available</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
            {searchResults.length === 0 && searchTerm && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No projects found matching your search criteria</p>
              </div>
            )}
            {!searchTerm && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">Enter search terms to find projects</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}