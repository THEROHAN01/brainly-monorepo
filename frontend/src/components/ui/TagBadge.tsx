import { CrossIcon } from "../../icons/CrossIcon";

interface TagBadgeProps {
    name: string;
    onRemove?: () => void;
    size?: "sm" | "md";
}

export function TagBadge({ name, onRemove, size = "sm" }: TagBadgeProps) {
    const sizeClasses = size === "sm"
        ? "text-xs px-2 py-0.5"
        : "text-sm px-2.5 py-1";

    return (
        <span
            className={`inline-flex items-center gap-1 bg-brand-surface text-brand-text rounded-full ${sizeClasses}`}
        >
            {name}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="hover:text-brand-primary transition-colors"
                >
                    <CrossIcon size="sm" />
                </button>
            )}
        </span>
    );
}
