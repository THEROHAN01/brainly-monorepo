import { PlusIcon } from "../../icons/PlusIcon";

interface EmptyStateProps {
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({
    title = "No content yet",
    description = "Start building your second brain by saving your first piece of content.",
    actionLabel = "Add Content",
    onAction
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center mb-4">
                <svg
                    className="w-8 h-8 text-brand-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                </svg>
            </div>
            <h3 className="text-xl font-semibold text-brand-text mb-2">{title}</h3>
            <p className="text-brand-text-muted text-center max-w-md mb-6">{description}</p>
            {onAction && (
                <button
                    onClick={onAction}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-brand-bg font-medium rounded-lg hover:bg-brand-primary-light transition-colors"
                >
                    <PlusIcon size="sm" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
