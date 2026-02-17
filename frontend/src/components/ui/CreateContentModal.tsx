import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { TagInput } from "./TagInput";
import { BACKEND_URL } from "../../config";
import axios from "axios";
import { toast } from "sonner";
import type { Tag } from "../../types/tag";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "./Dialog";
import { CrossIcon } from "../../icons/CrossIcon";
import { quickValidateUrl, type ValidationResult } from "../../providers";

interface CreateContentModalProps {
    open: boolean;
    onClose: () => void;
    onContentAdded?: () => void;
    availableTags: Tag[];
    onCreateTag: (name: string) => Promise<Tag | null>;
}

/**
 * Custom hook for debouncing a value.
 * Delays updating the returned value until after the specified delay.
 */
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Type badge component to display auto-detected content type.
 */
function TypeBadge({ type, displayName }: { type: string; displayName: string }) {
    // Color mapping for different content types
    const colorClasses: Record<string, string> = {
        youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
        twitter: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        github: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        medium: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        notion: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        link: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };

    const classes = colorClasses[type] || colorClasses.link;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${classes}`}>
            {displayName}
        </span>
    );
}

export function CreateContentModal({
    open,
    onClose,
    onContentAdded,
    availableTags,
    onCreateTag
}: CreateContentModalProps) {
    const titleRef = useRef<HTMLInputElement>(null);
    const [link, setLink] = useState("");
    const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(false);
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [validating, setValidating] = useState(false);

    // Debounce URL input to avoid validating on every keystroke
    const debouncedLink = useDebounce(link, 300);

    /**
     * Validate URL when debounced value changes.
     * First performs quick client-side validation, then confirms with server.
     */
    useEffect(() => {
        if (!debouncedLink) {
            setValidation(null);
            return;
        }

        // Quick client-side validation for instant feedback
        const quickResult = quickValidateUrl(debouncedLink);
        setValidation(quickResult);

        // If client-side validation passes, verify with server for authoritative result
        if (quickResult.valid) {
            setValidating(true);
            const token = localStorage.getItem("token");

            axios.post(`${BACKEND_URL}/api/v1/content/validate`,
                { link: debouncedLink },
                { headers: { "Authorization": `Bearer ${token}` } }
            )
                .then(response => {
                    setValidation(response.data);
                })
                .catch(() => {
                    // Keep client-side validation if server fails
                })
                .finally(() => {
                    setValidating(false);
                });
        }
    }, [debouncedLink]);

    /**
     * Reset form state when modal closes.
     */
    useEffect(() => {
        if (!open) {
            setLink("");
            setValidation(null);
            setSelectedTags([]);
            if (titleRef.current) titleRef.current.value = "";
        }
    }, [open]);

    /**
     * Handle link input change.
     */
    const handleLinkChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLink(e.target.value);
    }, []);

    /**
     * Submit content to backend.
     * Type is auto-detected from URL - no manual selection needed.
     */
    async function addContent() {
        const title = titleRef.current?.value;
        const token = localStorage.getItem("token");

        if (!title || title.trim().length === 0) {
            alert("Please enter a title.");
            return;
        }

        if (!validation?.valid) {
            toast.error("Please enter a valid URL.");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${BACKEND_URL}/api/v1/content`, {
                link,
                title: title.trim(),
                // Note: type is auto-detected on server from URL
                tags: selectedTags.map(t => t._id)
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            toast.success("Content added successfully!");
            onContentAdded?.();
            onClose();
        } catch (err) {
            // Show specific error message from server if available
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                toast.error(err.response.data.message);
            } else {
                toast.error("Failed to add content. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    function handleOpenChange(isOpen: boolean) {
        if (!isOpen) {
            onClose();
        }
    }

    // Determine if we should show preview
    const showPreview = validation?.valid && validation.canEmbed && validation.embedUrl;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader className="flex flex-row justify-between items-center">
                    <DialogTitle>Add Content</DialogTitle>
                    <DialogClose asChild>
                        <button className="text-brand-text hover:text-brand-primary transition-colors cursor-pointer p-2 hover:bg-brand-bg/50 rounded-lg">
                            <CrossIcon size="md" />
                        </button>
                    </DialogClose>
                </DialogHeader>

                <div className="space-y-5 mt-4">
                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-brand-text/80">Title</label>
                        <Input ref={titleRef} placeholder="Enter content title" />
                    </div>

                    {/* Link Input with Auto-Detection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-semibold text-brand-text/80">Link</label>
                            {/* Show type badge when URL is valid */}
                            {validation?.valid && validation.type && validation.displayName && (
                                <TypeBadge type={validation.type} displayName={validation.displayName} />
                            )}
                        </div>
                        <Input
                            value={link}
                            onChange={handleLinkChange}
                            placeholder="Paste any URL (YouTube, Twitter, or any link)"
                            error={validation ? !validation.valid : false}
                        />
                        {/* Validation feedback */}
                        {validation && !validation.valid && (
                            <p className="text-red-400 text-xs mt-1">{validation.message}</p>
                        )}
                        {validating && (
                            <p className="text-brand-text-muted text-xs mt-1">Validating URL...</p>
                        )}
                    </div>

                    {/* Embed Preview Section */}
                    {showPreview && (
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-brand-text/80">Preview</label>
                            <div className="border border-brand-surface rounded-lg overflow-hidden bg-black/20">
                                {validation.embedType === 'iframe' ? (
                                    // YouTube and other iframe-based embeds
                                    <iframe
                                        className="w-full aspect-video"
                                        src={validation.embedUrl}
                                        title="Content preview"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : validation.embedType === 'oembed' ? (
                                    // Twitter and other oEmbed-based content
                                    <div className="p-4 text-center text-brand-text-muted text-sm">
                                        <p className="mb-1">Twitter embed preview will appear after saving</p>
                                        <p className="text-xs opacity-70">Tweet ID: {validation.contentId}</p>
                                    </div>
                                ) : (
                                    // Generic links show as card placeholder
                                    <div className="p-4 text-center text-brand-text-muted text-sm">
                                        <p>Link will be saved as a reference</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Show link card preview for non-embeddable content */}
                    {validation?.valid && !validation.canEmbed && (
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-brand-text/80">Preview</label>
                            <div className="border border-brand-surface rounded-lg p-4 bg-brand-surface/30">
                                <p className="text-brand-text text-sm truncate">{link}</p>
                                <p className="text-brand-text-muted text-xs mt-1">
                                    This link will be saved for reference
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tags Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-brand-text/80">Tags</label>
                        <TagInput
                            availableTags={availableTags}
                            selectedTags={selectedTags}
                            onTagsChange={setSelectedTags}
                            onCreateTag={onCreateTag}
                            placeholder="Add tags (e.g., llm, tech)"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            text="Cancel"
                            onClick={onClose}
                            fullWidth={true}
                        />
                        <Button
                            variant="primary"
                            text="Add Content"
                            onClick={addContent}
                            fullWidth={true}
                            loading={loading}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
