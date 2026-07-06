import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

const auditActionValidator = v.union(
  v.literal("user.role_changed"),
  v.literal("user.deleted"),
  v.literal("user.role_request_approved"),
  v.literal("user.role_request_rejected"),
  v.literal("task.completion_reviewed"),
  v.literal("leave.reviewed"),
  v.literal("leave.admin_recorded"),
  v.literal("bfa.mda_score_saved"),
  v.literal("bfa.state_score_saved")
);

const auditCategoryValidator = v.union(
  v.literal("user"),
  v.literal("task"),
  v.literal("leave"),
  v.literal("bfa")
);

const filterArgs = {
  category: v.optional(auditCategoryValidator),
  action: v.optional(auditActionValidator),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  search: v.optional(v.string()),
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 5000;

function parseDateRange(startDate?: string, endDate?: string) {
  const startMs = startDate
    ? new Date(`${startDate}T00:00:00`).getTime()
    : undefined;
  const endMs = endDate
    ? new Date(`${endDate}T23:59:59.999`).getTime()
    : undefined;
  return { startMs, endMs };
}

function matchesSearch(
  log: {
    summary: string;
    actorName: string;
    actorEmail?: string;
    targetLabel?: string;
  },
  search: string
) {
  const haystack = [log.summary, log.actorName, log.actorEmail, log.targetLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
}

function matchesFilters(
  log: {
    category: string;
    action: string;
    createdAt: number;
    summary: string;
    actorName: string;
    actorEmail?: string;
    targetLabel?: string;
  },
  args: {
    category?: string;
    action?: string;
    startMs?: number;
    endMs?: number;
    search?: string;
  }
) {
  if (args.category && log.category !== args.category) return false;
  if (args.action && log.action !== args.action) return false;
  if (args.startMs !== undefined && log.createdAt < args.startMs) return false;
  if (args.endMs !== undefined && log.createdAt > args.endMs) return false;
  if (args.search && !matchesSearch(log, args.search)) return false;
  return true;
}

async function fetchFilteredAuditLogs(
  ctx: QueryCtx,
  args: {
    category?: string;
    action?: string;
    startMs?: number;
    endMs?: number;
    search?: string;
  }
) {
  const filterState = {
    category: args.category,
    action: args.action,
    startMs: args.startMs,
    endMs: args.endMs,
    search: args.search,
  };

  if (args.category) {
    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_category", (q: any) => q.eq("category", args.category))
      .order("desc")
      .collect();
    return logs.filter((log: any) => matchesFilters(log, filterState));
  }

  if (args.action) {
    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_action", (q: any) => q.eq("action", args.action))
      .order("desc")
      .collect();
    return logs.filter((log: any) => matchesFilters(log, filterState));
  }

  const logs = await ctx.db
    .query("audit_logs")
    .withIndex("by_createdAt")
    .order("desc")
    .collect();

  return logs.filter((log: any) => matchesFilters(log, filterState));
}

async function assertAdmin(ctx: QueryCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can view the audit log");
  }
  return user;
}

export const list = query({
  args: {
    page: v.number(),
    pageSize: v.optional(v.number()),
    ...filterArgs,
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const page = Math.max(0, args.page);
    const pageSize = Math.min(
      Math.max(args.pageSize ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const { startMs, endMs } = parseDateRange(args.startDate, args.endDate);
    const search = args.search?.trim().toLowerCase();

    const filtered = await fetchFilteredAuditLogs(ctx, {
      category: args.category,
      action: args.action,
      startMs,
      endMs,
      search: search || undefined,
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = total === 0 ? 0 : Math.min(page, totalPages - 1);
    const start = safePage * pageSize;
    const logs = filtered.slice(start, start + pageSize);

    return {
      logs,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  },
});

/** Returns all rows matching filters for CSV export (capped). */
export const listForExport = query({
  args: filterArgs,
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const { startMs, endMs } = parseDateRange(args.startDate, args.endDate);
    const search = args.search?.trim().toLowerCase();

    const filtered = await fetchFilteredAuditLogs(ctx, {
      category: args.category,
      action: args.action,
      startMs,
      endMs,
      search: search || undefined,
    });

    return {
      logs: filtered.slice(0, MAX_EXPORT_ROWS),
      total: filtered.length,
      truncated: filtered.length > MAX_EXPORT_ROWS,
    };
  },
});
