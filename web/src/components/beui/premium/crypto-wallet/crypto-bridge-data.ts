import {
  CRYPTO_TRADE_SLIPPAGE,
  type CryptoTradeToken,
} from "./crypto-trade-data";

export type CryptoBridgeRoute = {
  id: string;
  /** Bridge or solver name. */
  name: string;
  /** Typical time to arrive, in seconds. */
  etaSeconds: number;
  /** Flat fee in USD covering gas on both sides. */
  feeUsd: number;
  /** Protocol fee as a fraction of the amount. */
  feeRate: number;
  tag?: string;
};

export type CryptoBridgeRequest = {
  /** Token ids; each token carries its network. */
  from: string;
  to: string;
  /** Destination address or ENS name. */
  recipient: string;
  route: string;
  amountIn: number;
  amountOut: number;
  minimumReceived: number;
};

/** Where a submitted transfer is: signing, source confirmation, relaying, or received. */
export type CryptoBridgeStage = "sign" | "sent" | "relay" | "received";

export type CryptoBridgeLabels = {
  title: string;
  from: string;
  to: string;
  flip: string;
  max: string;
  myWallet: string;
  sendTo: string;
  recipientLabel: string;
  recipientPlaceholder: string;
  invalidRecipient: string;
  contacts: string;
  route: string;
  routes: string;
  rate: string;
  minimumReceived: string;
  fee: string;
  arrivesIn: string;
  enterAmount: string;
  enterRecipient: string;
  insufficient: (symbol: string) => string;
  bridge: (symbol: string, network: string) => string;
  swap: (symbol: string) => string;
  signing: string;
  failed: string;
  stages: Record<CryptoBridgeStage, string>;
  stageDetail: Record<CryptoBridgeStage, (network: string) => string>;
  timeLeft: string;
  received: (amount: string, network: string, recipient: string) => string;
  viewTx: string;
  again: string;
};

export const CRYPTO_BRIDGE_LABELS: CryptoBridgeLabels = {
  title: "Bridge",
  from: "From",
  to: "To",
  flip: "Switch tokens",
  max: "Max",
  myWallet: "My wallet",
  sendTo: "Send to",
  recipientLabel: "Recipient on the destination network",
  recipientPlaceholder: "Address or ENS name",
  invalidRecipient: "Enter a valid address or .eth name",
  contacts: "Contacts",
  route: "Route",
  routes: "Choose a route",
  rate: "Rate",
  minimumReceived: "Minimum received",
  fee: "Fee",
  arrivesIn: "Arrives in",
  enterAmount: "Enter an amount",
  enterRecipient: "Enter a recipient",
  insufficient: (symbol) => `Not enough ${symbol}`,
  bridge: (symbol, network) => `Bridge to ${symbol} on ${network}`,
  swap: (symbol) => `Swap to ${symbol}`,
  signing: "Confirm in wallet",
  failed: "The bridge didn’t go through. Your funds didn’t move.",
  stages: {
    sign: "Sign in wallet",
    sent: "Source confirmation",
    relay: "Relaying",
    received: "Received",
  },
  stageDetail: {
    sign: () => "Approve the transfer in your wallet",
    sent: (network) => `Waiting for ${network} to confirm`,
    relay: () => "The solver is filling your transfer",
    received: (network) => `Delivered on ${network}`,
  },
  timeLeft: "left",
  received: (amount, network, recipient) =>
    `${amount} arrived on ${network} for ${recipient}`,
  viewTx: "View on explorer",
  again: "Bridge again",
};

export const CRYPTO_BRIDGE_ROUTES: CryptoBridgeRoute[] = [
  {
    id: "relay",
    name: "Relay",
    etaSeconds: 18,
    feeUsd: 0.92,
    feeRate: 0.0006,
    tag: "Fastest",
  },
  {
    id: "across",
    name: "Across",
    etaSeconds: 75,
    feeUsd: 0.41,
    feeRate: 0.0004,
    tag: "Cheapest",
  },
  {
    id: "stargate",
    name: "Stargate",
    etaSeconds: 180,
    feeUsd: 1.1,
    feeRate: 0.0006,
  },
];

/** Default pair: ETH on Ethereum to USDC on Base. */
export const CRYPTO_BRIDGE_DEFAULT_FROM = "eth-ethereum";
export const CRYPTO_BRIDGE_DEFAULT_TO = "usdc-base";

/** Swap fee applied when the destination token differs from the source. */
const SWAP_FEE = 0.003;

export const bridgeEta = (seconds: number) =>
  seconds < 60 ? `~${seconds}s` : `~${Math.round(seconds / 60)} min`;

/**
 * Simulated cross-chain quote: protocol and flat fees, plus a swap fee and
 * slippage buffer when the token changes on the way.
 */
export function quoteBridge(
  from: CryptoTradeToken,
  to: CryptoTradeToken,
  route: CryptoBridgeRoute,
  amountIn: number,
) {
  const swapping = from.symbol !== to.symbol;
  const usdIn = amountIn * from.usdPrice;
  const feeUsd =
    amountIn > 0
      ? usdIn * route.feeRate + route.feeUsd + (swapping ? usdIn * SWAP_FEE : 0)
      : 0;
  const amountOut = Math.max(0, (usdIn - feeUsd) / to.usdPrice);
  return {
    swapping,
    amountOut,
    feeUsd,
    rate: from.usdPrice / to.usdPrice,
    minimumReceived: swapping
      ? amountOut * (1 - CRYPTO_TRADE_SLIPPAGE)
      : amountOut,
  };
}
