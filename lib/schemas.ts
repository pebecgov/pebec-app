// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { JSONContent } from 'novel';
import { z } from 'zod';
export const newPostSchema = z.object({
  title: z.string().min(1, 'Please enter a title.'),
  slug: z.string().min(1, 'Slug is required.'),
  excerpt: z.string().min(1, 'Please enter an excerpt.'),
  coverImageId: z.string().optional(),
  content: z.custom<JSONContent>()
});