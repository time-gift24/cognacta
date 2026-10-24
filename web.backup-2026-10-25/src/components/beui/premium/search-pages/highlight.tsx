import { escapeRegExp } from "./search-engine";

/** Marks every query word inside `text`. */
export function Highlight({
  text,
  words,
}: {
  text: string;
  words: readonly string[];
}) {
  if (words.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");
  return (
    <>
      {text.split(pattern).map((part, index) =>
        words.includes(part.toLowerCase()) ? (
          <mark
            // biome-ignore lint/suspicious/noArrayIndexKey: split order is stable
            key={index}
            className="rounded-sm bg-foreground/10 text-foreground"
          >
            {part}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: split order is stable
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
