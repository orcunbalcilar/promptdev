"use client";

import type { MotionProps } from "motion/react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { memo } from "react";

type MotionHTMLProps = MotionProps & Record<string, unknown>;

// Pre-create motion components at module level — React Compiler requires
// components to be declared outside render to maintain stable references.
const MOTION_COMPONENTS: Record<string, React.ComponentType<MotionHTMLProps>> = {
  p: motion.create("p"),
  span: motion.create("span"),
  div: motion.create("div"),
  h1: motion.create("h1"),
  h2: motion.create("h2"),
  h3: motion.create("h3"),
  h4: motion.create("h4"),
  h5: motion.create("h5"),
  h6: motion.create("h6"),
};

export interface TextShimmerProps {
  children: string;
  as?: keyof typeof MOTION_COMPONENTS;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: element = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent = MOTION_COMPONENTS[element] ?? MOTION_COMPONENTS.p;

  const dynamicSpread = (children?.length ?? 0) * spread;

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        } as CSSProperties
      }
      transition={{
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
