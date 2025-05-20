'use client';

import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvex } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
import { combineName } from '@/lib/utils';
import Image from 'next/image';

export default function RecentPosts() {
  const posts = useQuery(api.posts.getRecentPosts);
  const convex = useConvex();
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUrls = async () => {
      if (!posts) return;

      const newUrls: Record<string, string> = {};

      await Promise.all(
        posts.map(async (post) => {
          if (post.coverImageId) {
            const url = await convex.query(api.images.getImageUrl, {
              storageId: post.coverImageId as Id<'_storage'>
            });

            if (url) {
              newUrls[post._id] = url;
            }
          }
        })
      );

      setCoverUrls(newUrls);
    };

    fetchUrls();
  }, [posts, convex]);

  if (!posts) return <Spinner />;

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Latest Posts</CardTitle>
      </CardHeader>

      <CardContent>
        {!posts && <Spinner />}
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post._id}>
              <Link
                href={`/posts/${post.slug}`}
                className="flex items-center gap-4 hover:bg-muted/40 rounded-md px-4 py-2 transition"
              >
                {/* Avatar from Post Cover */}
                <div className="w-10 h-10 rounded-full overflow-hidden border bg-gray-100 flex-shrink-0">
                  {coverUrls[post._id] ? (
                    <Image
                      src={coverUrls[post._id]}
                      alt={post.title}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">
                      No Image
                    </div>
                  )}
                </div>

                {/* Post Info */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold">{post.title}</h3>
                
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
      <Link href="/portal?tab=news" className="text-sm font-light text-emerald-600 hover:underline">
  Go to news & articles
</Link>

      </CardFooter>
    </Card>
  );
}
