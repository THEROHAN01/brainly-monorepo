import { cn } from "../../lib/utils";

interface BorderBeamProps {
    className?: string;
    size?: number;
    duration?: number;
    borderWidth?: number;
    colorFrom?: string;
    colorTo?: string;
    delay?: number;
}

export function BorderBeam({
    className,
    size = 200,
    duration = 15,
    borderWidth = 1.5,
    colorFrom = "#08CB00",
    colorTo = "#4ADE40",
    delay = 0,
}: BorderBeamProps) {
    return (
        <div
            style={
                {
                    "--size": size,
                    "--duration": `${duration}s`,
                    "--border-width": `${borderWidth}px`,
                    "--color-from": colorFrom,
                    "--color-to": colorTo,
                    "--delay": `-${delay}s`,
                } as React.CSSProperties
            }
            className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit]",
                "[border:calc(var(--border-width)*1px)_solid_transparent]",
                "[background:padding-box_var(--bg-color,transparent),border-box_linear-gradient(calc(var(--angle,0deg)+90deg),var(--color-from),var(--color-to),transparent,transparent)]",
                "animate-border-beam [animation-delay:var(--delay)]",
                "[--angle:0deg]",
                className
            )}
        />
    );
}
