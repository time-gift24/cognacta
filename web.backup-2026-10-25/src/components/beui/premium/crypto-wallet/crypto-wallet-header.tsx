"use client";

import { Check, Copy, ScanLine, Settings2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionSwapIcon } from "@/components/beui/motion/action-swap";
import { Button } from "@/components/beui/motion/button";
import { shortCryptoAddress } from "./crypto-wallet-data";

/** Wallet identity with a copyable address and optional quick actions. */
export function CryptoWalletHeader({
  walletName,
  walletAddress,
  demo,
  onReceive,
  onSettings,
}: {
  walletName: string;
  walletAddress?: string;
  demo: boolean;
  onReceive?: () => void;
  onSettings?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
          <Wallet className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-medium">{walletName}</h2>
          {walletAddress ? (
            <Button
              variant="plain"
              type="button"
              className="mt-1 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label={
                copied ? "Wallet address copied" : "Copy wallet address"
              }
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(walletAddress);
                  setCopied(true);
                  setCopyError(false);
                } catch {
                  setCopyError(true);
                }
              }}
            >
              <span className="font-mono">
                {shortCryptoAddress(walletAddress)}
              </span>
              <ActionSwapIcon
                value={copied ? "copied" : "copy"}
                animation="cascade"
                className="size-3.5"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </ActionSwapIcon>
            </Button>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {demo ? "Demo wallet" : "Your portfolio"}
            </p>
          )}
          <output className="sr-only">
            {copyError
              ? "Unable to copy wallet address"
              : copied
                ? "Wallet address copied"
                : ""}
          </output>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {onReceive ? (
          <Button
            size="icon"
            variant="outline"
            onClick={onReceive}
            aria-label="Receive with wallet address"
            className="bg-background"
          >
            <ScanLine className="size-4" />
          </Button>
        ) : null}
        {onSettings ? (
          <Button
            size="icon"
            variant="outline"
            onClick={onSettings}
            aria-label="Wallet settings"
            className="bg-background"
          >
            <Settings2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </header>
  );
}
