import type { ReactElement } from "react";

interface SidebarItemProps {
    text: string;
    icon: ReactElement;
    isActive?: boolean;
    onClick?: () => void;
}

export function SidebarItem({ text, icon, isActive, onClick }: SidebarItemProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center w-full py-2 cursor-pointer rounded max-w-48 pl-4 transition-all duration-200 text-left ${
                isActive
                    ? "bg-brand-surface text-brand-primary"
                    : "text-brand-text hover:bg-brand-surface"
            }`}
        >
            <span className="pr-2">{icon}</span>
            <span>{text}</span>
        </button>
    );
}
