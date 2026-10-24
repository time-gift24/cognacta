import { cn } from "@/lib/utils";

const LOGO_BASE = "/logos";
const OPENAI_LOGO_URL = `${LOGO_BASE}/openai.svg`;
const CLAUDE_LOGO_URL = `${LOGO_BASE}/claude.svg`;
const GEMINI_LOGO_URL = `${LOGO_BASE}/googlegemini.svg`;

export function ModelLogo({
  modelId,
  className,
}: {
  modelId: string;
  className?: string;
}) {
  const openAi = modelId === "openai" || modelId.startsWith("gpt");
  const logoUrl = openAi
    ? OPENAI_LOGO_URL
    : modelId.startsWith("gemini") ? GEMINI_LOGO_URL : CLAUDE_LOGO_URL;

  return (
    <span
      aria-hidden="true"
      style={{
        backgroundColor: "currentColor",
        WebkitMaskImage: `url("${logoUrl}")`,
        maskImage: `url("${logoUrl}")`,
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
      className={cn("block size-4 shrink-0", className)}
    />
  );
}
