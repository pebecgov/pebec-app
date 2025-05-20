"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { useInView } from "react-intersection-observer";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export default function MediaPage() {
  const allMedia = useQuery(api.media.getAllMedia) || [];
  const categories = useQuery(api.media.getCategories) || [];

  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [limit, setLimit] = useState(10);

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView) setLimit((prev) => prev + 6);
  }, [inView]);

  const filtered = useMemo(() => {
    return allMedia
      .filter((post) =>
        categoryFilter ? post.categoryId === categoryFilter : true
      )
      .filter((post) =>
        dateFilter ? format(post.createdAt, "yyyy-MM-dd") === dateFilter : true
      );
  }, [allMedia, categoryFilter, dateFilter]);

  return (
    <div className="max-w-7xl mx-auto mt-20">
      {/* Smaller Banner */}
      <div className="relative w-full h-[300px] md:h-[400px]">
        <Image
          src="/images/media_cover.png"
          alt="PEBEC Media"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-white text-3xl md:text-4xl font-bold">
            Discover PEBEC’s Gallery
          </h1>
          <p className="text-white mt-3 text-sm md:text-base max-w-xl">
            Explore our latest media content and updates
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 justify-center mt-10 mb-8 px-4">
        <select
          className="border px-3 py-2 rounded w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <Input
          type="date"
          className="w-48"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      {/* Media Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-4 pb-10">
        {filtered.slice(0, limit).map((item) => (
          <div
            key={item._id}
            className="bg-white border rounded-lg shadow hover:shadow-md transition overflow-hidden"
          >
            <div className="relative w-full h-48">
              <Image
                src={item.coverImageUrl || "/images/media_cover.png"}
                alt="cover"
                fill
                className="object-cover"
              />
            </div>

            <div className="p-4 flex flex-col justify-between h-[200px]">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {item.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {format(item.createdAt, "PPP")}
                </p>
                <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                  {item.description}
                </p>
              </div>
              <Link
                href={`/media/${item._id}`}
                className="mt-3 text-sm font-medium text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div ref={ref} className="h-10" />
    </div>
  );
}
