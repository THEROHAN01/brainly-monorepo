import type { ReactElement } from "react";

interface SidebarItemProps {
    text: string;
    icon: ReactElement;
    isActive?: boolean;
    onClick?: () => void;
}

export function SidebarItem({ text, icon, isActive, onClick }: SidebarItemProps) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center py-2 cursor-pointer rounded max-w-48 pl-4 transition-all duration-200 ${
                isActive
                    ? "bg-brand-surface text-brand-primary"
                    : "text-brand-text hover:bg-brand-surface"
            }`}
        >
            <div className="pr-2">{icon}</div>
            <div>{text}</div>
        </div>
    );
}