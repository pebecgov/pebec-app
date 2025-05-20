"use client";

import { useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function VerifyPrimaryEmail() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const publicPrimaryEmail = user?.publicMetadata?.primaryEmail as string;
    const currentSessionEmail = user?.primaryEmailAddress?.emailAddress as string;

    if (!publicPrimaryEmail || !currentSessionEmail) {
      console.warn("⚠️ Missing publicMetadata primaryEmail or current email");
      return;
    }

    console.log("🔍 PrimaryEmail (from publicMetadata):", publicPrimaryEmail);
    console.log("🔍 Session Email (currently logged in):", currentSessionEmail);

    if (publicPrimaryEmail !== currentSessionEmail) {
      console.error("❌ Wrong email detected. Logging out...");
      
      toast("Please login using your PRIMARY email.", {
        description: "Wrong email detected",
        style: { backgroundColor: "red", color: "white" },
      });

      setTimeout(() => {
        signOut().then(() => router.push("/sign-in?error=use-primary-email"));
      }, 1000); // wait 1 sec
    }
  }, [user, signOut, router]);

  return null;
}
