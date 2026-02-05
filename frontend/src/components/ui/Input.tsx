import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-12 w-full rounded-lg border bg-brand-bg px-4 py-3 text-brand-text transition-all duration-200",
                    "placeholder:text-brand-text/40",
                    "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    error
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-brand-surface",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";
