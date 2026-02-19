import { useState, useEffect, useRef } from "react";
import { ShareIcon } from "../../icons/ShareIcon";
import { TrashIcon } from "../../icons/TrashIcon";
import { CopyIcon } from "../../icons/CopyIcon";
import { TagBadge } from "./TagBadge";
import { getProvider, getEmbedUrl as getProviderEmbedUrl } from "../../providers";
import { toast } from "sonner";
import type { Tag } from "../../types/tag";

declare global {
    interface Window {
        twttr?: {
            widgets: {
                load: (element?: HTMLElement) => void;
            };
        };
    }
}

interface CardProps {
    /** Database ID for deletion operations */
    id: string;
    title: string;
    link: string;
    /** Provider type: 'youtube', 'twitter', 'link', etc. */
    type: string;
    /** Extracted content ID from URL (for embed generation) */
    contentId?: string;
    tags?: Tag[];
    onDelete?: (id: string) => Promise<void>;
}

export function Card({ id, title, link, type, contentId, tags, onDelete }: CardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const twitterRef = useRef<HTMLDivElement>(null);

    // Get provider info for this content type
    const provider = getProvider(type);
    const embedType = provider?.embedType || 'card';
    const supportsEmbed = provider?.supportsEmbed ?? false;

    // Generate embed URL using provider system
    // Falls back to original link if contentId is not available
    const embedUrl = contentId && supportsEmbed
        ? getProviderEmbedUrl(type, contentId)
        : undefined;

    // Load Twitter widget when component mounts or type changes
    useEffect(() => {
        if (type === "twitter" && window.twttr?.widgets) {
            window.twttr.widgets.load(twitterRef.current || undefined);
        }
    }, [type, link]);

    const handleDelete = async () => {
        if (!onDelete) return;

        setIsDeleting(true);
        try {
            await onDelete(id);
        } catch {
            // Delete failed silently - error already handled in dashboard
        } finally {
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success("Link copied to clipboard!");
        } catch {
            toast.error("Failed to copy link");
        }
    };

    return (
        <div className="relative">
            {/* Delete Confirmation Overlay */}
            {showConfirm && (
                <div className="absolute inset-0 bg-brand-bg/90 rounded-md z-10 flex flex-col items-center justify-center p-4" role="alertdialog" aria-label="Confirm deletion">
                    <p className="text-brand-text text-center mb-4">Delete this content?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 bg-brand-surface text-brand-text rounded text-sm hover:bg-brand-surface-dark"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="p-4 bg-brand-bg rounded-md border-brand-surface border min-h-48">
                <div className="flex justify-between items-center">
                    <div className="flex items-center text-md text-brand-text flex-1 min-w-0">
                        <div className="pr-2 text-brand-text flex-shrink-0">
                            <ShareIcon size="md" />
                        </div>
                        <span className="truncate">{title}</span>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                        <button
                            onClick={handleCopyLink}
                            className="pr-1 text-brand-text hover:text-brand-primary transition-colors cursor-pointer"
                            aria-label="Copy link"
                        >
                            <CopyIcon size="md" />
                        </button>
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pr-1 text-brand-text hover:text-brand-primary transition-colors"
                            aria-label={`Open ${title} in new tab`}
                        >
                            <ShareIcon size="md" />
                        </a>
                        {onDelete && (
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="text-brand-text-muted hover:text-red-400 transition-colors cursor-pointer"
                                aria-label="Delete content"
                            >
                                <TrashIcon size="md" />
                            </button>
                        )}
                    </div>
                </div>
                {/* Tags */}
                {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map(tag => (
                            <TagBadge key={tag._id} name={tag.name} size="sm" />
                        ))}
                    </div>
                )}
                {/* Content Embed Section */}
                <div className="pt-4">
                    {/* Iframe embed (YouTube, Spotify, etc.) */}
                    {embedType === 'iframe' && embedUrl && (
                        <iframe
                            className="w-full aspect-video rounded"
                            src={embedUrl}
                            title={title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        />
                    )}

                    {/* oEmbed embed (Twitter) */}
                    {embedType === 'oembed' && type === 'twitter' && (
                        <div ref={twitterRef}>
                            <blockquote className="twitter-tweet">
                                <a href={link.replace("x.com", "twitter.com")}></a>
                            </blockquote>
                        </div>
                    )}

                    {/* oEmbed embed (Instagram) */}
                    {embedType === 'oembed' && type === 'instagram' && embedUrl && (
                        <iframe
                            className="w-full rounded border-0"
                            src={embedUrl}
                            title={title}
                            height="480"
                            allowFullScreen
                        />
                    )}

                    {/* Card/Link embed (generic links and non-embeddable content) */}
                    {(embedType === 'card' || embedType === 'none' || !supportsEmbed) && (
                        <div className="p-3 bg-brand-surface/30 rounded-lg border border-brand-surface">
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-primary text-sm hover:underline break-all"
                            >
                                {link}
                            </a>
                            <p className="text-brand-text-muted text-xs mt-2">
                                Click to open in new tab
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}