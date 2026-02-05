interface IconProps {
    size?: "sm" | "md" | "lg";
    className?: string;
    filled?: boolean;
}

const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
};

export function StarIcon({ size = "md", className = "", filled = false }: IconProps) {
    return (
        <svg
            className={`${sizeClasses[size]} ${className}`}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}
