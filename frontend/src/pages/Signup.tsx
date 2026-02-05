import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { GoogleSignInButton } from "../components/ui/GoogleSignInButton";
import { BACKEND_URL } from "../config";
import axios from "axios";
import { useRef, useState } from "react";
import { DotPattern, BlurFade, BorderBeam } from "../components/magicui";

export function Signup() {
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function signup() {
        const username = usernameRef.current?.value;
        const password = passwordRef.current?.value;

        if (!username || !password) {
            setError("Please enter both username and password");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await axios.post(BACKEND_URL + "/api/v1/signup", {
                username,
                password
            });
            setSuccess(true);
            setTimeout(() => navigate("/signin"), 1500);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || "Signup failed");
            } else {
                setError("Signup failed");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-screen w-screen bg-brand-bg flex justify-center items-center p-4 relative overflow-hidden">
            {/* Background Pattern */}
            <DotPattern className="opacity-50" />

            {/* Glow effects */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-brand-primary/15 rounded-full blur-[100px]" />

            <BlurFade delay={0.1}>
                <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-md p-10 space-y-8 border border-brand-surface relative overflow-hidden">
                    <BorderBeam size={200} duration={12} />

                    {/* Logo Section */}
                    <div className="text-center space-y-2">
                        <BlurFade delay={0.2}>
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg glow-primary-sm">
                                    <span className="text-brand-bg text-3xl font-bold">B</span>
                                </div>
                            </div>
                        </BlurFade>
                        <BlurFade delay={0.3}>
                            <h1 className="text-3xl font-bold text-brand-text">Create your account</h1>
                            <p className="text-brand-text/60 text-sm">Get started with Brainly</p>
                        </BlurFade>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-5">
                        {/* Success Message */}
                        {success && (
                            <BlurFade>
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <p className="text-green-400 text-sm text-center">Account created successfully! Redirecting to sign in...</p>
                                </div>
                            </BlurFade>
                        )}

                        {/* Error Message */}
                        {error && (
                            <BlurFade>
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-red-400 text-sm text-center">{error}</p>
                                </div>
                            </BlurFade>
                        )}

                        {/* Username Input */}
                        <BlurFade delay={0.4}>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-brand-text/80">Username</label>
                                <Input ref={usernameRef} placeholder="Choose a username" />
                            </div>
                        </BlurFade>

                        {/* Password Input */}
                        <BlurFade delay={0.5}>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-brand-text/80">Password</label>
                                <Input ref={passwordRef} placeholder="Create a strong password" type="password" />
                            </div>
                        </BlurFade>

                        {/* Signup Button */}
                        <BlurFade delay={0.6}>
                            <div className="pt-2">
                                <Button variant="primary" text="Create Account" fullWidth={true} loading={loading} onClick={signup} />
                            </div>
                        </BlurFade>

                        {/* Divider */}
                        <BlurFade delay={0.7}>
                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-brand-surface"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-brand-surface text-brand-text/60">or continue with</span>
                                </div>
                            </div>
                        </BlurFade>

                        {/* Google Sign In */}
                        <BlurFade delay={0.8}>
                            <GoogleSignInButton />
                        </BlurFade>
                    </div>

                    {/* Footer */}
                    <BlurFade delay={0.9}>
                        <div className="text-center text-sm text-brand-text/60">
                            Already have an account?{" "}
                            <a href="/signin" className="text-brand-primary font-semibold hover:text-brand-primary/80 hover:underline transition-colors">
                                Sign in
                            </a>
                        </div>
                    </BlurFade>
                </div>
            </BlurFade>
        </div>
    );
}
