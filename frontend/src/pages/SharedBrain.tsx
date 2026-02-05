import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/Card';
import { BACKEND_URL } from '../config';
import { Logo } from '../icons/Logo';

/**
 * Content item from shared brain API.
 * Type is a string to support any provider type.
 */
interface Content {
    _id: string;
    title: string;
    link: string;
    type: string;  // Provider type: 'youtube', 'twitter', 'link', etc.
    contentId?: string;  // Extracted content ID for embed generation
}

interface SharedBrainData {
    username: string;
    content: Content[];
}

export function SharedBrain() {
    const { shareLink } = useParams<{ shareLink: string }>();
    const [data, setData] = useState<SharedBrainData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSharedBrain() {
            try {
                const response = await axios.get(`${BACKEND_URL}/api/v1/brain/${shareLink}`);
                setData(response.data);
            } catch {
                setError('This shared brain link is invalid or has been removed.');
            } finally {
                setLoading(false);
            }
        }

        if (shareLink) {
            fetchSharedBrain();
        }
    }, [shareLink]);

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-brand-text text-xl">Loading...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
                <Logo />
                <div className="text-red-500 text-xl">{error || 'Something went wrong'}</div>
                <a href="/" className="text-brand-primary hover:underline">Go to Homepage</a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-bg">
            <div className="p-6 border-b border-brand-surface">
                <div className="flex items-center gap-4">
                    <Logo />
                    <div>
                        <h1 className="text-2xl font-bold text-brand-text">
                            {data.username}'s Brain
                        </h1>
                        <p className="text-brand-muted text-sm">
                            {data.content.length} item{data.content.length !== 1 ? 's' : ''} saved
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {data.content.length === 0 ? (
                    <div className="text-center text-brand-muted py-12">
                        This brain is empty.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.content.map((content) => (
                            <Card
                                key={content._id}
                                id={content._id}
                                type={content.type}
                                contentId={content.contentId}
                                link={content.link}
                                title={content.title}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
