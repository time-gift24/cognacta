export type EmailChipData = {
  id: string;
  email: string;
  /** Present when the address cannot be invited. */
  error?: string;
};

/** Characters that commit the current draft into a chip. */
export const CHIP_SEPARATORS = [",", " ", ";"] as const;

const SPLIT_PATTERN = /[\s,;]+/;
const LOCAL_PATTERN = /^[A-Za-z0-9._%+-]+$/;
const DOMAIN_PATTERN = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/** Pull addresses out of free text, including "Name <a@b.co>" forms. */
export function splitEmails(text: string): string[] {
  return text
    .replace(/[<>"']/g, " ")
    .split(SPLIT_PATTERN)
    .map((part) => part.trim().replace(/^mailto:/i, ""))
    .filter((part) => part.length > 0);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Returns a short reason when an address is invalid, otherwise undefined. */
export function validateEmail(email: string): string | undefined {
  const at = email.indexOf("@");
  if (at === -1) return "Missing @";
  if (email.indexOf("@", at + 1) !== -1) return "Too many @";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local) return "Missing name";
  if (!domain) return "Missing domain";
  if (!LOCAL_PATTERN.test(local) || local.startsWith(".")) {
    return "Invalid characters";
  }
  if (!domain.includes(".")) return "Missing domain ending";
  if (!DOMAIN_PATTERN.test(domain)) return "Check the domain";
  return undefined;
}

let chipCounter = 0;

export function createChip(raw: string): EmailChipData {
  const email = normalizeEmail(raw);
  chipCounter += 1;
  return {
    id: `chip-${chipCounter}-${email}`,
    email,
    error: validateEmail(email),
  };
}

export type ChipMergeResult = {
  chips: EmailChipData[];
  /** Existing chips that a new entry duplicated, so they can shake. */
  duplicates: EmailChipData[];
};

/**
 * Append new addresses to the batch. Addresses already in the batch, or
 * already on the team, are reported as duplicates instead of added.
 */
export function mergeChips(
  current: readonly EmailChipData[],
  entries: readonly string[],
  taken: ReadonlySet<string> = new Set(),
): ChipMergeResult {
  const chips = [...current];
  const duplicates: EmailChipData[] = [];
  for (const entry of entries) {
    const email = normalizeEmail(entry);
    if (!email) continue;
    const existing = chips.find((chip) => chip.email === email);
    if (existing) {
      duplicates.push(existing);
      continue;
    }
    const chip = createChip(email);
    if (taken.has(email)) chip.error = "Already on the team";
    chips.push(chip);
  }
  return { chips, duplicates };
}

export function initialsFor(value: string) {
  const name = value.split("@")[0] ?? value;
  const parts = name.split(/[._\-\s]+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
      : name.slice(0, 2);
  return letters.toUpperCase() || "?";
}
