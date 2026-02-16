import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../../config';
import { useState } from 'react';

interface GoogleSignInButtonProps {
    onError?: (error: string) => void;
}

export function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            onError?.('No credential received from Google');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(`${BACKEND_URL}/api/v1/auth/google`, {
                credential: credentialResponse.credential
            });
            localStorage.setItem('token', response.data.token);
            navigate('/dashboard');
        } catch (error) {
            console.error('Google sign-in error:', error);
            let errorMessage = 'Google sign-in failed';
            if (axios.isAxiosError(error)) {
                console.error('Response status:', error.response?.status);
                console.error('Response data:', error.response?.data);
                console.error('Request URL:', error.config?.url);
                if (error.code === 'ERR_NETWORK') {
                    errorMessage = `Network error: Cannot reach backend at ${BACKEND_URL}. Check CORS and server status.`;
                } else {
                    errorMessage = error.response?.data?.detail || error.response?.data?.message || errorMessage;
                }
            }
            onError?.(errorMessage);
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleError = () => {
        console.error('Google OAuth error: The Google sign-in popup failed or was cancelled.');
        console.error('Check: 1) VITE_GOOGLE_CLIENT_ID is set correctly 2) Authorized JavaScript origins in Google Cloud Console includes', window.location.origin);
        const errorMessage = `Google sign-in failed. Make sure ${window.location.origin} is in your Google Cloud Console authorized origins.`;
        onError?.(errorMessage);
        alert(errorMessage);
    };

    if (isLoading) {
        return (
            <div className="w-full flex justify-center py-3">
                <div className="text-brand-text/60">Signing in with Google...</div>
            </div>
        );
    }

    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                theme="filled_black"
                size="large"
                shape="rectangular"
                text="continue_with"
                width="100%"
            />
        </div>
    );
}
