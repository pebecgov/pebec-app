import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { PORTS_CUSTOMS_MDAS } from "../whatsapp/portsCustoms";

function normalizeMdaKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeAbbreviation(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Za-z0-9]{2,8}$/.test(trimmed);
}

function coreMdaName(name: string): string {
  const dashParts = name.split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 2 && looksLikeAbbreviation(dashParts[0])) {
    return normalizeMdaKey(dashParts.slice(1).join(" - "));
  }
  return normalizeMdaKey(name);
}

function abbreviationOf(name: string): string | null {
  const dashParts = name.split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 2 && looksLikeAbbreviation(dashParts[0])) {
    return dashParts[0].toUpperCase();
  }
  const known = PORTS_CUSTOMS_MDAS.find(
    (mda) =>
      normalizeMdaKey(mda.name) === normalizeMdaKey(name) ||
      mda.title.toUpperCase() === name.trim().toUpperCase(),
  );
  return known?.title ?? null;
}

export function mdaNamesMatch(left: string, right: string): boolean {
  const leftNorm = normalizeMdaKey(left);
  const rightNorm = normalizeMdaKey(right);
  if (!leftNorm || !rightNorm) return false;
  if (leftNorm === rightNorm) return true;

  const leftCore = coreMdaName(left);
  const rightCore = coreMdaName(right);
  if (leftCore && rightCore && leftCore === rightCore) return true;

  const leftAbbr = abbreviationOf(left);
  const rightAbbr = abbreviationOf(right);
  if (leftAbbr && rightAbbr && leftAbbr === rightAbbr) return true;

  return false;
}

export async function resolveMdaRecord(
  ctx: MutationCtx,
  assignedMDA: string,
): Promise<Doc<"mdas"> | null> {
  const name = assignedMDA.trim();
  if (!name) return null;

  const exact = await ctx.db
    .query("mdas")
    .withIndex("byName", (q) => q.eq("name", name))
    .first();
  if (exact) return exact;

  const mdas = await ctx.db.query("mdas").take(500);
  const byName = mdas.find((mda) => mdaNamesMatch(mda.name, name));
  if (byName) return byName;

  const mdaUsers = await ctx.db
    .query("users")
    .withIndex("byRole", (q) => q.eq("role", "mda"))
    .take(500);
  const linkedUser = mdaUsers.find(
    (user) => user.mdaId && user.mdaName && mdaNamesMatch(user.mdaName, name),
  );
  if (linkedUser?.mdaId) {
    const fromUser = await ctx.db.get(linkedUser.mdaId);
    if (fromUser) return fromUser;
  }

  return null;
}
