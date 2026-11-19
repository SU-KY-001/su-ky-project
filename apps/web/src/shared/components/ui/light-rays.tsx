import { useEffect, useState, type CSSProperties, type HTMLAttributes } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface LightRaysProps extends HTMLAttributes<HTMLDivElement> {
  count?: number;
  color?: string;
  blur?: number;
  speed?: number;
  length?: string;
}

interface LightRay {
  id: string;
  left: number;
  rotate: number;
  width: number;
  swing: number;
  delay: number;
  duration: number;
  intensity: number;
}

function createRays(count: number, cycle: number): LightRay[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const left = 8 + Math.random() * 84;
    return {
      id: `${index}-${Math.round(left * 10)}`,
      left,
      rotate: -28 + Math.random() * 56,
      width: 160 + Math.random() * 160,
      swing: 0.8 + Math.random() * 1.8,
      delay: Math.random() * cycle,
      duration: cycle * (0.75 + Math.random() * 0.5),
      intensity: 0.6 + Math.random() * 0.5,
    };
  });
}

function LightRay({ ray, reducedMotion }: { ray: LightRay; reducedMotion: boolean }): React.ReactElement {
  const { left, rotate, width, swing, delay, duration, intensity } = ray;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -top-[12%] left-[var(--ray-left)] h-[var(--light-rays-length)] w-[var(--ray-width)] origin-top -translate-x-1/2 rounded-full bg-linear-to-b from-[color-mix(in_srgb,var(--light-rays-color)_70%,transparent)] to-transparent opacity-0 mix-blend-screen blur-[var(--light-rays-blur)]"
      style={{ "--ray-left": `${left}%`, "--ray-width": `${width}px` } as CSSProperties}
      initial={{ rotate }}
      animate={reducedMotion ? { opacity: intensity * 0.45, rotate } : {
        opacity: [0, intensity, 0],
        rotate: [rotate - swing, rotate + swing, rotate - swing],
      }}
      transition={reducedMotion ? { duration: 0 } : {
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
        repeatDelay: duration * 0.1,
      }}
    />
  );
}

export function LightRays({
  className,
  style,
  count = 7,
  color = "rgba(160, 210, 255, 0.2)",
  blur = 36,
  speed = 14,
  length = "70vh",
  ...props
}: LightRaysProps): React.ReactElement {
  const [rays, setRays] = useState<LightRay[]>([]);
  const reducedMotion = useReducedMotion() ?? false;
  const cycleDuration = Math.max(speed, 0.1);

  useEffect(() => {
    setRays(createRays(count, cycleDuration));
  }, [count, cycleDuration]);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 isolate overflow-hidden", className)}
      style={{
        "--light-rays-color": color,
        "--light-rays-blur": `${blur}px`,
        "--light-rays-length": length,
        ...style,
      } as CSSProperties}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--light-rays-color) 45%, transparent), transparent 70%)" }} />
        <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--light-rays-color) 35%, transparent), transparent 75%)" }} />
        {rays.map((ray) => <LightRay key={ray.id} ray={ray} reducedMotion={reducedMotion} />)}
      </div>
    </div>
  );
}
