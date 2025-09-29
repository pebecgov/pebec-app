// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getAdminsForSaberReminders, getExternalCcForSaberReminders } from "./users";
import { api } from "./_generated/api";

// Nigerian states for validation
const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", 
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", 
  "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", 
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", 
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

// Initialize SABER deadlines with all the data provided
export const initializeSaberDeadlines = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can initialize SABER deadlines");
    }

    // Clear existing deadlines
    const existingDeadlines = await ctx.db.query("saber_deadlines").collect();
    for (const deadline of existingDeadlines) {
      await ctx.db.delete(deadline._id);
    }

    const now = Date.now();
    const deadlines = [
      // BERAP - Business Enabling Reforms Action Plans
      {
        dliCategory: "BERAP",
        indicator: "2024 State Business-Enabling Reforms Action Plan Progress report submitted to the State Executive Council and published online",
        deadline: new Date("2025-07-31").getTime(),
        description: "2024 State Business-Enabling Reforms Action Plan Progress report submitted to the State Executive Council and published online",
        comments: "32 States (including FCT) out of the 33 States that submitted 2024 BERAP last year have met the July 31st deadline by publishing their 2024 progress report. The outstanding State that participated alst and and has not yet shared is Kano who promised to publish online and send their links before the end of today. Rivers, Osun, Ogun and Kaduna states didnt particpate last year. However, Rivers is trying to meet the deadline.",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/berap",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "BERAP",
        indicator: "Annual State Business-Enabling Reforms Action Plan for 2026, prepared with, and including records of, private sector participation, approved by the State Executive Council and published online",
        deadline: new Date("2025-12-31").getTime(),
        description: "Annual State Business-Enabling Reforms Action Plan for 2026, prepared with, and including records of, private sector participation, approved by the State Executive Council and published online",
        comments: "",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/berap",
        createdAt: now,
        isActive: true
      },
      
      // DLI 4 - Improved Investment Promotion Environment
      {
        dliCategory: "DLI4",
        indicator: "Published on state official website: Inventory of all investment incentives (Federal and State) available in the State and the number of entities receiving State Investment Incentives",
        deadline: new Date("2025-12-31").getTime(),
        description: "Published on state official website: Inventory of all investment incentives (Federal and State) available in the State and the number of entities receiving State Investment Incentives",
        comments: "For the Inventory of all investment incentives, most states have them ready but are waiting for Year 2 verification to be complete so as to not tamper with the time stamp for the existing Inventory of all investment incentives. On the Aftercare and Retention Strategy Document, we are working with States to review the content of drafts pending publishing and the IPA's are being encouraged to update their Incentives Inventory and compile list and links of announced investments in their States.",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI4",
        createdAt: now,
        isActive: true
      },
      
      // DLI 5 - Increased Transparency of Official Fees and Procedure
      {
        dliCategory: "DLI5",
        indicator: "Atleast 75% Of Grievances Received Addressed",
        deadline: new Date("2025-12-31").getTime(),
        description: "Atleast 75% Of Grievances Received Addressed",
        comments: "",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI5",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "Atleast Two Core Regulatory Processes Published On State Official Website",
        deadline: new Date("2025-12-31").getTime(),
        description: "Atleast Two Core Regulatory Processes Published On State Official Website",
        comments: "",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI5",
        createdAt: now,
        isActive: true
      },
      
      // DLI 5 Monthly Compliance Reports
      {
        dliCategory: "DLI5",
        indicator: "January Compliance Report",
        deadline: new Date("2025-04-30").getTime(),
        description: "January Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "February Compliance Report",
        deadline: new Date("2025-05-31").getTime(),
        description: "February Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "March Compliance Report",
        deadline: new Date("2025-06-30").getTime(),
        description: "March Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "April Compliance Report",
        deadline: new Date("2025-07-31").getTime(),
        description: "April Compliance Report",
        comments: "States were reminded before and during the Nationwide Tour and via email this week to publish their monthly compliance reports , so far only 5 States have done so while some other states have promised to meet the July 31st deadline",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "May Compliance Report",
        deadline: new Date("2025-08-31").getTime(),
        description: "May Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "June Compliance Report",
        deadline: new Date("2025-09-30").getTime(),
        description: "June Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "July Complianace Report",
        deadline: new Date("2025-10-31").getTime(),
        description: "July Complianace Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "August Compliance Report",
        deadline: new Date("2025-11-30").getTime(),
        description: "August Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "September Compliance Report",
        deadline: new Date("2025-12-31").getTime(),
        description: "September Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "October Compliance Report",
        deadline: new Date("2025-12-31").getTime(),
        description: "October Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "November Compliance Report",
        deadline: new Date("2025-12-31").getTime(),
        description: "November Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI5",
        indicator: "December Compliance Report",
        deadline: new Date("2025-12-31").getTime(),
        description: "December Compliance Report",
        comments: "",
        isRecurring: true,
        recurringType: "monthly" as const,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI5/compliance",
        createdAt: now,
        isActive: true
      },
      
      // DLI 6 - Increased Transparency of Fees and Levies for Interstate Trade and Increased Exporter Certification
      {
        dliCategory: "DLI6",
        indicator: "Published on state official website: a consolidated schedule of trade-related fees and levies on inter-state movement of goods",
        deadline: new Date("2025-12-31").getTime(),
        description: "Published on state official website: a consolidated schedule of trade-related fees and levies on inter-state movement of goods",
        comments: "Only about 60% of the participating States have uploaded, while some have uploaded on a different website and some are inaccessible online. Efforts are ongoing in TAs to help State work around consolidation of fees and publishing them",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI6",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI6",
        indicator: "Report on complaints from traders and redress actions published",
        deadline: new Date("2025-12-31").getTime(),
        description: "Report on complaints from traders and redress actions published",
        comments: "Only Zamfara State has uploaded some Trader's Complaints. Some States are not clear on the template and approach and this is the basis of the TA being provided to guide them on the appropriate template",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI6",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI6",
        indicator: "A minimum of 75% of grievances received in the GRM are addressed within the specified service level agreements",
        deadline: new Date("2025-12-31").getTime(),
        description: "A minimum of 75% of grievances received in the GRM are addressed within the specified service level agreements",
        comments: "This is linked to the Trader's Complaints. Most States have not shown the evidence. This is the basis of our Technical Assistance",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI6",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI6",
        indicator: "Eliminated haulage fees and charges",
        deadline: new Date("2025-12-31").getTime(),
        description: "Eliminated haulage fees and charges",
        comments: "No State has removed Haulage Fees. Our TA is to ensure they follow the right measure (Governor's Executive Order or State Assembly's Amendment of Law) this is relative to the law establishing the codes",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI6",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI6",
        indicator: "At least 20% increase in firms in the state that obtained export certificates from NEPC from the baseline",
        deadline: new Date("2025-12-31").getTime(),
        description: "At least 20% increase in firms in the state that obtained export certificates from NEPC from the baseline",
        comments: "This will be verified only at the end of the Year from the NEPC Report. TA provided is around funding the State Committee on Export Promotion and providing sensitization, One Stop Shop for MSMEs in the various States to promote export registration",
        isRecurring: false,
        states: [], // All states
        priority: "medium" as const,
        actionUrl: "/saber_agent/dli/DLI6",
        createdAt: now,
        isActive: true
      },
      
      // DLI 8 - Quick Determination of Commercial Disputes (Small Claims Court)
      {
        dliCategory: "DLI8",
        indicator: "75% of cases disposed within 60 days as recorded by the time to disposition report",
        deadline: new Date("2025-12-31").getTime(),
        description: "75% of cases disposed within 60 days as recorded by the time to disposition report",
        comments: "",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI8",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "DLI8",
        indicator: "75% of judgments executed within 30 days as recorded by the execution reports",
        deadline: new Date("2025-12-31").getTime(),
        description: "75% of judgments executed within 30 days as recorded by the execution reports",
        comments: "",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI8",
        createdAt: now,
        isActive: true
      }
    ];

    // Insert all deadlines
    const insertedDeadlines = [];
    for (const deadline of deadlines) {
      const deadlineId = await ctx.db.insert("saber_deadlines", deadline);
      insertedDeadlines.push(deadlineId);
    }

    // Schedule initial reminders for all deadlines
    await ctx.scheduler.runAfter(0, api.saber_deadlines.scheduleAllReminders);

    return {
      success: true,
      insertedCount: insertedDeadlines.length,
      message: `Successfully initialized ${insertedDeadlines.length} SABER deadlines`
    };
  }
});

// Test version without admin check (for testing purposes)
export const initializeSaberDeadlinesTest = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing deadlines
    const existingDeadlines = await ctx.db.query("saber_deadlines").collect();
    for (const deadline of existingDeadlines) {
      await ctx.db.delete(deadline._id);
    }

    const now = Date.now();
    const deadlines = [
      // BERAP Deadlines
      {
        dliCategory: "BERAP",
        indicator: "2024 State Business-Enabling Reforms Action Plan Progress report submitted to the State Executive Council and published online",
        deadline: new Date("2025-07-31").getTime(),
        description: "2024 State Business-Enabling Reforms Action Plan Progress report submitted to the State Executive Council and published online",
        comments: "32 States (including FCT) out of the 33 States that submitted 2024 BERAP last year have met the July 31st deadline by publishing their 2024 progress report. The outstanding State that participated alst and and has not yet shared is Kano who promised to publish online and send their links before the end of today. Rivers, Osun, Ogun and Kaduna states didnt particpate last year. However, Rivers is trying to meet the deadline.",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/berap",
        createdAt: now,
        isActive: true
      },
      {
        dliCategory: "BERAP",
        indicator: "Annual State Business-Enabling Reforms Action Plan for 2026, prepared with, and including records of, private sector participation, approved by the State Executive Council and published online",
        deadline: new Date("2025-12-31").getTime(),
        description: "Annual State Business-Enabling Reforms Action Plan for 2026, prepared with, and including records of, private sector participation, approved by the State Executive Council and published online",
        comments: "",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/berap",
        createdAt: now,
        isActive: true
      },
      
      // DLI 6 - Trade Fees Schedule (Sample for testing)
      {
        dliCategory: "DLI6",
        indicator: "Published on state official website: a consolidated schedule of trade-related fees and levies on inter-state movement of goods",
        deadline: new Date("2025-12-31").getTime(),
        description: "Published on state official website: a consolidated schedule of trade-related fees and levies on inter-state movement of goods",
        comments: "Only about 60% of the participating States have uploaded, while some have uploaded on a different website and some are inaccessible online. Efforts are ongoing in TAs to help State work around consolidation of fees and publishing them",
        isRecurring: false,
        states: [], // All states
        priority: "high" as const,
        actionUrl: "/saber_agent/dli/DLI6",
        createdAt: now,
        isActive: true
      }
    ];

    // Insert sample deadlines (just 3 for testing)
    const insertedDeadlines = [];
    for (const deadline of deadlines) {
      const deadlineId = await ctx.db.insert("saber_deadlines", deadline);
      insertedDeadlines.push(deadlineId);
    }

    // Schedule initial reminders for these deadlines
    await ctx.scheduler.runAfter(0, api.saber_deadlines.scheduleAllReminders);

    return {
      success: true,
      insertedCount: insertedDeadlines.length,
      message: `Successfully initialized ${insertedDeadlines.length} SABER deadlines (test version)`
    };
  }
});

// Get all active SABER deadlines
export const getSaberDeadlines = query({
  args: {
    dliCategory: v.optional(v.string()),
    state: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("saber_deadlines")
      .withIndex("byActive", q => q.eq("isActive", true));

    if (args.dliCategory) {
      query = ctx.db.query("saber_deadlines")
        .withIndex("byCategory", q => q.eq("dliCategory", args.dliCategory!));
    }

    const deadlines = await query.collect();

    // Filter by state if specified
    if (args.state) {
      return deadlines.filter(deadline => 
        deadline.states.length === 0 || deadline.states.includes(args.state!)
      );
    }

    return deadlines;
  }
});

// Get upcoming deadlines for a SABER agent
export const getUpcomingDeadlinesForAgent = query({
  args: {
    clerkUserId: v.string(),
    daysAhead: v.optional(v.number()) // Default to 90 days
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users")
      .withIndex("byClerkUserId", q => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (!user || user.role !== "saber_agent") {
      throw new Error("User not found or not a SABER agent");
    }

    if (!user.state) {
      throw new Error("SABER agent state assignment missing");
    }

    const daysAhead = args.daysAhead || 90;
    const futureDate = Date.now() + (daysAhead * 24 * 60 * 60 * 1000);

    const allDeadlines = await ctx.db.query("saber_deadlines")
      .withIndex("byActive", q => q.eq("isActive", true))
      .collect();

    // Filter deadlines for this agent's state and upcoming timeframe
    const upcomingDeadlines = allDeadlines.filter(deadline => {
      const isRelevantToState = deadline.states.length === 0 || deadline.states.includes(user.state!);
      const isUpcoming = deadline.deadline > Date.now() && deadline.deadline <= futureDate;
      return isRelevantToState && isUpcoming;
    });

    // Sort by deadline date
    return upcomingDeadlines.sort((a, b) => a.deadline - b.deadline);
  }
});

// Schedule reminders for all active deadlines
export const scheduleAllReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const activeDeadlines = await ctx.db.query("saber_deadlines")
      .withIndex("byActive", q => q.eq("isActive", true))
      .collect();

    // Get all SABER agents
    const saberAgents = await ctx.db.query("users")
      .withIndex("byRole", q => q.eq("role", "saber_agent"))
      .collect();

    const reminderIntervals = [
      { type: "30_days", days: 30 },
      { type: "14_days", days: 14 },
      { type: "7_days", days: 7 },
      { type: "3_days", days: 3 }
    ];

    let scheduledCount = 0;

    for (const deadline of activeDeadlines) {
      for (const agent of saberAgents) {
        if (!agent.state) continue;

        // Check if deadline applies to this agent's state
        const appliesToState = deadline.states.length === 0 || deadline.states.includes(agent.state);
        if (!appliesToState) continue;

        for (const interval of reminderIntervals) {
          const reminderDate = deadline.deadline - (interval.days * 24 * 60 * 60 * 1000);
          
          // Only schedule if reminder date is in the future
          if (reminderDate > Date.now()) {
            // Check if reminder already exists
            const existingReminder = await ctx.db.query("deadline_reminders")
              .withIndex("byDeadline", q => q.eq("deadlineId", deadline._id))
              .filter(q => 
                q.and(
                  q.eq(q.field("userId"), agent._id),
                  q.eq(q.field("reminderType"), interval.type as any)
                )
              )
              .unique();

            if (!existingReminder) {
              await ctx.db.insert("deadline_reminders", {
                deadlineId: deadline._id,
                userId: agent._id,
                state: agent.state,
                reminderType: interval.type as any,
                scheduledFor: reminderDate,
                emailSent: false,
                notificationSent: false,
                createdAt: Date.now()
              });
              scheduledCount++;
            }
          }
        }
      }
    }

    return {
      success: true,
      scheduledCount,
      message: `Scheduled ${scheduledCount} deadline reminders`
    };
  }
});

// Process pending reminders (called by cron job)
export const processPendingReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all reminders that should be sent now
    const pendingReminders = await ctx.db.query("deadline_reminders")
      .withIndex("byScheduled", q => q.lte("scheduledFor", now))
      .filter(q => q.eq(q.field("sentAt"), undefined))
      .collect();

    let processedCount = 0;
    let emailCount = 0;
    let notificationCount = 0;

    for (const reminder of pendingReminders) {
      try {
        const deadline = await ctx.db.get(reminder.deadlineId);
        const user = await ctx.db.get(reminder.userId);

        if (!deadline || !user || !deadline.isActive) {
          // Mark as processed to avoid retrying
          await ctx.db.patch(reminder._id, {
            sentAt: now,
            emailSent: false,
            notificationSent: false
          });
          continue;
        }

        const daysUntilDeadline = Math.ceil((deadline.deadline - now) / (24 * 60 * 60 * 1000));
        
        // Send email notification
        if (user.email) {
          await ctx.scheduler.runAfter(0, api.saber_deadlines.sendDeadlineReminderEmail, {
            userId: user._id,
            deadlineId: deadline._id,
            daysUntilDeadline
          });
          emailCount++;
        }

        // Send in-app notification
        await ctx.scheduler.runAfter(0, api.saber_deadlines.sendDeadlineNotification, {
          userId: user._id,
          deadlineId: deadline._id,
          daysUntilDeadline
        });
        notificationCount++;

        // Mark reminder as sent
        await ctx.db.patch(reminder._id, {
          sentAt: now,
          emailSent: !!user.email,
          notificationSent: true
        });

        processedCount++;

      } catch (error) {
        console.error(`Failed to process reminder ${reminder._id}:`, error);
        
        // Mark as processed to avoid infinite retries
        await ctx.db.patch(reminder._id, {
          sentAt: now,
          emailSent: false,
          notificationSent: false
        });
      }
    }

    return {
      success: true,
      processedCount,
      emailCount,
      notificationCount,
      message: `Processed ${processedCount} reminders (${emailCount} emails, ${notificationCount} notifications)`
    };
  }
});

// Internal version for cron job
export const processPendingRemindersInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all reminders that should be sent now
    const pendingReminders = await ctx.db.query("deadline_reminders")
      .withIndex("byScheduled", q => q.lte("scheduledFor", now))
      .filter(q => q.eq(q.field("sentAt"), undefined))
      .collect();

    let processedCount = 0;
    let emailCount = 0;
    let notificationCount = 0;

    for (const reminder of pendingReminders) {
      try {
        const deadline = await ctx.db.get(reminder.deadlineId);
        const user = await ctx.db.get(reminder.userId);

        if (!deadline || !user || !deadline.isActive) {
          // Mark as processed to avoid retrying
          await ctx.db.patch(reminder._id, {
            sentAt: now,
            emailSent: false,
            notificationSent: false
          });
          continue;
        }

        const daysUntilDeadline = Math.ceil((deadline.deadline - now) / (24 * 60 * 60 * 1000));
        
        // Send email notification
        if (user.email) {
          await ctx.scheduler.runAfter(0, api.saber_deadlines.sendDeadlineReminderEmail, {
            userId: user._id,
            deadlineId: deadline._id,
            daysUntilDeadline
          });
          emailCount++;
        }

        // Send in-app notification
        await ctx.scheduler.runAfter(0, api.saber_deadlines.sendDeadlineNotification, {
          userId: user._id,
          deadlineId: deadline._id,
          daysUntilDeadline
        });
        notificationCount++;

        // Mark reminder as sent
        await ctx.db.patch(reminder._id, {
          sentAt: now,
          emailSent: !!user.email,
          notificationSent: true
        });

        processedCount++;

      } catch (error) {
        console.error(`Failed to process reminder ${reminder._id}:`, error);
        
        // Mark as processed to avoid infinite retries
        await ctx.db.patch(reminder._id, {
          sentAt: now,
          emailSent: false,
          notificationSent: false
        });
      }
    }

    return {
      success: true,
      processedCount,
      emailCount,
      notificationCount,
      message: `Processed ${processedCount} reminders (${emailCount} emails, ${notificationCount} notifications)`
    };
  }
});

// Send deadline reminder email
export const sendDeadlineReminderEmail = mutation({
  args: {
    userId: v.id("users"),
    deadlineId: v.id("saber_deadlines"),
    daysUntilDeadline: v.number()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const deadline = await ctx.db.get(args.deadlineId);

    if (!user || !deadline || !user.email) {
      return { success: false, reason: "User or deadline not found" };
    }

    // Version check for debugging
    console.log("SABER REMINDER VERSION: 2.0 - Admin CC enabled");

    const urgencyStyle = args.daysUntilDeadline <= 7 ? "background-color: #dc2626;" : 
                        args.daysUntilDeadline <= 14 ? "background-color: #ea580c;" : 
                        "background-color: #0369a1;";

    const urgencyText = args.daysUntilDeadline <= 3 ? "🚨 URGENT" :
                       args.daysUntilDeadline <= 7 ? "⚠️ CRITICAL" :
                       args.daysUntilDeadline <= 14 ? "🔔 IMPORTANT" :
                       "🔵 REMINDER";

    const deadlineDate = new Date(deadline.deadline).toLocaleDateString("en-NG", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="${urgencyStyle} color: white; padding: 20px; text-align: center;">
          <h2>${urgencyText}: SABER Deadline Reminder</h2>
          <p style="margin: 0; font-size: 18px; font-weight: bold;">${args.daysUntilDeadline} days remaining</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear <strong>${user.firstName || user.email}</strong>,</p>
          
          <p>This is a reminder about an upcoming SABER deadline for <strong>${user.state}</strong> state:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1976d2;">${deadline.indicator}</h3>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${deadline.dliCategory}</p>
            <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadlineDate}</p>
            <p style="margin: 5px 0;"><strong>Priority:</strong> ${deadline.priority.toUpperCase()}</p>
            <p style="margin: 10px 0 0 0;"><strong>Description:</strong></p>
            <p style="margin: 5px 0;">${deadline.description}</p>
            ${deadline.comments ? `<p style="margin: 10px 0 0 0;"><strong>Additional Notes:</strong></p><p style="margin: 5px 0; font-style: italic;">${deadline.comments}</p>` : ""}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pebec.gov.ng${deadline.actionUrl || '/saber_agent'}" 
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Take Action Now
            </a>
          </div>

          <p>Please ensure this requirement is completed before the deadline to maintain compliance with SABER requirements.</p>
          
          <p>If you have any questions or need assistance, please contact the PEBEC support team.</p>
        </div>
        
        <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 PEBEC | <a href="https://www.pebec.gov.ng" style="color: #1976d2;">www.pebec.gov.ng</a></p>
          <p style="margin: 5px 0 0 0;">This is an automated reminder. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    // Send email to the saber agent
    await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
      to: user.email,
      subject: `${urgencyText}: SABER Deadline - ${deadline.indicator} (${args.daysUntilDeadline} days remaining)`,
      html: emailHtml
    });

    // CC admins (including the special case admin who should only receive saber reminders)
    try {
      const allAdmins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
      const adminsForSaberReminders = getAdminsForSaberReminders(allAdmins);
      const externalCc = getExternalCcForSaberReminders();
      
      console.log(`SABER REMINDER: Found ${allAdmins.length} total admins, ${adminsForSaberReminders.length} admins for saber reminders`);
      
      const ccTargets = [
        ...adminsForSaberReminders.map(a => a.email).filter(Boolean),
        ...externalCc.map(e => e.email).filter(Boolean)
      ];

      // Ensure uniqueness
      const uniqueCcTargets = Array.from(new Set(ccTargets));

      for (const ccEmail of uniqueCcTargets) {
        if (ccEmail) {
          console.log(`SABER REMINDER: Sending CC email to: ${ccEmail}`);
          
          const adminEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #6b7280; color: white; padding: 20px; text-align: center;">
                <h2>📧 SABER Reminder CC</h2>
                <p style="margin: 0; font-size: 16px;">Admin Notification</p>
              </div>
              
              <div style="padding: 20px;">
                <p>Dear <strong>Admin</strong>,</p>
                
                <p>This is a copy of a SABER deadline reminder sent to <strong>${user.firstName || user.email}</strong> for <strong>${user.state}</strong> state:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #1976d2;">${deadline.indicator}</h3>
                  <p style="margin: 5px 0;"><strong>Category:</strong> ${deadline.dliCategory}</p>
                  <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadlineDate}</p>
                  <p style="margin: 5px 0;"><strong>Priority:</strong> ${deadline.priority.toUpperCase()}</p>
                  <p style="margin: 10px 0 0 0;"><strong>Description:</strong></p>
                  <p style="margin: 5px 0;">${deadline.description}</p>
                  ${deadline.comments ? `<p style="margin: 10px 0 0 0;"><strong>Additional Notes:</strong></p><p style="margin: 5px 0; font-style: italic;">${deadline.comments}</p>` : ""}
                </div>

                <p><strong>Recipient:</strong> ${user.firstName || user.email} (${user.state})</p>
                <p><strong>Days Remaining:</strong> ${args.daysUntilDeadline}</p>
              </div>
              
              <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">© 2025 PEBEC | <a href="https://www.pebec.gov.ng" style="color: #1976d2;">www.pebec.gov.ng</a></p>
                <p style="margin: 5px 0 0 0;">This is an automated CC notification. Please do not reply to this email.</p>
              </div>
            </div>
          `;

          await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                to: ccEmail,
            subject: `[CC] ${urgencyText}: SABER Deadline - ${deadline.indicator} (${args.daysUntilDeadline} days remaining)`,
            html: adminEmailHtml
          });
          
              console.log(`SABER REMINDER: CC email scheduled for: ${ccEmail}`);
        }
      }
    } catch (error) {
      // Log error but don't fail the entire function
      console.error("Failed to send admin CC emails:", error);
    }

    return { success: true };
  }
});

// Send deadline in-app notification
export const sendDeadlineNotification = mutation({
  args: {
    userId: v.id("users"),
    deadlineId: v.id("saber_deadlines"),
    daysUntilDeadline: v.number()
  },
  handler: async (ctx, args) => {
    const deadline = await ctx.db.get(args.deadlineId);
    
    if (!deadline) {
      return { success: false, reason: "Deadline not found" };
    }

    const urgencyEmoji = args.daysUntilDeadline <= 3 ? "🚨" :
                        args.daysUntilDeadline <= 7 ? "⚠️" :
                        args.daysUntilDeadline <= 14 ? "🔔" :
                        "🔵";

    const priorityStyle = args.daysUntilDeadline <= 7 ? "bg-red-50 border-l-4 border-red-500" :
                         args.daysUntilDeadline <= 14 ? "bg-orange-50 border-l-4 border-orange-500" :
                         "bg-blue-50 border-l-4 border-blue-500";

    const deadlineDate = new Date(deadline.deadline).toLocaleDateString("en-NG", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    await ctx.db.insert("notifications", {
      userId: args.userId,
      message: `${urgencyEmoji} ${args.daysUntilDeadline <= 3 ? 'URGENT' : args.daysUntilDeadline <= 7 ? 'Critical' : 'Early'} Reminder: ${deadline.indicator} due in ${args.daysUntilDeadline} days (Status: Pending Action)`,
      isRead: false,
      createdAt: Date.now(),
      type: "dli_reminder",
      actionUrl: deadline.actionUrl,
      dliCategory: deadline.dliCategory,
      dliDeadline: deadline.deadline,
      dliItemName: deadline.indicator,
      reminderDate: Date.now(),
      style: priorityStyle,
      metadata: {
        daysRemaining: args.daysUntilDeadline,
        deadline: deadlineDate,
        state: (await ctx.db.get(args.userId))?.state || "",
        status: "Pending Action"
      }
    });

    return { success: true };
  }
});

// Admin function to manually trigger reminder processing (for testing)
export const triggerReminderProcessing = mutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can manually trigger reminder processing");
    }

    await ctx.scheduler.runAfter(0, api.saber_deadlines.processPendingReminders);
    return { success: true, message: "Reminder processing triggered successfully" };
  }
});

// Get reminder statistics for admin dashboard
export const getReminderStatistics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can view reminder statistics");
    }

    const totalDeadlines = await ctx.db.query("saber_deadlines")
      .withIndex("byActive", q => q.eq("isActive", true))
      .collect();

    const totalReminders = await ctx.db.query("deadline_reminders").collect();
    
    const sentReminders = totalReminders.filter(r => r.sentAt);
    const pendingReminders = totalReminders.filter(r => !r.sentAt && r.scheduledFor <= Date.now());
    const futureReminders = totalReminders.filter(r => !r.sentAt && r.scheduledFor > Date.now());

    const saberAgents = await ctx.db.query("users")
      .withIndex("byRole", q => q.eq("role", "saber_agent"))
      .collect();

    return {
      totalDeadlines: totalDeadlines.length,
      totalReminders: totalReminders.length,
      sentReminders: sentReminders.length,
      pendingReminders: pendingReminders.length,
      futureReminders: futureReminders.length,
      saberAgents: saberAgents.length,
      activeStates: [...new Set(saberAgents.map(a => a.state).filter(Boolean))].length
    };
  }
});

// Admin function to trigger custom reminders
export const triggerCustomReminder = mutation({
  args: {
    deadlineId: v.id("saber_deadlines"),
    reminderType: v.union(
      v.literal("30_days"), 
      v.literal("14_days"), 
      v.literal("7_days"), 
      v.literal("3_days"),
      v.literal("custom")
    ),
    customMessage: v.optional(v.string()),
    triggerDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can trigger custom reminders");
    }

    const deadline = await ctx.db.get(args.deadlineId);
    if (!deadline) {
      throw new Error("Deadline not found");
    }

    const saberAgents = await ctx.db.query("users")
      .withIndex("byRole", q => q.eq("role", "saber_agent"))
      .collect();

    let processedCount = 0;
    const triggerTime = args.triggerDate || Date.now();

    console.log(`Custom reminder: Found ${saberAgents.length} SABER agents total`);
    
    for (const agent of saberAgents) {
      // Send to ALL SABER agents regardless of state for custom reminders
      // (Remove state filtering to ensure all agents get custom reminders)
      console.log(`Processing agent: ${agent.email} (${agent.firstName || 'No name'}) - State: ${agent.state || 'No state'}`);

      const daysUntilDeadline = Math.ceil((deadline.deadline - triggerTime) / (24 * 60 * 60 * 1000));
      
      // Send custom email notification immediately (no scheduler) and CC admins
      if (agent.email) {
        console.log(`Sending email to SABER agent: ${agent.email}`);
        try {
          const urgencyStyle = daysUntilDeadline <= 7 ? "background-color: #dc2626;" : 
                              daysUntilDeadline <= 14 ? "background-color: #ea580c;" : 
                              "background-color: #0369a1;";

          const urgencyText = args.reminderType === "custom" ? "📢 REMINDER" : (
            daysUntilDeadline <= 3 ? "🚨 URGENT" :
            daysUntilDeadline <= 7 ? "⚠️ CRITICAL" :
            daysUntilDeadline <= 14 ? "🔔 IMPORTANT" :
            "🔵 REMINDER"
          );

          const deadlineDate = new Date(deadline.deadline).toLocaleDateString("en-NG", {
            timeZone: "Africa/Lagos",
            year: "numeric",
            month: "long",
            day: "numeric"
          });

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <div style="${urgencyStyle} color: white; padding: 20px; text-align: center;">
                <h2>${urgencyText}: SABER Deadline Reminder</h2>
                <p style="margin: 0; font-size: 18px; font-weight: bold;">${daysUntilDeadline} days remaining</p>
              </div>
              
              <div style="padding: 20px;">
                <p>Dear <strong>${agent.firstName || agent.email}</strong>,</p>
                ${args.customMessage ? `<p style="margin: 5px 0;"><strong>Admin Message:</strong> ${args.customMessage}</p>` : ""}
                <p>This is a reminder about an upcoming SABER deadline for <strong>${agent.state}</strong> state:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #1976d2;">${deadline.indicator}</h3>
                  <p style="margin: 5px 0;"><strong>Category:</strong> ${deadline.dliCategory}</p>
                  <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadlineDate}</p>
                  <p style="margin: 5px 0;"><strong>Priority:</strong> ${deadline.priority.toUpperCase()}</p>
                  <p style="margin: 10px 0 0 0;"><strong>Description:</strong></p>
                  <p style="margin: 5px 0;">${deadline.description}</p>
                  ${deadline.comments ? `<p style="margin: 10px 0 0 0;"><strong>Additional Notes:</strong></p><p style="margin: 5px 0; font-style: italic;">${deadline.comments}</p>` : ""}
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://pebec.gov.ng${deadline.actionUrl || '/saber_agent'}" 
                     style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Take Action Now
                  </a>
                </div>

                <p>Please ensure this requirement is completed before the deadline to maintain compliance with SABER requirements.</p>
                
                <p>If you have any questions or need assistance, please contact the PEBEC support team.</p>
              </div>
              
              <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">© 2025 PEBEC | <a href="https://www.pebec.gov.ng" style="color: #1976d2;">www.pebec.gov.ng</a></p>
                <p style="margin: 5px 0 0 0;">This is an automated reminder. Please do not reply to this email.</p>
              </div>
            </div>
          `;

          // Send email to the saber agent
          console.log(`Scheduling email for agent: ${agent.email}`);
          await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
            to: agent.email,
            subject: `${urgencyText}: SABER Deadline - ${deadline.indicator} (${daysUntilDeadline} days remaining)`,
            html: emailHtml
          });
          console.log(`Email scheduled successfully for agent: ${agent.email}`);

          // CC admins and external recipients for this agent's email
          try {
            const allAdmins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
            const adminsForSaberReminders = getAdminsForSaberReminders(allAdmins);
            const externalCc = getExternalCcForSaberReminders();

            const ccTargets = [
              ...adminsForSaberReminders.map(a => a.email).filter(Boolean),
              ...externalCc.map(e => e.email).filter(Boolean)
            ];
            const uniqueCcTargets = Array.from(new Set(ccTargets));

            for (const ccEmail of uniqueCcTargets) {
              if (!ccEmail) continue;
              const adminEmailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #6b7280; color: white; padding: 20px; text-align: center;">
                    <h2>📧 SABER Reminder CC</h2>
                    <p style="margin: 0; font-size: 16px;">Admin Notification</p>
                  </div>
                  
                  <div style="padding: 20px;">
                    <p>Dear <strong>Admin</strong>,</p>
                    
                    <p>This is a copy of a SABER deadline reminder sent to <strong>${agent.firstName || agent.email}</strong> for <strong>${agent.state}</strong> state:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #1976d2;">${deadline.indicator}</h3>
                      <p style="margin: 5px 0;"><strong>Category:</strong> ${deadline.dliCategory}</p>
                      <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadlineDate}</p>
                      <p style="margin: 5px 0;"><strong>Priority:</strong> ${deadline.priority.toUpperCase()}</p>
                      <p style="margin: 10px 0 0 0;"><strong>Description:</strong></p>
                      <p style="margin: 5px 0;">${deadline.description}</p>
                      ${deadline.comments ? `<p style="margin: 10px 0 0 0;"><strong>Additional Notes:</strong></p><p style="margin: 5px 0; font-style: italic;">${deadline.comments}</p>` : ""}
                    </div>
    
                    <p><strong>Recipient:</strong> ${agent.firstName || agent.email} (${agent.state})</p>
                    <p><strong>Days Remaining:</strong> ${daysUntilDeadline}</p>
                    ${args.customMessage ? `<p><strong>Admin Message:</strong> ${args.customMessage}</p>` : ""}
                  </div>
                  
                  <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">© 2025 PEBEC | <a href="https://www.pebec.gov.ng" style="color: #1976d2;">www.pebec.gov.ng</a></p>
                    <p style="margin: 5px 0 0 0;">This is an automated CC notification. Please do not reply to this email.</p>
                  </div>
                </div>
              `;

              await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                to: ccEmail,
                subject: `[CC] ${urgencyText}: SABER Deadline - ${deadline.indicator} (${daysUntilDeadline} days remaining)`,
                html: adminEmailHtml
              });
            }
          } catch (err) {
            console.error("Failed to send admin CC emails:", err);
          }
        } catch (error) {
          console.error(`Failed to send custom reminder email to ${agent.email}:`, error);
          // Continue processing other agents even if one fails
        }
      } else {
        console.log(`Skipping agent with no email: ${agent._id} (${agent.firstName || 'No name'})`);
      }

      // Send custom in-app notification
      const urgencyEmoji = args.reminderType === "custom" ? "📢" :
                          daysUntilDeadline <= 3 ? "🚨" :
                          daysUntilDeadline <= 7 ? "⚠️" :
                          daysUntilDeadline <= 14 ? "🔔" :
                          "🔵";

      const priorityStyle = args.reminderType === "custom" ? "bg-purple-50 border-l-4 border-purple-500" :
                           daysUntilDeadline <= 7 ? "bg-red-50 border-l-4 border-red-500" :
                           daysUntilDeadline <= 14 ? "bg-orange-50 border-l-4 border-orange-500" :
                           "bg-blue-50 border-l-4 border-blue-500";

      const deadlineDate = new Date(deadline.deadline).toLocaleDateString("en-NG", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      await ctx.db.insert("notifications", {
        userId: agent._id,
        message: args.customMessage || `${urgencyEmoji} Admin triggered reminder: ${deadline.indicator} (${daysUntilDeadline} days remaining)`,
        isRead: false,
        createdAt: Date.now(),
        type: "dli_reminder_custom",
        actionUrl: deadline.actionUrl,
        dliCategory: deadline.dliCategory,
        dliDeadline: deadline.deadline,
        dliItemName: deadline.indicator,
        reminderDate: Date.now(),
        style: priorityStyle,
        metadata: {
          daysRemaining: daysUntilDeadline,
          deadline: deadlineDate,
          state: agent.state,
          status: "Admin Triggered",
          reminderType: args.reminderType
        }
      });

      processedCount++;
    }

    return {
      success: true,
      processedCount,
      message: `Custom reminder sent to ${processedCount} SABER agents`
    };
  }
});

// Admin function to get all deadlines for management
export const getAllDeadlinesForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can view all deadlines");
    }

    const deadlines = await ctx.db.query("saber_deadlines").collect();
    
    // Get reminder counts for each deadline
    const deadlinesWithStats = await Promise.all(deadlines.map(async (deadline) => {
      const reminders = await ctx.db.query("deadline_reminders")
        .withIndex("byDeadline", q => q.eq("deadlineId", deadline._id))
        .collect();
      
      const stats = {
        totalReminders: reminders.length,
        sentReminders: reminders.filter(r => r.sentAt).length,
        pendingReminders: reminders.filter(r => !r.sentAt && r.scheduledFor <= Date.now()).length,
        futureReminders: reminders.filter(r => !r.sentAt && r.scheduledFor > Date.now()).length
      };

      return {
        ...deadline,
        stats
      };
    }));

    return deadlinesWithStats.sort((a, b) => a.deadline - b.deadline);
  }
});

// Test function to verify admin CC logic is working
export const testAdminCCLogic = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can test this function");
    }

    // Get all admins + external CCs
    const allAdmins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
    const adminsForSaberReminders = getAdminsForSaberReminders(allAdmins);
    const externalCc = getExternalCcForSaberReminders();

    const ccTargets = [
      ...adminsForSaberReminders.map(a => a.email).filter(Boolean),
      ...externalCc.map(e => e.email).filter(Boolean)
    ];
    const uniqueCcTargets = Array.from(new Set(ccTargets));

                console.log(`Test: Found ${allAdmins.length} total admins, ${adminsForSaberReminders.length} admins for saber reminders, ${externalCc.length} external CCs`);
    console.log(`Test: Admin emails:`, adminsForSaberReminders.map(a => a.email));
    console.log(`Test: External CC emails:`, externalCc);
    console.log(`Test: All CC emails:`, uniqueCcTargets);

    // Send a test email to each CC target
    for (const ccEmail of uniqueCcTargets) {
        await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
        to: ccEmail!,
        subject: `[TEST] Admin/External CC Logic Test`,
        html: `<p>This is a test email to verify that the admin/external CC logic is working correctly.</p>
               <p>Email: ${ccEmail}</p>
                 <p>Time: ${new Date().toISOString()}</p>`
        });
    }

    return {
      success: true,
      totalAdmins: allAdmins.length,
      saberReminderAdmins: adminsForSaberReminders.length,
      adminEmails: adminsForSaberReminders.map(a => a.email)
    };
  }
});

// Get list of people who have received reminders for a specific deadline
export const getDeadlineReminderRecipients = query({
  args: {
    deadlineId: v.id("saber_deadlines")
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can view reminder recipients");
    }

    // Get all reminders for this deadline that have been sent
    const sentReminders = await ctx.db.query("deadline_reminders")
      .withIndex("byDeadline", q => q.eq("deadlineId", args.deadlineId))
      .filter(q => q.neq(q.field("sentAt"), undefined))
      .collect();

    // Get user details for each reminder
    const recipients = await Promise.all(
      sentReminders.map(async (reminder) => {
        const user = await ctx.db.get(reminder.userId);
        return {
          reminderId: reminder._id,
          userId: reminder.userId,
          userEmail: user?.email || "Unknown",
          userName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown",
          state: reminder.state,
          reminderType: reminder.reminderType,
          sentAt: reminder.sentAt,
          emailSent: reminder.emailSent,
          notificationSent: reminder.notificationSent,
          scheduledFor: reminder.scheduledFor
        };
      })
    );

    // Sort by sent date (most recent first)
    recipients.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));

    return {
      deadlineId: args.deadlineId,
      totalRecipients: recipients.length,
      recipients: recipients
    };
  }
});

// Get reminder statistics for a specific deadline
export const getDeadlineReminderStats = query({
  args: {
    deadlineId: v.id("saber_deadlines")
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can view reminder statistics");
    }

    // Get all reminders for this deadline
    const allReminders = await ctx.db.query("deadline_reminders")
      .withIndex("byDeadline", q => q.eq("deadlineId", args.deadlineId))
      .collect();

    const sentReminders = allReminders.filter(r => r.sentAt);
    const pendingReminders = allReminders.filter(r => !r.sentAt && r.scheduledFor <= Date.now());
    const futureReminders = allReminders.filter(r => !r.sentAt && r.scheduledFor > Date.now());

    // Group by reminder type
    const byType = {
      "30_days": allReminders.filter(r => r.reminderType === "30_days"),
      "14_days": allReminders.filter(r => r.reminderType === "14_days"),
      "7_days": allReminders.filter(r => r.reminderType === "7_days"),
      "3_days": allReminders.filter(r => r.reminderType === "3_days")
    };

    // Group by state
    const byState = allReminders.reduce((acc, reminder) => {
      const state = reminder.state;
      if (!acc[state]) {
        acc[state] = { total: 0, sent: 0, pending: 0, future: 0 };
      }
      acc[state].total++;
      if (reminder.sentAt) {
        acc[state].sent++;
      } else if (reminder.scheduledFor <= Date.now()) {
        acc[state].pending++;
      } else {
        acc[state].future++;
      }
      return acc;
    }, {} as Record<string, { total: number; sent: number; pending: number; future: number }>);

    return {
      deadlineId: args.deadlineId,
      totalReminders: allReminders.length,
      sentReminders: sentReminders.length,
      pendingReminders: pendingReminders.length,
      futureReminders: futureReminders.length,
      byType: {
        "30_days": { total: byType["30_days"].length, sent: byType["30_days"].filter(r => r.sentAt).length },
        "14_days": { total: byType["14_days"].length, sent: byType["14_days"].filter(r => r.sentAt).length },
        "7_days": { total: byType["7_days"].length, sent: byType["7_days"].filter(r => r.sentAt).length },
        "3_days": { total: byType["3_days"].length, sent: byType["3_days"].filter(r => r.sentAt).length }
      },
      byState: byState
    };
  }
});