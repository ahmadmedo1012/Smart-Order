import { cn } from "@/lib/utils"

/**
 * Skeleton — family loading placeholder. Uses the family `.skeleton`
 * shimmer class (muted→border gradient sweep, 1.8s ease-in-out loop,
 * radius-sm) rather than the generic opacity pulse.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton", className)}
      {...props}
    />
  )
}

export { Skeleton }
