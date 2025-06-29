// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Users, Shield, Tag, Plus, X, Calendar, User } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const workstreams = [
  "regulatory", "innovation", "judiciary", "communications", 
  "investments", "receptionist", "account", "auditor", "sub_national"
];


const workstreams = [
  "regulatory", "innovation", "judiciary", "communications", 
  "investments", "receptionist", "account", "auditor", "sub_national"
];

const commonTags = [
  "High Priority", "Quick Win", "Strategic", "Technical", "Research",
  "Compliance", "Innovation", "Process Improvement", "Training"
];

export default function CreateProjectForm() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const createProject = useMutation(api.staff_projects.createProject);
  const convexUser = useQuery(api.users.getUserByClerkId, {
    clerkUserId: user?.id ?? ""
  });
  const allUsers = useQuery(api.users.getAllUsers) || [];

  // Basic project info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // Steps
  const [steps, setSteps] = useState<Array<{
    title: string;
    completed: boolean;
    assignedTo?: Id<"users">;
    assignedToName?: string;
    dueDate?: number;
  }>>([{ 
    title: "", 
    completed: false
  }]);
  
  // Collaboration settings
  const [visibility, setVisibility] = useState<"private" | "workstream" | "cross_workstream" | "public">("workstream");
  const [allowedWorkstreams, setAllowedWorkstreams] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<Array<{ userId: Id<"users">; role: "editor" | "viewer" }>>([]);
  
  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  // Loading state
  const [isCreating, setIsCreating] = useState(false);

  // Get available users for collaboration (excluding current user)
  const availableUsers = allUsers.filter(u => 
    u._id !== convexUser?._id && 
    u.role === "staff" &&
    !collaborators.some(c => c.userId === u._id)
  );

  const handleStepChange = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], title: value };
    setSteps(updated);
  };

  const handleStepAssignmentChange = (index: number, userId: Id<"users"> | "unassigned") => {
    const updated = [...steps];
    if (userId === "unassigned") {
      const { assignedTo, assignedToName, ...rest } = updated[index];
      updated[index] = rest;
    } else {
      const user = allUsers.find(u => u._id === userId);
      updated[index] = { 
        ...updated[index], 
        assignedTo: userId, 
        assignedToName: user ? `${user.firstName} ${user.lastName}` : undefined 
      };
    }
    setSteps(updated);
  };

  const handleStepDueDateChange = (index: number, date: Date | null) => {
    const updated = [...steps];
    if (date) {
      updated[index] = { 
        ...updated[index], 
        dueDate: date.getTime() 
      };
    } else {
      const { dueDate, ...rest } = updated[index];
      updated[index] = rest;
    }
    setSteps(updated);
  };

  const addStep = () => {
    setSteps([...steps, { 
      title: "", 
      completed: false
    }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const addCollaborator = (userId: Id<"users">, role: "editor" | "viewer") => {
    setCollaborators([...collaborators, { userId, role }]);
  };

  const removeCollaborator = (userId: Id<"users">) => {
    setCollaborators(collaborators.filter(c => c.userId !== userId));
  };

  const updateCollaboratorRole = (userId: Id<"users">, newRole: "editor" | "viewer") => {
    setCollaborators(collaborators.map(c => 
      c.userId === userId ? { ...c, role: newRole } : c
    ));
  };

  const toggleWorkstream = (workstream: string) => {
    setAllowedWorkstreams(prev => 
      prev.includes(workstream)
        ? prev.filter(w => w !== workstream)
        : [...prev, workstream]
    );
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addCommonTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (!convexUser?._id) {
      toast({
        title: "Error",
        description: "User ID missing. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    if (!name.trim() || !description.trim()) {
      toast({
        title: "Error", 
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const validSteps = steps.filter(step => step.title.trim());
    if (validSteps.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one project step.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      await createProject({
        name: name.trim(),
        description: description.trim(),
        visibility,
        allowedWorkstreams: visibility === "cross_workstream" ? allowedWorkstreams : [],
        tags: tags.length > 0 ? tags : undefined,
        steps: validSteps,
        initialCollaborators: collaborators.length > 0 ? collaborators : undefined
      });

      toast({
        title: "Success",
        description: "Project created successfully!",
      });

      router.push("/staff/projects");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!user || !convexUser) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Create New Project</h2>
        <p className="text-gray-600 mt-2">Set up your project with team collaboration and visibility settings</p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project goals and objectives"
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Project Tasks</CardTitle>
          <p className="text-sm text-gray-600">Define the tasks for your project, assign team members, and set deadlines</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={step.title}
                  onChange={(e) => handleStepChange(idx, e.target.value)}
                  placeholder={`Task ${idx + 1} title`}
                  className="flex-1"
                />
                {steps.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeStep(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Assignment */}
                <div>
                  <Label className="text-sm flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Assign to
                  </Label>
                  <Select 
                    value={step.assignedTo || "unassigned"} 
                    onValueChange={(value) => handleStepAssignmentChange(idx, value as Id<"users"> | "unassigned")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {/* Include yourself */}
                      {convexUser && (
                        <SelectItem value={convexUser._id}>
                          {convexUser.firstName} {convexUser.lastName} (You)
                        </SelectItem>
                      )}
                      {/* Include collaborators */}
                      {collaborators.map((collab) => {
                        const user = allUsers.find(u => u._id === collab.userId);
                        if (user && user._id !== convexUser?._id) {
                          return (
                            <SelectItem key={user._id} value={user._id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          );
                        }
                        return null;
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div>
                  <Label className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due Date
                  </Label>
                  <div className="mt-1">
                    <DatePicker
                      selected={step.dueDate ? new Date(step.dueDate) : null}
                      onChange={(date) => handleStepDueDateChange(idx, date)}
                      className="w-full p-2 border border-input rounded-md bg-background text-sm"
                      placeholderText="Select due date (optional)"
                      dateFormat="MMM d, yyyy"
                      minDate={new Date()}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addStep}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </CardContent>
      </Card>

      {/* Visibility & Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Visibility & Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Project Visibility</Label>
            <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private - Only collaborators</SelectItem>
                <SelectItem value="workstream">Workstream - My workstream team</SelectItem>
                <SelectItem value="cross_workstream">Cross-Workstream - Selected workstreams</SelectItem>
                <SelectItem value="public">Public - All PEBEC staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === "cross_workstream" && (
            <div>
              <Label>Allowed Workstreams</Label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                {workstreams.map((workstream) => (
                  <div key={workstream} className="flex items-center space-x-2">
                    <Checkbox
                      id={workstream}
                      checked={allowedWorkstreams.includes(workstream)}
                      onCheckedChange={() => toggleWorkstream(workstream)}
                    />
                    <Label htmlFor={workstream} className="text-sm capitalize">
                      {formatWorkstream(workstream)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Collaboration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Add Team Members</Label>
            <div className="mt-2 space-y-2">
              {availableUsers.length > 0 ? (
                <Select onValueChange={(userId) => {
                  const user = availableUsers.find(u => u._id === userId);
                  if (user) {
                    addCollaborator(user._id, "editor");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} - {user.staffStream ? formatWorkstream(user.staffStream) : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-500">No available users to add</p>
              )}
            </div>
          </div>

          {/* Current Collaborators */}
          {collaborators.length > 0 && (
            <div>
              <Label>Team Members ({collaborators.length})</Label>
              <div className="mt-2 space-y-2">
                {collaborators.map((collab) => {
                  const user = allUsers.find(u => u._id === collab.userId);
                  return (
                    <div key={collab.userId} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                          <p className="text-sm text-gray-500">{user?.staffStream ? formatWorkstream(user.staffStream) : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={collab.role}
                          onValueChange={(role: "editor" | "viewer") => 
                            updateCollaboratorRole(collab.userId, role)
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeCollaborator(collab.userId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Add Custom Tag</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Enter tag name"
                onKeyPress={(e) => e.key === "Enter" && addTag()}
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
          </div>

          <div>
            <Label>Common Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {commonTags.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCommonTag(tag)}
                  disabled={tags.includes(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <Label>Selected Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isCreating || !name.trim() || !description.trim()}
        >
          {isCreating ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </div>
  );
}