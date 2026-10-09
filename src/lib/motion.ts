import type { Transition } from "motion/react";

/**
 * Shared motion presets — verbatim family tokens (Smart Menu / SmartBot).
 * Springs carry the family's confident-arrival feel. Keep exports trimmed
 * to what is consumed.
 */
export const springDefault: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
  mass: 0.8,
};
