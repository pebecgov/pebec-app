// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use server";

import { Roles, StaffStream } from "@/global";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
export async function setRole(formData: FormData) {
  const {
    sessionClaims
  } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    throw new Error("🚨 Not Authorized");
  }
  const client = await clerkClient();
  const id = formData.get("id") as string;
  const role = formData.get("role") as Roles;
  const stream = formData.get("staffStream") as StaffStream | null;
  const metadata: Record<string, any> = {
    role,
    staffStream: role === "staff" && stream ? stream : null
  };
  try {
    const user = await client.users.getUser(id).catch(() => null);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    await client.users.updateUser(id, {
      publicMetadata: metadata
    });
    revalidatePath("/admin");
    console.log(`✅ Updated Clerk metadata for user ${id}`, metadata);
  } catch (error: any) {
    console.error("❌ Clerk API Error:", error);
    throw new Error(`Failed to update role: ${error.message}`);
  }
}
export async function removeRole(formData: FormData) {
  const {
    sessionClaims
  } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    throw new Error("🚨 Not Authorized");
  }
  const client = await clerkClient();
  const id = formData.get("id") as string;
  try {
    const user = await client.users.getUser(id).catch(() => null);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    await client.users.updateUser(id, {
      publicMetadata: {
        role: null,
        staffStream: null
      }
    });
    revalidatePath("/admin");
    console.log(`✅ Removed role and staff stream for user ${id}`);
  } catch (error: any) {
    console.error("❌ Clerk API Error:", error);
    throw new Error(`Failed to remove role: ${error.message}`);
  }
}