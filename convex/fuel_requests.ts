//@ts-nocheck

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { isAuthorizedTaskAdmin } from "../lib/authorizedTaskAdmins";

const driverKeyValidator = v.union(
  v.literal("dawi_ezra"),
  v.literal("nathan_james"),
  v.literal("seidu_isah")
);

function todayYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Admin (designated emails): all fuel requests, newest first. */
export const listFuelRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!isAuthorizedTaskAdmin(user)) {
      return [];
    }
    return await ctx.db.query("fuel_requests").order("desc").collect();
  },
});

/** Reception staff: all fuel requests (to enter price after approval). */
export const listFuelRequestsForReception = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "staff" || user.staffStream !== "receptionist") {
      return [];
    }
    return await ctx.db.query("fuel_requests").order("desc").collect();
  },
});

export const createFuelRequest = mutation({
  args: {
    driverKey: driverKeyValidator,
  },
  handler: async (ctx, { driverKey }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "staff" || user.staffStream !== "receptionist") {
      throw new Error("Only reception staff can create fuel requests");
    }
    const requestDate = todayYyyyMmDd();
    const now = Date.now();
    return await ctx.db.insert("fuel_requests", {
      driverKey,
      requestDate,
      status: "pending_approval",
      requestedBy: user._id,
      requestedAt: now,
    });
  },
});

export const approveFuelRequest = mutation({
  args: {
    requestId: v.id("fuel_requests"),
  },
  handler: async (ctx, { requestId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!isAuthorizedTaskAdmin(user)) {
      throw new Error("Only designated reception admins can approve fuel requests");
    }
    const row = await ctx.db.get(requestId);
    if (!row) {
      throw new Error("Request not found");
    }
    if (row.status !== "pending_approval") {
      throw new Error("This request is not awaiting approval");
    }
    await ctx.db.patch(requestId, {
      status: "approved",
      approvedBy: user._id,
      approvedAt: Date.now(),
    });
    return requestId;
  },
});

export const submitFuelPrice = mutation({
  args: {
    requestId: v.id("fuel_requests"),
    priceAmount: v.number(),
  },
  handler: async (ctx, { requestId, priceAmount }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "staff" || user.staffStream !== "receptionist") {
      throw new Error("Only reception staff can enter the fuel price");
    }
    const row = await ctx.db.get(requestId);
    if (!row) {
      throw new Error("Request not found");
    }
    if (row.status !== "approved") {
      throw new Error("Fuel must be approved before you can enter the price");
    }
    if (row.priceAmount != null) {
      throw new Error("Price has already been recorded");
    }
    if (!Number.isFinite(priceAmount) || priceAmount < 0) {
      throw new Error("Enter a valid price");
    }
    await ctx.db.patch(requestId, {
      status: "completed",
      priceAmount,
      priceEnteredAt: Date.now(),
      priceEnteredBy: user._id,
    });
    return requestId;
  },
});
