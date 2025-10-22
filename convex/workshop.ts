import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Register for the Strategic Engagement workshop
export const registerWorkshop = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    organization: v.string(),
    designation: v.string(),
    sector: v.union(
      v.literal("Health"),
      v.literal("IT/FinTech/Artificial Intelligence"),
      v.literal("Agriculture"),
      v.literal("Shipping"),
      v.literal("Infrastructure and Real Estate Development"),
      v.literal("Renewable Energy")
    )
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existingRegistration = await ctx.db
      .query("workshop_registrations")
      .withIndex("byEmail", q => q.eq("email", args.email))
      .first();

    if (existingRegistration) {
      throw new Error("Email already registered for this workshop");
    }

    // Get existing registrations to generate next number
    const existingRegistrations = await ctx.db
      .query("workshop_registrations")
      .collect();
    
    const nextNumber = existingRegistrations.length + 1;
    const registrationNumber = `PEBEC-WS-${String(nextNumber).padStart(3, "0")}`;

    // Create registration
    const registrationId = await ctx.db.insert("workshop_registrations", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      organization: args.organization,
      designation: args.designation,
      sector: args.sector,
      registrationNumber,
      createdAt: Date.now(),
      confirmedEntry: false
    });

    // Send confirmation email with Teams link
    try {
      const teamsLink = "https://events.teams.microsoft.com/event/cb1f5d0e-9c58-4cf4-864c-2a349c757217@34d3adab-44ff-4c3a-823e-719232c37595";
      const htmlContent = `
        <h2>Workshop Registration Confirmed!</h2>
        <p>Dear ${args.name},</p>
        <p>Thank you for registering for the Strategic Engagement on Business Facilitation & Investment Access workshop!</p>
        <p><strong>Registration Number:</strong> ${registrationNumber}</p>
        <p><strong>Date:</strong> Tuesday, October 14th at 11:00 AM</p>
        <p><strong>Join the workshop:</strong> <a href="${teamsLink}">Click here to join on Microsoft Teams</a></p>
        <p>Best regards,<br>PEBEC Team</p>
      `;
      
      await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
        to: args.email,
        subject: "Workshop Registration Confirmed - Strategic Engagement Workshop",
        html: htmlContent
      });
    } catch (error) {
      console.error("Failed to schedule confirmation email:", error);
      // Don't fail the registration if email fails
    }

    return { registrationId, registrationNumber };
  }
});

// Get all workshop registrations
export const listRegistrations = query({
  handler: async (ctx) => {
    const registrations = await ctx.db
      .query("workshop_registrations")
      .withIndex("byCreatedAt")
      .order("desc")
      .collect();
    
    return registrations;
  }
});

// Get registration by email
export const getRegistrationByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const registration = await ctx.db
      .query("workshop_registrations")
      .withIndex("byEmail", q => q.eq("email", email))
      .first();
    
    return registration;
  }
});

// Confirm registration entry
export const confirmRegistration = mutation({
  args: { registrationId: v.id("workshop_registrations") },
  handler: async (ctx, { registrationId }) => {
    await ctx.db.patch(registrationId, { confirmedEntry: true });
  }
});

// Export workshop registrations as Excel data
export const exportRegistrations = query({
  handler: async (ctx) => {
    const registrations = await ctx.db
      .query("workshop_registrations")
      .withIndex("byCreatedAt")
      .order("desc")
      .collect();
    
    return registrations.map(reg => ({
      "Registration Number": reg.registrationNumber,
      "Name": reg.name,
      "Email": reg.email,
      "Phone": reg.phone,
      "Organization": reg.organization,
      "Designation": reg.designation,
      "Sector": reg.sector,
      "Registration Date": new Date(reg.createdAt).toLocaleDateString(),
      "Confirmed Entry": reg.confirmedEntry ? "Yes" : "No"
    }));
  }
});

// Get registration statistics
export const getRegistrationStats = query({
  handler: async (ctx) => {
    const registrations = await ctx.db
      .query("workshop_registrations")
      .collect();
    
    const totalRegistrations = registrations.length;
    const confirmedRegistrations = registrations.filter(reg => reg.confirmedEntry).length;
    
    // Count by sector
    const sectorCounts = registrations.reduce((acc, reg) => {
      acc[reg.sector] = (acc[reg.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalRegistrations,
      confirmedRegistrations,
      pendingRegistrations: totalRegistrations - confirmedRegistrations,
      sectorCounts
    };
  }
});
