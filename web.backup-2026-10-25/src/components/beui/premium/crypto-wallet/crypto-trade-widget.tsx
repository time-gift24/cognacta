"use client";

/*
 * Storyboard
 * 1. Mode tabs: the active pill glides between Swap, Send, and Buy. The card
 *    springs to the new pane's height while the old pane fades out (150ms) and
 *    the new pane blur-rises in.
 * 2. Flip: the arrow turns 180°, both token pills glide to the opposite panel
 *    through shared layout ids, and the quoted amount carries over.
 * 3. Typing: quotes, USD values, and received amounts roll digit by digit.
 * 4. Submit: the CTA moves through confirming → confirmed, then wallet
 *    balances roll to their new values in demo mode.
 * Reduced motion: panes and pills cross-fade only; no rotation, rise, or glide.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { CryptoTradeBuy } from "./crypto-trade-buy";
import {
  CRYPTO_TRADE_BUY_PRESETS,
  CRYPTO_TRADE_CONTACTS,
  CRYPTO_TRADE_LABELS,
  CRYPTO_TRADE_NETWORKS,
  CRYPTO_TRADE_PAYMENT_METHODS,
  CRYPTO_TRADE_TOKENS,
  type CryptoBuyRequest,
  type CryptoSendRequest,
  type CryptoSwapRequest,
  type CryptoTradeContact,
  type CryptoTradeLabels,
  type CryptoTradeMode,
  type CryptoTradeNetwork,
  type CryptoTradePaymentMethod,
  type CryptoTradeToken,
} from "./crypto-trade-data";
import { tradePaneVariants, useMeasuredHeight } from "./crypto-trade-motion";
import { CryptoTradeSend } from "./crypto-trade-send";
import { CryptoTradeSwap } from "./crypto-trade-swap";
import { CryptoTradeTokenPicker } from "./crypto-trade-token-picker";
import { demoConfirm } from "./use-trade-submit";

const MODES: CryptoTradeMode[] = ["swap", "send", "buy"];
type PickerTarget = "from" | "to" | "send" | "buy";

export type CryptoTradeWidgetProps = {
  tokens?: readonly CryptoTradeToken[];
  networks?: readonly CryptoTradeNetwork[];
  contacts?: readonly CryptoTradeContact[];
  paymentMethods?: readonly CryptoTradePaymentMethod[];
  buyPresets?: readonly number[];
  labels?: Partial<CryptoTradeLabels>;
  mode?: CryptoTradeMode;
  defaultMode?: CryptoTradeMode;
  onModeChange?: (mode: CryptoTradeMode) => void;
  /** Token id to pay with; also the default Send and Buy token. */
  defaultFrom?: string;
  /** Token id to receive. */
  defaultTo?: string;
  /** Return a promise to keep the button in its confirming state until it settles. */
  onSwap?: (request: CryptoSwapRequest) => unknown;
  onSend?: (request: CryptoSendRequest) => unknown;
  onBuy?: (request: CryptoBuyRequest) => unknown;
  /** Simulate confirmations and update balances locally. */
  demo?: boolean;
  className?: string;
};

export function CryptoTradeWidget({
  tokens = CRYPTO_TRADE_TOKENS,
  contacts = CRYPTO_TRADE_CONTACTS,
  paymentMethods = CRYPTO_TRADE_PAYMENT_METHODS,
  buyPresets = CRYPTO_TRADE_BUY_PRESETS,
  labels: labelOverrides,
  mode: modeProp,
  defaultMode = "swap",
  onModeChange,
  networks = CRYPTO_TRADE_NETWORKS,
  defaultFrom = tokens[0]?.id,
  defaultTo = tokens[1]?.id,
  onSwap,
  onSend,
  onBuy,
  demo = true,
  className,
}: CryptoTradeWidgetProps) {
  const labels = { ...CRYPTO_TRADE_LABELS, ...labelOverrides };
  const reduce = useReducedMotion() ?? false;
  const id = useId();
  const [paneRef, paneHeight] = useMeasuredHeight<HTMLDivElement>();
  const [internalMode, setInternalMode] = useState(defaultMode);
  const mode = modeProp ?? internalMode;
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [selection, setSelection] = useState({
    from: defaultFrom ?? "",
    to: defaultTo ?? "",
    send: defaultFrom ?? "",
    buy: defaultFrom ?? "",
  });
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resizing, setResizing] = useState(false);

  const wallet = tokens.map((token) => ({
    ...token,
    balance: balances[token.id] ?? token.balance,
  }));
  const find = (tokenId: string) =>
    wallet.find((token) => token.id === tokenId) ?? wallet[0];

  const setMode = (next: CryptoTradeMode) => {
    if (modeProp === undefined) setInternalMode(next);
    onModeChange?.(next);
  };

  const adjust = (changes: Record<string, number>) =>
    setBalances((current) => {
      const next = { ...current };
      for (const [tokenId, delta] of Object.entries(changes)) {
        const base = next[tokenId] ?? find(tokenId)?.balance ?? 0;
        next[tokenId] = Math.max(0, base + delta);
      }
      return next;
    });

  const settle = async (handler: unknown, apply: () => void) => {
    await (handler ?? (demo ? demoConfirm() : undefined));
    if (demo) apply();
  };

  const pick = (tokenId: string) => {
    if (!picker) return;
    setSelection((current) => {
      // Picking the token already on the other side swaps the pair.
      if (picker === "from" && tokenId === current.to)
        return { ...current, from: tokenId, to: current.from };
      if (picker === "to" && tokenId === current.from)
        return { ...current, to: tokenId, from: current.to };
      return { ...current, [picker]: tokenId };
    });
  };

  if (!wallet.length) return null;
  const from = find(selection.from);
  const to = find(selection.to);

  return (
    <section
      aria-label="Swap, send, or buy crypto"
      className={cn("w-full bg-background px-4 py-12 sm:py-16", className)}
    >
      <div className="mx-auto w-full max-w-md text-foreground">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as CryptoTradeMode)}
          className="flex justify-center"
        >
          <TabsList aria-label="Wallet action">
            {MODES.map((item, index) => (
              <TabsTrigger
                key={item}
                value={item}
                id={`${id}-tab-${item}`}
                aria-controls={`${id}-pane`}
                tabIndex={mode === item ? 0 : -1}
                className="h-9 px-4"
                onKeyDown={(event) => {
                  const step =
                    event.key === "ArrowRight"
                      ? 1
                      : event.key === "ArrowLeft"
                        ? -1
                        : 0;
                  if (!step) return;
                  event.preventDefault();
                  const next =
                    MODES[(index + step + MODES.length) % MODES.length];
                  setMode(next);
                  document.getElementById(`${id}-tab-${next}`)?.focus();
                }}
              >
                {labels[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <motion.div
          animate={{ height: paneHeight }}
          transition={reduce ? { duration: 0 } : SPRING_PANEL}
          onAnimationStart={() => setResizing(true)}
          onAnimationComplete={() => setResizing(false)}
          // Clip only while resizing so the payment menu can overflow at rest.
          className={cn("mt-5", resizing && "overflow-clip")}
        >
          <div
            ref={paneRef}
            id={`${id}-pane`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${mode}`}
          >
            <AnimatePresence mode="popLayout" initial={false} custom={reduce}>
              <motion.div
                key={mode}
                custom={reduce}
                variants={tradePaneVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="p-px"
              >
                {mode === "swap" ? (
                  <CryptoTradeSwap
                    from={from}
                    to={to}
                    labels={labels}
                    onFlip={() =>
                      setSelection((current) => ({
                        ...current,
                        from: current.to,
                        to: current.from,
                      }))
                    }
                    onPickToken={(side) => {
                      setPicker(side);
                      setPickerOpen(true);
                    }}
                    onSwap={(request) =>
                      settle(onSwap?.(request), () =>
                        adjust({
                          [request.from]: -request.amountIn,
                          [request.to]: request.amountOut,
                        }),
                      )
                    }
                  />
                ) : mode === "send" ? (
                  <CryptoTradeSend
                    token={find(selection.send)}
                    contacts={contacts}
                    labels={labels}
                    onPickToken={() => {
                      setPicker("send");
                      setPickerOpen(true);
                    }}
                    onSend={(request) =>
                      settle(onSend?.(request), () =>
                        adjust({ [request.token]: -request.amount }),
                      )
                    }
                  />
                ) : (
                  <CryptoTradeBuy
                    token={find(selection.buy)}
                    presets={buyPresets}
                    paymentMethods={paymentMethods}
                    labels={labels}
                    onPickToken={() => {
                      setPicker("buy");
                      setPickerOpen(true);
                    }}
                    onBuy={(request) =>
                      settle(onBuy?.(request), () =>
                        adjust({ [request.token]: request.amountOut }),
                      )
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <CryptoTradeTokenPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        tokens={wallet}
        networks={networks}
        selected={picker ? selection[picker] : undefined}
        labels={labels}
        onSelect={pick}
      />
    </section>
  );
}
