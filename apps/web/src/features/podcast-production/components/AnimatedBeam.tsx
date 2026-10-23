import type { ReactElement } from "react";
import { motion, useReducedMotion } from "motion/react";

export function AnimatedBeam({
  stepCount,
  activeStepIndex,
}: {
  stepCount: number;
  activeStepIndex: number;
}): ReactElement {
  const reducedMotion = useReducedMotion();
  const progress = stepCount > 1 ? activeStepIndex / (stepCount - 1) : 0;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12.5%] top-[15px] h-0.5 bg-mod-border">
      <motion.div
        className="h-full origin-left bg-mod-primary"
        initial={false}
        animate={{ scaleX: progress }}
        transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
