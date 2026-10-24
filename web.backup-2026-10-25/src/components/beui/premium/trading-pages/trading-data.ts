import type { Candle } from "@/components/beui/charts/candlestick-chart";
import { seededRandom } from "@/components/beui/premium/crypto-markets/order-book-data";

export type TradeSide = "buy" | "sell";
export type OrderType = "limit" | "market";

export type TradingOrder = {
  id: string;
  side: TradeSide;
  type: OrderType;
  price: number;
  amount: number;
  status: "open" | "filled" | "cancelled";
  /** Display time, such as "12:04:31". */
  time: string;
};

export type TradingBalances = Record<
  string,
  { available: number; locked: number }
>;

export type PlaceOrderRequest = {
  side: TradeSide;
  type: OrderType;
  /** Limit price, or the execution price for market orders. */
  price: number;
  amount: number;
};

export type Timeframe = { id: string; label: string; seconds: number };

export const TIMEFRAMES: Timeframe[] = [
  { id: "1m", label: "1m", seconds: 60 },
  { id: "5m", label: "5m", seconds: 300 },
  { id: "15m", label: "15m", seconds: 900 },
  { id: "1h", label: "1h", seconds: 3600 },
];

// The two sample open orders below hold 1,798.88 USDC and 0.4 ETH in orders.
export const TRADING_BALANCES: TradingBalances = {
  ETH: { available: 4.218, locked: 0.4 },
  USDC: { available: 12_480.5, locked: 1798.875 },
};

export const TRADING_ORDERS: TradingOrder[] = [
  {
    id: "o-1",
    side: "buy",
    type: "limit",
    price: 2398.5,
    amount: 0.75,
    status: "open",
    time: "11:52:08",
  },
  {
    id: "o-2",
    side: "sell",
    type: "limit",
    price: 2436.0,
    amount: 0.4,
    status: "open",
    time: "11:47:51",
  },
  {
    id: "o-3",
    side: "buy",
    type: "market",
    price: 2405.2,
    amount: 1.2,
    status: "filled",
    time: "10:31:12",
  },
  {
    id: "o-4",
    side: "sell",
    type: "limit",
    price: 2390.0,
    amount: 0.5,
    status: "cancelled",
    time: "09:12:40",
  },
];

export type TradingLabels = {
  chart: string;
  book: string;
  trades: string;
  buy: string;
  sell: string;
  limit: string;
  market: string;
  price: string;
  amount: string;
  total: string;
  available: string;
  marketPrice: string;
  openOrders: string;
  history: string;
  balances: string;
  cancel: string;
  side: string;
  type: string;
  status: string;
  time: string;
  asset: string;
  locked: string;
  enterAmount: string;
  insufficient: (asset: string) => string;
  placing: string;
  placed: string;
  noOpenOrders: string;
  noHistory: string;
  timeframe: string;
  fee: string;
};

export const TRADING_LABELS: TradingLabels = {
  chart: "Chart",
  book: "Book",
  trades: "Trades",
  buy: "Buy",
  sell: "Sell",
  limit: "Limit",
  market: "Market",
  price: "Price",
  amount: "Amount",
  total: "Total",
  available: "Available",
  marketPrice: "Best market price",
  openOrders: "Open orders",
  history: "Order history",
  balances: "Balances",
  cancel: "Cancel",
  side: "Side",
  type: "Type",
  status: "Status",
  time: "Time",
  asset: "Asset",
  locked: "In orders",
  enterAmount: "Enter an amount",
  insufficient: (asset) => `Not enough ${asset}`,
  placing: "Placing",
  placed: "Placed",
  noOpenOrders:
    "No open orders. Limit orders wait here until the price reaches them.",
  noHistory: "Filled and cancelled orders appear here.",
  timeframe: "Timeframe",
  fee: "Fee",
};

/** Taker fee as a fraction of the order total. */
export const TRADING_FEE = 0.001;

const REFERENCE_SECONDS = 12 * 3600 + 4 * 60;

export const clockLabel = (seconds: number, withSeconds = false) => {
  const day = ((seconds % 86400) + 86400) % 86400;
  const h = String(Math.floor(day / 3600)).padStart(2, "0");
  const m = String(Math.floor((day % 3600) / 60)).padStart(2, "0");
  const s = String(day % 60).padStart(2, "0");
  return withSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
};

/**
 * Deterministic candles that end at `endPrice`, one per timeframe step up to
 * the demo reference time. Larger timeframes move further per candle.
 */
export function sampleCandles(
  timeframe: Timeframe,
  endPrice: number,
  count = 64,
): Candle[] {
  const random = seededRandom(timeframe.seconds);
  const volatility = 0.0011 * Math.sqrt(timeframe.seconds / 60);
  const closes: number[] = [endPrice];
  for (let index = 1; index < count; index++) {
    const drift = (random() - 0.48) * volatility;
    closes.unshift(closes[0] / (1 + drift));
  }
  return closes.map((close, index) => {
    const open =
      index === 0
        ? close * (1 - (random() - 0.5) * volatility)
        : closes[index - 1];
    const spread = Math.abs(close - open) + close * volatility * random() * 0.6;
    const start = REFERENCE_SECONDS - (count - 1 - index) * timeframe.seconds;
    return {
      id: `${timeframe.id}-${start}`,
      label: clockLabel(start),
      open,
      close,
      high: Math.max(open, close) + spread * random() * 0.6,
      low: Math.min(open, close) - spread * random() * 0.6,
      volume: 40 + random() * 260 * Math.sqrt(timeframe.seconds / 60),
    };
  });
}

export const usd = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
