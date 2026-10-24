"use client";

/*
 * Storyboard
 * 1. Form: pick any token on any network for each side through the token
 *    picker; amounts, USD values, and each route's delivery roll as you type.
 *    Flip turns the arrow while both token pills glide across.
 * 2. Recipient: the To chip opens an inline address field with one-tap
 *    contacts; the chip updates to the chosen name.
 * 3. Route: the summary row opens to every route, and the selected outline
 *    glides between them.
 * 4. Bridge: the card springs to the transfer view. The connector fills as
 *    each stage lands, trails stream across while relaying, and the
 *    destination token pops a check on arrival.
 * Reduced motion: panes cross-fade; no glide, rotation, pulse, or trails.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  CRYPTO_BRIDGE_DEFAULT_FROM,
  CRYPTO_BRIDGE_DEFAULT_TO,
  CRYPTO_BRIDGE_LABELS,
  CRYPTO_BRIDGE_ROUTES,
  type CryptoBridgeLabels,
  type CryptoBridgeRoute,
} from "./crypto-bridge-data";
import { CryptoBridgeForm } from "./crypto-bridge-form";
import { recipientName } from "./crypto-bridge-recipient";
import { CryptoBridgeTransfer } from "./crypto-bridge-transfer";
import {
  CRYPTO_TRADE_CONTACTS,
  CRYPTO_TRADE_LABELS,
  CRYPTO_TRADE_NETWORKS,
  CRYPTO_TRADE_TOKENS,
  type CryptoTradeContact,
  type CryptoTradeLabels,
  type CryptoTradeNetwork,
  type CryptoTradeToken,
} from "./crypto-trade-data";
import { tradePaneVariants, useMeasuredHeight } from "./crypto-trade-motion";
import { CryptoTradeTokenPicker } from "./crypto-trade-token-picker";
import {
  type CryptoBridgeHandlers,
  useBridgeTransfer,
} from "./use-bridge-transfer";

export type CryptoBridgeProps = CryptoBridgeHandlers & {
  tokens?: readonly CryptoTradeToken[];
  networks?: readonly CryptoTradeNetwork[];
  contacts?: readonly CryptoTradeContact[];
  routes?: CryptoBridgeRoute[];
  labels?: Partial<CryptoBridgeLabels>;
  /** Copy for the shared token picker. */
  pickerLabels?: Partial<CryptoTradeLabels>;
  /** Connected wallet, also the default recipient. */
  walletAddress?: string;
  /** Token ids; each token carries its network. */
  defaultFrom?: string;
  defaultTo?: string;
  /** Builds the block explorer link for the source transaction. */
  explorerUrl?: (hash: string) => string;
  className?: string;
};

/** Relay time used for the demo, so long routes don't stall the preview. */
const DEMO_RELAY_MS = 5000;

export function CryptoBridge({
  tokens: tokenList = CRYPTO_TRADE_TOKENS,
  networks = CRYPTO_TRADE_NETWORKS,
  contacts = CRYPTO_TRADE_CONTACTS,
  routes = CRYPTO_BRIDGE_ROUTES,
  labels: labelOverrides,
  pickerLabels,
  walletAddress = "0x7a3d9e1fb2c4a5d6e7f8091a2b3c4d5e6f70b41c",
  defaultFrom = CRYPTO_BRIDGE_DEFAULT_FROM,
  defaultTo = CRYPTO_BRIDGE_DEFAULT_TO,
  explorerUrl = (hash) => `https://etherscan.io/tx/${hash}`,
  onBridge,
  waitForSource,
  waitForArrival,
  className,
}: CryptoBridgeProps) {
  const labels = { ...CRYPTO_BRIDGE_LABELS, ...labelOverrides };
  const tradeLabels = { ...CRYPTO_TRADE_LABELS, ...pickerLabels };
  const reduce = useReducedMotion() ?? false;
  const [tokens, setTokens] = useState(tokenList);
  const [selection, setSelection] = useState({
    from: defaultFrom,
    to: defaultTo,
  });
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const demo = !onBridge;
  const { transfer, start, reset } = useBridgeTransfer(
    { onBridge, waitForSource, waitForArrival },
    DEMO_RELAY_MS,
  );
  const [paneRef, paneHeight] = useMeasuredHeight<HTMLDivElement>();

  const token = (id: string) =>
    tokens.find((item) => item.id === id) ?? tokens[0];
  const network = (id: string) =>
    networks.find((item) => item.id === id)?.name ?? id;
  const from = token(selection.from);
  const to = token(selection.to);
  const route = routes.find((item) => item.id === routeId) ?? routes[0];
  const relayMs = demo ? DEMO_RELAY_MS : route.etaSeconds * 1000;
  const flip = () =>
    setSelection((current) => ({ from: current.to, to: current.from }));

  const pick = (id: string) => {
    if (!picker) return;
    const other = picker === "from" ? selection.to : selection.from;
    // Picking the other side's token swaps the pair instead of matching it.
    if (id === other) flip();
    else setSelection((current) => ({ ...current, [picker]: id }));
    setPicker(null);
  };

  return (
    <section
      aria-label={labels.title}
      className={cn("w-full bg-background px-4 py-12 sm:py-16", className)}
    >
      <div className="mx-auto w-full max-w-md text-foreground">
        <h2 className="px-1 text-xl font-medium">{labels.title}</h2>
        <motion.div
          animate={{ height: paneHeight }}
          transition={reduce ? { duration: 0 } : SPRING_PANEL}
          className="mt-4"
        >
          <div ref={paneRef}>
            <AnimatePresence mode="popLayout" initial={false} custom={reduce}>
              <motion.div
                key={transfer ? "transfer" : "form"}
                custom={reduce}
                variants={tradePaneVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="p-px"
              >
                {transfer ? (
                  <CryptoBridgeTransfer
                    {...transfer}
                    from={token(transfer.request.from)}
                    to={token(transfer.request.to)}
                    fromNetwork={network(token(transfer.request.from).network)}
                    toNetwork={network(token(transfer.request.to).network)}
                    recipient={recipientName(contacts, recipient, labels)}
                    relayMs={relayMs}
                    labels={labels}
                    explorerUrl={explorerUrl}
                    onReset={reset}
                  />
                ) : (
                  <CryptoBridgeForm
                    from={from}
                    to={to}
                    routes={routes}
                    route={route}
                    networks={networks}
                    contacts={contacts}
                    walletAddress={walletAddress}
                    amount={amount}
                    recipient={recipient}
                    labels={labels}
                    onAmountChange={setAmount}
                    onRecipientChange={setRecipient}
                    onRouteChange={setRouteId}
                    onPickToken={setPicker}
                    onFlip={flip}
                    onSubmit={(request) =>
                      start(request, () => {
                        setAmount("");
                        if (!demo) return;
                        const toSelf = request.recipient === walletAddress;
                        setTokens((list) =>
                          list.map((item) =>
                            item.id === request.from
                              ? {
                                  ...item,
                                  balance: item.balance - request.amountIn,
                                }
                              : item.id === request.to && toSelf
                                ? {
                                    ...item,
                                    balance: item.balance + request.amountOut,
                                  }
                                : item,
                          ),
                        );
                      })
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <CryptoTradeTokenPicker
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
        tokens={tokens}
        networks={networks}
        selected={picker ? selection[picker] : undefined}
        labels={tradeLabels}
        onSelect={pick}
      />
    </section>
  );
}
