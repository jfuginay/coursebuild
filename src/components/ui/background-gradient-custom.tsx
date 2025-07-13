import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "framer-motion";

export const BackgroundGradientCustom = ({
  children,
  className,
  containerClassName,
  animate = true,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}) => {
  const variants = {
    initial: {
      backgroundPosition: "0 50%",
    },
    animate: {
      backgroundPosition: ["0, 50%", "100% 50%", "0 50%"],
    },
  };
  return (
    <div className={cn("relative p-[1px] group", containerClassName)}>
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
        className={cn(
          "absolute inset-0 rounded-[22px] z-[1] opacity-25 group-hover:opacity-40 blur-sm transition duration-500 will-change-transform",
          "bg-[radial-gradient(circle_farthest-side_at_0_100%,#ef444460,transparent),radial-gradient(circle_farthest-side_at_100%_0,#06b6d460,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#ef444460,transparent),radial-gradient(circle_farthest-side_at_0_0,#06b6d460,transparent)]"
        )}
      />
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
        className={cn(
          "absolute inset-0 rounded-[22px] z-[1] opacity-60 will-change-transform",
          "bg-[radial-gradient(circle_farthest-side_at_0_100%,#ef444430,transparent),radial-gradient(circle_farthest-side_at_100%_0,#06b6d430,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#ef444430,transparent),radial-gradient(circle_farthest-side_at_0_0,#06b6d430,transparent)]"
        )}
      />

      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
};