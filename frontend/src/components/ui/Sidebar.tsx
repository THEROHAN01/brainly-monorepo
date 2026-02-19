import { Logo } from "../../icons/Logo";
import { TwitterIcon } from "../../icons/TwitterIcon";
import { YoutubeIcon } from "../../icons/YoutubeIcon";
import { InstagramIcon } from "../../icons/InstagramIcon";
import { GithubIcon } from "../../icons/GithubIcon";
import { MediumIcon } from "../../icons/MediumIcon";
import { NotionIcon } from "../../icons/NotionIcon";
import { TagIcon } from "../../icons/TagIcon";
import { SidebarItem } from "./SidebarItem";
import type { Tag } from "../../types/tag";

/** Filter types for content filtering - matches provider types */
export type FilterType = "all" | "twitter" | "youtube" | "instagram" | "github" | "medium" | "notion" | "link";

/** Link icon for generic links */
function LinkIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    );
}

function AllIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
    );
}

interface SidebarProps {
    filter?: FilterType;
    onFilterChange?: (filter: FilterType) => void;
    tags?: Tag[];
    open?: boolean;
    onClose?: () => void;
}

function SidebarContent({ filter = "all", onFilterChange, tags, onItemClick }: SidebarProps & { onItemClick?: () => void }) {
    const handleFilterChange = (f: FilterType) => {
        onFilterChange?.(f);
        onItemClick?.();
    };

    return (
        <>
            <div className="flex text-2xl pt-8 items-center text-brand-text pl-6">
                <div className="pr-2 text-brand-primary">
                    <Logo />
                </div>
                Brainly
            </div>
            <div className="pt-8 pl-4">
                <SidebarItem
                    text="All Content"
                    icon={<AllIcon />}
                    isActive={filter === "all"}
                    onClick={() => handleFilterChange("all")}
                />
                <SidebarItem
                    text="Twitter"
                    icon={<TwitterIcon />}
                    isActive={filter === "twitter"}
                    onClick={() => handleFilterChange("twitter")}
                />
                <SidebarItem
                    text="Youtube"
                    icon={<YoutubeIcon />}
                    isActive={filter === "youtube"}
                    onClick={() => handleFilterChange("youtube")}
                />
                <SidebarItem
                    text="Instagram"
                    icon={<InstagramIcon />}
                    isActive={filter === "instagram"}
                    onClick={() => handleFilterChange("instagram")}
                />
                <SidebarItem
                    text="GitHub"
                    icon={<GithubIcon />}
                    isActive={filter === "github"}
                    onClick={() => handleFilterChange("github")}
                />
                <SidebarItem
                    text="Medium"
                    icon={<MediumIcon />}
                    isActive={filter === "medium"}
                    onClick={() => handleFilterChange("medium")}
                />
                <SidebarItem
                    text="Notion"
                    icon={<NotionIcon />}
                    isActive={filter === "notion"}
                    onClick={() => handleFilterChange("notion")}
                />
                <SidebarItem
                    text="Links"
                    icon={<LinkIcon />}
                    isActive={filter === "link"}
                    onClick={() => handleFilterChange("link")}
                />
            </div>

            {/* Tags Section */}
            {tags && tags.length > 0 && (
                <div className="pt-6 pl-4 pr-4">
                    <div className="flex items-center gap-2 text-brand-text-muted text-sm font-medium mb-3">
                        <TagIcon size="sm" />
                        <span>Your Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-2">
                        {tags.map(tag => (
                            <span
                                key={tag._id}
                                className="text-xs px-2 py-1 bg-brand-surface text-brand-text rounded-full"
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

export function Sidebar({ filter = "all", onFilterChange, tags, open, onClose }: SidebarProps) {
    return (
        <>
            {/* Desktop sidebar - hidden on mobile */}
            <nav aria-label="Main navigation" className="hidden md:block h-screen bg-brand-bg border-r border-brand-surface w-72 fixed left-0 top-0 overflow-y-auto">
                <SidebarContent filter={filter} onFilterChange={onFilterChange} tags={tags} />
            </nav>

            {/* Mobile drawer overlay */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-40"
                    onClick={onClose}
                />
            )}

            {/* Mobile drawer */}
            <nav
                aria-label="Main navigation"
                className={`md:hidden fixed left-0 top-0 h-screen bg-brand-bg border-r border-brand-surface w-72 z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <SidebarContent
                    filter={filter}
                    onFilterChange={onFilterChange}
                    tags={tags}
                    onItemClick={onClose}
                />
            </nav>
        </>
    );
}
