import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useUser();
    const location = useLocation();
    const token = localStorage.getItem('token');

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-brand-text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    // No token = redirect to signin
    if (!token) {
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    // Token exists but user failed to load = likely invalid token
    if (!user) {
        localStorage.removeItem('token');
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
