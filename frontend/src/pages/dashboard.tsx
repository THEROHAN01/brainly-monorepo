import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CreateContentModal } from '../components/ui/CreateContentModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { UserAvatar } from '../components/ui/UserAvatar'
import { EmptyState } from '../components/ui/EmptyState'
import { CardSkeletonGrid } from '../components/ui/CardSkeleton'
import { PlusIcon } from '../icons/PlusIcon'
import { ShareIcon } from '../icons/ShareIcon'
import { SearchIcon } from '../icons/SearchIcon'
import { Sidebar, type FilterType } from '../components/ui/Sidebar'
import { useContents } from '../hooks/useContents'
import { useUser } from '../hooks/useUser'
import { useTags } from '../hooks/useTags'
import { BACKEND_URL } from '../config'
import axios from 'axios';
import { toast } from 'sonner';

type SortOption = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "type";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; contentId: string | null }>({
    open: false,
    contentId: null
  });
  const { contents, loading, error, refetch } = useContents();
  const { user, loading: userLoading, logout } = useUser();
  const { tags: availableTags, createTag } = useTags();
  const token = localStorage.getItem("token");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Open add content modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setModalOpen(true);
      }
      // Escape: Close modal
      if (e.key === 'Escape') {
        setModalOpen(false);
        setDeleteConfirm({ open: false, contentId: null });
      }
      // /: Focus search (if not in input)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDeleteContent = async (contentId: string) => {
    setDeleteConfirm({ open: true, contentId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.contentId) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/v1/content`, {
        headers: {
          "Authorization": `Bearer ${token}`
        },
        data: { contentId: deleteConfirm.contentId }
      });
      toast.success("Content deleted successfully");
      refetch();
    } catch {
      toast.error("Failed to delete content");
    }
  };

  // Filter and sort contents
  const filteredContents = contents
    .filter(content => filter === "all" || content.type === filter)
    .filter(content => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const matchesTitle = content.title.toLowerCase().includes(query);
      const matchesUrl = content.link.toLowerCase().includes(query);
      const matchesTags = content.tags.some((tag: any) =>
        tag.name?.toLowerCase().includes(query)
      );
      return matchesTitle || matchesUrl || matchesTags;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "date-asc":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  return (
    <>
      <div>
        <Sidebar filter={filter} onFilterChange={setFilter} tags={availableTags} />

        <div className='p-4 ml-72 min-h-screen bg-brand-bg border-2 border-brand-surface'>
          <CreateContentModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onContentAdded={refetch}
            availableTags={availableTags}
            onCreateTag={createTag}
          />

          <ConfirmDialog
            open={deleteConfirm.open}
            title="Delete Content"
            message="Are you sure you want to delete this content? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            onConfirm={confirmDelete}
            onCancel={() => setDeleteConfirm({ open: false, contentId: null })}
          />

          <div className='flex justify-between items-center gap-4 mb-6'>
            {/* Search and Sort */}
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
              {/* Search Bar */}
              <div className="relative flex-1">
                <SearchIcon size="md" className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/40" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by title, URL, or tags... (Press / to focus)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-brand-text placeholder:text-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-shadow"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text/60 hover:text-brand-text transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-shadow cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="type">Type</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setModalOpen(true)}
                variant="primary"
                text="Add Content"
                startIcon={<PlusIcon size='lg' />}
              />
            <Button
              onClick={async () => {
                try {
                  const response = await axios.post(`${BACKEND_URL}/api/v1/brain/share`, {
                    share: true
                  }, {
                    headers: {
                      "Authorization": `Bearer ${token}`
                    }
                  });
                  const shareUrl = `${window.location.origin}/share/${response.data.hash}`;
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success("Share link copied to clipboard!");
                } catch {
                  toast.error("Failed to generate share link. Please try again.");
                }
              }}
              variant="secondary"
              text="Share Brain"
              startIcon={<ShareIcon size='lg' />}
            />

              {!userLoading && user && (
                <UserAvatar user={user} onLogout={logout} />
              )}
            </div>
          </div>

          {/* Content Area */}
          {loading ? (
            <CardSkeletonGrid count={8} />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={refetch} variant="secondary" text="Try Again" />
            </div>
          ) : contents.length === 0 ? (
            <EmptyState onAction={() => setModalOpen(true)} />
          ) : filteredContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-brand-text-muted mb-2">No {filter} content found</p>
              <button
                onClick={() => setFilter("all")}
                className="text-brand-primary hover:underline"
              >
                View all content
              </button>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4'>
              {filteredContents.map((content) => (
                <Card
                  key={content._id}
                  id={content._id}
                  type={content.type}
                  contentId={content.contentId}
                  link={content.link}
                  title={content.title}
                  tags={content.tags}
                  onDelete={handleDeleteContent}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
