// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { formatDate } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
export default function LatestNewsSection() {
  const posts = useQuery(api.posts.getPosts);
  if (!posts) return null;
  const latestPosts = posts.sort((a, b) => b._creationTime - a._creationTime).slice(0, 3);
  return <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            The Latest News
          </h2>
          <p className="mt-2 text-gray-600 text-base max-w-xl mx-auto">
            Stay updated with our most recent updates and articles.
          </p>
        </div>

        {}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latestPosts.map(post => <Link key={post._id} href={`/posts/${post.slug}`} className="group relative block overflow-hidden rounded-xl shadow-lg transition hover:shadow-xl">
              <div className="relative w-full h-64">
                <Image src={post.coverImageUrl ?? "/placeholder.jpg"} alt={post.title} fill className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
              </div>
              <div className="absolute bottom-4 left-4 z-20 text-white">
                <h3 className="text-lg font-bold leading-tight line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-300 mt-1">
                  {formatDate(post._creationTime)}
                </p>
              </div>
              <div className="absolute bottom-4 right-4 z-20 bg-white text-black rounded-full p-2 shadow-md">
                <ArrowRight className="w-5 h-5" />
              </div>
            </Link>)}
        </div>

        {}
        <div className="mt-10 flex justify-center">
          <Link href="/portal">
            <button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-full text-sm transition">
              View All News
            </button>
          </Link>
        </div>
      </div>
    </section>;
}