"use client";

import {
  Check,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Smartphone,
  TrendingUp,
  Store,
  Crown,
} from "lucide-react";
import { m, useAnimate } from "motion/react";
import { forwardRef, useImperativeHandle, type SVGProps } from "react";

/**
 * Motion-enhanced lucide icons — family pattern verbatim (Smart Menu
 * motion-icons). Animates on hover via imperative useAnimate (reliable on
 * nested SVGs). Drop-in replacement for plain lucide: size/color/className
 * API unchanged.
 */
type MotionIconProps = SVGProps<SVGSVGElement>;

function makeMotionIcon(Icon: typeof Check, label: string) {
  const Cmp = forwardRef<SVGSVGElement, MotionIconProps>(
    ({ className, width, height, ...rest }, ref) => {
      const [scope, animate] = useAnimate();
      useImperativeHandle(ref, () => scope.current as SVGSVGElement);

      const start = () => {
        animate(
          scope.current,
          {
            scale: 1.15,
            rotate: label === "Check" ? 15 : 0,
          },
          { type: "spring", stiffness: 400, damping: 15 }
        );
      };
      const stop = () => {
        animate(scope.current, { scale: 1, rotate: 0 }, { type: "spring", stiffness: 300, damping: 20 });
      };

      return (
        <m.svg
          ref={scope}
          className={className}
          width={width ?? "100%"}
          height={height ?? "100%"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: "block" }}
          onHoverStart={start}
          onHoverEnd={stop}
        >
          <Icon {...(rest as object)} className="w-full h-full" />
        </m.svg>
      );
    }
  );
  Cmp.displayName = `Motion${label}`;
  return Cmp;
}

export const MotionCheck = makeMotionIcon(Check, "Check");
export const MotionArrowRight = makeMotionIcon(ArrowRight, "ArrowRight");
export const MotionArrowLeft = makeMotionIcon(ArrowLeft, "ArrowLeft");
export const MotionPlus = makeMotionIcon(Plus, "Plus");
export const MotionMinus = makeMotionIcon(Minus, "Minus");
export const MotionSmartphone = makeMotionIcon(Smartphone, "Smartphone");
export const MotionTrendingUp = makeMotionIcon(TrendingUp, "TrendingUp");
export const MotionStore = makeMotionIcon(Store, "Store");
export const MotionCrown = makeMotionIcon(Crown, "Crown");
