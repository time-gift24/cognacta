export type TokenAllocation = {
  id: string;
  label: string;
  /** Share of total supply, in percent. */
  percent: number;
  /** Share of this allocation unlocked at launch, from 0 to 1. */
  tgeUnlock: number;
  /** Months after launch before linear vesting starts. */
  cliffMonths: number;
  /** Months of linear vesting after the cliff. 0 unlocks the rest at the cliff. */
  vestingMonths: number;
  /**
   * Fill class such as `bg-blue-500`. The donut reads the matching
   * `--color-*` variable, so use a Tailwind palette color.
   */
  color: string;
  /** Text class used as the area color, such as `text-blue-500`. */
  text: string;
};

export type TokenomicsStat = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  /** Fraction digits shown for the value. */
  decimals?: number;
};

export type TokenomicsCopy = {
  eyebrow: string;
  title: string;
  description: string;
  distribution: string;
  schedule: string;
  scheduleHint: string;
  cliffEnds: string;
  totalSupply: string;
  unlocked: string;
  atLaunch: string;
  month: (month: number) => string;
  vesting: (allocation: TokenAllocation) => string;
};

export const TOKENOMICS_SYMBOL = "MRD";
export const TOKENOMICS_SUPPLY = 1_000_000_000;

export const TOKENOMICS_ALLOCATIONS: TokenAllocation[] = [
  {
    id: "community",
    label: "Community and ecosystem",
    percent: 34,
    tgeUnlock: 0.08,
    cliffMonths: 0,
    vestingMonths: 48,
    color: "bg-blue-500",
    text: "text-blue-500",
  },
  {
    id: "contributors",
    label: "Core contributors",
    percent: 20,
    tgeUnlock: 0,
    cliffMonths: 12,
    vestingMonths: 36,
    color: "bg-teal-500",
    text: "text-teal-500",
  },
  {
    id: "investors",
    label: "Early backers",
    percent: 17,
    tgeUnlock: 0,
    cliffMonths: 12,
    vestingMonths: 24,
    color: "bg-orange-500",
    text: "text-orange-500",
  },
  {
    id: "treasury",
    label: "Foundation treasury",
    percent: 15,
    tgeUnlock: 0.05,
    cliffMonths: 0,
    vestingMonths: 48,
    color: "bg-amber-500",
    text: "text-amber-500",
  },
  {
    id: "airdrop",
    label: "Launch airdrop",
    percent: 8,
    tgeUnlock: 0.5,
    cliffMonths: 0,
    vestingMonths: 6,
    color: "bg-sky-500",
    text: "text-sky-500",
  },
  {
    id: "liquidity",
    label: "Market liquidity",
    percent: 6,
    tgeUnlock: 1,
    cliffMonths: 0,
    vestingMonths: 0,
    color: "bg-rose-500",
    text: "text-rose-500",
  },
];

export const TOKENOMICS_COPY: TokenomicsCopy = {
  eyebrow: "Token design",
  title: "A supply built for the long run",
  description:
    "Most tokens unlock gradually over four years, so the people building the network stay aligned with the people using it.",
  distribution: "Distribution",
  schedule: "Unlock schedule",
  scheduleHint: "Cumulative supply unlocked each month, by allocation",
  cliffEnds: "Cliffs end",
  totalSupply: "Total supply",
  unlocked: "Unlocked",
  atLaunch: "At launch",
  month: (month) => (month === 0 ? "Launch" : `Month ${month}`),
  vesting: (allocation) => {
    const parts: string[] = [];
    if (allocation.tgeUnlock >= 1) return "Fully unlocked at launch";
    if (allocation.tgeUnlock > 0)
      parts.push(`${Math.round(allocation.tgeUnlock * 100)}% at launch`);
    if (allocation.cliffMonths)
      parts.push(`${allocation.cliffMonths}-month cliff`);
    if (allocation.vestingMonths)
      parts.push(`${allocation.vestingMonths} months linear`);
    return parts.join(", ");
  },
};

/** Fraction of an allocation unlocked `month` months after launch. */
export function unlockedShare(allocation: TokenAllocation, month: number) {
  const { tgeUnlock, cliffMonths, vestingMonths } = allocation;
  if (month < cliffMonths) return tgeUnlock;
  const progress = vestingMonths
    ? Math.min(1, (month - cliffMonths) / vestingMonths)
    : 1;
  return tgeUnlock + (1 - tgeUnlock) * progress;
}

/** Tokens unlocked per allocation at each sampled month. */
export function buildUnlockSchedule(
  allocations: readonly TokenAllocation[],
  supply: number,
  months: number,
  step: number,
) {
  return Array.from({ length: Math.floor(months / step) + 1 }, (_, index) => {
    const month = index * step;
    return {
      month,
      values: Object.fromEntries(
        allocations.map((allocation) => [
          allocation.id,
          (supply * allocation.percent * unlockedShare(allocation, month)) /
            100,
        ]),
      ),
    };
  });
}

export const compactTokens = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1e9 ? 2 : 1,
  }).format(value);
