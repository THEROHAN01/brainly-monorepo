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
                "bg-[linear-gradient(110deg,transparent_25%,rgba(8,203,0,0.5)_35%,rgba(74,222,64,0.8)_50%,rgba(8,203,0,0.5)_65%,transparent_75%),linear-gradient(#08CB00,#08CB00)]",
                className
            )}
        >
            {children}
        </span>
    );
}
