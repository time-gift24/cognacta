"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/beui/utils";
import {
  type ApiKey,
  type ApiKeyEnvironment,
  type ApiKeyExpiryOption,
  type ApiKeyScopeGroup,
  type ApiKeysLabels,
  type CreateApiKeyInput,
  type CreateApiKeyResult,
  DEFAULT_ENVIRONMENTS,
  DEFAULT_EXPIRY_OPTIONS,
  DEFAULT_KEYS,
  DEFAULT_LABELS,
  DEFAULT_SCOPE_GROUPS,
  type RotateApiKeyResult,
  SAMPLE_NOW,
} from "./api-keys-data";
import {
  getKeyStatus,
  randomLast4,
  sampleCreate,
  wait,
} from "./api-keys-format";
import { ApiKeysHeader } from "./api-keys-header";
import { PANEL_EXIT, SECTION_RISE, SECTION_STAGGER } from "./api-keys-motion";
import { CreateKeyDialog } from "./create-key-dialog";
import { EmptyState } from "./empty-state";
import { KeyTable } from "./key-table";
import { RevokeDialog } from "./revoke-dialog";

/* ─────────────────────────────────────────────────────────
 * API KEYS MANAGER
 *
 *  load     header, environment tabs, and table blur-rise 70ms
 *           apart; rows cascade 45ms apart; sparklines draw in
 *  tabs     the table exits in 150ms, the next environment's rows
 *           (or the empty state) cascade in; counts roll
 *  create   dialog form morphs into a one-time secret reveal;
 *           closing it lands the new row with a fading tint
 *  rotate   button rolls loading → success; changed prefix digits
 *           swap in place and "rotated" updates
 *  revoke   typed confirmation; after the dialog closes the name
 *           strikes through, the status pill rolls, counts roll
 *  reduced  no transforms or blur; opacity-only swaps
 * ───────────────────────────────────────────────────────── */

export type ApiKeysProps = {
  /** Initial keys. The block keeps its own copy as keys change. */
  keys?: ApiKey[];
  environments?: ApiKeyEnvironment[];
  defaultEnvironment?: string;
  scopeGroups?: ApiKeyScopeGroup[];
  expiryOptions?: ApiKeyExpiryOption[];
  labels?: Partial<ApiKeysLabels>;
  /**
   * Clock used for relative times and new timestamps. Defaults to the sample
   * reference time so server and client match; pass `Date.now()` for live data.
   */
  now?: number;
  /** Creates a key and returns its one-time secret plus the stored key. */
  onCreate?: (input: CreateApiKeyInput) => Promise<CreateApiKeyResult>;
  onRevoke?: (id: string) => Promise<void> | void;
  /** Rotates a key; return the new `last4` or let the block generate one. */
  onRotate?: (id: string) => Promise<RotateApiKeyResult>;
  className?: string;
};

export function ApiKeys({
  keys: initialKeys = DEFAULT_KEYS,
  environments = DEFAULT_ENVIRONMENTS,
  defaultEnvironment,
  scopeGroups = DEFAULT_SCOPE_GROUPS,
  expiryOptions = DEFAULT_EXPIRY_OPTIONS,
  labels: labelOverrides,
  now = SAMPLE_NOW,
  onCreate,
  onRevoke,
  onRotate,
  className,
}: ApiKeysProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const reduce = useReducedMotion();
  const scope = useId();
  const titleId = `${scope}-title`;
  const panelId = `${scope}-panel`;
  const [keys, setKeys] = useState(initialKeys);
  const [envId, setEnvId] = useState(
    defaultEnvironment ?? environments[0]?.id ?? "",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const environment =
    environments.find((env) => env.id === envId) ?? environments[0];

  const statusOf = (key: ApiKey) => getKeyStatus(key, now);
  const visible = keys.filter((key) => key.environment === environment?.id);
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const key of keys) {
      if (key.revokedAt) continue;
      result[key.environment] = (result[key.environment] ?? 0) + 1;
    }
    return result;
  }, [keys]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  function updateKey(id: string, patch: Partial<ApiKey>) {
    setKeys((current) =>
      current.map((key) => (key.id === id ? { ...key, ...patch } : key)),
    );
  }

  async function rotate(id: string) {
    let result: RotateApiKeyResult;
    if (onRotate) result = await onRotate(id);
    else await wait(1100);
    updateKey(id, {
      last4: result?.last4 || randomLast4(),
      lastRotatedAt: new Date(now).toISOString(),
    });
  }

  async function create(input: CreateApiKeyInput) {
    if (onCreate) return onCreate(input);
    return sampleCreate(input, environment, now);
  }

  if (!environment) return null;

  return (
    <motion.section
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={SECTION_STAGGER}
      aria-labelledby={titleId}
      className={cn(
        "w-full bg-background px-4 py-12 font-sans text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <ApiKeysHeader
          titleId={titleId}
          panelId={panelId}
          title={labels.title}
          description={labels.description}
          labels={labels}
          environments={environments}
          environment={environment.id}
          onEnvironmentChange={setEnvId}
          counts={counts}
          onCreate={() => setCreateOpen(true)}
        />

        <motion.div
          variants={SECTION_RISE}
          id={panelId}
          role="tabpanel"
          aria-labelledby={`${panelId}-${environment.id}`}
          className="mt-5"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${environment.id}-${visible.length > 0 ? "table" : "empty"}`}
              exit={{
                opacity: 0,
                transition: reduce ? { duration: 0 } : PANEL_EXIT,
              }}
            >
              {visible.length > 0 ? (
                <KeyTable
                  keys={visible}
                  statusOf={statusOf}
                  now={now}
                  labels={labels}
                  highlightId={highlightId}
                  onRotate={rotate}
                  onRequestRevoke={setRevokeTarget}
                />
              ) : (
                <EmptyState
                  title={labels.emptyTitle}
                  description={labels.emptyDescription}
                  actionLabel={labels.create}
                  onAction={() => setCreateOpen(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        environment={environment.id}
        environmentLabel={environment.label}
        scopeGroups={scopeGroups}
        expiryOptions={expiryOptions}
        labels={labels}
        onCreate={create}
        onCreated={(key) => {
          setKeys((current) => [key, ...current]);
          setHighlightId(key.id);
          setEnvId(key.environment);
        }}
      />

      <RevokeDialog
        apiKey={revokeTarget}
        labels={labels}
        onClose={() => setRevokeTarget(null)}
        onConfirm={async (id) => {
          await (onRevoke ? onRevoke(id) : wait(800));
        }}
        onRevoked={(id) =>
          updateKey(id, { revokedAt: new Date(now).toISOString() })
        }
      />
    </motion.section>
  );
}
