import { cn } from "@/lib/utils";

const OPENAI_LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/OpenAI_logo_2025_%28symbol%29.svg/120px-OpenAI_logo_2025_%28symbol%29.svg.png";
const CLAUDE_LOGO_URL = "https://cdn.simpleicons.org/claude/F4F4F4";
const GEMINI_LOGO_URL = "https://cdn.simpleicons.org/googlegemini/F4F4F4";

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
        backgroundImage: `url("${logoUrl}")`,
      }}
      className={cn(
        "block size-4 shrink-0 bg-center bg-contain bg-no-repeat",
        openAi && "invert",
        className,
      )}
    />
  );
}
