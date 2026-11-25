export const COMPANY_PROPERTIES_PERMISSION = "/admin/company-items";

export function canManageCompanyProperties(user: {
  role?: string | null;
  permissions?: string[] | null;
}): boolean {
  if (user.role === "admin") return true;
  return (user.permissions ?? []).includes(COMPANY_PROPERTIES_PERMISSION);
}
