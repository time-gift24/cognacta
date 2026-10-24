import {
  CRYPTO_TRADE_CONTACTS,
  CRYPTO_TRADE_TOKENS,
  type CryptoTradeContact,
  type CryptoTradeToken,
  isRecipient,
  shortAddress,
} from "../crypto-wallet/crypto-trade-data";

/** A transaction the agent proposes. Nothing runs until the user approves. */
export type CryptoAgentAction =
  | {
      kind: "swap";
      /** Token ids. */
      from: string;
      to: string;
      amountIn: number;
    }
  | {
      kind: "send";
      /** Token id. */
      token: string;
      amount: number;
      /** Contact id, ENS name, or address. */
      recipient: string;
    }
  | {
      kind: "approve";
      /** Token id. */
      token: string;
      spender: string;
      spenderName: string;
      /** Allowance in whole token units. */
      amount: number;
    };

export type CryptoAgentActionStatus =
  | "pending"
  | "signing"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "failed";

/** A tool call the agent ran before answering, such as a balance check. */
export type CryptoAgentStep = {
  label: string;
  detail?: string;
  state?: "running" | "done";
};

export type CryptoAgentMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "agent";
      text: string;
      steps?: CryptoAgentStep[];
      /** True while tool steps resolve; the text and card wait for it. */
      working?: boolean;
      action?: CryptoAgentAction;
      status?: CryptoAgentActionStatus;
      hash?: string;
    };

export type CryptoAgentReply = {
  text: string;
  steps?: CryptoAgentStep[];
  action?: CryptoAgentAction;
};

export type CryptoAgentContext = {
  tokens: CryptoTradeToken[];
  contacts: CryptoTradeContact[];
};

export type CryptoAgentLabels = {
  agentName: string;
  agentStatus: string;
  greeting: string;
  greetingBody: string;
  placeholder: string;
  send: string;
  thinking: string;
  suggestions: string;
  approve: string;
  reject: string;
  signing: string;
  confirmed: string;
  rejected: string;
  failed: string;
  retry: string;
  refreshQuote: string;
  quoteExpires: string;
  viewTx: string;
  steps: [sign: string, submit: string, confirm: string];
  networkFee: string;
  pay: string;
  sending: string;
  receive: string;
  rate: string;
  minimumReceived: string;
  priceImpact: string;
  balanceAfter: string;
  allowance: string;
  exactAmount: string;
  spender: string;
  titles: Record<CryptoAgentAction["kind"], string>;
  declinedReply: string;
  failedReply: string;
  confirmedReply: (action: CryptoAgentAction, summary: string) => string;
};

export const CRYPTO_AGENT_LABELS: CryptoAgentLabels = {
  agentName: "Atlas",
  agentStatus: "Wallet agent",
  greeting: "What should we move today?",
  greetingBody:
    "Ask in plain words. I prepare every transaction as a card, and nothing is signed until you approve it.",
  placeholder: "Ask to swap, send, or approve",
  send: "Send message",
  thinking: "Thinking",
  suggestions: "Try asking",
  approve: "Approve",
  reject: "Decline",
  signing: "Confirm in wallet",
  confirmed: "Confirmed",
  rejected: "Declined",
  failed: "Failed",
  retry: "Try again",
  refreshQuote: "Refresh quote",
  quoteExpires: "Quote refreshes in",
  viewTx: "View on explorer",
  steps: ["Sign", "Submitted", "Confirmed"],
  networkFee: "Network fee",
  pay: "You pay",
  sending: "You send",
  receive: "You receive",
  rate: "Rate",
  minimumReceived: "Minimum received",
  priceImpact: "Price impact",
  balanceAfter: "Balance after",
  allowance: "Allowance",
  exactAmount: "Exact amount only",
  spender: "Spender",
  titles: {
    swap: "Swap",
    send: "Send",
    approve: "Token approval",
  },
  declinedReply: "No problem. I cancelled that, and nothing was signed.",
  failedReply: "The transaction didn’t go through. Your funds didn’t move.",
  confirmedReply: (_action, summary) => `Done. ${summary}`,
};

export type CryptoAgentSuggestion = {
  kind: CryptoAgentAction["kind"];
  title: string;
  prompt: string;
};

export const CRYPTO_AGENT_SUGGESTIONS: CryptoAgentSuggestion[] = [
  { kind: "swap", title: "Swap tokens", prompt: "Swap 0.5 ETH to USDC" },
  { kind: "send", title: "Pay a contact", prompt: "Send 120 USDC to lena.eth" },
  {
    kind: "approve",
    title: "Set an allowance",
    prompt: "Approve 500 USDC for Uniswap",
  },
];

export const CRYPTO_AGENT_TOKENS = CRYPTO_TRADE_TOKENS;
export const CRYPTO_AGENT_CONTACTS = CRYPTO_TRADE_CONTACTS;

export const CRYPTO_AGENT_INITIAL_MESSAGES: CryptoAgentMessage[] = [];

/** Seconds a swap quote stays valid before it needs a refresh. */
export const CRYPTO_AGENT_QUOTE_TTL = 30;

const findToken = (tokens: CryptoTradeToken[], symbol: string) =>
  tokens.find(
    (item) =>
      item.symbol.toLowerCase() === symbol.toLowerCase() && item.balance > 0,
  ) ??
  tokens.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);

/**
 * Demo intent parser standing in for a model. Real apps pass `respond` and
 * return the tool call their agent produced.
 */
export function demoRespond(
  prompt: string,
  { tokens, contacts }: CryptoAgentContext,
): CryptoAgentReply {
  const text = prompt.trim();
  const swap = text.match(
    /(?:swap|convert|trade)\s+([\d.]+)\s+(\w+)\s+(?:to|for|into)\s+(\w+)/i,
  );
  if (swap) {
    const from = findToken(tokens, swap[2]);
    const to = findToken(tokens, swap[3]);
    const amountIn = Number.parseFloat(swap[1]);
    if (!from || !to || from.id === to.id)
      return { text: "I couldn’t find that pair in your wallet’s tokens." };
    if (amountIn > from.balance)
      return {
        text: `You have ${fmt(from.balance)} ${from.symbol}, which isn’t enough for that swap.`,
      };
    return {
      text: `Here’s the best route I found for ${fmt(amountIn)} ${from.symbol}. Review it and approve when you’re ready.`,
      steps: [
        {
          label: "Checked balance",
          detail: `${fmt(from.balance)} ${from.symbol} available`,
        },
        { label: "Compared 4 routes", detail: "Uniswap v3 · 0.05% pool" },
        { label: "Simulated swap", detail: "No reverts, 0.5% max slippage" },
      ],
      action: { kind: "swap", from: from.id, to: to.id, amountIn },
    };
  }

  const send = text.match(
    /(?:send|pay|transfer)\s+([\d.]+)\s+(\w+)\s+to\s+(\S+)/i,
  );
  if (send) {
    const token = findToken(tokens, send[2]);
    const amount = Number.parseFloat(send[1]);
    const name = send[3].replace(/[.,!?]$/, "");
    const contact = contacts.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );
    if (!token) return { text: `I don’t see ${send[2]} in your wallet.` };
    if (!contact && !isRecipient(name))
      return {
        text: "That recipient doesn’t look like an address or ENS name.",
      };
    if (amount > token.balance)
      return {
        text: `You only have ${fmt(token.balance)} ${token.symbol} on ${token.network}.`,
      };
    return {
      text: `Ready to send ${fmt(amount)} ${token.symbol} to ${contact?.name ?? name}. The address matches your saved contact.`,
      steps: [
        {
          label: contact ? `Resolved ${contact.name}` : "Checked address",
          detail: contact ? shortAddress(contact.address) : shortAddress(name),
        },
        {
          label: "Checked balance",
          detail: `${fmt(token.balance)} ${token.symbol} available`,
        },
        { label: "Simulated transfer", detail: "No reverts" },
      ],
      action: {
        kind: "send",
        token: token.id,
        amount,
        recipient: contact?.id ?? name,
      },
    };
  }

  const approve = text.match(/approve\s+([\d.]+)\s+(\w+)(?:\s+for\s+(\w+))?/i);
  if (approve) {
    const token = findToken(tokens, approve[2]);
    if (!token) return { text: `I don’t see ${approve[2]} in your wallet.` };
    const spenderName = approve[3] ?? "Uniswap";
    return {
      text: `This lets ${spenderName} spend up to ${fmt(Number.parseFloat(approve[1]))} ${token.symbol}. I capped it at the exact amount instead of unlimited.`,
      steps: [
        { label: "Verified spender", detail: `${spenderName} router` },
        {
          label: "Read current allowance",
          detail: `0 ${token.symbol}`,
        },
      ],
      action: {
        kind: "approve",
        token: token.id,
        amount: Number.parseFloat(approve[1]),
        spender: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
        spenderName,
      },
    };
  }

  return {
    text: "I can swap tokens, send to a contact or address, and set token approvals. Try “Swap 0.5 ETH to USDC”.",
  };
}

/** Deterministic fake transaction hash for demo mode. */
export const demoHash = (seed: string) => {
  let value = 0x811c9dc5;
  let hash = "0x";
  for (let index = 0; index < 64; index += 1) {
    value ^= seed.charCodeAt(index % seed.length) + index;
    value = Math.imul(value, 0x01000193) >>> 0;
    hash += (value & 15).toString(16);
  }
  return hash;
};

export const demoDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
