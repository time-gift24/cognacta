"use client";

import {
  BlogArticleCards,
  type BlogArticleCardsProps,
} from "./blog-article-cards";

export type BlogImageCardsProps = Omit<BlogArticleCardsProps, "coverPosition">;

export function BlogImageCards(props: BlogImageCardsProps) {
  return <BlogArticleCards {...props} coverPosition="top" />;
}
