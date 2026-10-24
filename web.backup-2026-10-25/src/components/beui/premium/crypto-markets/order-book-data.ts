export type OrderBookPair = {
  base: string;
  quote: string;
  /** Smallest price step of the raw book. */
  tickSize: number;
  /** Starting best ask, in quote units. */
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  /** 24h volume in base units. */
  volume24h: number;
  /** Fraction digits for base-unit sizes. */
  sizeDecimals: number;
};

export type OrderBookLevel = {
  price: number;
  size: number;
  /** Running size from the best price out to this level. */
  cumulative: number;
};

export type OrderBookTrade = {
  id: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  time: string;
};

export type OrderBookLabels = {
  book: string;
  trades: string;
  price: (quote: string) => string;
  size: (base: string) => string;
  total: (base: string) => string;
  time: string;
  spread: string;
  grouping: string;
  high: string;
  low: string;
  volume: string;
  average: string;
  sum: string;
  hoverHint: string;
};

export const ORDER_BOOK_LABELS: OrderBookLabels = {
  book: "Order book",
  trades: "Trades",
  price: (quote) => `Price (${quote})`,
  size: (base) => `Size (${base})`,
  total: (base) => `Total (${base})`,
  time: "Time",
  spread: "Spread",
  grouping: "Price grouping",
  high: "24h high",
  low: "24h low",
  volume: "24h volume",
  average: "Avg price",
  sum: "Sum",
  hoverHint: "Hover a level to see the cost of filling up to it",
};

export const ORDER_BOOK_PAIR: OrderBookPair = {
  base: "ETH",
  quote: "USDC",
  tickSize: 0.1,
  price: 2412.4,
  change24h: 2.41,
  high24h: 2448.9,
  low24h: 2351.2,
  volume24h: 184_220,
  sizeDecimals: 3,
};

/** Grouping steps, as multiples of the pair's tick size. */
export const ORDER_BOOK_GROUPS = [1, 5, 10] as const;

/** Raw levels kept per side. */
export const ORDER_BOOK_DEPTH = 300;

/** Small deterministic PRNG so the first render matches on server and client. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A resting size: mostly small orders, with the occasional wall. */
export function levelSize(random: () => number) {
  const roll = random();
  if (roll > 0.97) return 40 + random() * 60;
  if (roll > 0.85) return 8 + random() * 14;
  return 0.05 + random() * 4.5;
}

export function initialSizes(seed: number) {
  const random = seededRandom(seed);
  return Array.from({ length: ORDER_BOOK_DEPTH }, () => levelSize(random));
}

export function initialTrades(pair: OrderBookPair): OrderBookTrade[] {
  const random = seededRandom(7);
  return Array.from({ length: 18 }, (_, index) => {
    const side = random() > 0.48 ? "buy" : "sell";
    const offset = Math.round((random() - 0.5) * 6) * pair.tickSize;
    const seconds = 59 - index * 3;
    return {
      id: `seed-${index}`,
      side,
      price: pair.price + offset,
      size: 0.02 + random() * (random() > 0.9 ? 18 : 2.4),
      time: `12:04:${String(Math.max(0, seconds)).padStart(2, "0")}`,
    };
  });
}

/**
 * Groups raw levels into `step`-wide buckets, best price first. Bids round
 * down and asks round up, so a bucket never crosses the spread.
 */
export function groupLevels(
  bestPrice: number,
  sizes: readonly number[],
  side: "bid" | "ask",
  tickSize: number,
  groupTicks: number,
  rows: number,
): OrderBookLevel[] {
  const buckets = new Map<number, number>();
  for (let index = 0; index < sizes.length; index++) {
    const ticks =
      Math.round(bestPrice / tickSize) + (side === "ask" ? index : -index);
    const bucket =
      side === "ask"
        ? Math.ceil(ticks / groupTicks) * groupTicks
        : Math.floor(ticks / groupTicks) * groupTicks;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + sizes[index]);
    if (buckets.size > rows) break;
  }
  let running = 0;
  return [...buckets.entries()].slice(0, rows).map(([ticks, size]) => {
    running += size;
    return { price: ticks * tickSize, size, cumulative: running };
  });
}

export const bookPrice = (value: number, tickSize: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits:
      tickSize < 1 ? (String(tickSize).split(".")[1]?.length ?? 0) : 0,
    maximumFractionDigits:
      tickSize < 1 ? (String(tickSize).split(".")[1]?.length ?? 0) : 0,
  }).format(value);

export const bookSize = (value: number, decimals: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
