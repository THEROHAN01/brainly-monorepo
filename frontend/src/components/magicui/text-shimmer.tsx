import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

interface TextShimmerProps {
    children: ReactNode;
    className?: string;
    shimmerWidth?: number;
}

export function TextShimmer({
    children,
    className,
    shimmerWidth = 100,
}: TextShimmerProps) {
    return (
        <span
            style={
                {
                    "--shimmer-width": `${shimmerWidth}px`,
                } as React.CSSProperties
            }
            className={cn(
                "inline-flex animate-text-shimmer bg-clip-text text-transparent",
                "bg-[length:250%_100%,100%_100%]",
                "bg-[linear-gradient(110deg,transparent_25%,rgba(34,197,94,0.5)_35%,rgba(74,222,128,0.8)_50%,rgba(34,197,94,0.5)_65%,transparent_75%),linear-gradient(#22C55E,#22C55E)]",
                className
            )}
        >
            {children}
        </span>
    );
}
