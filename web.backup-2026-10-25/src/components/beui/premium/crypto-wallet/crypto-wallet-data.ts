export type CryptoAsset = {
  id: string;
  symbol: string;
  name: string;
  /** Network display name, such as "Ethereum" or "Arbitrum". */
  network: string;
  decimals: number;
  balance: string;
  usdPrice: number;
  /** Recent prices, oldest first. Drives sparklines and 24h change. */
  priceHistory?: readonly number[];
};
export type CryptoHistoryPoint = { label: string; value: number };
export type CryptoTransaction = {
  id: string;
  kind: "send" | "receive" | "swap";
  status: "pending" | "confirmed" | "failed";
  title: string;
  amount: string;
  symbol: string;
  /** Received leg of a swap. */
  toAmount?: string;
  toSymbol?: string;
  network: string;
  date: string;
  address: string;
  fee: string;
  hash?: string;
  explorerUrl?: string;
  usdValue?: number;
};

export const CRYPTO_ASSETS: CryptoAsset[] = [
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    network: "Ethereum",
    decimals: 18,
    balance: "1.42",
    usdPrice: 2400,
    priceHistory: [2293, 2320, 2305, 2345, 2332, 2370, 2355, 2390, 2378, 2400],
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    network: "Ethereum",
    decimals: 6,
    balance: "4280.50",
    usdPrice: 1,
    priceHistory: [
      1.0001, 1.0003, 0.9999, 1.0002, 1, 1.0003, 1.0001, 0.9998, 1.0001, 1,
    ],
  },
  {
    id: "wbtc",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    network: "Ethereum",
    decimals: 8,
    balance: "0.035",
    usdPrice: 60000,
    priceHistory: [
      61800, 61500, 61900, 61100, 61400, 60700, 60900, 60200, 60400, 60000,
    ],
  },
  {
    id: "link",
    symbol: "LINK",
    name: "Chainlink",
    network: "Ethereum",
    decimals: 18,
    balance: "42.6",
    usdPrice: 14.82,
    priceHistory: [
      14.1, 14.35, 14.2, 14.6, 14.48, 14.9, 14.71, 14.95, 14.8, 14.82,
    ],
  },
  {
    id: "arb",
    symbol: "ARB",
    name: "Arbitrum",
    network: "Arbitrum",
    decimals: 18,
    balance: "820",
    usdPrice: 0.62,
    priceHistory: [
      0.66, 0.65, 0.655, 0.64, 0.645, 0.63, 0.635, 0.62, 0.625, 0.62,
    ],
  },
];

/** Demo "now". Sample history labels count back from this date. */
export const CRYPTO_REFERENCE_DATE = "2026-09-08T12:00:00Z";

const dayLabel = (daysAgo: number) => {
  const date = new Date(CRYPTO_REFERENCE_DATE);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].concat([
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
]);

/** Relative curve shapes ending at 1, scaled to a value per series. */
const SHAPES = {
  "1D": {
    values: [0.982, 0.986, 0.979, 0.988, 0.993, 0.989, 0.996, 1],
    label: (index: number) => `${String(index * 3).padStart(2, "0")}:00`,
  },
  "1W": {
    values: [0.909, 0.94, 0.927, 0.956, 0.94, 0.987, 1],
    label: (index: number) => dayLabel(6 - index),
  },
  "1M": {
    values: [
      0.766, 0.828, 0.807, 0.884, 0.86, 0.94, 0.92, 0.899, 0.96, 0.948, 0.986,
      1,
    ],
    label: (index: number) => dayLabel((11 - index) * 3),
  },
  "1Y": {
    values: [
      0.327, 0.398, 0.49, 0.47, 0.582, 0.674, 0.644, 0.807, 0.771, 0.899, 0.94,
      1,
    ],
    label: (index: number) => MONTHS[index],
  },
} as const;

/** Builds sample history for every range that ends at `current`. */
export function cryptoSampleHistory(
  current: number,
): Record<string, CryptoHistoryPoint[]> {
  return Object.fromEntries(
    Object.entries(SHAPES).map(([range, shape]) => [
      range,
      shape.values.map((ratio, index) => ({
        label: shape.label(index),
        value: Math.round(current * ratio * 100) / 100,
      })),
    ]),
  );
}

export const cryptoAssetValue = (asset: CryptoAsset) =>
  Number(asset.balance) * asset.usdPrice;

export const CRYPTO_HISTORY = cryptoSampleHistory(
  CRYPTO_ASSETS.reduce((sum, asset) => sum + cryptoAssetValue(asset), 0),
);

export const CRYPTO_TRANSACTIONS: CryptoTransaction[] = [
  {
    id: "tx-1",
    kind: "swap",
    status: "pending",
    title: "Swap ETH for USDC",
    amount: "0.15",
    toAmount: "358.92",
    toSymbol: "USDC",
    usdValue: 360,
    symbol: "ETH",
    network: "Ethereum",
    date: "2026-09-08T08:42:00Z",
    address: "Demo swap router",
    fee: "Estimated $0.42",
  },
  {
    id: "tx-2",
    kind: "receive",
    status: "confirmed",
    title: "Received USDC",
    amount: "500",
    usdValue: 500,
    symbol: "USDC",
    network: "Ethereum",
    date: "2026-09-08T07:15:00Z",
    address: "0x8b3f4c21a9d07e65b1f2c3d4e5f6a7b8c9d0e1f2",
    fee: "Paid by sender",
  },
  {
    id: "tx-3",
    kind: "send",
    status: "confirmed",
    title: "Sent ETH",
    amount: "0.08",
    usdValue: 192,
    symbol: "ETH",
    network: "Ethereum",
    date: "2026-09-07T15:30:00Z",
    address: "0x51ac0e9d8f7b6a5c4d3e2f1a0b9c8d7e6f5a4b3c",
    fee: "$0.38",
  },
  {
    id: "tx-4",
    kind: "receive",
    status: "confirmed",
    title: "Received ARB",
    amount: "320",
    usdValue: 198.4,
    symbol: "ARB",
    network: "Arbitrum",
    date: "2026-09-07T09:05:00Z",
    address: "0xc0ffee2546a3b8d9e1f0c7a6b5d4e3f2a1b0c9d8",
    fee: "Paid by sender",
  },
  {
    id: "tx-5",
    kind: "swap",
    status: "failed",
    title: "Swap USDC for WBTC",
    amount: "250",
    toAmount: "0.00415",
    toSymbol: "WBTC",
    usdValue: 250,
    symbol: "USDC",
    network: "Ethereum",
    date: "2026-09-06T10:20:00Z",
    address: "Demo swap router",
    fee: "$0.24",
  },
  {
    id: "tx-6",
    kind: "swap",
    status: "confirmed",
    title: "Swap USDC for LINK",
    amount: "630",
    toAmount: "42.6",
    toSymbol: "LINK",
    usdValue: 630,
    symbol: "USDC",
    network: "Ethereum",
    date: "2026-08-29T14:10:00Z",
    address: "Demo swap router",
    fee: "$0.51",
  },
  {
    id: "tx-7",
    kind: "receive",
    status: "confirmed",
    title: "Received Ethereum",
    amount: "0.6",
    usdValue: 1440,
    symbol: "ETH",
    network: "Ethereum",
    date: "2026-08-26T10:00:00Z",
    address: "Ledger",
    fee: "$0.32",
  },
  {
    id: "tx-8",
    kind: "send",
    status: "confirmed",
    title: "Sent USDC",
    amount: "250",
    usdValue: 250,
    symbol: "USDC",
    network: "Ethereum",
    date: "2026-08-20T10:00:00Z",
    address: "Demo recipient",
    fee: "$0.18",
  },
];

export const cryptoUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export const cryptoAmount = (value: string) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(
    Number(value),
  );

/** Percent change across a price series, or null without enough data. */
export function cryptoSeriesChange(values: readonly number[] = []) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  if (clean.length < 2) return null;
  return ((clean[clean.length - 1] - clean[0]) / clean[0]) * 100;
}

export const shortCryptoAddress = (address: string) =>
  address.startsWith("0x") && address.length > 14
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
