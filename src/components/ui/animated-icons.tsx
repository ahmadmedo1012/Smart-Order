"use client";

import { m, useAnimate, type HTMLMotionProps } from "motion/react";
import { Copy, X, Eye, EyeOff, MessageCircle, Sparkles, Upload, Zap } from "lucide-react";

/**
 * Animated icons — family pattern (Smart Menu animated icon family):
 * imperative useAnimate on hover, wrapping a plain lucide glyph. The glyph
 * itself never animates its geometry — the wrapper wiggles/rotates, which
 * is reliable across browsers and keeps the SVG markup plain lucide.
 */
type AnimatedIconProps = HTMLMotionProps<"div"> & { className?: string };

function makeAnimatedIcon(
  Icon: typeof Copy,
  label: string,
  hoverAnim: { rotate?: number; scale?: number; y?: number }
) {
  function Cmp({ className, ...rest }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = () => {
      animate(
        scope.current,
        { scale: hoverAnim.scale ?? 1.18, rotate: hoverAnim.rotate ?? 0, y: hoverAnim.y ?? 0 },
        { type: "spring", stiffness: 400, damping: 15 }
      );
    };
    const stop = () => {
      animate(scope.current, { scale: 1, rotate: 0, y: 0 }, { type: "spring", stiffness: 300, damping: 20 });
    };

    return (
      <m.div
        ref={scope}
        onHoverStart={start}
        onHoverEnd={stop}
        className={`inline-flex cursor-pointer items-center justify-center ${className ?? ""}`}
        {...rest}
      >
        <Icon className="size-full" aria-hidden="true" />
      </m.div>
    );
  }
  Cmp.displayName = `Animated${label}`;
  return Cmp;
}

/** Copy — nudges diagonally on hover (money-path rows). */
export const AnimatedCopy = makeAnimatedIcon(Copy, "Copy", { rotate: -8, y: -1 });
/** X — rotates like a close affordance. */
export const AnimatedX = makeAnimatedIcon(X, "X", { rotate: 90 });
/** Eye — subtle lid-open scale. */
export const AnimatedEye = makeAnimatedIcon(Eye, "Eye", { scale: 1.12 });
/** EyeOff — same family, reversed feel. */
export const AnimatedEyeOff = makeAnimatedIcon(EyeOff, "EyeOff", { scale: 1.12 });
/** MessageCircle — WhatsApp voice, gentle lift. */
export const AnimatedMessageCircle = makeAnimatedIcon(MessageCircle, "MessageCircle", { y: -2, rotate: -6 });
/** Sparkles — eyebrow sparkle, celebratory scale. */
export const AnimatedSparkles = makeAnimatedIcon(Sparkles, "Sparkles", { scale: 1.25, rotate: 12 });
/** Upload — receipt upload, upward nudge. */
export const AnimatedUpload = makeAnimatedIcon(Upload, "Upload", { y: -2 });
/** Zap — popular badge bolt, quick jitter. */
export const AnimatedZap = makeAnimatedIcon(Zap, "Zap", { rotate: -12, scale: 1.2 });
