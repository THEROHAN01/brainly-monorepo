import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

interface ShimmerButtonProps {
    children: ReactNode;
    className?: string;
    shimmerColor?: string;
    shimmerSize?: string;
    borderRadius?: string;
    shimmerDuration?: string;
    background?: string;
    onClick?: () => void;
}

export function ShimmerButton({
    children,
    className,
    shimmerColor = "rgba(255, 255, 255, 0.1)",
    borderRadius = "0.5rem",
    shimmerDuration = "2s",
    background = "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
    onClick,
}: ShimmerButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative cursor-pointer overflow-hidden whitespace-nowrap px-6 py-3 font-semibold text-brand-bg transition-all duration-300",
                "hover:scale-[1.02] active:scale-[0.98]",
                className
            )}
            style={{
                borderRadius,
                background,
            }}
        >
            <span
                className="absolute inset-0 overflow-hidden"
                style={{ borderRadius }}
            >
                <span
                    className="absolute inset-0 animate-shimmer"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
                        backgroundSize: "200% 100%",
                        animation: `shimmer ${shimmerDuration} infinite`,
                    }}
                />
            </span>
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </span>
        </button>
    );
}
