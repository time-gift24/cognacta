import { ArticleCover } from "./article-cover";
import type { BlogArticleCard } from "./blog-article-cards";

export type BlogStory = BlogArticleCard & {
  excerpt: string;
  readingTime: string;
  author: string;
};
export const defaultStories: BlogStory[] = [
  {
    id: "space",
    category: "Design",
    title: "Making space for work that matters.",
    excerpt:
      "Why we’re choosing fewer distractions, clearer decisions, and a little more breathing room in the tools we build.",
    date: "2026-09-24",
    dateLabel: "Sep 24, 2026",
    href: "#space",
    readingTime: "6 min read",
    author: "Jamie Chen",
    cover: <ArticleCover kind="layers" />,
  },
  {
    id: "listening",
    category: "Company",
    title: "The best ideas start with a better question.",
    excerpt:
      "A few things our conversations with small teams taught us about building together.",
    date: "2026-09-21",
    dateLabel: "Sep 21, 2026",
    href: "#listening",
    readingTime: "4 min read",
    author: "Alex Morgan",
    cover: <ArticleCover kind="voice" />,
  },
  {
    id: "details",
    category: "Product",
    title: "Small improvements. A smoother everyday.",
    excerpt:
      "A closer look at the thoughtful updates making their way into your workspace.",
    date: "2026-09-18",
    dateLabel: "Sep 18, 2026",
    href: "#details",
    readingTime: "3 min read",
    author: "Sam Rivera",
    cover: <ArticleCover kind="focus" />,
  },
  {
    id: "rhythm",
    category: "Design",
    title: "Finding a rhythm that works for your team.",
    excerpt:
      "Simple ways to turn good intentions into a more sustainable working day.",
    date: "2026-09-12",
    dateLabel: "Sep 12, 2026",
    href: "#rhythm",
    readingTime: "5 min read",
    author: "Jamie Chen",
    cover: <ArticleCover kind="layers" />,
  },
];
