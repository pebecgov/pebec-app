// app/sign-up/page.tsx
"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 mt-25 mb-20">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Create your <span className="text-red-600">ReportGov</span> account
        </h1>
        <p className="text-center text-sm text-gray-500 mt-1 mb-4">
          Join to track, comment & manage your complaints
        </p>

        {/* 👉 Back to Sign In */}
        <div className="text-sm text-center mb-4 text-gray-600">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-green-700 font-medium hover:underline"
          >
            Sign In
          </Link>
        </div>

        {/* Clerk Sign Up Component */}
        <SignUp
  routing="path"
  path="/sign-up"
  appearance={{
    elements: {
      card: "w-full max-w-[600px]", // 👈 Increase form width
      formButtonPrimary: "bg-green-700 hover:bg-green-800 text-white",
      footerAction: "hidden", // hides built-in "Already have an account?"
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
