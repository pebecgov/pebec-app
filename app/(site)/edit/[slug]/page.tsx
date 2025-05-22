// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useForm } from "react-hook-form";
import NewPostForm from "@/components/new-post-form";
const EditPostPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.split("/")[2];
  const [postData, setPostData] = useState<any>(null);
  const postQuery = useQuery(api.posts.getPostBySlug, {
    slug
  });
  useEffect(() => {
    if (postQuery) {
      setPostData(postQuery);
    }
  }, [postQuery]);
  if (!postQuery) {
    return <div className="h-screen flex items-center justify-center">
        Loading...
      </div>;
  }
  return <div className="pb-20 pt-40">
      <div className="container max-w-3xl mx-auto">
        <h1 className="mb-10 font-serif text-5xl font-medium">Edit Post</h1>
        <NewPostForm initialData={postData} />  {}
      </div>
    </div>;
};
export default EditPostPage;