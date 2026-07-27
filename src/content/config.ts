import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
  }),
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.date(),
    url: z.string().url(),
    cover: z.string().optional(),
  }),
});

export const collections = { projects, blog };
