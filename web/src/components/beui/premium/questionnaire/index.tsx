"use client";

import { Questionnaire as Primitive } from "@shadcn/react/questionnaire";
import { ArrowLeft, Check, CornerDownLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react";
import { Button } from "@/components/beui/motion/button";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/beui/motion/radio";
import { EASE_OUT, SPRING_PANEL } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

const Context = createContext({ active: "", direction: 1 });
const ItemContext = createContext("");
const MotionItem = motion.create(Primitive.Item);
const ACTION =
  "h-9 gap-2 rounded-full px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-hidden:hidden";

export type QuestionnaireProps = ComponentProps<typeof Primitive.Root>;

/** Compose question parts freely. State, validation and FormData belong to the headless root. */
export function Questionnaire({
  className,
  items,
  item,
  defaultItem,
  onItemChange,
  children,
  ...props
}: QuestionnaireProps) {
  const [internal, setInternal] = useState(
    defaultItem ?? items?.find((entry) => !entry.disabled)?.name ?? "",
  );
  const [direction, setDirection] = useState(1);
  const active = item ?? internal;
  return (
    <Context.Provider value={{ active, direction }}>
      <Primitive.Root
        {...props}
        items={items}
        item={item}
        defaultItem={defaultItem}
        shortcuts={props.shortcuts ?? "numbers"}
        onItemChange={(next) => {
          const currentIndex =
            items?.findIndex((entry) => entry.name === active) ?? 0;
          const nextIndex =
            items?.findIndex((entry) => entry.name === next) ?? 0;
          setDirection(nextIndex < currentIndex ? -1 : 1);
          setInternal(next);
          onItemChange?.(next);
        }}
        className={cn(
          "w-full max-w-xl rounded-2xl border border-border bg-background p-2 text-foreground",
          className,
        )}
      >
        {children}
      </Primitive.Root>
    </Context.Provider>
  );
}

export function QuestionnaireProgress({
  className,
  ...props
}: ComponentProps<typeof Primitive.Progress>) {
  return (
    <Primitive.Progress
      {...props}
      className={cn("px-3 pt-2 text-xs text-muted-foreground", className)}
    />
  );
}

export function QuestionnaireItem({
  name,
  className,
  children,
  ...props
}: Omit<
  ComponentProps<typeof Primitive.Item>,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
>) {
  const { active, direction } = useContext(Context);
  const reduce = useReducedMotion();
  const id = useId();
  return (
    <ItemContext.Provider value={id}>
      <MotionItem
        {...props}
        name={name}
        initial={false}
        animate={{
          opacity: !active || active === name ? 1 : 0,
          x: reduce || !active || active === name ? 0 : direction * 10,
        }}
        transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
        className={cn("min-w-0 border-0 p-0 outline-none", className)}
      >
        {children}
      </MotionItem>
    </ItemContext.Provider>
  );
}

// The legend remains a direct child of its fieldset.
export function QuestionnaireTitle({
  className,
  ...props
}: ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      {...props}
      className={cn("mb-2 w-full px-3 pt-2 text-xl font-medium", className)}
    />
  );
}
export function QuestionnaireDescription({
  className,
  ...props
}: ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      {...props}
      className={cn("mb-2 px-3 text-sm text-muted-foreground", className)}
    />
  );
}
export function QuestionnaireChoices({
  className,
  ...props
}: ComponentProps<typeof Primitive.Choices>) {
  return (
    <Primitive.Choices {...props} className={cn("space-y-1", className)} />
  );
}

export function QuestionnaireChoice({
  className,
  children,
  variant = "row",
  ...props
}: Omit<ComponentProps<typeof Primitive.Choice>, "render"> & {
  variant?: "row" | "control";
}) {
  const group = useContext(ItemContext);
  const labelId = useId();
  const reduce = useReducedMotion();
  return (
    <Primitive.Choice
      {...props}
      className={cn(
        "group relative flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50",
        variant === "control"
          ? "items-start gap-3 py-2.5"
          : "hover:bg-foreground/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        className,
      )}
      render={(labelProps, state) => (
        <div {...labelProps}>
          {state.checked && variant === "row" && (
            <motion.span
              aria-hidden
              layoutId={
                reduce || state.type === "checkbox"
                  ? undefined
                  : `${group}-selection`
              }
              initial={false}
              transition={SPRING_PANEL}
              className="absolute inset-0 rounded-xl bg-foreground/7"
            />
          )}
          <Primitive.ChoiceInput
            aria-labelledby={labelId}
            className="absolute inset-0 z-20 size-full cursor-pointer opacity-0"
          />
          {variant === "control" && (
            // The native input above owns focus, shortcuts and FormData. These
            // inert beUI controls provide the shared visual and motion treatment.
            <div
              aria-hidden
              inert
              className={cn(
                "pointer-events-none mt-0.5 shrink-0 group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-ring group-has-[:focus-visible]:ring-offset-2 group-has-[:focus-visible]:ring-offset-background",
                state.type === "checkbox" ? "rounded-md" : "rounded-full",
              )}
            >
              {state.type === "checkbox" ? (
                <Checkbox
                  className="flex [&_button]:size-4 [&_button]:border [&_svg]:size-2.5"
                  checked={state.checked}
                  disabled={state.disabled}
                  onCheckedChange={() => {}}
                />
              ) : (
                <RadioGroup value={state.checked ? props.value : ""}>
                  <RadioGroupItem
                    className="flex [&_button]:size-4 [&_button]:border [&_button>span]:inset-1"
                    value={props.value}
                    disabled={state.disabled}
                  />
                </RadioGroup>
              )}
            </div>
          )}
          <Primitive.ChoiceLabel
            id={labelId}
            className="relative z-10 min-w-0 flex-1 leading-5"
          >
            {children}
          </Primitive.ChoiceLabel>
          {variant === "row" && (
            <span
              aria-hidden
              className="relative z-10 grid size-6 shrink-0 place-items-center rounded-lg border border-border text-xs tabular-nums text-muted-foreground"
            >
              {state.checked ? (
                <motion.span
                  initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING_PANEL}
                >
                  <Check className="size-3.5" />
                </motion.span>
              ) : (
                <Primitive.ChoiceShortcut />
              )}
            </span>
          )}
        </div>
      )}
    />
  );
}
export function QuestionnaireInput({
  className,
  ...props
}: ComponentProps<typeof Primitive.Input>) {
  return (
    <Primitive.Input
      {...props}
      className={cn(
        "my-2 h-10 w-full rounded-full border border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    />
  );
}
export function QuestionnaireError({
  className,
  ...props
}: ComponentProps<typeof Primitive.Error>) {
  return (
    <Primitive.Error
      {...props}
      className={cn("mt-3 px-3 text-sm text-destructive sm:px-4", className)}
    />
  );
}
export function QuestionnaireActions({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "mt-3 flex items-center justify-end gap-2 px-1 pb-1",
        className,
      )}
    />
  );
}
export function QuestionnairePrevious({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Previous>) {
  return (
    <Primitive.Previous
      {...props}
      className={cn(ACTION, "mr-auto", className)}
      render={<Button variant="ghost" />}
    >
      {children ?? (
        <>
          <ArrowLeft aria-hidden className="size-4" />
          Back
        </>
      )}
    </Primitive.Previous>
  );
}
export function QuestionnaireSkip({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Skip>) {
  return (
    <Primitive.Skip
      {...props}
      className={cn(ACTION, className)}
      render={<Button variant="ghost" />}
    >
      {children ?? "Skip"}
    </Primitive.Skip>
  );
}
function ContinueLabel({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <kbd
        aria-hidden
        className="flex items-center rounded-md border border-current/15 px-1.5 py-0.5 text-xs"
      >
        <CornerDownLeft className="size-3" />
      </kbd>
    </>
  );
}
export function QuestionnaireNext({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Next>) {
  return (
    <Primitive.Next
      {...props}
      className={cn(ACTION, className)}
      render={<Button />}
    >
      {children ?? <ContinueLabel>Continue</ContinueLabel>}
    </Primitive.Next>
  );
}
export function QuestionnaireSubmit({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Submit>) {
  return (
    <Primitive.Submit
      {...props}
      className={cn(ACTION, className)}
      render={<Button />}
    >
      {children ?? <ContinueLabel>Send answers</ContinueLabel>}
    </Primitive.Submit>
  );
}
