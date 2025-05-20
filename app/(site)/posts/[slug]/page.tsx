import Post from "@/components/post";
import { Metadata } from "next";

// Metadata for SEO
export const metadata: Metadata = {
  title: "Post - PEBEC",
  description: "PEBEC Articles & News .",
};

export default async function PostPage({ params }: { params: { slug: string } }) {
  // Await the slug, because params are dynamic and should be awaited
  const { slug } = await params;

  return (
    <div className="pb-20 pt-10">
      <div className="container max-w-3xl mx-auto">
        {/* Pass the slug to the Post component */}
        <Post slug={slug} />
      </div>
    </div>
  );
}
