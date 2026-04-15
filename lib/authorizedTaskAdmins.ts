/**
 * Task inbox / reception / designated admin actions (fuel requests, etc.).
 * Single source of truth — import from Convex and client components.
 */
export const AUTHORIZED_TASK_ADMIN_EMAILS: readonly string[] = [
  "mickaelking2002@gmail.com",
  "zahrah.mustaphaaudu@pebec.gov.ng",
];

export function isAuthorizedTaskAdmin(
  user: { email?: string; role?: string } | null | undefined
): boolean {
  return (
    !!user &&
    user.role === "admin" &&
    !!user.email &&
    AUTHORIZED_TASK_ADMIN_EMAILS.includes(user.email)
  );
}
