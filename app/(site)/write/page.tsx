// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React, { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import NewPostForm from "@/components/new-post-form";
const WritePage = () => {
  const {
    isLoaded,
    isSignedIn
  } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);
  if (!isLoaded) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!isSignedIn) return null;
  return <div className="pb-20 pt-5">
      <div className="container max-w-3xl mx-auto text-center">
        <h1 className="mb-10 font-serif text-5xl font-medium">New Post</h1>
        <NewPostForm />
      </div>
    </div>;
};
export default WritePage;