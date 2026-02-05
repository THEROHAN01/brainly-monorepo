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
            let errorMessage = 'Google sign-in failed';
            if (axios.isAxiosError(error)) {
                errorMessage = error.response?.data?.message || errorMessage;
            }
            onError?.(errorMessage);
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleError = () => {
        const errorMessage = 'Google sign-in was cancelled or failed';
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
