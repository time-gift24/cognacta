"use client";

import { ArrowLeft, LoaderCircle, Mail, Mountain } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { Input } from "@/components/beui/motion/input";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { AUTH_LANDSCAPE_IMAGE } from "./auth-landscape-image";
import { AppleIcon, GithubIcon, GoogleIcon } from "./social-icons";

export type AuthLandscapeProps = {
  title?: string;
  termsHref?: string;
  privacyHref?: string;
  description?: string;
  brandName?: string;
  logo?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  onAppleSignIn?: () => void | Promise<void>;
  onGithubSignIn?: () => void | Promise<void>;
  onGoogleSignIn?: () => void | Promise<void>;
  onEmailSignIn?: (email: string) => void | Promise<void>;
  className?: string;
};

export function AuthLandscape({
  title = "Back to your own pace.",
  description = "Your projects, saved notes, and next steps. All right where you left them.",
  brandName = "Trailhead",
  termsHref = "/terms",
  privacyHref = "/privacy",
  logo,
  imageSrc = AUTH_LANDSCAPE_IMAGE,
  imageAlt = "A textured pixel-art river winding through a green mountain forest",
  onGoogleSignIn,
  onAppleSignIn,
  onGithubSignIn,
  onEmailSignIn,
  className,
}: AuthLandscapeProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const emailId = useId();
  const [step, setStep] = useState<"social" | "email" | "sent">("social");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const busy = pending !== null;
  const [error, setError] = useState("");
  async function authenticate(
    provider: "google" | "apple" | "github" | "email",
  ) {
    const actions = {
      google: onGoogleSignIn,
      apple: onAppleSignIn,
      github: onGithubSignIn,
      email: onEmailSignIn ? () => onEmailSignIn(email.trim()) : undefined,
    };
    const action = actions[provider];
    if (!action || busy) return;
    setPending(provider);
    setError("");
    try {
      await action();
      if (provider === "email") setStep("sent");
    } catch {
      setError("That didn’t go through. Give it another try.");
    } finally {
      setPending(null);
    }
  }
  return (
    <section
      aria-labelledby={titleId}
      className={cn("w-full px-4 py-10 sm:px-8", className)}
    >
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-border bg-background text-foreground p-2 md:grid-cols-2">
        <div className="relative h-60 overflow-hidden rounded-2xl sm:h-72 md:h-auto md:min-h-[38rem]">
          {/* biome-ignore lint/performance/noImgElement: image is included in the portable registry bundle. */}
          <img
            src={imageSrc}
            alt={imageAlt}
            width={800}
            height={1000}
            className="absolute inset-0 size-full object-cover"
            decoding="async"
          />
          <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-md">
            <Mountain aria-hidden className="size-4" />
            {brandName}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-20 items-center justify-center rounded-full border border-border bg-background/90 text-foreground backdrop-blur-sm">
              {logo ?? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 64 64"
                  className="size-14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  {[0, 45, 90, 135].map((angle) => (
                    <ellipse
                      key={angle}
                      cx="32"
                      cy="32"
                      rx="13"
                      ry="26"
                      transform={`rotate(${angle} 32 32)`}
                    />
                  ))}
                  <circle
                    cx="32"
                    cy="32"
                    r="3"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center px-5 py-8 sm:p-10 md:px-12 md:py-10">
          <p className="mb-4 text-xs font-medium text-muted-foreground">
            YOUR PERSONAL WORKSPACE
          </p>
          <h2
            id={titleId}
            className="max-w-sm text-balance text-4xl font-medium tracking-tight"
          >
            {title}
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
              >
                {step === "social" ? (
                  <div className="space-y-3">
                    {(
                      [
                        {
                          id: "google",
                          label: "Google",
                          icon: GoogleIcon,
                          action: onGoogleSignIn,
                        },
                        {
                          id: "apple",
                          label: "Apple",
                          icon: AppleIcon,
                          action: onAppleSignIn,
                        },
                        {
                          id: "github",
                          label: "GitHub",
                          icon: GithubIcon,
                          action: onGithubSignIn,
                        },
                      ] as const
                    ).map(({ id, label, icon: Icon, action }) => (
                      <Button
                        key={id}
                        tabIndex={0}
                        type="button"
                        variant="outline"
                        className="relative h-10 w-full rounded-full hover:bg-muted"
                        disabled={busy || !action}
                        aria-busy={pending === id}
                        onClick={() => void authenticate(id)}
                      >
                        {pending === id ? (
                          <LoaderCircle
                            aria-hidden
                            className="absolute left-4 size-4 motion-safe:animate-spin"
                          />
                        ) : (
                          <Icon className="absolute left-4 size-4" />
                        )}
                        Sign in with {label}
                      </Button>
                    ))}
                    <div className="flex items-center gap-3 py-2" aria-hidden>
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">
                        or keep it simple
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <Button
                      tabIndex={0}
                      type="button"
                      className="relative h-10 w-full rounded-full"
                      disabled={busy || !onEmailSignIn}
                      onClick={() => {
                        setError("");
                        setStep("email");
                      }}
                    >
                      <Mail aria-hidden className="absolute left-4 size-4" />
                      Sign in with email
                    </Button>
                  </div>
                ) : step === "email" ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void authenticate("email");
                    }}
                  >
                    <label htmlFor={emailId} className="text-sm font-medium">
                      Email address
                    </label>
                    <Input
                      id={emailId}
                      type="email"
                      autoComplete="email"
                      required
                      disabled={busy}
                      value={email}
                      onChange={(event) => setEmail(event)}
                      placeholder="you@example.com"
                      className="w-full"
                      classNames={{ input: "px-4 text-sm" }}
                    />
                    <Button
                      tabIndex={0}
                      type="submit"
                      disabled={busy}
                      className="h-9 w-full"
                    >
                      {busy && (
                        <LoaderCircle className="size-4 motion-safe:animate-spin" />
                      )}
                      Email me a login link
                    </Button>
                    <Button
                      tabIndex={0}
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      className="h-9 w-full"
                      onClick={() => {
                        setError("");
                        setStep("social");
                      }}
                    >
                      <ArrowLeft className="size-4" />
                      Back to sign-in methods
                    </Button>
                  </form>
                ) : (
                  <div aria-live="polite" className="space-y-3">
                    <p className="text-xl font-medium">
                      Your next step is in your inbox.
                    </p>
                    <p className="break-words text-sm text-muted-foreground">
                      Open the login link we sent to {email} to return to your
                      workspace.
                    </p>
                    <Button
                      tabIndex={0}
                      type="button"
                      variant="outline"
                      className="h-9"
                      onClick={() => setStep("email")}
                    >
                      Try a different address
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <p className="mt-7 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to our{" "}
            <a
              href={termsHref}
              className="rounded-sm text-foreground underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Terms of Service
            </a>{" "}
            and acknowledge our{" "}
            <a
              href={privacyHref}
              className="rounded-sm text-foreground underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
