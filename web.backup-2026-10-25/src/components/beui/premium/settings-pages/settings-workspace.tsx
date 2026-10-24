"use client";

import {
  ArrowUpRight,
  Check,
  CreditCard,
  Mail,
  Plus,
  Users,
  X,
} from "lucide-react";
import { cloneElement, type ReactElement, useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Checkbox } from "@/components/beui/motion/checkbox";
import { Input, type InputProps } from "@/components/beui/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { cn } from "@/lib/beui/utils";
import {
  SettingsFooter,
  SettingsSelect,
  useSettingsForm,
} from "./settings-shared";

export type WorkspaceMember = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Member";
  status: "Active" | "Invitation draft";
};
export type WorkspaceSettingsValue = {
  name: string;
  email: string;
  jobTitle: string;
  company: string;
  billingEmail: string;
  taxId: string;
  address: string;
  plan: "starter" | "pro" | "business";
  cycle: "monthly" | "yearly";
  timezone: string;
  digest: boolean;
  members: WorkspaceMember[];
};
export type WorkspaceSettingsProps = {
  initialValue?: WorkspaceSettingsValue;
  onSave?: (value: WorkspaceSettingsValue) => void | Promise<void>;
  className?: string;
};
const DEFAULT_SETTINGS: WorkspaceSettingsValue = {
  name: "Alex Morgan",
  email: "alex@forma.example",
  jobTitle: "Product designer",
  company: "Forma Studio",
  billingEmail: "billing@forma.example",
  taxId: " ",
  address: " ",
  plan: "pro",
  cycle: "monthly",
  timezone: "America/New_York",
  digest: true,
  members: [
    {
      id: "alex",
      name: "Alex Morgan",
      email: "alex@forma.example",
      role: "Owner",
      status: "Active",
    },
    {
      id: "jamie",
      name: "Jamie Chen",
      email: "jamie@forma.example",
      role: "Admin",
      status: "Active",
    },
    {
      id: "sam",
      name: "Sam Rivera",
      email: "sam@forma.example",
      role: "Member",
      status: "Active",
    },
  ],
};
const SECTIONS = ["Account", "Billing", "Plan", "Team", "Preferences"] as const;
const PLANS = [
  {
    id: "starter",
    title: "Starter",
    monthly: 0,
    yearly: 0,
    description: "A home for your next idea.",
    features: ["3 projects", "Essential collaboration", "Community support"],
  },
  {
    id: "pro",
    title: "Pro",
    monthly: 24,
    yearly: 20,
    description: "More room to do your best work.",
    features: ["Unlimited projects", "Shared libraries", "Priority support"],
  },
  {
    id: "business",
    title: "Business",
    monthly: 49,
    yearly: 40,
    description: "Bring your whole team together.",
    features: [
      "Everything in Pro",
      "Advanced permissions",
      "Dedicated onboarding",
    ],
  },
] as const;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactElement<InputProps>;
}) {
  const id = useId();
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
      <label htmlFor={id} className="text-sm font-medium sm:pt-3">
        {label}
      </label>
      <div className="min-w-0">
        {cloneElement(children, {
          id,
          "aria-describedby": hint ? `${id}-hint` : undefined,
        })}
        {hint && (
          <p
            id={`${id}-hint`}
            className="mt-2 text-xs leading-relaxed text-muted-foreground"
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function WorkspaceSettings({
  initialValue = DEFAULT_SETTINGS,
  onSave,
  className,
}: WorkspaceSettingsProps) {
  const form = useSettingsForm(initialValue, onSave);
  const value = form.value;
  const id = useId();
  const [tab, setTab] = useState<string>("Account");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Member">("Member");
  const [error, setError] = useState(" ");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const update = <K extends keyof WorkspaceSettingsValue>(
    key: K,
    next: WorkspaceSettingsValue[K],
  ) => {
    form.update({ ...value, [key]: next });
    setError(" ");
  };
  function addInvitation() {
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address to add an invitation.");
      return;
    }
    if (value.members.some((member) => member.email.toLowerCase() === email)) {
      setError("That person is already on the team or invitation list.");
      return;
    }
    update("members", [
      ...value.members,
      {
        id: crypto.randomUUID(),
        name: email.split("@")[0],
        email,
        role: inviteRole,
        status: "Invitation draft",
      },
    ]);
    setInviteEmail("");
  }
  const selectedPlan = PLANS.find((plan) => plan.id === value.plan) ?? PLANS[1];
  const panel = (name: string) => ({
    role: "tabpanel",
    id: `${id}-panel-${name}`,
    "aria-labelledby": `${id}-tab-${name}`,
    hidden: tab !== name,
  });
  return (
    <div
      className={cn(
        "min-h-[var(--preview-viewport-height,100svh)] w-full bg-background px-5 py-8 text-foreground sm:px-10",
        className,
      )}
    >
      <form
        className="mx-auto max-w-5xl"
        noValidate
        onSubmit={(event) => {
          if (
            !value.name.trim() ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)
          ) {
            event.preventDefault();
            setTab("Account");
            setError("Add your name and a valid account email.");
            return;
          }
          if (
            !value.company.trim() ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.billingEmail)
          ) {
            event.preventDefault();
            setTab("Billing");
            setError("Add your company name and a valid billing email.");
            return;
          }
          setError(" ");
          void form.submit(event);
        }}
      >
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium">Settings</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your profile, your workspace, your way of working.
            </p>
          </div>
        </header>
        <Tabs
          variant="underline"
          value={tab}
          onValueChange={setTab}
          className="mb-8"
        >
          <div className="overflow-x-auto pb-1">
            <TabsList
              aria-label="Workspace settings"
              className="min-w-full gap-5"
            >
              {SECTIONS.map((section, index) => (
                <TabsTrigger
                  key={section}
                  value={section}
                  id={`${id}-tab-${section}`}
                  aria-controls={`${id}-panel-${section}`}
                  tabIndex={tab === section ? 0 : -1}
                  className="shrink-0 whitespace-nowrap px-1 focus-visible:outline-2 focus-visible:outline-ring"
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const next =
                      SECTIONS[
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? SECTIONS.length - 1
                            : (index +
                                (event.key === "ArrowRight" ? 1 : -1) +
                                SECTIONS.length) %
                              SECTIONS.length
                      ];
                    setTab(next);
                    document.getElementById(`${id}-tab-${next}`)?.focus();
                  }}
                >
                  {section}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <fieldset disabled={form.status === "saving"} className="min-w-0">
          <div {...panel("Account")}>
            <div className="mb-7">
              <h3 className="text-xl font-medium">Personal information</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                The details that help your team recognize you.
              </p>
            </div>
            <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="space-y-6">
                <Field label="Full name">
                  <Input
                    value={value.name}
                    autoComplete="name"
                    maxLength={80}
                    onChange={(e) => update("name", e)}
                    className="w-full mt-0"
                  />
                </Field>
                <Field
                  label="Email address"
                  hint="Used for account updates and workspace invitations."
                >
                  <Input
                    type="email"
                    value={value.email}
                    autoComplete="email"
                    onChange={(e) => update("email", e)}
                    className="w-full mt-0"
                  />
                </Field>
                <Field label="Job title">
                  <Input
                    value={value.jobTitle}
                    autoComplete="organization-title"
                    maxLength={100}
                    onChange={(e) => update("jobTitle", e)}
                    className="w-full mt-0"
                  />
                </Field>
              </div>
              <aside className="rounded-2xl border border-border p-5">
                <span className="flex size-12 items-center justify-center rounded-full border border-border text-base font-medium">
                  {value.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join(" ") || "A"}
                </span>
                <p className="mt-4 break-words text-sm font-medium">
                  {value.name || "Your name"}
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {value.jobTitle || "Your role"}
                </p>
                <p className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <Users size={14} />
                  Workspace owner
                </p>
              </aside>
            </div>
          </div>
          <div {...panel("Billing")}>
            <div className="mb-7">
              <h3 className="text-xl font-medium">Billing details</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep your receipts and company information in order.
              </p>
            </div>
            <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="space-y-6">
                <Field label="Company name">
                  <Input
                    value={value.company}
                    autoComplete="organization"
                    onChange={(e) => update("company", e)}
                    className="w-full mt-0"
                  />
                </Field>
                <Field
                  label="Billing email"
                  hint="Receipts will be addressed to this email."
                >
                  <Input
                    type="email"
                    value={value.billingEmail}
                    onChange={(e) => update("billingEmail", e)}
                    className="w-full mt-0"
                  />
                </Field>
                <Field label="Billing address">
                  <Input
                    value={value.address}
                    autoComplete="street-address"
                    placeholder="Street, city, postal code"
                    onChange={(e) => update("address", e)}
                    className="w-full mt-0"
                  />
                </Field>
                <Field
                  label="Tax ID"
                  hint="Optional. Include your VAT or company tax number."
                >
                  <Input
                    value={value.taxId}
                    placeholder="Tax identification number"
                    onChange={(e) => update("taxId", e)}
                    className="w-full mt-0"
                  />
                </Field>
              </div>
              <aside className="self-start rounded-2xl border border-border p-5">
                <CreditCard size={20} />
                <h4 className="mt-4 text-sm font-medium">
                  {selectedPlan.title} · {value.cycle}
                </h4>
                <p className="mt-2 text-2xl font-medium tabular-nums">
                  $
                  {value.cycle === "yearly"
                    ? selectedPlan.yearly * 12
                    : selectedPlan.monthly}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / {value.cycle === "yearly" ? "year" : "month"}
                  </span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Preview estimate before taxes.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setTab("Plan")}
                  className="mt-3 px-0 text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                >
                  Manage plan
                  <ArrowUpRight size={14} />
                </Button>
              </aside>
            </div>
          </div>
          <div {...panel("Plan")}>
            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-medium">Room to grow</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose a plan that fits the way you work.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Billing cycle
                <SettingsSelect
                  label="Billing cycle"
                  value={value.cycle}
                  onValueChange={(next) =>
                    update("cycle", next as WorkspaceSettingsValue["cycle"])
                  }
                  disabled={form.status === "saving"}
                  options={[
                    { id: "monthly", label: "Monthly" },
                    { id: "yearly", label: "Yearly · save up to 18%" },
                  ]}
                  className="mt-2 min-w-44"
                />
              </div>
            </div>
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="sr-only">Choose a plan</legend>
              {PLANS.map((plan) => (
                <label
                  key={plan.id}
                  className={cn(
                    "relative cursor-pointer rounded-2xl border bg-background p-5 transition-colors focus-within:ring-2 focus-within:ring-ring",
                    value.plan === plan.id
                      ? "border-foreground"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-medium">{plan.title}</span>
                    <input
                      type="radio"
                      name={`${id}-plan`}
                      value={plan.id}
                      checked={value.plan === plan.id}
                      onChange={() => update("plan", plan.id)}
                      className="size-4 accent-primary"
                    />
                  </div>
                  <p className="mt-3 min-h-10 text-xs leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                  <p className="my-6 text-4xl font-medium tabular-nums">
                    ${value.cycle === "yearly" ? plan.yearly : plan.monthly}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / mo
                    </span>
                  </p>
                  <ul className="space-y-3 border-t border-border pt-5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-xs">
                        <Check size={14} className="shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </label>
              ))}
            </fieldset>
            <p className="mt-4 text-xs text-muted-foreground">
              Example pricing. Selecting a plan updates your preferences; this
              preview does not charge you.
            </p>
          </div>
          <div {...panel("Team")}>
            <div className="mb-7">
              <h3 className="text-xl font-medium">Better together</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage access and make space for your next collaborator.
              </p>
            </div>
            <div className="mb-6 flex flex-wrap items-end gap-3">
              <Input
                label="Email address"
                type="email"
                aria-label="Invite email address"
                value={inviteEmail}
                onChange={setInviteEmail}
                placeholder="colleague@company.com"
                className="min-w-0 flex-1"
              />
              <div className="text-xs font-medium">
                Role
                <SettingsSelect
                  label="Invitation role"
                  value={inviteRole}
                  onValueChange={(next) =>
                    setInviteRole(next as "Admin" | "Member")
                  }
                  disabled={form.status === "saving"}
                  options={[
                    { id: "Member", label: "Member" },
                    { id: "Admin", label: "Admin" },
                  ]}
                  className="mt-2 min-w-28"
                />
              </div>
              <Button
                variant="outline"
                onClick={addInvitation}
                className="mb-0.5 text-xs focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
              >
                <Plus size={15} />
                Add invitation
              </Button>
            </div>
            <div className="divide-y divide-border rounded-2xl border border-border px-5">
              {value.members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center gap-3 py-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">
                    {member.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                    {member.status === "Invitation draft" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Invitation draft
                      </p>
                    )}
                  </div>
                  {member.role === "Owner" ? (
                    <span className="px-3 text-xs text-muted-foreground">
                      Owner
                    </span>
                  ) : (
                    <>
                      <SettingsSelect
                        label={`Role for ${member.email}`}
                        value={member.role}
                        onValueChange={(next) =>
                          update(
                            "members",
                            value.members.map((item) =>
                              item.id === member.id
                                ? { ...item, role: next as "Member" | "Admin" }
                                : item,
                            ),
                          )
                        }
                        disabled={form.status === "saving"}
                        options={[
                          { id: "Member", label: "Member" },
                          { id: "Admin", label: "Admin" },
                        ]}
                        className="w-28"
                        buttonClassName="text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${member.email}`}
                        title="Remove member"
                        onClick={() => setRemoveId(member.id)}
                        className="size-9 focus-visible:ring-2 focus-visible:ring-ring rounded-full h-9"
                      >
                        <X size={15} />
                      </Button>
                    </>
                  )}
                  {removeId === member.id && (
                    <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                      <p className="text-xs">
                        Remove {member.name} from this workspace?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setRemoveId(null)}
                          className="text-xs rounded-full h-9"
                        >
                          Keep member
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            update(
                              "members",
                              value.members.filter(
                                (item) => item.id !== member.id,
                              ),
                            );
                            setRemoveId(null);
                          }}
                          className="text-xs rounded-full h-9"
                        >
                          Remove member
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Mail size={14} className="shrink-0" />
              Preview only. Invitations stay as drafts; no emails are sent.
            </p>
          </div>
          <div {...panel("Preferences")}>
            <div className="mb-7">
              <h3 className="text-xl font-medium">Make work feel natural</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A few small preferences for your everyday routine.
              </p>
            </div>
            <div className="max-w-2xl space-y-7">
              <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
                <span className="text-sm font-medium sm:pt-3">Time zone</span>
                <div>
                  <SettingsSelect
                    label="Time zone"
                    value={value.timezone}
                    onValueChange={(next) => update("timezone", next)}
                    disabled={form.status === "saving"}
                    options={[
                      {
                        id: "America/New_York",
                        label: "New York · Eastern Time",
                      },
                      { id: "Europe/London", label: "London · UK Time" },
                      {
                        id: "Asia/Kolkata",
                        label: "Kolkata · India Standard Time",
                      },
                      { id: "UTC", label: "UTC" },
                    ]}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Used for dates, activity, and scheduled summaries.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
                <div>
                  <h4 className="text-sm font-medium">
                    Weekly workspace summary
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A useful recap, delivered once a week.
                  </p>
                </div>
                <Checkbox
                  checked={value.digest}
                  onCheckedChange={(checked) => update("digest", checked)}
                  label="Email summary"
                  className="min-h-11 text-sm [&_button]:relative [&_button]:after:absolute [&_button]:after:-inset-3"
                />
              </div>
            </div>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-5 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-9">
          <SettingsFooter
            {...form}
            reset={() => {
              form.reset();
              setError(" ");
              setRemoveId(null);
            }}
            demo={!onSave}
          />
        </div>
      </form>
    </div>
  );
}
