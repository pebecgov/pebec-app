import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { api } from "./_generated/api";

// ✅ Create DLI with PDF Guide
export const createDliTemplate = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    guideFileId: v.id("_storage"), // ✅ Guide File
    guideFileName: v.string(),
    guideFileUrl: v.string(),
    steps: v.array(v.string()), // ✅ New: Accept steps
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);  

    return await ctx.db.insert("dli_templates", {
      ...args,
      createdBy: user._id,
      createdAt: Date.now(),
      steps: args.steps || [], // ✅ Ensure steps are provided (or empty array)
    });
  },
});



export const updateDliTemplate = mutation({
  args: {
    id: v.id("dli_templates"),
    title: v.string(),
    description: v.string(),
    guideFileId: v.id("_storage"),
    guideFileUrl: v.string(),
    guideFileName: v.string(),
    steps: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
      guideFileId: args.guideFileId,
      guideFileUrl: args.guideFileUrl,
      guideFileName: args.guideFileName,
      steps: args.steps,
    });
  },
});


// ✅ Get All DLI Templates
export const getAllDliTemplates = query({
  handler: async (ctx) => {
    return await ctx.db.query("dli_templates").collect();
  },
});

// ✅ Delete DLI Template
export const deleteDliTemplate = mutation({
  args: { id: v.id("dli_templates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});


export const getStorageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});



// ✅ Start a new DLI progress tracking
export const startDLI = mutation({
  args: {
    dliTemplateId: v.id("dli_templates"),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (!args.state) throw new Error("State is missing");

    const existingProgress = await ctx.db
      .query("dli_progress")
      .withIndex("byUserAndDLI", (q) =>
        q.eq("userId", user._id).eq("dliTemplateId", args.dliTemplateId)
      )
      .first();

    if (existingProgress) {
      throw new Error("DLI already started");
    }

    const progressId = await ctx.db.insert("dli_progress", {
      userId: user._id,
      dliTemplateId: args.dliTemplateId,
      totalSteps: 0,
      completedSteps: 0,
      state: args.state,
      steps: [],
      status: "in_progress",
      createdAt: Date.now(),
    });

    const template = await ctx.db.get(args.dliTemplateId);
    const dliTitle = template?.title || "Untitled DLI";

    // ✅ Notify the state governor
    const governor = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "state_governor"))
      .collect()
      .then((users) => users.find((u) => u.state === args.state));

    if (governor) {
      await ctx.db.insert("notifications", {
        userId: governor._id,
        message: `A new DLI "${dliTitle}" has been started by ${user.firstName || user.email} in ${args.state}`,
        isRead: false,
        createdAt: Date.now(),
        type: "dli_started",
      });

      // ✅ Email to governor
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0047AB; color: white; padding: 20px; text-align: center;">
            <h2>New DLI Activity in ${args.state}</h2>
          </div>
          <div style="padding: 20px;">
            <p>Dear <strong>Governor of ${args.state}</strong>,</p>
            <p>The DLI<strong>"${dliTitle}"</strong> has just been initiated by:</p>
            <ul>
              <li><strong>Reform Champion:</strong> ${user.firstName || ""} ${user.lastName || ""}</li>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>State:</strong> ${args.state}</li>
            </ul>
            <p>This marks the beginning of reform monitoring for this DLI. You can view the status in your dashboard.</p>
           
          </div>
          <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px;">
            <p>© 2025 PEBEC GOV | <a href="https://www.pebec.gov.ng" style="color: #0047AB;">www.pebec.gov.ng</a></p>
          </div>
        </div>
      `;

      await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
        to: governor.email,
        subject: `New DLI Started in ${args.state}`,
        html: emailBody,
      });
    }

    // ✅ Notify all admins
    const admins = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        message: `A new DLI "${dliTitle}" has been started by ${user.firstName || user.email} in ${args.state}`,
        isRead: false,
        createdAt: Date.now(),
        type: "dli_started",
      });
    }

    return { success: true, progressId };
  },
});



// ✅ Set up steps for a DLI
export const setupSteps = mutation({
  args: {
    dliTemplateId: v.id("dli_templates"),
    steps: v.array(v.object({ title: v.string(), completed: v.boolean() })), // ✅ Store Step Names
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Get current progress
    const progress = await ctx.db
      .query("dli_progress")
      .withIndex("byUserAndDLI", (q) =>
        q.eq("userId", user._id).eq("dliTemplateId", args.dliTemplateId)
      )
      .first();

    if (!progress) throw new Error("DLI not started yet.");

    if (args.steps.length < progress.completedSteps) {
      throw new Error("Cannot set fewer steps than completed steps.");
    }

    // ✅ Store Named Steps
    return await ctx.db.patch(progress._id, {
      totalSteps: args.steps.length,
      steps: args.steps, // ✅ Store named steps
      status: "in_progress",
      updatedAt: Date.now(),
    });
  },
});


export const completeStep = mutation({
  args: {
    dliTemplateId: v.id("dli_templates"),
    stepTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // ✅ Get current DLI progress
    const progress = await ctx.db
      .query("dli_progress")
      .withIndex("byUserAndDLI", (q) =>
        q.eq("userId", user._id).eq("dliTemplateId", args.dliTemplateId)
      )
      .first();

    if (!progress) throw new Error("DLI not started yet.");
    if (progress.completedSteps >= progress.totalSteps) {
      throw new Error("All steps already completed.");
    }

    // ✅ Update steps
    const updatedSteps = progress.steps.map((step) =>
      step.title === args.stepTitle
        ? { ...step, completed: true, completedAt: Date.now() }
        : step
    );

    const completedCount = updatedSteps.filter((s) => s.completed).length;
    const newStatus = completedCount === progress.totalSteps ? "completed" : "in_progress";

    await ctx.db.patch(progress._id, {
      steps: updatedSteps,
      completedSteps: completedCount,
      status: newStatus,
      updatedAt: Date.now(),
    });

    // ✅ Get DLI Template
    const dliTemplate = await ctx.db.get(args.dliTemplateId);
    if (!dliTemplate) throw new Error("DLI Template not found");

    // ✅ Find governor by state
    const governor = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "state_governor"))
      .collect()
      .then(govs => govs.find(g => g.state === progress.state));

    if (!governor) {
      console.log("❌ No state governor found for state:", progress.state);
      return;
    }

    // ✅ In-app notification
    await ctx.db.insert("notifications", {
      userId: governor._id,
      message: `Reform Champion completed step "${args.stepTitle}" in DLI "${dliTemplate.title}".`,
      isRead: false,
      createdAt: Date.now(),
      type: "dli_step_completed",
    });

    // ✅ Styled email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: #1976d2; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
          <strong>DLI Step Completed</strong>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${governor.firstName || "Governor"},</p>
          <p>The Reform Champion assigned for <strong>${progress.state}</strong> state has completed the step:</p>
          <p><strong>DLI:</strong> ${dliTemplate.title}</p>
          <p><strong>Step:</strong> ${args.stepTitle}</p>
          <p>You can view progress in your dashboard.</p>
        </div>
        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
          <p>© 2025 PEBEC GOV. | <a href="https://www.pebec.gov.ng" style="color: #1976d2;">Visit Dashboard</a></p>
        </div>
      </div>
    `;

    await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
      to: governor.email,
      subject: `Citizen Completed Step in DLI: ${dliTemplate.title}`,
      html: emailHtml,
    });

    console.log(`📧 Notification + Email sent to governor (${governor.email})`);

    return { success: true };
  },
});


export const getStateDLIs = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    // ✅ Fetch all users in the given state
    const usersInState = await ctx.db
      .query("users")
      .withIndex("byState", (q) => q.eq("state", args.state))
      .collect();

    if (!usersInState.length) return []; // ✅ No users found in the state

    const userIds = usersInState.map((user) => user._id);

    // ✅ Fetch all DLI progress for each user using `Promise.all`
    const allDLIs = await Promise.all(
      userIds.map(async (userId) => {
        return await ctx.db
          .query("dli_progress")
          .withIndex("byUserAndDLI", (q) => q.eq("userId", userId)) // ✅ Fetch DLIs per user
          .collect();
      })
    );

    // ✅ Flatten the results since `Promise.all()` returns an array of arrays
    const stateDLIs = allDLIs.flat();

    if (!stateDLIs.length) return []; // ✅ No DLIs found

    // ✅ Fetch all DLI Templates & Users
    const dliTemplates = await ctx.db.query("dli_templates").collect();
    const users = await ctx.db.query("users").collect();

    return stateDLIs.map((dli) => {
      const dliTemplate = dliTemplates.find((t) => t._id === dli.dliTemplateId);
      const startedByUser = users.find((u) => u._id === dli.userId);

      return {
        ...dli,
        dliTitle: dliTemplate?.title || "Unknown DLI", // ✅ Attach DLI Title
        startedBy: startedByUser
          ? `${startedByUser.firstName} ${startedByUser.lastName}`
          : "Unknown", // ✅ Attach Started By User
      };
    });
  },
});

export const getDliProgressById = query({
  args: { id: v.id("dli_progress") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});


// ✅ Get User's DLI Progress
export const getUserDLIProgress = query({
  args: { dliTemplateId: v.id("dli_templates") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("dli_progress")
      .withIndex("byUserAndDLI", (q) =>
        q.eq("userId", user._id).eq("dliTemplateId", args.dliTemplateId)
      )
      .first();
  },
});


// ✅ Fetch a DLI Template by ID
export const getDliTemplate = query({
  args: { id: v.id("dli_templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});


export const getAllUserDLIProgress = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("dli_progress")
      .withIndex("byUserAndDLI", (q) => q.eq("userId", user._id))
      .collect();
  },
});



// ✅ Edit Steps (Cannot reduce below completed steps)
export const editSteps = mutation({
  args: { dliProgressId: v.id("dli_progress"), steps: v.array(v.object({ title: v.string(), completed: v.boolean() })) },
  handler: async (ctx, { dliProgressId, steps }) => {
    const progress = await ctx.db.get(dliProgressId);

    if (!progress) throw new Error("DLI progress not found");

    if (steps.length < progress.completedSteps) {
      throw new Error("Cannot reduce steps below completed steps!");
    }

    // ✅ Preserve completion status of already completed steps
    const updatedSteps = steps.map((step) => {
      const existingStep = progress.steps.find((s) => s.title === step.title);
      return { ...step, completed: existingStep?.completed || false };
    });

    await ctx.db.patch(dliProgressId, {
      totalSteps: steps.length,
      steps: updatedSteps,
    });
  },
});



export const confirmEC = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    await ctx.db.patch(user._id, {
      ecConfirmed: true,
    });

    return { success: true };
  },
});



export const getAllStateDLIs = query({
  handler: async (ctx) => {
    const dliProgressList = await ctx.db.query("dli_progress").collect();
    const dliTemplates = await ctx.db.query("dli_templates").collect();
    const users = await ctx.db.query("users").collect();

    return dliProgressList.map((dli) => {
      const dliTemplate = dliTemplates.find((t) => t._id === dli.dliTemplateId);
      const user = users.find((u) => u._id === dli.userId);

      return {
        ...dli,
        dliTitle: dliTemplate?.title ?? "Unknown DLI",
        startedBy: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
        userState: user?.state ?? "Unknown",
        status: dli.status, // ✅ Include completion status
      };
    });
  },
});


export const getAllDLITitles = query({
  handler: async (ctx) => {
    const templates = await ctx.db.query("dli_templates").collect();
    return templates.map((t) => t.title);
  },
});




export const getStateDLIsReformChampion = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    // ✅ Filter DLIs based on actual state recorded in dli_progress
    const stateDLIs = await ctx.db
      .query("dli_progress")
      .withIndex("byState", (q) => q.eq("state", args.state))
      .collect();

    if (!stateDLIs.length) return [];

    const dliTemplates = await ctx.db.query("dli_templates").collect();
    const users = await ctx.db.query("users").collect();

    return stateDLIs.map((dli) => {
      const dliTemplate = dliTemplates.find((t) => t._id === dli.dliTemplateId);
      const user = users.find((u) => u._id === dli.userId);

      return {
        ...dli,
        dliTitle: dliTemplate?.title || "Unknown DLI",
        startedBy: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
      };
    });
  },
});
