// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PostMediaModal } from "@/components/MediaPageComp/PostMediaModal";
import { CreateCategoryModal } from "@/components/MediaPageComp/CreateCateogoryModel";
import { Id } from "@/convex/_generated/dataModel";
export default function MediaDashboardPage() {
  const router = useRouter();
  const allMedia = useQuery(api.media.getAllMedia) || [];
  const categories = useQuery(api.media.getCategories) || [];
  const deleteMedia = useMutation(api.media.deleteMediaPost);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"media"> | null>(null);
  const [titleFilter, setTitleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const filtered = useMemo(() => {
    return allMedia.filter(post => titleFilter ? post.title.toLowerCase().includes(titleFilter.toLowerCase()) : true).filter(post => categoryFilter ? post.categoryId === categoryFilter : true).filter(post => {
      if (fromDate && post.createdAt < new Date(fromDate).getTime()) return false;
      if (toDate && post.createdAt > new Date(toDate).getTime()) return false;
      return true;
    });
  }, [allMedia, titleFilter, categoryFilter, fromDate, toDate]);
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);
  const handleDeleteConfirm = async () => {
    if (!selectedId) return;
    await deleteMedia({
      mediaId: selectedId
    });
    setSelectedId(null);
    setShowDeleteConfirm(false);
  };
  return <div className="p-6">
      <div className="flex justify-between mb-6">
        <div className="flex gap-2">
          <Button onClick={() => setShowPostModal(true)}>Create Post</Button>
          <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
            Create Category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Input value={titleFilter} onChange={e => setTitleFilter(e.target.value)} placeholder="Filter by title" />
        <select className="border px-3 py-2 rounded w-full" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>
              {c.name}
            </option>)}
        </select>
        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
      </div>

      <div className="overflow-x-auto rounded-lg shadow-sm border">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Title</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Category</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Created</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {paginated.map(item => {
            const category = categories.find(c => c._id === item.categoryId);
            return <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{item.title}</td>
                  <td className="px-6 py-4">{category?.name || "-"}</td>
                  <td className="px-6 py-4">{format(item.createdAt, "PPpp")}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/media/${item._id}`)}>
                        View
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => {
                    setSelectedId(item._id as Id<"media">);
                    setShowDeleteConfirm(true);
                  }}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>;
          })}
          </tbody>
        </table>
      </div>

      {}
      <div className="flex justify-end mt-4 gap-2">
        <Button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
          Previous
        </Button>
        <Button onClick={() => setPage(p => filtered.length > p * perPage ? p + 1 : p)}>
          Next
        </Button>
      </div>

      {}
      {showDeleteConfirm && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-2">Are you sure you want to delete it?</h2>
            <p className="text-sm text-gray-600 mb-4">
              It will become unavailable on the website once deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                No, cancel it
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                Yes, I'm sure
              </Button>
            </div>
          </div>
        </div>}

      {}
      <PostMediaModal open={showPostModal} onClose={() => setShowPostModal(false)} />
      <CreateCategoryModal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
    </div>;
}