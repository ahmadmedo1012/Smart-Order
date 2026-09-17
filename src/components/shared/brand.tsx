import { cn } from "@/lib/utils";

/** Smart Order brand mark — bag + spark, emerald identity of the Smart ecosystem. */
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="var(--primary)" />
      <path
        d="M15 19h18l-1.5 14.5a3 3 0 0 1-3 2.5h-9a3 3 0 0 1-3-2.5L15 19Z"
        fill="var(--primary-foreground)"
        fillOpacity="0.92"
      />
      <path
        d="M19 19v-2a5 5 0 0 1 10 0v2"
        stroke="var(--primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M20.2 26.4l2.2 2.2 4.6-4.8"
        stroke="var(--primary)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({
  className,
  size = 36,
  showText = true,
  textClass,
}: {
  className?: string;
  size?: number;
  showText?: boolean;
  textClass?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-heading font-bold text-foreground", textClass)}>
            سمارت أوردر
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 tracking-wide">
            SMART ORDER
          </span>
        </span>
      )}
    </span>
  );
}
