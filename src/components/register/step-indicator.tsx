"use client";

import { cn } from "@/lib/utils";
import { MotionCheck } from "@/components/ui/motion-icons";
import { m, useReducedMotion } from "motion/react";

/** Family step-node labels — Smart Order wizard (plan → account). */
export type WizardStep = "plan" | "account";

const STEP_ORDER: WizardStep[] = ["plan", "account"];

const STEP_LABELS: Record<WizardStep, string> = {
  plan: "اختر الخطة",
  account: "بيانات الحساب",
};

export function stepIndex(step: WizardStep) {
  return STEP_ORDER.indexOf(step);
}

/**
 * StepIndicator — family twin (Smart Menu subscribe/StepIndicator.tsx):
 * flat flame step node for the active step (espresso digit on the orange
 * ground), check node when done, muted node ahead; connectors animate
 * color on completion. r128-F8 (B20): durations ride the ladder, the
 * gradient node is retired (§7).
 */
export function StepIndicator({
  current,
  onNavigate,
}: {
  current: WizardStep;
  onNavigate?: (s: WizardStep) => void;
}) {
  const reduceMotion = useReducedMotion();
  const currentIdx = stepIndex(current);

  return (
    <nav aria-label="خطوات التسجيل" className="mb-10 flex items-center justify-center">
      {STEP_ORDER.map((s, i) => {
        const isActive = s === current;
        const isDone = i < currentIdx;
        const clickable = isDone || isActive;

        return (
          <div key={s} className="flex items-center">
            {/* Step node */}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigate?.(s)}
              className={cn(
                "group flex flex-col items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                !clickable && "cursor-default"
              )}
              aria-current={isActive ? "step" : undefined}
              aria-disabled={!clickable || undefined}
              aria-label={`الخطوة ${i + 1}: ${STEP_LABELS[s]}${isDone ? " (مكتملة)" : isActive ? " (الحالية)" : ""}`}
            >
              <m.div
                initial={false}
                whileTap={clickable && !reduceMotion ? { scale: 0.94 } : undefined}
                className={cn(
                  /* r128-F8 (B20): ladder durations + flat active node —
                     the ember→saffron gradient + glow shadow retire (§7) */
                  "flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-(--t-base)",
                  isActive
                    ? "border-transparent bg-orange font-bold text-espresso shadow-sm"
                    : isDone
                      ? "border-orange/40 bg-orange/15 text-accent-foreground"
                      : "border-border/40 bg-muted/50 text-muted-foreground"
                )}
              >
                {isDone ? <MotionCheck className="size-4" /> : <span className="tabular-nums">{i + 1}</span>}
              </m.div>
              <span
                className={cn(
                  "hidden text-[11px] font-medium transition-colors sm:block sm:text-xs",
                  isActive ? "font-bold text-accent-foreground" : isDone ? "text-foreground/70" : "text-muted-foreground/50"
                )}
              >
                {STEP_LABELS[s]}
              </span>
            </button>

            {/* Connector */}
            {i < STEP_ORDER.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-0.5 w-14 rounded-full transition-colors duration-(--t-slower) sm:mx-2",
                  i < currentIdx ? "bg-orange/50" : "bg-muted-foreground/15"
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
