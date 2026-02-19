import { cn } from "../../lib/utils";

interface DotPatternProps {
    className?: string;
    dotColor?: string;
    dotSize?: number;
    gap?: number;
}

export function DotPattern({
    className,
    dotColor = "rgba(34, 197, 94, 0.15)",
    dotSize = 1,
    gap = 20,
}: DotPatternProps) {
    return (
        <svg
            className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern
                    id="dot-pattern"
                    width={gap}
                    height={gap}
                    patternUnits="userSpaceOnUse"
                >
                    <circle
                        cx={gap / 2}
                        cy={gap / 2}
                        r={dotSize}
                        fill={dotColor}
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-pattern)" />
        </svg>
    );
}
