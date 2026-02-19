import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../../hooks/useUser";

interface UserAvatarProps {
    user: User;
    onLogout: () => void;
}

export function UserAvatar({ user, onLogout }: UserAvatarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        onLogout();
        navigate("/signin");
    };

    const getInitials = (username: string) => {
        return username.slice(0, 2).toUpperCase();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-brand-surface transition-colors cursor-pointer"
                aria-label="User menu"
                aria-expanded={isOpen}
            >
                {user.profilePicture ? (
                    <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-brand-primary"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-brand-bg font-semibold text-sm">
                        {getInitials(user.username)}
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-brand-surface rounded-lg shadow-lg border border-brand-surface-dark py-2 z-50 animate-scale-in" role="menu">
                    <div className="px-4 py-3 border-b border-brand-bg">
                        <p className="text-brand-text font-semibold truncate">{user.username}</p>
                        {user.email && (
                            <p className="text-brand-text-muted text-sm truncate">{user.email}</p>
                        )}
                        {user.authProvider === "google" && (
                            <span className="text-xs text-brand-primary mt-1 inline-block">
                                Signed in with Google
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-brand-text hover:bg-brand-bg transition-colors flex items-center gap-2 mt-1 cursor-pointer"
                        role="menuitem"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}
