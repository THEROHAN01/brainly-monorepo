import { useState, useRef, useEffect } from "react";
import type { Tag } from "../../types/tag";
import { TagBadge } from "./TagBadge";

interface TagInputProps {
    availableTags: Tag[];
    selectedTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    onCreateTag: (name: string) => Promise<Tag | null>;
    placeholder?: string;
}

export function TagInput({
    availableTags,
    selectedTags,
    onTagsChange,
    onCreateTag,
    placeholder = "Add tags..."
}: TagInputProps) {
    const [inputValue, setInputValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on input
    const filteredTags = availableTags.filter(
        tag =>
            tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
            !selectedTags.some(st => st._id === tag._id)
    );

    // Check if input matches an existing tag exactly
    const exactMatch = availableTags.find(
        t => t.name.toLowerCase() === inputValue.trim().toLowerCase()
    );
    const canCreateNew = inputValue.trim().length > 0 && !exactMatch;

    // Handle click outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectTag = (tag: Tag) => {
        onTagsChange([...selectedTags, tag]);
        setInputValue("");
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleRemoveTag = (tagId: string) => {
        onTagsChange(selectedTags.filter(t => t._id !== tagId));
    };

    const handleCreateTag = async () => {
        if (!canCreateNew || isCreating) return;

        setIsCreating(true);
        try {
            const newTag = await onCreateTag(inputValue.trim());
            if (newTag) {
                handleSelectTag(newTag);
            }
        } catch {
            // Tag creation failed silently
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (filteredTags.length > 0) {
                handleSelectTag(filteredTags[0]);
            } else if (canCreateNew) {
                handleCreateTag();
            }
        }
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {selectedTags.map(tag => (
                        <TagBadge
                            key={tag._id}
                            name={tag.name}
                            onRemove={() => handleRemoveTag(tag._id)}
                        />
                    ))}
                </div>
            )}

            {/* Input */}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-brand-bg border border-brand-surface rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
                    transition-all duration-200 placeholder:text-brand-text/40 text-brand-text text-sm"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && (inputValue.length > 0 || filteredTags.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-brand-bg border border-brand-surface
                    rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredTags.map(tag => (
                        <button
                            key={tag._id}
                            onClick={() => handleSelectTag(tag)}
                            className="w-full px-3 py-2 text-left text-sm text-brand-text
                                hover:bg-brand-surface transition-colors"
                        >
                            {tag.name}
                        </button>
                    ))}
                    {canCreateNew && (
                        <button
                            onClick={handleCreateTag}
                            disabled={isCreating}
                            className="w-full px-3 py-2 text-left text-sm text-brand-primary
                                hover:bg-brand-surface transition-colors border-t border-brand-surface"
                        >
                            {isCreating ? "Creating..." : `Create "${inputValue.trim()}"`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
