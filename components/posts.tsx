// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import PostItem from '@/components/post-item';
import { Button } from '@/components/ui/button';
export default function Posts() {
  const posts = useQuery(api.posts.getPosts);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;
  if (!posts) {
    return <div className="flex h-40 items-center justify-center">
        <Spinner size="lg" />
      </div>;
  }
  const filteredPosts = posts.filter(post => post.title?.toLowerCase().includes(searchQuery.toLowerCase()) || post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => new Date(b._creationTime).getTime() - new Date(a._creationTime).getTime());
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
  return <div className="max-w-4xl mx-auto px-4 py-8">
      {}
      <input type="text" value={searchQuery} onChange={e => {
      setSearchQuery(e.target.value);
      setCurrentPage(1);
    }} placeholder="Search posts..." className="w-full px-4 py-2 mb-6 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600" />

      {}
      <ul>
        {paginatedPosts.length > 0 ? paginatedPosts.map(post => {
        const createdDate = new Date(post._creationTime);
        const isNew = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24) < 2;
        return <PostItem key={post._id} post={post} showComments={false} isNew={isNew} />;
      }) : <p className="text-center text-gray-500">No posts found.</p>}
      </ul>

      {}
      {totalPages > 1 && <div className="flex justify-center items-center gap-4 mt-6">
          <Button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
            ◀ Prev
          </Button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
            Next ▶
          </Button>
        </div>}
    </div>;
}