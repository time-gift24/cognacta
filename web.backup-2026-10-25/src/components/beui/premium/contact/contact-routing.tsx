"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Handshake,
  Headphones,
  Send,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useState } from "react";
import {
  Button,
  type ButtonState,
  StatefulButton,
} from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_OUT, SPRING_BOUNCE, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type ContactRoutingProps = {
  eyebrow?: string;
  title?: string;
  className?: string;
};

const ROUTES = [
  {
    id: "sales",
    label: "Sales & demos",
    description: "Plans, security, and procurement",
    response: "Replies within 2 hours",
    Icon: BriefcaseBusiness,
  },
  {
    id: "support",
    label: "Product support",
    description: "Implementation and account help",
    response: "Replies within 30 minutes",
    Icon: Headphones,
  },
  {
    id: "partners",
    label: "Partnerships",
    description: "Agencies, affiliates, and integrations",
    response: "Replies within 1 business day",
    Icon: Handshake,
  },
] as const;

export function ContactRouting({
  eyebrow = "Routing desk",
  title = "Send your message to the right room.",
  className,
}: ContactRoutingProps) {
  const reduce = useReducedMotion();
  const [routeId, setRouteId] =
    useState<(typeof ROUTES)[number]["id"]>("sales");
  const [state, setState] = useState<ButtonState>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const route = ROUTES.find((item) => item.id === routeId) ?? ROUTES[0];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.includes("@") || message.trim().length < 4) {
      setState("error");
      return;
    }
    setState("loading");
    setTimeout(() => setState("success"), 950);
  };

  const clearError = () => state === "error" && setState("idle");

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-20 text-foreground sm:px-8",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-background">
        <header className="space-y-3 border-border border-b p-6 sm:p-8">
          <p className="font-medium text-muted-foreground text-sm">{eyebrow}</p>
          <h2 className="max-w-2xl text-balance text-foreground leading-tight text-4xl font-medium">
            {title}
          </h2>
        </header>

        <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
          <nav
            aria-label="Contact route"
            className="flex flex-col gap-3 border-border border-b p-6 lg:border-r lg:border-b-0 sm:p-8"
          >
            {ROUTES.map((item, index) => {
              const active = item.id === route.id;
              return (
                <Button
                  variant="plain"
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setRouteId(item.id);
                    setState("idle");
                  }}
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.45,
                    ease: EASE_OUT,
                    delay: reduce ? 0 : index * 0.07,
                  }}
                  aria-pressed={active}
                  className="group relative flex h-10 w-full items-center gap-3 rounded-full px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {active ? (
                    <motion.span
                      layoutId="contact-route"
                      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                      className="absolute inset-0 rounded-full bg-muted"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative grid size-5 shrink-0 place-items-center rounded-full",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <item.Icon className="size-4" />
                  </span>
                  <span className="relative flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "font-medium",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                      <ArrowRight
                        className={cn(
                          "size-4",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      />
                    </span>
                  </span>
                </Button>
              );
            })}
          </nav>

          <div className="min-h-[34rem] p-6 sm:p-8 lg:p-10">
            <AnimatePresence mode="wait" initial={false}>
              {state === "success" ? (
                <motion.div
                  key="success"
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? { duration: 0 } : SPRING_BOUNCE}
                  className="flex min-h-[28rem] items-center justify-center"
                >
                  <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6">
                    <div className="flex items-center justify-between gap-4 border-border border-b pb-4">
                      <span className="text-sm text-muted-foreground">
                        Ticket routed
                      </span>
                      <span className="grid size-9 place-items-center rounded-full bg-muted text-foreground">
                        <Send className="size-4" />
                      </span>
                    </div>
                    <p className="mt-7 font-medium text-xl text-foreground tracking-tight">
                      It is in the right queue.
                    </p>
                    <p className="mt-3 text-muted-foreground leading-7">
                      The {route.label.toLowerCase()} team will reply to{" "}
                      <span className="text-foreground">{email}</span>.{" "}
                      {route.response}.
                    </p>
                    <p className="mt-8 text-sm text-muted-foreground">
                      REF / {route.id.toUpperCase()}-2048
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key={route.id}
                  onSubmit={submit}
                  initial={reduce ? false : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                >
                  <div className="flex flex-col justify-between gap-4 border-border border-b pb-5 sm:flex-row sm:items-end">
                    <div>
                      <p className="font-medium text-primary text-sm">
                        Now routing to
                      </p>
                      <h3 className="mt-2 text-foreground tracking-tight text-xl font-medium">
                        {route.label}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {route.description}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {route.response}
                    </p>
                  </div>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <RoutingField id="routing-name" label="Name">
                      <Input
                        id="routing-name"
                        value={name}
                        onChange={(event) => {
                          setName(event);
                          clearError();
                        }}
                        placeholder="Ada Lovelace"
                        className="w-full"
                        classNames={{ input: "px-3 text-foreground text-sm" }}
                      />
                    </RoutingField>
                    <RoutingField id="routing-email" label="Work email">
                      <Input
                        id="routing-email"
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event);
                          clearError();
                        }}
                        placeholder="ada@analytical.engine"
                        className="w-full"
                        classNames={{ input: "px-3 text-foreground text-sm" }}
                      />
                    </RoutingField>
                  </div>
                  <div className="mt-5">
                    <RoutingField
                      id="routing-message"
                      label={
                        route.id === "sales"
                          ? "What are you evaluating?"
                          : route.id === "support"
                            ? "What needs attention?"
                            : "What should we build together?"
                      }
                    >
                      <textarea
                        id="routing-message"
                        value={message}
                        onChange={(event) => {
                          setMessage(event.target.value);
                          clearError();
                        }}
                        rows={5}
                        placeholder="Give us the useful context…"
                        className="w-full resize-none rounded-2xl border border-border bg-transparent p-3 text-foreground text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                      />
                    </RoutingField>
                  </div>
                  <div className="mt-5 flex flex-col justify-between gap-3 border-border border-t pt-5 sm:flex-row sm:items-center">
                    <p className="text-xs text-muted-foreground">
                      No bots / no ticket maze
                    </p>
                    <StatefulButton
                      type="submit"
                      state={state === "error" ? "idle" : state}
                      loadingText="Routing"
                      successText="Sent"
                      className="px-5 rounded-full h-9"
                    >
                      Route message <ArrowRight className="size-4" />
                    </StatefulButton>
                  </div>
                  {state === "error" ? (
                    <p role="alert" className="mt-3 text-destructive text-xs">
                      Complete each field so the desk can route your message.
                    </p>
                  ) : null}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoutingField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
