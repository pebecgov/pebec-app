// src/global.d.ts

declare global {
    interface Window {
      chatbase: any; // Declare chatbase on window with `any` type
    }
  }
  
  export {};
  
  export type Roles = "admin" | "user" | "mda" | "staff" | "reform_champion"| "federal" | "deputies" | "magistrates" | "state_governor"| "president"| "vice_president"| "saber_agent";
  export type StaffStream = 
  | "regulatory"
  | "innovation"
  | "judiciary"
  | "communications"
  | "investments"
  | "receptionist"
  | "account"
  | "auditor";
  
  declare global {
    interface CustomJwtSessionClaims {
      metadata: {
        role?: Roles;
        staffStream?: StaffStream;
        primaryEmail?: string;   // ✅ ← add this line

      };
    }
  }

  