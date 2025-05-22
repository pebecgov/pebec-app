// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import Post from "@/components/post";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Post - PEBEC",
  description: "PEBEC Articles & News ."
};
export default async function PostPage({
  params
}: {
  params: {
    slug: string;
  };
}) {
  const {
    slug
  } = await params;
  return <div className="pb-20 pt-10">
      <div className="container max-w-3xl mx-auto">
        {}
        <Post slug={slug} />
      </div>
    </div>;
}