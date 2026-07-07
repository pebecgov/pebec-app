/** Staff leave requests are routed to configured approver emails (first match in DB is used). */
const DEFAULT_LEAVE_APPROVER_EMAIL = "zahrah.mustaphaaudu@pebec.gov.ng";

function parseApproverEmails(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

const configuredApproverEmails = parseApproverEmails(process.env.APPROVAL_ADMIN_EMAILS);

export const LEAVE_APPROVER_EMAILS = configuredApproverEmails.length
  ? configuredApproverEmails
  : [DEFAULT_LEAVE_APPROVER_EMAIL];

/** Backwards-compatible primary email constant. */
export const LEAVE_APPROVER_EMAIL = LEAVE_APPROVER_EMAILS[0];
export const LEAVE_APPROVER_ROLE_LABEL = "DG";
/** Fallback if the user record is not loaded yet. */
export const LEAVE_APPROVER_DISPLAY_NAME = "Princess Zahrah Mustapha Audu";
