export type BlogCategory = "Places" | "Food" | "People";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  readTime: string;
  author: string;
  image: string;
  imageAlt: string;
};

export const FEATURED_POST: BlogPost = {
  slug: "a-week-without-an-itinerary",
  title: "A week without an itinerary",
  excerpt:
    "What changed when we stopped collecting recommendations and started following the shape of each day.",
  category: "Places",
  readTime: "7 min read",
  author: "Mina Park",
  image:
    "https://images.unsplash.com/photo-1528598754407-20e385ee7b31?auto=format&fit=crop&fm=webp&q=82&w=1800",
  imageAlt: "A quiet cafe interior lit by tall windows",
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "the-kitchen-at-four",
    title: "The kitchen at four in the afternoon",
    excerpt:
      "Three cooks on prep, a radio just loud enough, and the quiet work behind a busy dinner room.",
    category: "Food",
    readTime: "5 min read",
    author: "Jon Bell",
    image:
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&fm=webp&q=84&w=900",
    imageAlt: "A warm oak kitchen prepared for afternoon service",
  },
  {
    slug: "keeping-a-small-shop",
    title: "Keeping a small shop",
    excerpt:
      "A conversation about regulars, useful objects, and knowing when the shelves have enough.",
    category: "People",
    readTime: "6 min read",
    author: "Leah Soto",
    image:
      "https://images.unsplash.com/photo-1755613495591-5b86c76a9df6?auto=format&fit=crop&fm=webp&q=82&w=1200",
    imageAlt: "A warmly lit independent bookstore",
  },
  {
    slug: "the-long-way-to-the-water",
    title: "The long way to the water",
    excerpt:
      "One coastal path, two wrong turns, and a late lunch worth arriving hungry for.",
    category: "Places",
    readTime: "4 min read",
    author: "Mina Park",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&fm=webp&q=84&w=900",
    imageAlt: "A sunlit room overlooking the coast",
  },
  {
    slug: "notes-on-a-shared-table",
    title: "Notes on a shared table",
    excerpt:
      "Why the best meals often begin before anyone sits down and continue after the plates are cleared.",
    category: "Food",
    readTime: "8 min read",
    author: "Jon Bell",
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&fm=webp&q=84&w=900",
    imageAlt: "A long shared table in a quiet studio",
  },
  {
    slug: "mornings-with-sana",
    title: "Mornings with Sana",
    excerpt:
      "The florist opens before the street wakes up. We joined her for the first quiet hour.",
    category: "People",
    readTime: "5 min read",
    author: "Leah Soto",
    image:
      "https://images.unsplash.com/photo-1753982861969-295e79c4bf78?auto=format&fit=crop&fm=webp&q=82&w=1200",
    imageAlt: "A florist arranging bouquets at a market stall",
  },
  {
    slug: "one-room-three-generations",
    title: "One room, three generations",
    excerpt:
      "Inside a family workshop where every tool has a place and every mark carries a memory.",
    category: "Places",
    readTime: "6 min read",
    author: "Mina Park",
    image:
      "https://images.unsplash.com/photo-1781389005078-d9e413d89c94?auto=format&fit=crop&fm=webp&q=82&w=1200",
    imageAlt: "An artisan shaping clay by hand at a worktable",
  },
];
