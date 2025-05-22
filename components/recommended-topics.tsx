// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
export default function RecommendedTopics() {
  const topics = useQuery(api.posts.getMostLikedPostExcerpts, {
    limit: 7
  }) || [];
  return <Card className="flex-1">
      <CardHeader>
        <CardTitle>Recommended Topics</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-2">
        {topics.map(post => <Link key={post.slug} href={`/posts/${post.slug}`}>
    <Badge variant="secondary" className="font-light cursor-pointer hover:underline">
      {post.excerpt}
    </Badge>
  </Link>)}
        </div>
      </CardContent>

      <CardFooter />
    </Card>;
}