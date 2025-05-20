"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useForm } from "react-hook-form";
import NewPostForm from "@/components/new-post-form"; // Import the existing NewPostForm component

const EditPostPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.split("/")[2];  // Extract slug from the URL

  const [postData, setPostData] = useState<any>(null);  // Initialize state for post data

  // Fetch the post data using the slug
  const postQuery = useQuery(api.posts.getPostBySlug, { slug });

  useEffect(() => {
    if (postQuery) {
      setPostData(postQuery);  // Set the post data from the query result
    }
  }, [postQuery]);

  if (!postQuery) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="pb-20 pt-40">
      <div className="container max-w-3xl mx-auto">
        <h1 className="mb-10 font-serif text-5xl font-medium">Edit Post</h1>
        <NewPostForm initialData={postData} />  {/* Pass the post data as initialData */}
      </div>
    </div>
  );
};

export default EditPostPage;
