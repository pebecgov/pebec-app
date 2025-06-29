// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users";

export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    visibility: v.union(v.literal("private"), v.literal("workstream"), v.literal("cross_workstream"), v.literal("public")),
    allowedWorkstreams: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    steps: v.array(v.object({
      title: v.string(),
      completed: v.boolean(),
      assignedTo: v.optional(v.id("users")),
      assignedToName: v.optional(v.string()),
      dueDate: v.optional(v.number())
    })),
    initialCollaborators: v.optional(v.array(v.object({
      userId: v.id("users"),
      role: v.union(v.literal("editor"), v.literal("viewer"))
    })))
  },
  handler: async (ctx, { name, description, visibility, allowedWorkstreams, tags, steps, initialCollaborators }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const createdAt = Date.now();

    // Build collaborators array with creator as owner
    const collaborators: Array<{
      userId: Id<"users">;
      role: "owner" | "editor" | "viewer";
      addedAt: number;
      addedBy: Id<"users">;
    }> = [
      {
        userId: user._id,
        role: "owner" as const,
        addedAt: createdAt,
        addedBy: user._id
      }
    ];

    // Add initial collaborators if provided
    if (initialCollaborators) {
      for (const collab of initialCollaborators) {
        collaborators.push({
          userId: collab.userId,
          role: collab.role,
          addedAt: createdAt,
          addedBy: user._id
        });
      }
    }

    const projectId = await ctx.db.insert("projects", {
      name,
      description,
      createdBy: user._id,
      status: "open",
      progress: 0,
      steps: steps.map((step, index) => ({
        ...step,
        completedBy: undefined,
        completedAt: undefined,
        assignedTo: undefined,
        assignedToName: undefined,
        dueDate: undefined,
        order: index + 1
      })),
      updates: [],
      collaborators,
      visibility,
      allowedWorkstreams: allowedWorkstreams || [],
      primaryWorkstream: user.staffStream || "general",
      tags,
      createdAt
    });

    // Notify collaborators
    if (initialCollaborators) {
      for (const collab of initialCollaborators) {
        await ctx.db.insert("notifications", {
          userId: collab.userId,
          message: `You've been added as a ${collab.role} to project: ${name}`,
          isRead: false,
          createdAt: Date.now(),
          type: "project_collaboration"
        });
      }
    }

    return projectId;
  }
});

export const addStep = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    assignedTo: v.optional(v.id("users")),
    assignedToName: v.optional(v.string()),
    dueDate: v.optional(v.number())
  },
  handler: async (ctx, { projectId, title, assignedTo, assignedToName, dueDate }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check permissions - only owners can create tasks
    const isOwner = project.collaborators?.some(c => c.userId === user._id && c.role === "owner") || project.createdBy === user._id;
    if (!isOwner) throw new Error("Only project owners can add new tasks");

    // Get next order number
    const maxOrder = Math.max(...project.steps.map(s => s.order || 0), 0);

    const newSteps = [...project.steps, {
      title,
      completed: false,
      completedBy: undefined,
      completedAt: undefined,
      assignedTo,
      assignedToName,
      dueDate,
      order: maxOrder + 1
    }];

    const completedCount = newSteps.filter(s => s.completed).length;
    const progress = newSteps.length === 0 ? 0 : (completedCount / newSteps.length) * 100;

    await ctx.db.patch(projectId, {
      steps: newSteps,
      progress,
      updatedAt: Date.now()
    });

    const newStatus = completedCount === newSteps.length ? "completed" : completedCount > 0 ? "in_progress" : "open";
    if (newStatus !== project.status) {
      await ctx.db.patch(projectId, { status: newStatus });
    }

    // Notify assigned user if different from creator
    if (assignedTo && assignedTo !== user._id) {
      await ctx.db.insert("notifications", {
        userId: assignedTo,
        message: `You've been assigned a new task "${title}" in project: ${project.name}`,
        isRead: false,
        createdAt: Date.now(),
        type: "task_assignment"
      });
    }
  }
});

export const toggleStep = mutation({
  args: {
    projectId: v.id("projects"),
    index: v.number()
  },
  handler: async (ctx, { projectId, index }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check permissions
    const canEdit = await hasEditPermission(ctx, user._id, project);
    if (!canEdit) throw new Error("You don't have permission to edit this project");

    const steps = [...project.steps];
    const step = steps[index];
    if (!step) throw new Error("Step not found");

    steps[index] = {
      ...step,
      completed: !step.completed,
      completedBy: !step.completed ? user._id : undefined,
      completedAt: !step.completed ? Date.now() : undefined
    };

    const completedCount = steps.filter(s => s.completed).length;
    const progress = steps.length === 0 ? 0 : (completedCount / steps.length) * 100;

    await ctx.db.patch(projectId, {
      steps,
      progress,
      updatedAt: Date.now()
    });

    const newStatus = completedCount === steps.length ? "completed" : completedCount > 0 ? "in_progress" : "open";
    if (newStatus !== project.status) {
      await ctx.db.patch(projectId, { status: newStatus });
    }
  }
});

export const addUpdate = mutation({
  args: {
    projectId: v.id("projects"),
    text: v.string()
  },
  handler: async (ctx, { projectId, text }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check permissions (even viewers can add updates for communication)
    const canView = await hasViewPermission(ctx, user._id, project);
    if (!canView) throw new Error("You don't have permission to view this project");

    const updates = [
      {
        text,
        timestamp: Date.now(),
        authorId: user._id,
        authorName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User"
      },
      ...project.updates
    ];

    await ctx.db.patch(projectId, {
      updates,
      updatedAt: Date.now()
    });
  }
});

export const addCollaborator = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(v.literal("editor"), v.literal("viewer"))
  },
  handler: async (ctx, { projectId, userId, role }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check if user is owner
    const isOwner = project.collaborators?.some(c => c.userId === user._id && c.role === "owner") || project.createdBy === user._id;
    if (!isOwner) throw new Error("Only project owners can add collaborators");

    // Check if user is already a collaborator
    const existingCollab = project.collaborators?.find(c => c.userId === userId);
    if (existingCollab) throw new Error("User is already a collaborator");

    const newCollaborator = {
      userId,
      role,
      addedAt: Date.now(),
      addedBy: user._id
    };

    // Initialize collaborators array if it doesn't exist
    const currentCollaborators = project.collaborators || [];

    await ctx.db.patch(projectId, {
      collaborators: [...currentCollaborators, newCollaborator],
      updatedAt: Date.now()
    });

    // Notify the new collaborator
    await ctx.db.insert("notifications", {
      userId,
      message: `You've been added as a ${role} to project: ${project.name}`,
      isRead: false,
      createdAt: Date.now(),
      type: "project_collaboration"
    });
  }
});

export const updateCollaboratorRole = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
    newRole: v.union(v.literal("editor"), v.literal("viewer"))
  },
  handler: async (ctx, { projectId, userId, newRole }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check if user is owner
    const isOwner = project.collaborators?.some(c => c.userId === user._id && c.role === "owner") || project.createdBy === user._id;
    if (!isOwner) throw new Error("Only project owners can update collaborator roles");

    if (!project.collaborators) throw new Error("No collaborators found");

    const updatedCollaborators = project.collaborators.map(collab => 
      collab.userId === userId 
        ? { ...collab, role: newRole }
        : collab
    );

    await ctx.db.patch(projectId, {
      collaborators: updatedCollaborators,
      updatedAt: Date.now()
    });
  }
});

export const removeCollaborator = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users")
  },
  handler: async (ctx, { projectId, userId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check if user is owner or removing themselves
    const isOwner = project.collaborators?.some(c => c.userId === user._id && c.role === "owner") || project.createdBy === user._id;
    const isSelf = user._id === userId;
    
    if (!isOwner && !isSelf) {
      throw new Error("You can only remove yourself or be removed by the project owner");
    }

    if (!project.collaborators) throw new Error("No collaborators found");

    // Can't remove the owner
    const targetCollab = project.collaborators.find(c => c.userId === userId);
    if (targetCollab?.role === "owner") {
      throw new Error("Cannot remove the project owner");
    }

    const updatedCollaborators = project.collaborators.filter(collab => collab.userId !== userId);

    await ctx.db.patch(projectId, {
      collaborators: updatedCollaborators,
      updatedAt: Date.now()
    });
  }
});

export const updateProjectSettings = mutation({
  args: {
    projectId: v.id("projects"),
    visibility: v.optional(v.union(v.literal("private"), v.literal("workstream"), v.literal("cross_workstream"), v.literal("public"))),
    allowedWorkstreams: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string()))
  },
  handler: async (ctx, { projectId, visibility, allowedWorkstreams, tags }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check if user is owner
    const isOwner = project.collaborators?.some(c => c.userId === user._id && c.role === "owner") || project.createdBy === user._id;
    if (!isOwner) throw new Error("Only project owners can update project settings");

    const updates: any = { updatedAt: Date.now() };
    if (visibility !== undefined) updates.visibility = visibility;
    if (allowedWorkstreams !== undefined) updates.allowedWorkstreams = allowedWorkstreams;
    if (tags !== undefined) updates.tags = tags;

    await ctx.db.patch(projectId, updates);
  }
});

// Query functions
export const getMyProjects = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Get projects where user is a collaborator or creator
    const allProjects = await ctx.db.query("projects").collect();
    const myProjects = allProjects.filter(project => 
      project.collaborators?.some(collab => collab.userId === user._id) ||
      project.createdBy === user._id
    );

    return myProjects;
  }
});

export const getWorkstreamProjects = query({
  args: {
    workstream: v.optional(v.string())
  },
  handler: async (ctx, { workstream }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const targetWorkstream = workstream || user.staffStream || "general";

    const allProjects = await ctx.db.query("projects").collect();
    
    return allProjects.filter(project => {
      // Check if user has access to this project
      const hasAccess = 
        // User is a collaborator
        project.collaborators?.some(collab => collab.userId === user._id) ||
        // User is the creator (backward compatibility)
        project.createdBy === user._id ||
        // Project is visible to workstream and user is in that workstream
        (project.visibility === "workstream" && project.primaryWorkstream === targetWorkstream) ||
        // Project allows cross-workstream and user's workstream is allowed
        (project.visibility === "cross_workstream" && project.allowedWorkstreams?.includes(targetWorkstream)) ||
        // Project is public or has no visibility set
        (!project.visibility || project.visibility === "public");

      return hasAccess && (
        project.primaryWorkstream === targetWorkstream ||
        project.allowedWorkstreams?.includes(targetWorkstream) ||
        !project.primaryWorkstream // backward compatibility
      );
    });
  }
});

export const getPublicProjects = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    const publicProjects = await ctx.db
      .query("projects")
      .withIndex("byVisibility", q => q.eq("visibility", "public"))
      .collect();

    return publicProjects;
  }
});

export const searchProjects = query({
  args: {
    searchTerm: v.string(),
    workstreamFilter: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
    tagFilter: v.optional(v.string())
  },
  handler: async (ctx, { searchTerm, workstreamFilter, statusFilter, tagFilter }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const allProjects = await ctx.db.query("projects").collect();

    return allProjects.filter(project => {
      // Check access permissions
      const hasAccess = 
        project.collaborators?.some(collab => collab.userId === user._id) ||
        project.createdBy === user._id ||
        (project.visibility === "workstream" && project.primaryWorkstream === user.staffStream) ||
        (project.visibility === "cross_workstream" && project.allowedWorkstreams?.includes(user.staffStream || "")) ||
        (!project.visibility || project.visibility === "public");

      if (!hasAccess) return false;

      // Apply filters
      const matchesSearch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWorkstream = !workstreamFilter || 
        project.primaryWorkstream === workstreamFilter ||
        project.allowedWorkstreams?.includes(workstreamFilter);

      const matchesStatus = !statusFilter || project.status === statusFilter;

      const matchesTag = !tagFilter || 
        (project.tags && project.tags.includes(tagFilter));

      return matchesSearch && matchesWorkstream && matchesStatus && matchesTag;
    });
  }
});

export const getProjectById = query({
  args: {
    projectId: v.id("projects")
  },
  handler: async (ctx, { projectId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    
    if (!project) return null;

    // Check if user has access
    const hasAccess = await hasViewPermission(ctx, user._id, project);
    if (!hasAccess) return null;

    return project;
  }
});

export const getProjectCollaborators = query({
  args: {
    projectId: v.id("projects")
  },
  handler: async (ctx, { projectId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    
    if (!project) return [];

    // Check if user has access
    const hasAccess = await hasViewPermission(ctx, user._id, project);
    if (!hasAccess) return [];

    // Get user details for each collaborator (handle projects without collaborators field)
    if (!project.collaborators) {
      return [];
    }

    const collaboratorsWithDetails = await Promise.all(
      project.collaborators.map(async (collab) => {
        const collaboratorUser = await ctx.db.get(collab.userId);
        return {
          ...collab,
          user: collaboratorUser ? {
            firstName: collaboratorUser.firstName,
            lastName: collaboratorUser.lastName,
            email: collaboratorUser.email,
            imageUrl: collaboratorUser.imageUrl,
            staffStream: collaboratorUser.staffStream
          } : null
        };
      })
    );

    return collaboratorsWithDetails;
  }
});

export const getAllProjects = query({
  handler: async (ctx) => {
    // Only admins can see all projects
    const user = await getCurrentUserOrThrow(ctx);
    const isAdmin = user.role === "admin";
    
    if (!isAdmin) {
      throw new Error("Only admins can view all projects");
    }

    return await ctx.db.query("projects").collect();
  }
});

export const updateStepAssignment = mutation({
  args: {
    projectId: v.id("projects"),
    stepIndex: v.number(),
    assignedTo: v.optional(v.id("users")),
    assignedToName: v.optional(v.string())
  },
  handler: async (ctx, { projectId, stepIndex, assignedTo, assignedToName }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check permissions - only owners can assign tasks
    const isOwner = project.collaborators?.some(c => c.userId === user._id && c.role === "owner") || project.createdBy === user._id;
    if (!isOwner) throw new Error("Only project owners can assign tasks");

    const steps = [...project.steps];
    if (!steps[stepIndex]) throw new Error("Step not found");

    steps[stepIndex] = {
      ...steps[stepIndex],
      assignedTo,
      assignedToName
    };

    await ctx.db.patch(projectId, {
      steps,
      updatedAt: Date.now()
    });

    // Notify assigned user if different from previous assignment
    if (assignedTo && assignedTo !== steps[stepIndex].assignedTo) {
      await ctx.db.insert("notifications", {
        userId: assignedTo,
        message: `You've been assigned task "${steps[stepIndex].title}" in project: ${project.name}`,
        isRead: false,
        createdAt: Date.now(),
        type: "task_assignment"
      });
    }
  }
});

export const updateStepDueDate = mutation({
  args: {
    projectId: v.id("projects"),
    stepIndex: v.number(),
    dueDate: v.optional(v.number())
  },
  handler: async (ctx, { projectId, stepIndex, dueDate }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check permissions - only owners can set deadlines
    const isOwner = project.collaborators?.some(c => c.userId === user._id && c.role === "owner") || project.createdBy === user._id;
    if (!isOwner) throw new Error("Only project owners can set task deadlines");

    const steps = [...project.steps];
    if (!steps[stepIndex]) throw new Error("Step not found");

    steps[stepIndex] = {
      ...steps[stepIndex],
      dueDate
    };

    await ctx.db.patch(projectId, {
      steps,
      updatedAt: Date.now()
    });
  }
});

export const reorderSteps = mutation({
  args: {
    projectId: v.id("projects"),
    newOrder: v.array(v.number()) // Array of step indices in new order
  },
  handler: async (ctx, { projectId, newOrder }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check permissions - editors and owners can reorder tasks
    const canEdit = await hasEditPermission(ctx, user._id, project);
    if (!canEdit) throw new Error("You don't have permission to reorder tasks");

    // Validate newOrder array
    if (newOrder.length !== project.steps.length) {
      throw new Error("Invalid reorder: length mismatch");
    }

    // Reorder steps based on the new order array
    const reorderedSteps = newOrder.map((originalIndex, newIndex) => ({
      ...project.steps[originalIndex],
      order: newIndex + 1
    }));

    await ctx.db.patch(projectId, {
      steps: reorderedSteps,
      updatedAt: Date.now()
    });
  }
});

export const deleteStep = mutation({
  args: {
    projectId: v.id("projects"),
    index: v.number()
  },
  handler: async (ctx, { projectId, index }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Check permissions
    const canEdit = await hasEditPermission(ctx, user._id, project);
    if (!canEdit) throw new Error("You don't have permission to edit this project");

    const steps = [...project.steps];
    steps.splice(index, 1);
    
    const completedCount = steps.filter(s => s.completed).length;
    const progress = steps.length === 0 ? 0 : (completedCount / steps.length) * 100;

    await ctx.db.patch(projectId, {
      steps,
      progress,
      updatedAt: Date.now()
    });
  }
});

export const deleteProject = mutation({
  args: {
    projectId: v.id("projects")
  },
  handler: async (ctx, { projectId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Only owner can delete (check both collaborators and creator for backward compatibility)
    const isOwner = project.collaborators?.some(c => c.userId === user._id && c.role === "owner") || project.createdBy === user._id;
    if (!isOwner) throw new Error("Only project owners can delete projects");

    await ctx.db.delete(projectId);
  }
});

// Helper functions
async function hasViewPermission(ctx: any, userId: string, project: any): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;

  // Admin always has access
  if (user.role === "admin") return true;

  // Check if user is a collaborator (handle projects without collaborators field)
  if (project.collaborators && project.collaborators.some((collab: any) => collab.userId === userId)) {
    return true;
  }

  // If no collaborators field, check if user is the creator (backward compatibility)
  if (!project.collaborators && project.createdBy === userId) {
    return true;
  }

  // Check visibility rules (handle projects without visibility field)
  if (!project.visibility || project.visibility === "public") return true;
  
  if (project.visibility === "workstream" && project.primaryWorkstream === user.staffStream) {
    return true;
  }

  if (project.visibility === "cross_workstream" && project.allowedWorkstreams && project.allowedWorkstreams.includes(user.staffStream)) {
    return true;
  }

  return false;
}

async function hasEditPermission(ctx: any, userId: string, project: any): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;

  // Admin always has access
  if (user.role === "admin") return true;

  // If no collaborators field, check if user is the creator (backward compatibility)
  if (!project.collaborators && project.createdBy === userId) {
    return true;
  }

  // Check if user is a collaborator with edit permissions
  if (project.collaborators) {
    const collaboration = project.collaborators.find((collab: any) => collab.userId === userId);
    if (collaboration && (collaboration.role === "owner" || collaboration.role === "editor")) {
      return true;
    }
  }

  return false;
}

// Data migration helper - run this to upgrade existing projects
export const migrateProjectsToCollaboration = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Only admins can run migrations
    if (user.role !== "admin") {
      throw new Error("Only admins can run migrations");
    }

    const allProjects = await ctx.db.query("projects").collect();
    let migrationCount = 0;

    for (const project of allProjects) {
      // Check if project needs migration (missing new fields)
      const needsMigration = !project.collaborators || !project.visibility || !project.primaryWorkstream;
      
      if (needsMigration) {
        const updates: any = {};
        
        // Add collaborators field with creator as owner
        if (!project.collaborators) {
          updates.collaborators = [
            {
              userId: project.createdBy,
              role: "owner" as const,
              addedAt: project.createdAt,
              addedBy: project.createdBy
            }
          ];
        }
        
        // Add visibility field (default to workstream)
        if (!project.visibility) {
          updates.visibility = "workstream";
        }
        
        // Add allowedWorkstreams field
        if (!project.allowedWorkstreams) {
          updates.allowedWorkstreams = [];
        }
        
        // Add primaryWorkstream field (try to get from creator's workstream)
        if (!project.primaryWorkstream) {
          const creator = await ctx.db.get(project.createdBy);
          updates.primaryWorkstream = creator?.staffStream || "general";
        }
        
        // Update authorId and authorName in updates array if missing
        if (project.updates && project.updates.length > 0) {
          const updatedUpdates = project.updates.map(update => ({
            ...update,
            authorId: update.authorId || project.createdBy,
            authorName: update.authorName || "Unknown User"
          }));
          updates.updates = updatedUpdates;
        }
        
        await ctx.db.patch(project._id, updates);
        migrationCount++;
      }
    }

    return {
      message: `Migration completed. Updated ${migrationCount} projects.`,
      migratedProjects: migrationCount
    };
  }
});