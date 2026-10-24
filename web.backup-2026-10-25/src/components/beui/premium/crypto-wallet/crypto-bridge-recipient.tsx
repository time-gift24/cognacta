"use client";

import { AtSign, ChevronDown, Wallet } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { CryptoBridgeLabels } from "./crypto-bridge-data";
import {
  type CryptoTradeContact,
  isRecipient,
  shortAddress,
} from "./crypto-trade-data";

function Avatar({ contact }: { contact?: CryptoTradeContact }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
      {contact?.avatar ? (
        // biome-ignore lint/performance/noImgElement: Remote sample portraits ship with the installable block.
        <img
          src={contact.avatar}
          alt=""
          width={20}
          height={20}
          className="size-full object-cover"
        />
      ) : (
        <Wallet className="size-3" aria-hidden="true" />
      )}
    </span>
  );
}

export const findContact = (
  contacts: readonly CryptoTradeContact[],
  value: string,
) =>
  contacts.find(
    (item) =>
      item.name.toLowerCase() === value.trim().toLowerCase() ||
      item.address.toLowerCase() === value.trim().toLowerCase(),
  );

/** Display name for a recipient: contact name, short address, or "My wallet". */
export const recipientName = (
  contacts: readonly CryptoTradeContact[],
  value: string,
  labels: CryptoBridgeLabels,
) =>
  !value.trim()
    ? labels.myWallet
    : (findContact(contacts, value)?.name ?? shortAddress(value.trim()));

/** Header chip in the To panel showing who receives the funds. */
export function CryptoBridgeRecipientChip({
  value,
  contacts,
  labels,
  open,
  controls,
  onToggle,
}: {
  value: string;
  contacts: readonly CryptoTradeContact[];
  labels: CryptoBridgeLabels;
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const contact = value.trim() ? findContact(contacts, value) : undefined;
  return (
    <Button
      type="button"
      variant="secondary"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${labels.sendTo}: ${recipientName(contacts, value, labels)}`}
      onClick={onToggle}
      className="h-7 gap-1.5 pr-2 pl-1 text-xs font-medium"
    >
      <Avatar contact={contact} />
      {recipientName(contacts, value, labels)}
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
        className="flex text-muted-foreground"
      >
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </motion.span>
    </Button>
  );
}

/** Inline editor: an address field plus one-tap contacts and "My wallet". */
export function CryptoBridgeRecipientEditor({
  value,
  contacts,
  labels,
  onChange,
  onDone,
}: {
  value: string;
  contacts: readonly CryptoTradeContact[];
  labels: CryptoBridgeLabels;
  onChange: (value: string) => void;
  onDone: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const invalid = touched && value.trim() !== "" && !isRecipient(value);
  const choices: {
    id: string;
    value: string;
    label: string;
    contact?: CryptoTradeContact;
  }[] = [
    { id: "self", value: "", label: labels.myWallet },
    ...contacts.map((item) => ({
      id: item.id,
      value: item.name,
      label: item.name,
      contact: item,
    })),
  ];

  return (
    <div className="flex flex-col gap-3 pt-3">
      <Input
        label={labels.recipientLabel}
        value={value}
        onChange={onChange}
        onBlur={() => setTouched(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (!value.trim() || isRecipient(value)))
            onDone();
        }}
        placeholder={labels.recipientPlaceholder}
        autoComplete="off"
        spellCheck={false}
        leftIcon={<AtSign />}
        error={invalid ? labels.invalidRecipient : undefined}
        classNames={{ label: "px-1 font-normal text-xs text-muted-foreground" }}
      />
      <div>
        <p className="sr-only">{labels.contacts}</p>
        <ul className="flex flex-wrap gap-1.5">
          {choices.map((choice) => {
            const selected =
              choice.value === ""
                ? !value.trim()
                : findContact(contacts, value)?.id === choice.id;
            return (
              <li key={choice.id}>
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(choice.value);
                    setTouched(false);
                    onDone();
                  }}
                  className={cn(
                    "h-8 gap-1.5 bg-background pr-3 pl-1.5 text-xs",
                    selected && "border-foreground/40",
                  )}
                >
                  <Avatar contact={choice.contact} />
                  {choice.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
