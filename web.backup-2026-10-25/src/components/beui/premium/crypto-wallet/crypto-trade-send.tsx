"use client";

import { AtSign, Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button, StatefulButton } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { Input } from "@/components/beui/motion/input";
import { SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  CRYPTO_TRADE_NETWORK_FEE_USD,
  type CryptoSendRequest,
  type CryptoTradeContact,
  type CryptoTradeLabels,
  type CryptoTradeToken,
  isRecipient,
  parseAmount,
  sanitizeAmount,
  shortAddress,
  tradeAmount,
  tradeUsd,
} from "./crypto-trade-data";
import {
  TradeAmountInput,
  TradeCtaLabel,
  TradeDetailRow,
  TradeMaxButton,
  TradePanel,
  TradeTokenPill,
} from "./crypto-trade-parts";
import { useTradeSubmit } from "./use-trade-submit";

export function CryptoTradeSend({
  token,
  contacts,
  labels,
  onPickToken,
  onSend,
}: {
  token: CryptoTradeToken;
  contacts: readonly CryptoTradeContact[];
  labels: CryptoTradeLabels;
  onPickToken: () => void;
  onSend: (request: CryptoSendRequest) => unknown;
}) {
  const reduce = useReducedMotion();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, run] = useTradeSubmit();

  const value = parseAmount(amount);
  const insufficient = value > token.balance;
  const contact = contacts.find(
    (item) =>
      item.name === recipient.trim() ||
      item.address.toLowerCase() === recipient.trim().toLowerCase(),
  );
  const validRecipient = isRecipient(recipient);
  const ready = value > 0 && !insufficient && validRecipient;
  const recipientName = contact?.name ?? shortAddress(recipient.trim());

  const submit = () =>
    run(
      () =>
        onSend({
          token: token.id,
          amount: value,
          recipient: contact?.address ?? recipient.trim(),
        }),
      () => setAmount(""),
    );

  return (
    <div>
      <TradePanel
        label={labels.send}
        amount={
          <TradeAmountInput
            value={amount}
            onChange={(next) =>
              setAmount(sanitizeAmount(next, token.precision))
            }
            label={`${labels.send} (${token.symbol})`}
            invalid={insufficient}
          />
        }
        token={
          <TradeTokenPill
            token={token}
            label={labels.chooseToken}
            onClick={onPickToken}
          />
        }
        footer={
          <>
            <DigitSwap value={tradeUsd(value * token.usdPrice)} />
            <span className="flex items-center gap-2">
              {tradeAmount(token.balance, token.precision)} {token.symbol}
              <TradeMaxButton
                label={labels.max}
                onClick={() => setAmount(String(token.balance))}
              />
            </span>
          </>
        }
      />

      <div className="mt-1.5 rounded-3xl border border-border bg-background p-4 transition-colors focus-within:border-foreground/30">
        <Input
          label={labels.recipient}
          value={recipient}
          onChange={setRecipient}
          onBlur={() => setTouched(true)}
          placeholder={labels.recipientPlaceholder}
          autoComplete="off"
          spellCheck={false}
          leftIcon={<AtSign />}
          error={
            touched && recipient.trim() && !validRecipient
              ? labels.invalidRecipient
              : undefined
          }
          classNames={{ label: "px-1 font-normal text-muted-foreground" }}
        />
        {contacts.length ? (
          <div className="mt-3">
            <p className="px-1 text-xs text-muted-foreground">
              {labels.recent}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {contacts.map((item) => {
                const selected = contact?.id === item.id;
                return (
                  <li key={item.id}>
                    <Button
                      type="button"
                      variant="outline"
                      aria-pressed={selected}
                      onClick={() => {
                        setRecipient(selected ? "" : item.name);
                        setTouched(false);
                      }}
                      className={cn(
                        "h-9 gap-2 bg-background pr-3 pl-1 text-sm",
                        selected && "border-foreground/40 bg-muted",
                      )}
                    >
                      <span className="relative flex size-7 shrink-0 overflow-hidden rounded-full bg-muted">
                        {item.avatar ? (
                          // biome-ignore lint/performance/noImgElement: Remote sample portraits ship with the installable block.
                          <img
                            src={item.avatar}
                            alt=""
                            width={28}
                            height={28}
                            className="size-full rounded-full object-cover"
                          />
                        ) : null}
                        <AnimatePresence initial={false}>
                          {selected ? (
                            <motion.span
                              initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
                              transition={SPRING_SWAP}
                              className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/70 text-background"
                            >
                              <Check className="size-3.5" aria-hidden="true" />
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </span>
                      {item.name}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <dl className="mt-3 px-2">
        <TradeDetailRow label={labels.networkFee}>
          {tradeUsd(CRYPTO_TRADE_NETWORK_FEE_USD)}
        </TradeDetailRow>
      </dl>

      <StatefulButton
        type="button"
        size="lg"
        state={state}
        disabled={!ready && state === "idle"}
        onClick={submit}
        loadingText={labels.confirming}
        successText={labels.done}
        className="mt-3 h-12 w-full text-base"
      >
        {insufficient ? (
          <TradeCtaLabel kind="insufficient">
            {labels.insufficient(token.symbol)}
          </TradeCtaLabel>
        ) : value <= 0 ? (
          <TradeCtaLabel kind="idle">{labels.enterAmount}</TradeCtaLabel>
        ) : !validRecipient ? (
          <TradeCtaLabel kind="recipient">
            {labels.recipientPlaceholder}
          </TradeCtaLabel>
        ) : (
          <TradeCtaLabel kind={`ready-${token.id}`}>
            {labels.send}
            <DigitSwap value={tradeAmount(value, token.precision)} />
            {token.symbol} to {recipientName}
          </TradeCtaLabel>
        )}
      </StatefulButton>
    </div>
  );
}
