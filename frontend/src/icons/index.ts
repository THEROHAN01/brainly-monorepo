export interface IconProps {
	size: "sm" | "md" | "lg";
	className?: string;
}

export const iconSizeVariants = {
	"sm": 	"w-4 h-4",
	"md":   "w-5 h-5",
	"lg":   "w-6 h-6"
}

// Export all icons
export { ZapIcon } from "./ZapIcon";
export { FolderIcon } from "./FolderIcon";
export { GlobeIcon } from "./GlobeIcon";
export { SearchIcon } from "./SearchIcon";
export { UsersIcon } from "./UsersIcon";
export { StarIcon } from "./StarIcon";
export { CheckIcon } from "./CheckIcon";
export { ArrowRightIcon } from "./ArrowRightIcon";
export { ShieldIcon } from "./ShieldIcon";
export { TagIcon } from "./TagIcon";


