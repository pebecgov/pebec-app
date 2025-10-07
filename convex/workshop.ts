import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
      v.literal("Aviation"),
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

    // Get or create counter for workshop registrations
    let counter = await ctx.db
      .query("counters")
      .withIndex("byName", q => q.eq("name", "workshop_registrations"))
      .first();

    if (!counter) {
      const id = await ctx.db.insert("counters", { name: "workshop_registrations", value: 0 });
      counter = await ctx.db.get(id);
    }

    // Increment counter and generate registration number
    const newValue = (counter?.value || 0) + 1;
    await ctx.db.patch(counter!._id, { value: newValue });
    
    const registrationNumber = `PEBEC-WS-${String(newValue).padStart(3, "0")}`;

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
