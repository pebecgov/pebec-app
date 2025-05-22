// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { Id } from '@/convex/_generated/dataModel';
export type Post = {
  _id: Id<'posts'>;
  _creationTime: number;
  coverImageId?: string;
  coverImageUrl?: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  authorId: Id<'users'>;
  likes: number;
  author: {
    _id: Id<'users'>;
    _creationTime: number;
    firstName?: string | undefined;
    lastName?: string | undefined;
    imageUrl?: string | undefined;
    posts?: Id<'posts'>[] | undefined;
    email: string;
    clerkUserId: string;
  } | null;
};
export type Event = {
  _id: Id<'events'>;
  _creationTime: number;
  title: string;
  description: string;
  eventDate: number;
  location: string;
  host: string;
  coverImageId?: Id<'_storage'>;
  coverImageUrl?: string | null;
};