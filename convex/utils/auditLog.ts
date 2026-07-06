import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { formatRole, formatWorkstream } from "../../lib/formatters";

export const AUDIT_ACTIONS = [
  "user.role_changed",
  "user.deleted",
  "user.role_request_approved",
  "user.role_request_rejected",
  "task.completion_reviewed",
  "leave.reviewed",
  "leave.admin_recorded",
  "bfa.mda_score_saved",
  "bfa.state_score_saved",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditCategory = "user" | "task" | "leave" | "bfa";

type Actor = {
  _id?: Id<"users">;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type AuditTarget = {
  type: string;
  id?: string;
  label?: string;
};

export function auditDisplayName(user?: Actor | null) {
  if (!user) return "System";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown";
}

export function formatRoleSnapshot(user: {
  role?: string;
  staffStream?: string;
  state?: string;
}) {
  const roleLabel = formatRole(user.role || "user");
  const parts = [roleLabel];
  if (user.staffStream) {
    parts.push(`(${formatWorkstream(user.staffStream)})`);
  }
  if (user.state) {
    parts.push(`— ${user.state}`);
  }
  return parts.join(" ");
}

export async function logAuditEvent(
  ctx: MutationCtx,
  {
    action,
    category,
    summary,
    actor,
    target,
    metadata,
  }: {
    action: AuditAction;
    category: AuditCategory;
    summary: string;
    actor?: Actor | null;
    target?: AuditTarget;
    metadata?: Record<string, unknown>;
  }
) {
  await ctx.db.insert("audit_logs", {
    action,
    category,
    summary,
    actorUserId: actor?._id,
    actorName: auditDisplayName(actor),
    actorEmail: actor?.email,
    actorRole: actor?.role,
    targetType: target?.type,
    targetId: target?.id,
    targetLabel: target?.label,
    metadata,
    createdAt: Date.now(),
  });
}
