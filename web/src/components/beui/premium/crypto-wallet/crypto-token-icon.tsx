"use client";

import {
  NetworkArbitrumOne,
  NetworkBase,
  NetworkEthereum,
  NetworkOptimism,
  NetworkPolygon,
  TokenAAVE,
  TokenADA,
  TokenARB,
  TokenAVAX,
  TokenBNB,
  TokenBTC,
  TokenDAI,
  TokenDOGE,
  TokenETH,
  TokenLINK,
  TokenOP,
  TokenPEPE,
  TokenPOL,
  TokenSOL,
  TokenTON,
  TokenUNI,
  TokenUSDC,
  TokenUSDT,
  TokenWBTC,
  TokenXRP,
} from "@web3icons/react";
import type { ComponentType } from "react";
import { cn } from "@/lib/beui/utils";

type IconComponent = ComponentType<{
  variant?: "branded" | "mono" | "background";
  className?: string;
  "aria-hidden"?: boolean;
}>;

// Named imports keep the bundle to these icons. Add entries to support more.
export const CRYPTO_TOKEN_ICONS: Record<string, IconComponent> = {
  AAVE: TokenAAVE,
  ADA: TokenADA,
  ARB: TokenARB,
  AVAX: TokenAVAX,
  BNB: TokenBNB,
  BTC: TokenBTC,
  DAI: TokenDAI,
  DOGE: TokenDOGE,
  ETH: TokenETH,
  LINK: TokenLINK,
  OP: TokenOP,
  PEPE: TokenPEPE,
  POL: TokenPOL,
  SOL: TokenSOL,
  TON: TokenTON,
  UNI: TokenUNI,
  USDC: TokenUSDC,
  USDT: TokenUSDT,
  WBTC: TokenWBTC,
  XRP: TokenXRP,
};

export const CRYPTO_NETWORK_ICONS: Record<string, IconComponent> = {
  arbitrum: NetworkArbitrumOne,
  base: NetworkBase,
  ethereum: NetworkEthereum,
  optimism: NetworkOptimism,
  polygon: NetworkPolygon,
};

export function CryptoNetworkIcon({
  network,
  className,
}: {
  network: string;
  className?: string;
}) {
  const Icon = CRYPTO_NETWORK_ICONS[network.toLowerCase()];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {Icon ? (
        <Icon variant="background" className="size-full" />
      ) : (
        <span className="text-xs font-medium uppercase">{network[0]}</span>
      )}
    </span>
  );
}

/** Branded token mark with an optional network badge in the corner. */
export function CryptoTokenIcon({
  symbol,
  network,
  className,
}: {
  symbol: string;
  network?: string;
  className?: string;
}) {
  const Icon = CRYPTO_TOKEN_ICONS[symbol.toUpperCase()];
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex size-10 shrink-0", className)}
    >
      <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-muted text-foreground">
        {Icon ? (
          <Icon variant="background" className="size-full" />
        ) : (
          <span className="text-xs font-medium">{symbol.slice(0, 3)}</span>
        )}
      </span>
      {network ? (
        <CryptoNetworkIcon
          network={network}
          className="absolute -right-0.5 -bottom-0.5 size-2/5 ring-2 ring-background"
        />
      ) : null}
    </span>
  );
}
