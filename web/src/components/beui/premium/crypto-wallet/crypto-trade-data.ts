export type CryptoTradeMode = "swap" | "send" | "buy";

export type CryptoTradeNetwork = {
  id: string;
  name: string;
};

export type CryptoTradeToken = {
  /** Unique per network, since one symbol can live on several chains. */
  id: string;
  symbol: string;
  name: string;
  /** Matches a `CryptoTradeNetwork` id. */
  network: string;
  /** Wallet balance in whole token units. */
  balance: number;
  usdPrice: number;
  /** Maximum fraction digits shown for amounts of this token. */
  precision: number;
  /** 24h price change in percent. */
  change24h?: number;
  /** Shown as a quick pick above the token search. */
  popular?: boolean;
};

export type CryptoTradeContact = {
  id: string;
  name: string;
  address: string;
  avatar?: string;
};

export type CryptoTradePaymentMethod = {
  id: string;
  label: string;
  detail: string;
  /** Percentage fee applied to card or bank purchases. */
  feePercent: number;
  /** Picks the row icon. Defaults to card. */
  kind?: "card" | "bank" | "wallet";
};

export type CryptoSwapRequest = {
  /** Token ids. */
  from: string;
  to: string;
  amountIn: number;
  amountOut: number;
  minimumReceived: number;
};
export type CryptoSendRequest = {
  /** Token id. */
  token: string;
  amount: number;
  recipient: string;
};
export type CryptoBuyRequest = {
  /** Token id. */
  token: string;
  usdAmount: number;
  amountOut: number;
  paymentMethod: string;
};

export type CryptoTradeLabels = {
  swap: string;
  send: string;
  buy: string;
  sell: string;
  receive: string;
  flip: string;
  max: string;
  balance: string;
  enterAmount: string;
  insufficient: (symbol: string) => string;
  review: string;
  confirming: string;
  done: string;
  recipient: string;
  recipientPlaceholder: string;
  invalidRecipient: string;
  recent: string;
  networkFee: string;
  priceImpact: string;
  minimumReceived: string;
  slippage: string;
  youGet: string;
  payWith: string;
  fee: string;
  chooseToken: string;
  searchTokens: string;
  noTokens: string;
  popular: string;
  yourTokens: string;
  allTokens: string;
  allNetworks: string;
  networks: string;
};

export const CRYPTO_TRADE_LABELS: CryptoTradeLabels = {
  swap: "Swap",
  send: "Send",
  buy: "Buy",
  sell: "You pay",
  receive: "You receive",
  flip: "Switch tokens",
  max: "Max",
  balance: "Balance",
  enterAmount: "Enter an amount",
  insufficient: (symbol) => `Not enough ${symbol}`,
  review: "Review",
  confirming: "Confirming",
  done: "Confirmed",
  recipient: "To",
  recipientPlaceholder: "Address or ENS name",
  invalidRecipient: "Enter a valid address or .eth name",
  recent: "Recent",
  networkFee: "Network fee",
  priceImpact: "Price impact",
  minimumReceived: "Minimum received",
  slippage: "Max slippage",
  youGet: "You get",
  payWith: "Pay with",
  fee: "fee",
  chooseToken: "Choose a token",
  searchTokens: "Search name or symbol",
  noTokens: "No tokens match your search",
  popular: "Popular",
  yourTokens: "Your tokens",
  allTokens: "All tokens",
  allNetworks: "All",
  networks: "Networks",
};

export const CRYPTO_TRADE_NETWORKS: CryptoTradeNetwork[] = [
  { id: "ethereum", name: "Ethereum" },
  { id: "base", name: "Base" },
  { id: "arbitrum", name: "Arbitrum" },
  { id: "optimism", name: "Optimism" },
  { id: "polygon", name: "Polygon" },
];

const token = (
  symbol: string,
  name: string,
  network: string,
  usdPrice: number,
  rest: Partial<CryptoTradeToken> = {},
): CryptoTradeToken => ({
  id: `${symbol.toLowerCase()}-${network}`,
  symbol,
  name,
  network,
  usdPrice,
  balance: 0,
  precision: usdPrice >= 1000 ? 8 : usdPrice >= 0.5 ? 6 : 2,
  ...rest,
});

export const CRYPTO_TRADE_TOKENS: CryptoTradeToken[] = [
  token("ETH", "Ethereum", "ethereum", 2412.38, {
    balance: 3.184,
    change24h: 2.41,
    popular: true,
  }),
  token("USDC", "USD Coin", "ethereum", 1, {
    balance: 6240.5,
    precision: 2,
    change24h: 0.01,
    popular: true,
  }),
  token("WBTC", "Wrapped Bitcoin", "ethereum", 60284.1, {
    balance: 0.0815,
    change24h: 1.12,
    popular: true,
  }),
  token("LINK", "Chainlink", "ethereum", 14.82, {
    balance: 42.6,
    change24h: -1.84,
  }),
  token("USDT", "Tether", "ethereum", 1, {
    precision: 2,
    change24h: -0.02,
    popular: true,
  }),
  token("DAI", "Dai", "ethereum", 1, { precision: 2, change24h: 0 }),
  token("UNI", "Uniswap", "ethereum", 8.41, { change24h: 3.67 }),
  token("AAVE", "Aave", "ethereum", 162.5, { change24h: -0.92 }),
  token("PEPE", "Pepe", "ethereum", 0.0000094, { change24h: 8.15 }),
  token("ETH", "Ethereum", "base", 2412.38, {
    balance: 0.42,
    change24h: 2.41,
  }),
  token("USDC", "USD Coin", "base", 1, {
    balance: 1250,
    precision: 2,
    change24h: 0.01,
  }),
  token("ARB", "Arbitrum", "arbitrum", 0.62, {
    balance: 820,
    change24h: -2.37,
  }),
  token("USDC", "USD Coin", "arbitrum", 1, { precision: 2, change24h: 0.01 }),
  token("OP", "Optimism", "optimism", 1.48, { change24h: 4.06 }),
  token("POL", "Polygon", "polygon", 0.38, { change24h: -0.54 }),
];

const AVATAR = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&fm=webp&q=80&w=96`;

export const CRYPTO_TRADE_CONTACTS: CryptoTradeContact[] = [
  {
    id: "lena",
    name: "lena.eth",
    address: "0x8b3f4c21a9d07e65b1f2c3d4e5f6a7b8c9d0e1f2",
    avatar: AVATAR("1494790108377-be9c29b29330"),
  },
  {
    id: "marco",
    name: "marco.eth",
    address: "0x51ac0e9d8f7b6a5c4d3e2f1a0b9c8d7e6f5a4b3c",
    avatar: AVATAR("1500648767791-00dcc994a43e"),
  },
  {
    id: "ivy",
    name: "ivy.eth",
    address: "0xc0ffee2546a3b8d9e1f0c7a6b5d4e3f2a1b0c9d8",
    avatar: AVATAR("1534528741775-53994a69daeb"),
  },
];

export const CRYPTO_TRADE_PAYMENT_METHODS: CryptoTradePaymentMethod[] = [
  {
    id: "card",
    label: "Debit card",
    detail: "Visa •• 4021 · Instant",
    feePercent: 1.5,
    kind: "card",
  },
  {
    id: "bank",
    label: "Bank transfer",
    detail: "Checking •• 8830 · 1–2 days",
    feePercent: 0.5,
    kind: "bank",
  },
  {
    id: "mobile",
    label: "Mobile wallet",
    detail: "Apple Pay or Google Pay · Instant",
    feePercent: 1.2,
    kind: "wallet",
  },
];

export const CRYPTO_TRADE_BUY_PRESETS = [50, 100, 250, 500] as const;

/** Swap fee and slippage defaults for the simulated quote. */
export const CRYPTO_TRADE_SWAP_FEE = 0.003;
export const CRYPTO_TRADE_SLIPPAGE = 0.005;
export const CRYPTO_TRADE_NETWORK_FEE_USD = 1.84;

export const tradeUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

/** Price formatter that keeps significant digits for sub-cent tokens. */
export const tradePrice = (value: number) =>
  value >= 0.01 || value <= 0
    ? tradeUsd(value)
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumSignificantDigits: 3,
      }).format(value);

export const tradeAmount = (value: number, precision = 6) => {
  if (!Number.isFinite(value) || value <= 0) return "0";
  // Keep significant digits for dust so tiny rates never collapse to zero.
  if (value < 0.0001)
    return new Intl.NumberFormat("en-US", {
      maximumSignificantDigits: 3,
    }).format(value);
  // Show more digits for small amounts.
  const digits = value < 1 ? Math.min(precision, 6) : Math.min(precision, 4);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
};

/** Keep only digits and a single decimal separator from typed input. */
export const sanitizeAmount = (raw: string, precision: number) => {
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (!rest.length) return whole.replace(/^0+(?=\d)/, "");
  return `${whole.replace(/^0+(?=\d)/, "") || "0"}.${rest.join("").slice(0, precision)}`;
};

export const parseAmount = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Simulated constant-rate quote with a fee and a size-based price impact. */
export function quoteSwap(
  from: CryptoTradeToken,
  to: CryptoTradeToken,
  amountIn: number,
) {
  const usdIn = amountIn * from.usdPrice;
  const impact = Math.min(0.08, usdIn / 4_000_000);
  const amountOut =
    (usdIn * (1 - CRYPTO_TRADE_SWAP_FEE) * (1 - impact)) / to.usdPrice;
  return {
    amountOut,
    usdOut: amountOut * to.usdPrice,
    rate: from.usdPrice / to.usdPrice,
    impact,
    minimumReceived: amountOut * (1 - CRYPTO_TRADE_SLIPPAGE),
  };
}

export const isRecipient = (value: string) =>
  /^0x[a-fA-F0-9]{40}$/.test(value.trim()) ||
  /^[a-z0-9-]+\.eth$/i.test(value.trim());

export const shortAddress = (address: string) =>
  address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
