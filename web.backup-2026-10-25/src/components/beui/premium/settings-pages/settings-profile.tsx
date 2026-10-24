"use client";

import {
  Check,
  Copy,
  FileText,
  Globe2,
  Layers3,
  Lightbulb,
  Link2,
  Search,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ChangeEvent, useEffect, useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { Switch } from "@/components/beui/motion/switch";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { SettingsNavigation } from "./settings-navigation";
import {
  SettingsFooter,
  SettingsSelect,
  useSettingsForm,
} from "./settings-shared";

export type ProfileSettingsValue = {
  name: string;
  logo: string;
  semanticSearch: boolean;
  insights: boolean;
  subdomain: string;
  customDomain: string;
  defaultContent: string;
};
export type ProfileSettingsProps = {
  initialValue?: ProfileSettingsValue;
  organizationId?: string;
  publishingHost?: string;
  onSave?: (value: ProfileSettingsValue) => void | Promise<void>;
  className?: string;
};
const DEFAULT_PROFILE: ProfileSettingsValue = {
  name: "Forma Studio",
  logo: "",
  semanticSearch: true,
  insights: true,
  subdomain: "forma-studio",
  customDomain: "",
  defaultContent: "Workspace overview",
};

export function ProfileSettings({
  initialValue = DEFAULT_PROFILE,
  organizationId = "org_forma_01",
  publishingHost = "example.com",
  onSave,
  className,
}: ProfileSettingsProps) {
  const form = useSettingsForm(initialValue, onSave);
  const profile = form.value;
  const id = useId();
  const reduce = useReducedMotion();
  const [active, setActive] = useState("profile");
  const [editing, setEditing] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("Copy organization ID");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState("");
  useEffect(() => {
    if (copyStatus === "Copy organization ID") return;
    const timer = setTimeout(() => setCopyStatus("Copy organization ID"), 2500);
    return () => clearTimeout(timer);
  }, [copyStatus]);
  async function copyId() {
    try {
      await navigator.clipboard.writeText(organizationId);
      setCopyStatus("Organization ID copied");
    } catch {
      setCopyStatus("Couldn’t copy. Try again.");
    }
  }
  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setUploadError("Choose a PNG, JPG, or WebP image under 2 MB.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    setUploadError("");
    const reader = new FileReader();
    reader.onload = () => {
      form.update({ ...profile, logo: String(reader.result) });
      setUploading(false);
    };
    reader.onerror = () => {
      setUploadError("Couldn’t read that image. Try another file.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }
  const transition = { duration: reduce ? 0 : 0.18, ease: EASE_OUT };
  return (
    <div className={cn("w-full bg-background text-foreground", className)}>
      <div className="mx-auto grid max-w-7xl md:h-[var(--preview-viewport-height,100svh)] md:grid-cols-[14rem_minmax(0,1fr)] md:overflow-hidden">
        <SettingsNavigation
          sectionPrefix={id}
          active={active}
          onNavigate={setActive}
        />
        <form
          onSubmit={(event) => {
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(profile.subdomain)) {
              event.preventDefault();
              setEditing("subdomain");
              setValidationError(
                "Use lowercase letters, numbers, and single hyphens for your subdomain.",
              );
              return;
            }
            if (
              profile.customDomain &&
              !/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(profile.customDomain)
            ) {
              event.preventDefault();
              setEditing("domain");
              setValidationError(
                "Enter a domain such as docs.example.com, without a URL path.",
              );
              return;
            }
            setValidationError("");
            void form.submit(event);
          }}
          className="min-h-0 min-w-0 px-5 py-8 sm:px-8 md:overflow-y-auto md:overscroll-contain lg:px-12"
        >
          <header className="mb-8">
            <h2 className="text-xl font-medium">General</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your organization and how your content is shared.
            </p>
          </header>
          <fieldset disabled={form.status === "saving" || uploading}>
            <section id={`${id}-profile`} className="scroll-mt-6 pb-8">
              <h3 className="text-xl font-medium">Organization profile</h3>
              <div className="my-6 flex items-center gap-4">
                <div className="relative flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border text-xl font-medium">
                  {profile.logo ? (
                    /* biome-ignore lint/performance/noImgElement: User-selected data URL is rendered directly in this installable block. */ <img
                      src={profile.logo}
                      alt={`${profile.name} logo`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Layers3 size={28} />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium">Organization logo</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A square image works best. PNG, JPG, or WebP, up to 2 MB.
                  </p>
                  <label className="relative mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-xs font-medium transition-colors hover:border-muted-foreground/50 focus-within:ring-2 focus-within:ring-ring">
                    <Upload size={13} />
                    {uploading ? "Uploading…" : "Upload image"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="Upload organization logo"
                      onChange={uploadLogo}
                      className="absolute inset-0 w-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </div>
              {uploadError && (
                <p role="alert" className="mb-4 text-sm text-destructive">
                  {uploadError}
                </p>
              )}
              <div className="grid max-w-2xl gap-6">
                <div className="grid items-start gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                  <label
                    htmlFor={`${id}-name`}
                    className="text-sm font-medium sm:pt-3"
                  >
                    Display name
                  </label>
                  <div className="min-w-0">
                    <Input
                      id={`${id}-name`}
                      aria-describedby={`${id}-name-hint`}
                      required
                      maxLength={80}
                      value={profile.name}
                      onChange={(e) => form.update({ ...profile, name: e })}
                      className="w-full mt-0"
                    />
                    <p
                      id={`${id}-name-hint`}
                      className="mt-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      The name your members see in the workspace.
                    </p>
                  </div>
                </div>
                <div className="grid items-start gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                  <label
                    htmlFor={`${id}-organization-id`}
                    className="text-sm font-medium sm:pt-3"
                  >
                    Organization ID
                  </label>
                  <div className="min-w-0">
                    <Input
                      rightIcon={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Copy organization ID"
                          title={copyStatus}
                          onClick={copyId}
                          className="size-9 shrink-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring rounded-full h-9"
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={
                                copyStatus === "Organization ID copied"
                                  ? "copied"
                                  : "copy"
                              }
                              initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
                              transition={transition}
                            >
                              {copyStatus === "Organization ID copied" ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </motion.span>
                          </AnimatePresence>
                        </Button>
                      }
                      id={`${id}-organization-id`}
                      readOnly
                      value={organizationId}
                      className="w-full min-w-0 flex-1"
                      classNames={{
                        input:
                          "px-3 py-2 font-mono text-xs text-muted-foreground",
                      }}
                    />
                    <output
                      aria-live="polite"
                      className="mt-2 block min-h-4 text-xs text-muted-foreground"
                    >
                      {copyStatus === "Copy organization ID"
                        ? "A unique identifier for support and integrations."
                        : copyStatus === "Organization ID copied"
                          ? "Copied to clipboard."
                          : "Couldn’t copy. Select the ID to copy it manually."}
                    </output>
                  </div>
                </div>
              </div>
            </section>
            <section
              id={`${id}-features`}
              className="scroll-mt-6 border-t border-border py-7"
            >
              <h3 className="mb-6 text-xl font-medium">AI features</h3>
              <div className="space-y-7">
                {(
                  [
                    {
                      key: "semanticSearch",
                      title: "Semantic search",
                      description:
                        "Help your team find answers across your workspace using natural language.",
                      icon: Search,
                    },
                    {
                      key: "insights",
                      title: "Content insights",
                      description:
                        "Spot knowledge gaps and uncover connections between your team’s documents.",
                      icon: Lightbulb,
                    },
                  ] as const
                ).map(({ key, title, description, icon: Icon }) => (
                  <div key={key} className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium">{title}</h4>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <Switch
                      ariaLabel={`Enable ${title.toLowerCase()}`}
                      checked={profile[key]}
                      onCheckedChange={(checked) =>
                        form.update({ ...profile, [key]: checked })
                      }
                      className="min-h-11"
                    />
                  </div>
                ))}
              </div>
            </section>
            <section className="border-t border-border py-7">
              <h3 className="mb-6 text-xl font-medium">Publishing</h3>
              <div className="space-y-7">
                {(
                  [
                    {
                      key: "subdomain",
                      title: "Subdomain",
                      description: `Your published content lives at ${profile.subdomain}.${publishingHost}.`,
                      action: "Edit subdomain",
                      icon: Globe2,
                    },
                    {
                      key: "domain",
                      title: "Custom domain",
                      description: profile.customDomain
                        ? `Use ${profile.customDomain} for your published content. DNS setup is required.`
                        : "Bring your own domain for a more familiar home.",
                      action: profile.customDomain
                        ? "Edit domain"
                        : "Add domain",
                      icon: Link2,
                    },
                    {
                      key: "content",
                      title: "Default content",
                      description: `Visitors land on ${profile.defaultContent.toLowerCase()} when they open your workspace.`,
                      action: "Change default",
                      icon: FileText,
                    },
                  ] as const
                ).map(({ key, title, description, action, icon: Icon }) => (
                  <div id={`${id}-${key}`} key={key} className="scroll-mt-6">
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium">{title}</h4>
                        <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">
                          {description}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setEditing(editing === key ? null : key)}
                        aria-expanded={editing === key}
                        aria-controls={`${id}-edit-${key}`}
                        className="col-start-2 justify-self-start px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring sm:col-start-3 rounded-full h-9"
                      >
                        {editing === key ? "Close" : action}
                      </Button>
                    </div>
                    <AnimatePresence initial={false}>
                      {editing === key && (
                        <motion.div
                          id={`${id}-edit-${key}`}
                          initial={{ opacity: 0, y: reduce ? 0 : -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: reduce ? 0 : -5 }}
                          transition={transition}
                          className="mt-4 max-w-2xl sm:pl-13"
                        >
                          <label
                            htmlFor={
                              key === "content"
                                ? undefined
                                : `${id}-input-${key}`
                            }
                            className="text-sm font-medium"
                          >
                            {title}
                          </label>
                          {key === "content" ? (
                            <SettingsSelect
                              label="Default content"
                              value={profile.defaultContent}
                              onValueChange={(next) =>
                                form.update({
                                  ...profile,
                                  defaultContent: next,
                                })
                              }
                              disabled={form.status === "saving" || uploading}
                              className="mt-2"
                              options={[
                                "Workspace overview",
                                "Getting started",
                                "Latest updates",
                              ].map((label) => ({ id: label, label }))}
                            />
                          ) : (
                            <Input
                              id={`${id}-input-${key}`}
                              required={key === "subdomain"}
                              pattern={
                                key === "subdomain"
                                  ? "[a-z0-9]+(-[a-z0-9]+)*"
                                  : "([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}"
                              }
                              title={
                                key === "subdomain"
                                  ? "Use lowercase letters, numbers, and single hyphens between words."
                                  : "Enter a domain such as docs.example.com, without https:// or a path."
                              }
                              maxLength={key === "subdomain" ? 63 : 253}
                              value={
                                key === "subdomain"
                                  ? profile.subdomain
                                  : profile.customDomain
                              }
                              placeholder={
                                key === "domain"
                                  ? "docs.example.com"
                                  : "your-workspace"
                              }
                              onChange={(e) =>
                                form.update({
                                  ...profile,
                                  [key === "subdomain"
                                    ? "subdomain"
                                    : "customDomain"]: e,
                                })
                              }
                              className="w-full"
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </section>
          </fieldset>
          {validationError && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {validationError}
            </p>
          )}
          <SettingsFooter
            dirty={form.dirty && !uploading}
            status={form.status}
            reset={form.reset}
            demo={!onSave}
          />
        </form>
      </div>
    </div>
  );
}
