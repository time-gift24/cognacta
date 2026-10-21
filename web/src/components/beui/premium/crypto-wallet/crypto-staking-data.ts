export type CryptoVaultRisk = "low" | "medium" | "high";

export type CryptoVault = {
  id: string;
  name: string;
  /** Strategy summary, such as "Liquid staking". */
  strategy: string;
  symbol: string;
  network: string;
  /** Annual yield in percent. */
  apy: number;
  /** Recent APY readings, oldest first. */
  apyHistory?: readonly number[];
  /** Total value locked, in USD. */
  tvl: number;
  /** Unbonding period in days. 0 means flexible. */
  lockDays: number;
  risk: CryptoVaultRisk;
  usdPrice: number;
  /** Wallet balance available to stake. */
  available: number;
  /** Fraction digits for amounts of this token. */
  precision: number;
};

export type CryptoStakePosition = {
  vaultId: string;
  staked: number;
  /** Rewards accrued when the block mounts. */
  rewards: number;
};

export type CryptoStakeRequest = { vaultId: string; amount: number };
export type CryptoClaimRequest = { vaultId: string; rewards: number };

export const CRYPTO_VAULT_RISK: Record<
  CryptoVaultRisk,
  { label: string; tone: string }
> = {
  low: {
    label: "Low risk",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  medium: {
    label: "Medium risk",
    tone: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  high: {
    label: "High risk",
    tone: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

export const CRYPTO_VAULTS: CryptoVault[] = [
  {
    id: "eth-liquid",
    name: "Ethereum staking",
    strategy: "Liquid staking",
    symbol: "ETH",
    network: "Ethereum",
    apy: 3.82,
    apyHistory: [3.61, 3.7, 3.66, 3.74, 3.79, 3.72, 3.8, 3.85, 3.78, 3.82],
    tvl: 1_240_000_000,
    lockDays: 0,
    risk: "low",
    usdPrice: 2412.38,
    available: 3.184,
    precision: 8,
  },
  {
    id: "usdc-lending",
    name: "Stable yield",
    strategy: "Overcollateralized lending",
    symbol: "USDC",
    network: "Ethereum",
    apy: 6.41,
    apyHistory: [5.92, 6.1, 6.35, 6.2, 6.48, 6.55, 6.3, 6.44, 6.38, 6.41],
    tvl: 812_000_000,
    lockDays: 0,
    risk: "low",
    usdPrice: 1,
    available: 6240.5,
    precision: 6,
  },
  {
    id: "arb-delegation",
    name: "Arbitrum delegation",
    strategy: "Governance staking",
    symbol: "ARB",
    network: "Arbitrum",
    apy: 7.24,
    apyHistory: [7.8, 7.62, 7.55, 7.4, 7.48, 7.31, 7.36, 7.2, 7.28, 7.24],
    tvl: 96_400_000,
    lockDays: 21,
    risk: "medium",
    usdPrice: 0.62,
    available: 820,
    precision: 4,
  },
  {
    id: "link-pool",
    name: "Chainlink pool",
    strategy: "Oracle network staking",
    symbol: "LINK",
    network: "Ethereum",
    apy: 4.5,
    apyHistory: [4.5, 4.5, 4.48, 4.5, 4.52, 4.5, 4.49, 4.5, 4.5, 4.5],
    tvl: 638_000_000,
    lockDays: 28,
    risk: "medium",
    usdPrice: 14.82,
    available: 42.6,
    precision: 6,
  },
  {
    id: "wbtc-basis",
    name: "Bitcoin basis vault",
    strategy: "Delta-neutral basis trade",
    symbol: "WBTC",
    network: "Ethereum",
    apy: 9.86,
    apyHistory: [7.9, 8.6, 10.4, 9.2, 11.1, 9.8, 8.9, 10.2, 9.5, 9.86],
    tvl: 58_200_000,
    lockDays: 7,
    risk: "high",
    usdPrice: 60284.1,
    available: 0.0815,
    precision: 8,
  },
  {
    id: "op-staking",
    name: "Optimism staking",
    strategy: "Sequencer rewards",
    symbol: "OP",
    network: "Optimism",
    apy: 5.12,
    apyHistory: [4.7, 4.82, 4.9, 4.86, 5.0, 4.95, 5.08, 5.04, 5.1, 5.12],
    tvl: 41_700_000,
    lockDays: 14,
    risk: "medium",
    usdPrice: 1.48,
    available: 0,
    precision: 4,
  },
];

export const CRYPTO_STAKE_POSITIONS: CryptoStakePosition[] = [
  { vaultId: "eth-liquid", staked: 12.5, rewards: 0.08421337 },
  { vaultId: "usdc-lending", staked: 2500, rewards: 18.42651 },
];

/** Projection horizons in months for the stake dialog. */
export const CRYPTO_STAKE_HORIZONS = [
  { id: "6m", label: "6M", months: 6 },
  { id: "1y", label: "1Y", months: 12 },
  { id: "2y", label: "2Y", months: 24 },
] as const;

export type CryptoStakingLabels = {
  title: string;
  totalStaked: string;
  rewardsEarned: string;
  averageApy: string;
  positions: string;
  vaults: string;
  all: string;
  flexible: string;
  locked: string;
  stake: string;
  addMore: string;
  claim: string;
  claimed: string;
  claiming: string;
  apy: string;
  tvl: string;
  lockup: string;
  available: string;
  amount: string;
  estimatedRewards: string;
  projection: string;
  unlock: string;
  confirming: string;
  staked: string;
  nothingAvailable: (symbol: string) => string;
  insufficient: (symbol: string) => string;
  enterAmount: string;
};

export const CRYPTO_STAKING_LABELS: CryptoStakingLabels = {
  title: "Earn",
  totalStaked: "Total staked",
  rewardsEarned: "Rewards earned",
  averageApy: "Average APY",
  positions: "Your positions",
  vaults: "Vaults",
  all: "All",
  flexible: "Flexible",
  locked: "Locked",
  stake: "Stake",
  addMore: "Add",
  claim: "Claim",
  claimed: "Claimed",
  claiming: "Claiming",
  apy: "APY",
  tvl: "TVL",
  lockup: "Unstaking",
  available: "Available",
  amount: "Amount",
  estimatedRewards: "Estimated rewards",
  projection: "Projected rewards",
  unlock: "Unstaking period",
  confirming: "Confirming",
  staked: "Staked",
  nothingAvailable: (symbol) => `No ${symbol} available`,
  insufficient: (symbol) => `Not enough ${symbol}`,
  enterAmount: "Enter an amount",
};

const YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Simple-interest rewards per second for a staked amount. */
export const rewardsPerSecond = (staked: number, apy: number) =>
  (staked * apy) / 100 / YEAR_SECONDS;

/** Cumulative rewards at the end of each month, compounding monthly. */
export function projectRewards(amount: number, apy: number, months: number) {
  const monthly = apy / 100 / 12;
  return Array.from(
    { length: months },
    (_, index) => amount * ((1 + monthly) ** (index + 1) - 1),
  );
}

export const vaultLockLabel = (days: number, flexible: string) =>
  days === 0 ? flexible : `${days} days`;

export const compactUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const stakeUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0);

export const stakeAmount = (value: number, digits: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Math.min(digits, 2),
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
