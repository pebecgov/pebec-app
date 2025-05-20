// app/sign-in/page.tsx
"use client";

import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn && user?.publicMetadata?.role === "user") {
      router.push("/reportgov");
    }
  }, [isSignedIn, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 mt-15">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Welcome to <span className="text-red-600">ReportGov</span>
        </h1>
        <p className="text-center text-sm text-gray-500 mt-1 mb-4">
          Please sign in to continue
        </p>

        {/* 👉 Sign Up Redirect Button */}
        <div className="text-sm text-center mb-4 text-gray-600">
          Don’t have an account?{" "}
          <Link
            href="/sign-up"
            className="text-green-700 font-medium hover:underline"
          >
            Sign Up
          </Link>
        </div>

        {/* Clerk Sign In Component */}
        <SignIn
  routing="path"
  path="/sign-in"
  appearance={{
    elements: {
      footerAction: "hidden", // 👈 hides the "Don't have an account? Sign up" section at the bottom
      formButtonPrimary: "bg-green-700 hover:bg-green-800 text-white",
      footerActionLink: "text-green-700 hover:underline",
    },
    variables: {
      colorPrimary: "#15803d",
    },
  }}
/>

      </div>
    </div>
  );
}
