import { useRef, type ReactNode } from "react";
import { motion, useInView, type Variants } from "motion/react";

interface BlurFadeProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    yOffset?: number;
    blur?: string;
}

export function BlurFade({
    children,
    className,
    delay = 0,
    duration = 0.4,
    yOffset = 6,
    blur = "6px",
}: BlurFadeProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    const variants: Variants = {
        hidden: {
            opacity: 0,
            y: yOffset,
            filter: `blur(${blur})`,
        },
        visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
        },
    };

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={variants}
            transition={{
                delay: delay,
                duration: duration,
                ease: "easeOut",
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
