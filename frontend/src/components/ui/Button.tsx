import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 cursor-pointer disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary: "bg-brand-primary text-brand-bg hover:bg-brand-primary-light active:bg-brand-primary-dark shadow-md hover:shadow-lg",
                secondary: "bg-brand-surface text-brand-text border border-brand-primary hover:bg-brand-surface/80 active:bg-brand-surface/60",
                ghost: "text-brand-text hover:bg-brand-surface/50",
                danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
            },
            size: {
                sm: "px-3 py-1.5 text-sm",
                md: "px-5 py-2.5 text-base",
                lg: "px-8 py-4 text-lg",
            },
            glow: {
                true: "animate-pulse-glow glow-primary",
                false: "",
            },
            fullWidth: {
                true: "w-full",
                false: "",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
            glow: false,
            fullWidth: false,
        },
    }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
    text: string;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    onClick?: () => void;
    loading?: boolean;
    className?: string;
    type?: "button" | "submit" | "reset";
}

export const Button = ({
    variant,
    size,
    text,
    startIcon,
    endIcon,
    onClick,
    fullWidth,
    loading,
    glow,
    className,
    type = "button",
}: ButtonProps) => {
    return (
        <button
            type={type}
            onClick={onClick}
            className={cn(
                buttonVariants({ variant, size, glow, fullWidth }),
                loading && "opacity-45 cursor-not-allowed",
                className
            )}
            disabled={loading}
        >
            {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                startIcon && <span className="mr-2 flex items-center">{startIcon}</span>
            )}
            {text}
            {endIcon && <span className="ml-2 flex items-center">{endIcon}</span>}
        </button>
    );
};

export { buttonVariants };
