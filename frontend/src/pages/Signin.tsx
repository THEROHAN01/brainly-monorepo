import { useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { GoogleSignInButton } from "../components/ui/GoogleSignInButton";
import { BACKEND_URL } from "../config";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export function Signin() {
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function signin() {
        const username = usernameRef.current?.value;
        const password = passwordRef.current?.value;

        if (!username || !password) {
            setError("Please enter both username and password");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(BACKEND_URL + "/api/v1/signin", {
                username,
                password
            });
            localStorage.setItem("token", response.data.token);
            navigate("/dashboard");
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || "Signin failed");
            } else {
                setError("Signin failed");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-screen w-screen bg-brand-bg flex justify-center items-center p-4">
            <div className="bg-brand-surface rounded-2xl shadow-xl w-full max-w-md p-10 space-y-8 border border-brand-border">`

                    {/* Logo Section */}
                    <div className="text-center space-y-2">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-brand-bg text-3xl font-bold">B</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-brand-text">Welcome back</h1>
                        <p className="text-brand-text/60 text-sm">Sign in to your account</p>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            </div>
                        )}

                        {/* Username Input */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-brand-text/80">Username</label>
                            <Input ref={usernameRef} placeholder="Enter your username" />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-brand-text/80">Password</label>
                            <Input ref={passwordRef} placeholder="Enter your password" type="password" />
                        </div>

                        {/* Signin Button */}
                        <div className="pt-2">
                            <Button onClick={signin} variant="primary" text="Sign In" fullWidth={true} loading={loading} />
                        </div>

                        {/* Divider */}
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-brand-border"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-brand-surface text-brand-text/60">or continue with</span>
                            </div>
                        </div>

                        {/* Google Sign In */}
                        <GoogleSignInButton />
                    </div>

                    {/* Footer */}
                    <div className="text-center text-sm text-brand-text/60">
                        Don't have an account?{" "}
                        <a href="/signup" className="text-brand-primary font-semibold hover:text-brand-primary/80 hover:underline transition-colors">
                            Sign up
                        </a>
                    </div>
                </div>
        </div>
    );
}
