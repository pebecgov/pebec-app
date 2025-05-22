// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
    steps: v.array(v.object({
      title: v.string(),
      completed: v.boolean()
    }))
  },
  handler: async (ctx, {
    name,
    description,
    createdBy,
    steps
  }) => {
    const createdAt = Date.now();
    await ctx.db.insert("projects", {
      name,
      description,
      createdBy,
      status: "open",
      progress: 0,
      steps,
      updates: [],
      createdAt
    });
  }
});
export const addStep = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string()
  },
  handler: async (ctx, {
    projectId,
    title
  }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    const newSteps = [...project.steps, {
      title,
      completed: false
    }];
    const completedCount = newSteps.filter(s => s.completed).length;
    const progress = completedCount / newSteps.length * 100;
    await ctx.db.patch(projectId, {
      steps: newSteps,
      progress
    });
    const newStatus = completedCount === newSteps.length ? "completed" : completedCount > 0 ? "in_progress" : "open";
    if (newStatus !== project.status) {
      await ctx.db.patch(projectId, {
        status: newStatus
      });
    }
  }
});
export const toggleStep = mutation({
  args: {
    projectId: v.id("projects"),
    index: v.number()
  },
  handler: async (ctx, {
    projectId,
    index
  }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    const steps = [...project.steps];
    steps[index].completed = !steps[index].completed;
    const progress = steps.filter(s => s.completed).length / steps.length * 100;
    await ctx.db.patch(projectId, {
      steps,
      progress
    });
  }
});
export const addUpdate = mutation({
  args: {
    projectId: v.id("projects"),
    text: v.string()
  },
  handler: async (ctx, {
    projectId,
    text
  }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    const updates = [{
      text,
      timestamp: Date.now()
    }, ...project.updates];
    await ctx.db.patch(projectId, {
      updates
    });
  }
});
export const getMyProjects = query({
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.query("projects").withIndex("byCreatedBy", q => q.eq("createdBy", user._id)).collect();
  }
});
export const getProjectById = query({
  args: {
    projectId: v.id("projects")
  },
  handler: async (ctx, {
    projectId
  }) => {
    return await ctx.db.get(projectId);
  }
});
export const deleteStep = mutation({
  args: {
    projectId: v.id("projects"),
    index: v.number()
  },
  handler: async (ctx, {
    projectId,
    index
  }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    const steps = [...project.steps];
    steps.splice(index, 1);
    const progress = steps.length === 0 ? 0 : steps.filter(s => s.completed).length / steps.length * 100;
    await ctx.db.patch(projectId, {
      steps,
      progress
    });
  }
});
export const deleteProject = mutation({
  args: {
    projectId: v.id("projects")
  },
  handler: async (ctx, {
    projectId
  }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    await ctx.db.delete(projectId);
  }
});
export const updateProjectStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("completed"))
  },
  handler: async (ctx, {
    projectId,
    status
  }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    await ctx.db.patch(projectId, {
      status
    });
  }
});
export const getAllProjects = query(async ctx => {
  return await ctx.db.query("projects").collect();
});