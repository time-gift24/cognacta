export function BrandMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M12 2.75v18.5M2.75 12h18.5M5.46 5.46l13.08 13.08M18.54 5.46 5.46 18.54"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.15" fill="currentColor" />
    </svg>
  );
}
