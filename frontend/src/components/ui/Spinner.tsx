interface SpinnerProps {
    size?: "sm" | "md" | "lg";
}

const sizeClasses = {
    sm: "w-4 h-4 border",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-2"
};

export function Spinner({ size = "md" }: SpinnerProps) {
    return (
        <div
            className={`${sizeClasses[size]} border-brand-primary border-t-transparent rounded-full animate-spin`}
        />
    );
}
