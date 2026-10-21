export type MarketCategory = {
  id: string;
  label: string;
};

export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  /** 24h change in percent. */
  change24h: number;
  marketCap: number;
  volume24h: number;
  /** Seven days of prices, oldest first. */
  sparkline: readonly number[];
  /** Category ids from `MarketCategory`. */
  categories: readonly string[];
};

export type MarketSortKey =
  | "rank"
  | "name"
  | "price"
  | "change24h"
  | "marketCap"
  | "volume24h";

export type MarketSort = { key: MarketSortKey; direction: "asc" | "desc" };

export type MarketsLabels = {
  title: string;
  search: string;
  watchlist: string;
  all: string;
  rank: string;
  name: string;
  price: string;
  change24h: string;
  last7Days: string;
  marketCap: string;
  volume24h: string;
  totalMarketCap: string;
  totalVolume: string;
  topGainer: string;
  addToWatchlist: (name: string) => string;
  removeFromWatchlist: (name: string) => string;
  emptyWatchlist: string;
  emptySearch: string;
  live: string;
};

export const MARKETS_LABELS: MarketsLabels = {
  title: "Markets",
  search: "Search name or symbol",
  watchlist: "Watchlist",
  all: "All",
  rank: "#",
  name: "Name",
  price: "Price",
  change24h: "24h",
  last7Days: "Last 7 days",
  marketCap: "Market cap",
  volume24h: "Volume (24h)",
  totalMarketCap: "Total market cap",
  totalVolume: "24h volume",
  topGainer: "Top gainer",
  addToWatchlist: (name) => `Add ${name} to watchlist`,
  removeFromWatchlist: (name) => `Remove ${name} from watchlist`,
  emptyWatchlist: "Star a coin to keep it here.",
  emptySearch: "No coins match your search.",
  live: "Live",
};

export const MARKET_CATEGORIES: MarketCategory[] = [
  { id: "layer1", label: "Layer 1" },
  { id: "defi", label: "DeFi" },
  { id: "layer2", label: "Layer 2" },
  { id: "stablecoins", label: "Stablecoins" },
  { id: "memes", label: "Memes" },
];

/**
 * Deterministic seven-day line so server and client render the same path. It
 * follows the week's trend from start to end, with a wobble that fades out at
 * both ends so the line always finishes on the current price.
 */
function sparkline(seed: number, end: number, drift: number) {
  const start = end / (1 + drift / 100);
  const steps = 28;
  return Array.from({ length: steps }, (_, index) => {
    const t = index / (steps - 1);
    const wobble =
      (Math.sin(seed * 1.7 + index * 0.85) * 0.6 +
        Math.sin(seed * 0.4 + index * 2.1) * 0.4) *
      Math.sin(Math.PI * t) *
      Math.max(Math.abs(drift), 2) *
      0.004;
    return (start + (end - start) * t) * (1 + wobble);
  });
}

const coin = (
  seed: number,
  symbol: string,
  name: string,
  price: number,
  change24h: number,
  marketCap: number,
  volume24h: number,
  categories: string[],
  weekDrift: number,
): MarketCoin => ({
  id: symbol.toLowerCase(),
  symbol,
  name,
  price,
  change24h,
  marketCap,
  volume24h,
  categories,
  sparkline: sparkline(seed, price, weekDrift),
});

export const MARKET_COINS: MarketCoin[] = [
  coin(1, "BTC", "Bitcoin", 60284.1, 1.12, 1.19e12, 28.4e9, ["layer1"], 3.8),
  coin(2, "ETH", "Ethereum", 2412.38, 2.41, 290.4e9, 14.2e9, ["layer1"], 5.6),
  coin(3, "USDT", "Tether", 1.0, -0.02, 118.6e9, 41.7e9, ["stablecoins"], 0),
  coin(4, "BNB", "BNB", 548.2, -0.84, 80.1e9, 1.6e9, ["layer1"], -2.1),
  coin(5, "SOL", "Solana", 142.65, 4.37, 66.8e9, 3.9e9, ["layer1"], 9.4),
  coin(6, "USDC", "USD Coin", 1.0, 0.01, 35.2e9, 6.8e9, ["stablecoins"], 0),
  coin(7, "XRP", "XRP", 0.5421, -1.66, 30.7e9, 1.2e9, ["layer1"], -4.2),
  coin(8, "DOGE", "Dogecoin", 0.1123, 6.82, 16.4e9, 1.4e9, ["memes"], 12.7),
  coin(9, "TON", "Toncoin", 5.42, -2.94, 13.8e9, 310e6, ["layer1"], -6.8),
  coin(10, "ADA", "Cardano", 0.3618, 0.73, 12.9e9, 290e6, ["layer1"], 1.4),
  coin(11, "AVAX", "Avalanche", 26.14, 3.18, 10.6e9, 420e6, ["layer1"], 7.9),
  coin(12, "LINK", "Chainlink", 14.82, -1.84, 9.0e9, 380e6, ["defi"], -3.3),
  coin(13, "DAI", "Dai", 1.0, 0.0, 5.3e9, 210e6, ["stablecoins", "defi"], 0),
  coin(14, "UNI", "Uniswap", 8.41, 3.67, 5.0e9, 160e6, ["defi"], 6.2),
  coin(15, "PEPE", "Pepe", 0.0000094, 8.15, 3.9e9, 820e6, ["memes"], 18.6),
  coin(16, "ARB", "Arbitrum", 0.62, -2.37, 2.5e9, 240e6, ["layer2"], -5.1),
  coin(17, "AAVE", "Aave", 162.5, -0.92, 2.4e9, 190e6, ["defi"], 2.7),
  coin(18, "OP", "Optimism", 1.48, 4.06, 1.9e9, 150e6, ["layer2"], 8.3),
  coin(19, "POL", "Polygon", 0.38, -0.54, 2.9e9, 120e6, ["layer2"], -1.2),
];

export const marketPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    ...(value >= 1
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { maximumSignificantDigits: 4 }),
  }).format(value);

export const marketCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);

export const marketPercent = (value: number) =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
