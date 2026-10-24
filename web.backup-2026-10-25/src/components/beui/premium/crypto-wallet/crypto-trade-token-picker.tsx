"use client";

/*
 * Storyboard
 * 1. Open: rows cascade in 35ms apart below the search, chips, and networks.
 * 2. Filter: the network pill glides; rows that stay slide into place, new
 *    rows rise in, and removed rows fade out in 120ms.
 * 3. Keyboard: arrows move the highlighted row (scrolled into view), Enter
 *    picks it. Hovering a row moves the same highlight.
 * Reduced motion: rows fade only, with no rise or layout glide.
 */

import { Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { CryptoNetworkIcon, CryptoTokenIcon } from "./crypto-token-icon";
import type {
  CryptoTradeLabels,
  CryptoTradeNetwork,
  CryptoTradeToken,
} from "./crypto-trade-data";
import { TokenGroup } from "./crypto-trade-token-list";

const ALL = "all";

export function CryptoTradeTokenPicker({
  open,
  onOpenChange,
  tokens,
  networks,
  selected,
  labels,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokens: readonly CryptoTradeToken[];
  networks: readonly CryptoTradeNetwork[];
  selected?: string;
  labels: CryptoTradeLabels;
  onSelect: (tokenId: string) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState(ALL);
  const [activeId, setActiveId] = useState<string>();
  const [cascade, setCascade] = useState(true);
  const keyboardMove = useRef(false);

  const networkName = (networkId: string) =>
    networks.find((item) => item.id === networkId)?.name ?? networkId;
  const term = query.trim().toLowerCase();
  const inNetwork = tokens.filter(
    (token) => network === ALL || token.network === network,
  );
  const matches = inNetwork.filter(
    (token) =>
      !term ||
      token.symbol.toLowerCase().includes(term) ||
      token.name.toLowerCase().includes(term) ||
      networkName(token.network).toLowerCase().includes(term),
  );
  const owned = matches
    .filter((token) => token.balance > 0)
    .sort((a, b) => b.balance * b.usdPrice - a.balance * a.usdPrice);
  const rest = matches.filter((token) => token.balance <= 0);
  const flat = [...owned, ...rest];
  const popular = inNetwork.filter((token) => token.popular).slice(0, 5);
  const active = flat.some((token) => token.id === activeId)
    ? activeId
    : flat[0]?.id;
  const optionId = (tokenId: string) => `${id}-option-${tokenId}`;

  // Cascade rows on open only; later filtering animates rows individually.
  useEffect(() => {
    if (!open) return;
    setCascade(true);
    const timeout = setTimeout(() => setCascade(false), 600);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!keyboardMove.current || !active) return;
    keyboardMove.current = false;
    document
      .getElementById(optionId(active))
      ?.scrollIntoView({ block: "nearest" });
  });

  const choose = (tokenId: string) => {
    onSelect(tokenId);
    onOpenChange(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!flat.length) return;
    const index = flat.findIndex((token) => token.id === active);
    let next = index;
    if (event.key === "ArrowDown") next = (index + 1) % flat.length;
    else if (event.key === "ArrowUp")
      next = (index - 1 + flat.length) % flat.length;
    else if (event.key === "Enter" && active) {
      event.preventDefault();
      choose(active);
      return;
    } else return;
    event.preventDefault();
    keyboardMove.current = true;
    setActiveId(flat[next].id);
  };

  const filters = [{ id: ALL, name: labels.allNetworks }, ...networks];

  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      onExitComplete={() => {
        setQuery("");
        setNetwork(ALL);
        setActiveId(undefined);
      }}
      panelClassName="max-w-md rounded-3xl p-5"
    >
      <AnimatedModalTitle className="text-xl font-medium">
        {labels.chooseToken}
      </AnimatedModalTitle>
      <Input
        value={query}
        onChange={setQuery}
        onKeyDown={onKeyDown}
        placeholder={labels.searchTokens}
        aria-label={labels.searchTokens}
        role="combobox"
        aria-expanded={true}
        aria-controls={`${id}-list`}
        aria-activedescendant={active ? optionId(active) : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        leftIcon={<Search />}
        className="mt-4"
      />

      <Tabs value={network} onValueChange={setNetwork} className="mt-3">
        <TabsList
          aria-label={labels.networks}
          className="flex max-w-full overflow-x-auto [scrollbar-width:none]"
        >
          {filters.map((item, index) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              id={`${id}-network-${item.id}`}
              tabIndex={network === item.id ? 0 : -1}
              className="h-8 gap-1.5 px-3 text-xs"
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
                  filters[(index + step + filters.length) % filters.length];
                setNetwork(next.id);
                document.getElementById(`${id}-network-${next.id}`)?.focus();
              }}
            >
              {item.id !== ALL ? <CryptoNetworkIcon network={item.id} /> : null}
              {item.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!term && popular.length ? (
        <div className="mt-4">
          <p className="px-1 text-xs text-muted-foreground">{labels.popular}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {popular.map((token) => (
              <li key={token.id}>
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={token.id === selected}
                  onClick={() => choose(token.id)}
                  className="h-9 gap-2 bg-background pr-3 pl-1 text-sm"
                >
                  <CryptoTokenIcon
                    symbol={token.symbol}
                    network={network === ALL ? token.network : undefined}
                    className="size-7"
                  />
                  {token.symbol}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        id={`${id}-list`}
        role="listbox"
        aria-label={labels.chooseToken}
        className="-mx-2 mt-3 h-80 overflow-y-auto overscroll-contain"
      >
        <TokenGroup
          id={`${id}-owned`}
          title={labels.yourTokens}
          tokens={owned}
          term={term}
          activeId={active}
          selectedId={selected}
          optionId={optionId}
          networkName={networkName}
          cascade={cascade}
          onActivate={setActiveId}
          onSelect={choose}
        />
        <TokenGroup
          id={`${id}-all`}
          title={labels.allTokens}
          tokens={rest}
          term={term}
          activeId={active}
          selectedId={selected}
          optionId={optionId}
          networkName={networkName}
          cascade={cascade}
          onActivate={setActiveId}
          onSelect={choose}
        />
        {!flat.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {labels.noTokens}
          </p>
        ) : null}
      </div>
    </AnimatedModal>
  );
}
