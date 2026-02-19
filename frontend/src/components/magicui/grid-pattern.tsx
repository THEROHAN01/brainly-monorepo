import { cn } from "../../lib/utils";

interface GridPatternProps {
    width?: number;
    height?: number;
    className?: string;
    strokeColor?: string;
}

export function GridPattern({
    width = 40,
    height = 40,
    className,
    strokeColor = "rgba(34, 197, 94, 0.08)",
}: GridPatternProps) {
    return (
        <svg
            className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern
                    id="grid-pattern"
                    width={width}
                    height={height}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${width} 0 L 0 0 0 ${height}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="1"
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
    );
}
