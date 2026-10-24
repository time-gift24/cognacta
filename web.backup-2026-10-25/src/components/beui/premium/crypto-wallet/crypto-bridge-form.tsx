"use client";

import { ArrowDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Button, StatefulButton } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { SPRING_SWAP } from "@/lib/beui/ease";
import {
  type CryptoBridgeLabels,
  type CryptoBridgeRequest,
  type CryptoBridgeRoute,
  quoteBridge,
} from "./crypto-bridge-data";
import { CryptoBridgeLeg as Leg } from "./crypto-bridge-leg";
import {
  CryptoBridgeRecipientChip,
  CryptoBridgeRecipientEditor,
  findContact,
} from "./crypto-bridge-recipient";
import { CryptoBridgeRouteSummary } from "./crypto-bridge-route";
import {
  type CryptoTradeContact,
  type CryptoTradeNetwork,
  type CryptoTradeToken,
  isRecipient,
  parseAmount,
  sanitizeAmount,
  shortAddress,
  tradeAmount,
  tradeUsd,
} from "./crypto-trade-data";
import { tradeRevealVariants } from "./crypto-trade-motion";
import {
  TradeAmountInput,
  TradeAmountReadout,
  TradeCtaLabel,
  TradeMaxButton,
  TradeTokenPill,
} from "./crypto-trade-parts";

export function CryptoBridgeForm({
  from,
  to,
  routes,
  route,
  networks,
  contacts,
  walletAddress,
  amount,
  recipient,
  labels,
  onAmountChange,
  onRecipientChange,
  onRouteChange,
  onPickToken,
  onFlip,
  onSubmit,
}: {
  from: CryptoTradeToken;
  to: CryptoTradeToken;
  routes: CryptoBridgeRoute[];
  route: CryptoBridgeRoute;
  networks: readonly CryptoTradeNetwork[];
  contacts: readonly CryptoTradeContact[];
  walletAddress: string;
  amount: string;
  recipient: string;
  labels: CryptoBridgeLabels;
  onAmountChange: (value: string) => void;
  onRecipientChange: (value: string) => void;
  onRouteChange: (route: string) => void;
  onPickToken: (side: "from" | "to") => void;
  onFlip: () => void;
  onSubmit: (request: CryptoBridgeRequest) => void;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  const [flips, setFlips] = useState(0);
  const [editing, setEditing] = useState(false);
  const amountIn = parseAmount(amount);
  const quote = quoteBridge(from, to, route, amountIn);
  const insufficient = amountIn > from.balance;
  const badRecipient = recipient.trim() !== "" && !isRecipient(recipient);
  const ready =
    amountIn > 0 && !insufficient && !badRecipient && quote.amountOut > 0;
  const network = (tokenNetwork: string) =>
    networks.find((item) => item.id === tokenNetwork)?.name ?? tokenNetwork;
  const crossChain = from.network !== to.network;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col gap-1.5">
        {/* Anchored to the From panel so it stays on the seam as To grows. */}
        <div className="relative">
          <Leg
            label={labels.from}
            network={{ id: from.network, name: network(from.network) }}
            aside={
              <span className="font-mono text-xs text-muted-foreground">
                {shortAddress(walletAddress)}
              </span>
            }
            amount={
              <TradeAmountInput
                value={amount}
                onChange={(value) =>
                  onAmountChange(sanitizeAmount(value, from.precision))
                }
                label={`${labels.from} (${from.symbol} on ${network(from.network)})`}
                invalid={insufficient}
              />
            }
            token={
              <TradeTokenPill
                token={from}
                layoutId={`${id}-${from.id}`}
                label={labels.from}
                onClick={() => onPickToken("from")}
              />
            }
            footer={
              <>
                <DigitSwap value={tradeUsd(amountIn * from.usdPrice)} />
                <span className="flex items-center gap-2">
                  {tradeAmount(from.balance, from.precision)} {from.symbol}
                  <TradeMaxButton
                    label={labels.max}
                    onClick={() => onAmountChange(String(from.balance))}
                  />
                </span>
              </>
            }
          />
          <div className="absolute -bottom-6.25 left-1/2 z-10 -translate-x-1/2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                setFlips((count) => count + 1);
                onFlip();
              }}
              aria-label={labels.flip}
              className="size-11 border-4 border-background bg-muted text-foreground hover:bg-muted"
            >
              <motion.span
                animate={{ rotate: reduce ? 0 : flips * 180 }}
                transition={SPRING_SWAP}
                className="flex"
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </motion.span>
            </Button>
          </div>
        </div>
        <Leg
          label={labels.to}
          network={{ id: to.network, name: network(to.network) }}
          aside={
            <CryptoBridgeRecipientChip
              value={recipient}
              contacts={contacts}
              labels={labels}
              open={editing}
              controls={`${id}-recipient`}
              onToggle={() => setEditing((current) => !current)}
            />
          }
          amount={
            <TradeAmountReadout
              value={
                amountIn > 0 ? tradeAmount(quote.amountOut, to.precision) : "0"
              }
              label={labels.to}
            />
          }
          token={
            <TradeTokenPill
              token={to}
              layoutId={`${id}-${to.id}`}
              label={labels.to}
              onClick={() => onPickToken("to")}
            />
          }
          footer={
            <>
              <DigitSwap value={tradeUsd(quote.amountOut * to.usdPrice)} />
              <span>
                {labels.minimumReceived}{" "}
                {amountIn > 0
                  ? tradeAmount(quote.minimumReceived, to.precision)
                  : "0"}
              </span>
            </>
          }
        >
          <AnimatePresence initial={false}>
            {editing ? (
              <motion.div
                id={`${id}-recipient`}
                variants={tradeRevealVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="-mx-1 overflow-hidden px-1"
              >
                <CryptoBridgeRecipientEditor
                  value={recipient}
                  contacts={contacts}
                  labels={labels}
                  onChange={onRecipientChange}
                  onDone={() => setEditing(false)}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Leg>
      </div>

      <CryptoBridgeRouteSummary
        routes={routes}
        value={route}
        from={from}
        to={to}
        amountIn={amountIn}
        labels={labels}
        onChange={onRouteChange}
      />

      <StatefulButton
        type="button"
        size="lg"
        disabled={!ready}
        onClick={() =>
          onSubmit({
            from: from.id,
            to: to.id,
            recipient:
              findContact(contacts, recipient)?.address ??
              (recipient.trim() || walletAddress),
            route: route.id,
            amountIn,
            amountOut: quote.amountOut,
            minimumReceived: quote.minimumReceived,
          })
        }
        className="h-12 w-full text-base"
      >
        {insufficient ? (
          <TradeCtaLabel kind="insufficient">
            {labels.insufficient(from.symbol)}
          </TradeCtaLabel>
        ) : amountIn <= 0 ? (
          <TradeCtaLabel kind="empty">{labels.enterAmount}</TradeCtaLabel>
        ) : badRecipient ? (
          <TradeCtaLabel kind="recipient">
            {labels.enterRecipient}
          </TradeCtaLabel>
        ) : (
          <TradeCtaLabel kind={`ready-${crossChain}-${to.id}`}>
            {crossChain
              ? labels.bridge(to.symbol, network(to.network))
              : labels.swap(to.symbol)}
          </TradeCtaLabel>
        )}
      </StatefulButton>
    </div>
  );
}
