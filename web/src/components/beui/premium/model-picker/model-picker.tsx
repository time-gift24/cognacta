"use client";

import { ChevronDown, Cpu, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { MODEL_PROVIDER_ICONS } from "./provider-icons";

export type ModelPickerOption = {
  id: string;
  name: string;
  provider: string;
  /** Built-in logo key or your own icon. */
  providerId?: string;
  icon?: ReactNode;
  description?: string;
  badge?: string;
  keywords?: readonly string[];
  disabled?: boolean;
};
export type ModelPickerProps = {
  models: readonly ModelPickerOption[];
  variant?: "catalog" | "provider-rail";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "end" | "center";
  defaultOpen?: boolean;
  className?: string;
};

function ModelMark({ model }: { model: ModelPickerOption }) {
  const source = MODEL_PROVIDER_ICONS[model.providerId ?? " "];
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-full"
    >
      {model.icon ??
        (source ? (
          <span
            className="size-4 bg-contain bg-center bg-no-repeat dark:invert"
            style={{ backgroundImage: `url("${source}")` }}
          />
        ) : (
          <Cpu className="size-4 text-muted-foreground" />
        ))}
    </span>
  );
}

function ModelPickerMenu({
  models,
  value,
  onSelect,
  variant,
}: {
  models: readonly ModelPickerOption[];
  value?: string;
  onSelect: (id: string) => void;
  variant: "catalog" | "provider-rail";
}) {
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const providerModels = [
    ...new Map(models.map((model) => [model.provider, model])).values(),
  ];
  const [activeProvider, setActiveProvider] = useState(
    models.find((model) => model.id === value)?.provider ?? models[0]?.provider,
  );
  const rail = variant === "provider-rail";
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  function searchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") return;
    event.stopPropagation();
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const items = list.current?.querySelectorAll<HTMLElement>(
        '[role="menuitemradio"]:not([data-disabled])',
      );
      const item =
        event.key === "ArrowUp" ? items?.[items.length - 1] : items?.[0];
      item?.focus();
    }
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      input.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = models.filter((model) => {
    const text = [
      model.name,
      model.provider,
      model.id,
      model.description,
      ...(model.keywords ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!rail || model.provider === activeProvider) &&
      terms.every((term) => text.includes(term))
    );
  });
  const providers = [...new Set(filtered.map((model) => model.provider))];
  return (
    <div className="flex min-h-0">
      {rail && (
        <div className="m-2 mr-0 flex w-14 shrink-0 flex-col items-center gap-2 rounded-full bg-muted p-2">
          {providerModels.map((model) => (
            <AnimatedDropdownItem
              key={model.provider}
              aria-label={model.provider}
              title={model.provider}
              data-active={activeProvider === model.provider}
              onSelect={(event) => {
                event.preventDefault();
                setActiveProvider(model.provider);
                setQuery("");
                input.current?.focus();
              }}
              className={cn(
                "grid size-9 shrink-0 place-items-center p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9",
                activeProvider === model.provider
                  ? "bg-background text-foreground hover:bg-background rounded-full h-9"
                  : "bg-transparent hover:bg-foreground/5 rounded-full h-9",
              )}
            >
              <ModelMark model={model} />
            </AnimatedDropdownItem>
          ))}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {rail && (
          <div className="relative z-20 flex items-center justify-between gap-3 bg-background px-4 pt-3 pb-1">
            <span className="text-sm text-muted-foreground">Models</span>
            <Input
              leftIcon={<Search aria-hidden className="size-4" />}
              ref={input}
              aria-label="Quick search models"
              placeholder="Quick search"
              value={query}
              onKeyDown={searchKeyDown}
              onChange={(event) => setQuery(event)}
              className="w-28 min-w-0"
              classNames={{
                input: "text-sm placeholder:text-muted-foreground",
              }}
            />
          </div>
        )}
        <AnimatedDropdownRadioGroup
          ref={list}
          value={value ?? ""}
          onValueChange={onSelect}
          aria-label="Models"
          className="h-80 max-h-[50dvh] overflow-y-auto overscroll-contain px-2 pb-2 outline-none"
        >
          {providers.map((provider) => (
            <motion.fieldset
              key={provider}
              initial={rail && !reduceMotion ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.18,
                ease: EASE_OUT,
              }}
              aria-label={provider}
              className="min-w-0"
            >
              {!rail && (
                <div
                  aria-hidden="true"
                  className="px-2 pt-3 pb-1.5 text-xs font-medium text-muted-foreground"
                >
                  {provider}
                </div>
              )}
              {filtered
                .filter((model) => model.provider === provider)
                .map((model) => (
                  <AnimatedDropdownRadioItem
                    key={model.id}
                    data-beui-dropdown-index={model.id}
                    value={model.id}
                    disabled={model.disabled}
                    className="gap-2 rounded-xl py-2.5"
                  >
                    <ModelMark model={model} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {model.name}
                        </span>
                        {model.badge && (
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {model.badge}
                          </span>
                        )}
                      </span>
                      {model.description && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      )}
                    </span>
                  </AnimatedDropdownRadioItem>
                ))}
            </motion.fieldset>
          ))}
          {filtered.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center">
              <Search className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">No models found</p>
              <p className="text-xs text-muted-foreground">
                Try a model name or provider.
              </p>
            </div>
          )}
        </AnimatedDropdownRadioGroup>
        {!rail && (
          <div className="relative z-20 shrink-0 border-t border-border bg-background p-2">
            <Input
              rightIcon={
                <kbd className="text-xs text-muted-foreground">esc</kbd>
              }
              leftIcon={<Search aria-hidden className="size-4" />}
              ref={input}
              aria-label="Search models"
              placeholder="Search models or providers…"
              value={query}
              onKeyDown={searchKeyDown}
              onChange={(event) => setQuery(event)}
              className="w-full min-w-0 flex-1"
              classNames={{
                input: "text-sm placeholder:text-muted-foreground",
              }}
            />
          </div>
        )}
        <output className="sr-only">{filtered.length} models found</output>
      </div>
    </div>
  );
}

export function ModelPicker({
  models,
  variant = "catalog",
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  placeholder = "Select model",
  side = "top",
  align = "start",
  defaultOpen = false,
  className,
}: ModelPickerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(defaultOpen);
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedValue = value !== undefined ? value : internalValue;
  const selected = models.find((model) => model.id === selectedValue);
  function select(id: string) {
    if (value === undefined) setInternalValue(id);
    onValueChange?.(id);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  return (
    <AnimatedDropdown open={open && !disabled} onOpenChange={setOpen}>
      <AnimatedDropdownTrigger asChild>
        <Button
          ref={trigger}
          variant="outline"
          disabled={disabled}
          aria-label={`Select model${selected ? `, current: ${selected.name}` : " "}`}
          className={cn(
            "min-w-52 justify-between gap-2 px-3 rounded-full h-10",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selected && <ModelMark model={selected} />}
            <span className="truncate text-sm">
              {selected?.name ?? placeholder}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </Button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent
        side={side}
        align={align}
        className={cn(
          "max-w-[calc(100vw-2rem)] overflow-hidden p-0",
          variant === "provider-rail" ? "w-96" : "w-80",
        )}
      >
        <ModelPickerMenu
          models={models}
          variant={variant}
          value={selectedValue}
          onSelect={select}
        />
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}
