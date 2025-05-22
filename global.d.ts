// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
declare global {
  interface Window {
    chatbase: any;
  }
}
export {};
export type Roles = "admin" | "user" | "mda" | "staff" | "reform_champion" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president" | "saber_agent";
export type StaffStream = "regulatory" | "innovation" | "judiciary" | "communications" | "investments" | "receptionist" | "account" | "auditor";
declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
      staffStream?: StaffStream;
      primaryEmail?: string;
    };
  }
}