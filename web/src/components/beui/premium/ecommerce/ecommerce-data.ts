export type CommerceProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Price in minor currency units (for example, cents for USD). */
  price: number;
  image: string;
  imageAlt: string;
  images?: readonly { src: string; alt: string }[];
  stock: number;
  label?: string;
};
export type CommerceCartItem = {
  id: string;
  product: CommerceProduct;
  quantity: number;
  option?: string;
};
export const COMMERCE_PRODUCTS: CommerceProduct[] = [
  {
    id: "headphones",
    name: "Studio headphones",
    description: "A little more focus. A lot more of your favorite music.",
    category: "Audio",
    price: 12900,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Over-ear headphones against a warm yellow background",
    images: [
      {
        src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&h=1000&q=85",
        alt: "Studio headphones, full product view",
      },
      {
        src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&crop=focalpoint&fp-x=0.35&fp-y=0.65&fp-z=1.6&w=1000&h=1000&q=85",
        alt: "Studio headphones, cropped detail view",
      },
      {
        src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&crop=focalpoint&fp-x=0.65&fp-y=0.3&fp-z=1.8&w=1000&h=1000&q=85",
        alt: "Studio headphones, second close-up",
      },
    ],
    stock: 12,
    label: "Bestseller",
  },
  {
    id: "watch",
    name: "Everyday watch",
    description:
      "A simple face and an easy fit, from the first meeting to the last train.",
    category: "Everyday",
    price: 8900,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Minimal wristwatch on a pale background",
    stock: 8,
  },
  {
    id: "camera",
    name: "Weekend camera",
    description: "Make room for the moments you want to keep.",
    category: "Everyday",
    price: 34900,
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Camera and lens photographed up close",
    stock: 5,
    label: "Just arrived",
  },
  {
    id: "lamp",
    name: "Focus desk lamp",
    description: "A warm pool of light for the things you love working on.",
    category: "Workspace",
    price: 7900,
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "A desk lamp lighting a workspace",
    stock: 9,
  },
];
export function commercePrice(amount: number, currency = "USD") {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}
export const COMMERCE_CART: CommerceCartItem[] = [
  {
    id: "headphones-standard",
    product: COMMERCE_PRODUCTS[0],
    quantity: 1,
    option: "Standard",
  },
  { id: "watch-standard", product: COMMERCE_PRODUCTS[1], quantity: 1 },
];
