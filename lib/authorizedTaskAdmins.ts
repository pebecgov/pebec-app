/**
 * Task inbox / reception / designated admin actions (fuel requests, etc.).
 * Single source of truth — import from Convex and client components.
 *
 * Env:
 * - Set `APPROVAL_ADMIN_EMAILS` in the Convex dashboard (comma-separated) so server mutations/queries work.
 * - For Next.js **client** UI (e.g. AdminTasks tabs), also set
 *   `NEXT_PUBLIC_APPROVAL_ADMIN_EMAILS` in `.env.local` with the same list — non-public env vars are not available in the browser.
 */
function parseApprovalAdminEmails(): readonly string[] {
  const raw =
    process.env.NEXT_PUBLIC_APPROVAL_ADMIN_EMAILS ?? process.env.APPROVAL_ADMIN_EMAILS;
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const AUTHORIZED_TASK_ADMIN_EMAILS: readonly string[] = parseApprovalAdminEmails();

export function isAuthorizedTaskAdmin(
  user: { email?: string; role?: string } | null | undefined
): boolean {
  const email = user?.email?.trim().toLowerCase();
  return (
    !!user &&
    user.role === "admin" &&
    !!email &&
    AUTHORIZED_TASK_ADMIN_EMAILS.includes(email)
  );
}
