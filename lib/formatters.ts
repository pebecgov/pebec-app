/**
 * Utility functions for formatting roles and workstreams
 */

/**
 * Formats a role string to have the first letter uppercase
 * @param role - The role string to format
 * @returns The formatted role string
 */
export function formatRole(role: string): string {
  if (!role) return "";
  
  // Special cases for specific roles
  const roleMappings: Record<string, string> = {
    "reform_champion": "Reform Champion",
    "mda": "ReportGov Agent",
    "state_governor": "State Governor",
    "vice_president": "Vice President",
    "world_bank": "World Bank",
    "saber_agent": "Saber Agent",
    "ngf": "NGF",
    "dmo": "DMO"
  };
  
  // Check if we have a special mapping
  if (roleMappings[role]) {
    return roleMappings[role];
  }
  
  // Default: capitalize first letter
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Formats a workstream string according to the specified requirements
 * @param workstream - The workstream string to format
 * @returns The formatted workstream string
 */
export function formatWorkstream(workstream: string): string {
  if (!workstream) return "";
  
  // Special mappings for workstreams
  const workstreamMappings: Record<string, string> = {
    "investments": "High Impact",
    "innovation": "Innovation & Technology",
    "receptionist": "Admin/Operations"
  };
  
  // Check if we have a special mapping
  if (workstreamMappings[workstream]) {
    return workstreamMappings[workstream];
  }
  
  // Default: capitalize first letter
  return workstream.charAt(0).toUpperCase() + workstream.slice(1);
}

/**
 * Formats both role and workstream for display
 * @param role - The role string
 * @param workstream - The workstream string (optional)
 * @returns Formatted string combining role and workstream
 */
export function formatRoleAndWorkstream(role: string, workstream?: string): string {
  const formattedRole = formatRole(role);
  
  if (role === "staff" && workstream) {
    const formattedWorkstream = formatWorkstream(workstream);
    return `${formattedRole} - ${formattedWorkstream}`;
  }
  
  return formattedRole;
} 