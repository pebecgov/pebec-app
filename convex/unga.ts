// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation } from "./_generated/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    org: v.string()
  },
  handler: async (ctx, { name, email, phone, org }) => {
    // Get or create counter for UNGA registrations
    const counter = await ctx.db
      .query("counters")
      .withIndex("byName", q => q.eq("name", "unga_registrations"))
      .unique();

    let currentValue = 0;
    if (!counter) {
      const id = await ctx.db.insert("counters", { name: "unga_registrations", value: 0 });
      const created = await ctx.db.get(id);
      currentValue = created?.value ?? 0;
    } else {
      currentValue = counter.value;
    }

    const assignedNumber = currentValue + 1;

    // Update counter
    const counterDoc = counter
      ? counter
      : await ctx.db
          .query("counters")
          .withIndex("byName", q => q.eq("name", "unga_registrations"))
          .unique();

    if (counterDoc) {
      await ctx.db.patch(counterDoc._id, { value: assignedNumber });
    }

    // Insert registration
    const now = Date.now();
    await ctx.db.insert("unga_registrations", {
      name,
      email,
      phone,
      org,
      assignedNumber,
      createdAt: now
    });

    return { assignedNumber };
  }
});

export const listRegistrations = query({
  args: {},
  handler: async (ctx) => {
    const regs = await ctx.db.query("unga_registrations").withIndex("byCreatedAt").order("desc").collect();
    return regs;
  }
});

export const toggleConfirmed = mutation({
  args: {
    registrationId: v.id("unga_registrations"),
    confirmed: v.boolean()
  },
  handler: async (ctx, { registrationId, confirmed }) => {
    await ctx.db.patch(registrationId, { confirmedEntry: confirmed });
  }
});


