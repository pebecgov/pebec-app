"use client";

import React, { useEffect } from "react";
import { useAuth } from "@clerk/nextjs"; // ✅ Import Clerk authentication
import { useRouter } from "next/navigation"; // ✅ Import Next.js router

import NewPostForm from "@/components/new-post-form";

const WritePage = () => {
  const { isLoaded, isSignedIn } = useAuth(); // ✅ Ensure authentication is fully loaded
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/"); // ✅ Redirect only when Clerk has fully loaded
    }
  }, [isLoaded, isSignedIn, router]);

  // Prevent rendering until Clerk is fully loaded
  if (!isLoaded) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  // Prevent rendering if redirecting
  if (!isSignedIn) return null;

  return (
    <div className="pb-20 pt-5">
      <div className="container max-w-3xl mx-auto text-center">
        <h1 className="mb-10 font-serif text-5xl font-medium">New Post</h1>
        <NewPostForm />
      </div>
    </div>
  );
};

export default WritePage;
