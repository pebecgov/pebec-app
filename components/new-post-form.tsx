// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { z } from "zod";
import { toast } from "sonner";
import { JSONContent } from "novel";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { newPostSchema } from "@/lib/schemas";
import { createSlugFromName } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Editor from "@/components/editor/editor";
import { Spinner } from "@/components/ui/spinner";
import ImageUploader from "@/components/image-uploader";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
type Inputs = z.infer<typeof newPostSchema>;
export default function NewPostForm({
  initialData
}: {
  initialData?: any;
}) {
  const createPost = useMutation(api.posts.createPost);
  const updatePost = useMutation(api.posts.editPost);
  const router = useRouter();
  const pathname = usePathname();
  const defaultEditorContent: JSONContent = {
    type: "doc",
    content: [{
      type: "paragraph",
      content: []
    }]
  };
  const [filePickerIsOpen, setFilePickerIsOpen] = useState(false);
  const {
    register,
    setValue,
    handleSubmit,
    formState: {
      errors,
      isSubmitting
    },
    watch
  } = useForm<Inputs>({
    resolver: zodResolver(newPostSchema),
    defaultValues: {
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      excerpt: initialData?.excerpt || "",
      content: initialData?.content ? JSON.parse(initialData.content) : {
        content: []
      },
      coverImageId: initialData?.coverImageId || undefined
    }
  });
  const watchedContent = watch("content") || defaultEditorContent;
  const slug = pathname.split("/")[2];
  const postQuery = slug ? useQuery(api.posts.getPostBySlug, {
    slug
  }) : null;
  useEffect(() => {
    if (!postQuery) {
      console.warn("🚨 No post data returned from Convex!");
      return;
    }
    console.log("✅ Post data fetched:", postQuery);
    setValue("title", postQuery.title);
    setValue("slug", postQuery.slug);
    setValue("excerpt", postQuery.excerpt);
    if (postQuery.content) {
      try {
        const parsedContent = JSON.parse(postQuery.content);
        console.log("📜 Setting content from DB:", parsedContent);
        setValue("content", parsedContent);
      } catch (error) {
        console.error("🚨 Error parsing content:", error);
        setValue("content", defaultEditorContent);
      }
    } else {
      console.warn("🚨 postQuery.content is missing or empty!");
      setValue("content", defaultEditorContent);
    }
    if (postQuery.coverImageId) {
      setValue("coverImageId", postQuery.coverImageId as Id<"_storage">);
    }
  }, [postQuery, setValue]);
  const editorPost = initialData ? {
    ...initialData,
    content: JSON.stringify(watchedContent)
  } : {
    content: JSON.stringify(defaultEditorContent)
  };
  function setCoverImageId(storageId: Id<"_storage">) {
    setValue("coverImageId", storageId);
    setFilePickerIsOpen(false);
  }
  function setContent(content: JSONContent) {
    setValue("content", content, {
      shouldValidate: true
    });
  }
  const title = watch("title");
  useEffect(() => {
    if (title) {
      const slug = createSlugFromName(title);
      if (slug) {
        setValue("slug", slug, {
          shouldValidate: true
        });
      }
    }
  }, [title, setValue]);
  const processForm: SubmitHandler<Inputs> = async data => {
    const contentJson = data.content;
    const hasContent = contentJson?.content?.some(c => c.content && c.content.length > 0);
    if (!hasContent) {
      toast.error("Please add some content to the post");
      return;
    }
    try {
      let postSlug;
      if (initialData) {
        await updatePost({
          slug: initialData.slug,
          title: data.title,
          excerpt: data.excerpt,
          content: JSON.stringify(contentJson),
          coverImageId: data.coverImageId as Id<"_storage"> | undefined
        });
      } else {
        postSlug = await createPost({
          ...data,
          coverImageId: data.coverImageId as Id<"_storage"> | undefined,
          content: JSON.stringify(contentJson)
        });
      }
      if (!postSlug) throw new Error("Failed to create or update post");
      router.push(`/posts/${postSlug}`);
      toast.success(initialData ? "Post updated!" : "Post created!");
    } catch (error) {
      toast.error("Failed to create or update post");
    }
  };
  if (slug && postQuery === undefined) {
    return <div className="h-screen flex items-center justify-center">
        <Spinner />
        <p>Loading post data...</p>
      </div>;
  }
  return <form onSubmit={handleSubmit(processForm)}>
      <div className="flex flex-col gap-4">
        {}
        <div className="flex justify-between gap-4">
          <div className="w-full">
            <Input disabled type="text" className="w-full" placeholder="Select a cover image" {...register("coverImageId")} />
            {errors.coverImageId?.message && <p className="mt-1 px-2 text-xs text-red-400">
                {errors.coverImageId.message}
              </p>}
          </div>
          <Dialog open={filePickerIsOpen} onOpenChange={setFilePickerIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Select file</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Select a Cover Image</DialogTitle>
              <ImageUploader setImageId={setCoverImageId} />
            </DialogContent>
          </Dialog>
        </div>

        {}
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="flex-1">
            <Input type="text" placeholder="Post title" {...register("title")} />
            {errors.title?.message && <p className="mt-1 px-2 text-xs text-red-400">
                {errors.title.message}
              </p>}
          </div>
          <div className="flex-1">
            <Input type="text" placeholder="Post slug" {...register("slug")} />
            {errors.slug?.message && <p className="mt-1 px-2 text-xs text-red-400">
                {errors.slug.message}
              </p>}
          </div>
        </div>

        {}
        <div>
          <Input type="text" placeholder="Post excerpt" {...register("excerpt")} />
          {errors.excerpt?.message && <p className="mt-1 px-2 text-xs text-red-400">
              {errors.excerpt.message}
            </p>}
        </div>

        {}
        <div>
        

        <Editor editable={true} setContent={setContent} post={editorPost} />




        </div>

        <div>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-1/2">
            {isSubmitting ? <>
                <Spinner className="mr-2" />
                <span>Saving post...</span>
              </> : initialData ? "Update Post" : "Create Post"}
          </Button>
        </div>
      </div>
    </form>;
}