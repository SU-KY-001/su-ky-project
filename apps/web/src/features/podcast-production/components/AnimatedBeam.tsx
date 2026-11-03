import type { ReactElement } from "react";
import { motion, useReducedMotion } from "motion/react";

export function AnimatedBeam({
  stepCount,
  activeStepIndex,
  inset = "12.5%",
}: {
  stepCount: number;
  activeStepIndex: number;
  inset?: string;
}): ReactElement {
  const reducedMotion = useReducedMotion();
  const progress = stepCount > 1 ? activeStepIndex / (stepCount - 1) : 0;

  return (
    <div aria-hidden="true" style={{ left: inset, right: inset }} className="pointer-events-none absolute top-[15px] h-0.5 bg-mod-border">
      <motion.div
        className="h-full origin-left bg-mod-primary"
        initial={false}
        animate={{ scaleX: progress }}
        transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
