import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ZapIcon } from "../icons/ZapIcon";
import { FolderIcon } from "../icons/FolderIcon";
import { GlobeIcon } from "../icons/GlobeIcon";
import { SearchIcon } from "../icons/SearchIcon";
import { StarIcon } from "../icons/StarIcon";
import { ArrowRightIcon } from "../icons/ArrowRightIcon";
import { ShieldIcon } from "../icons/ShieldIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { YoutubeIcon } from "../icons/YoutubeIcon";
import { GithubIcon } from "../icons/GithubIcon";
import { MediumIcon } from "../icons/MediumIcon";
import { InstagramIcon } from "../icons/InstagramIcon";
import { UsersIcon } from "../icons/UsersIcon";
import { useState } from "react";
import { GridPattern, TextShimmer, BlurFade, BorderBeam, MagicCard } from "../components/magicui";

export function Landing() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text overflow-x-hidden">

            {/* ── Floating Pill Navigation ── */}
            <nav className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="glass border border-brand-surface/60 rounded-2xl px-4 shadow-lg shadow-black/20">
                        <div className="flex justify-between items-center h-14">
                            {/* Logo */}
                            <Link to="/" className="flex items-center space-x-2.5 group">
                                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-md">
                                    <span className="text-brand-bg text-sm font-bold">B</span>
                                </div>
                                <span className="text-lg font-bold text-brand-text">Brainly</span>
                            </Link>

                            {/* Nav Links - desktop */}
                            <div className="hidden md:flex items-center space-x-7">
                                <a href="#features" className="text-sm text-brand-text/60 hover:text-brand-primary transition-colors">Features</a>
                                <a href="#how-it-works" className="text-sm text-brand-text/60 hover:text-brand-primary transition-colors">How it Works</a>
                                <a href="#testimonials" className="text-sm text-brand-text/60 hover:text-brand-primary transition-colors">Testimonials</a>
                            </div>

                            {/* Auth Buttons + Mobile Hamburger */}
                            <div className="flex items-center gap-3">
                                <Link to="/signin" className="text-sm text-brand-text/60 hover:text-brand-primary transition-colors hidden sm:block">
                                    Sign In
                                </Link>
                                <Link to="/signup" className="hidden sm:block">
                                    <Button variant="primary" text="Get Started" size="sm" endIcon={<ArrowRightIcon size="sm" />} />
                                </Link>
                                {/* Mobile hamburger */}
                                <button
                                    onClick={() => setMobileMenuOpen(o => !o)}
                                    className="md:hidden p-1.5 text-brand-text/60 hover:text-brand-primary transition-colors rounded-lg hover:bg-brand-surface/50 cursor-pointer"
                                    aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                                >
                                    {mobileMenuOpen ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Mobile Menu */}
                        {mobileMenuOpen && (
                            <div className="md:hidden border-t border-brand-surface/40 py-3 space-y-1">
                                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-brand-text/60 hover:text-brand-primary transition-colors rounded-lg hover:bg-brand-surface/50">Features</a>
                                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-brand-text/60 hover:text-brand-primary transition-colors rounded-lg hover:bg-brand-surface/50">How it Works</a>
                                <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-brand-text/60 hover:text-brand-primary transition-colors rounded-lg hover:bg-brand-surface/50">Testimonials</a>
                                <div className="pt-2 border-t border-brand-surface/40 flex flex-col gap-2 px-3 pb-1">
                                    <Link to="/signin" onClick={() => setMobileMenuOpen(false)} className="text-sm text-brand-text/60 hover:text-brand-primary transition-colors py-2">Sign In</Link>
                                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="primary" text="Get Started" fullWidth endIcon={<ArrowRightIcon size="sm" />} />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* ── Hero Section ── */}
            <section className="relative pt-36 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                {/* Background Effects - layered orbs for depth */}
                <GridPattern className="opacity-30" />
                <div className="absolute top-16 left-8 w-[500px] h-[500px] bg-brand-primary/25 rounded-full blur-[130px] pointer-events-none" />
                <div className="absolute bottom-10 right-8 w-[600px] h-[500px] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-brand-primary/8 rounded-full blur-[180px] pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center max-w-4xl mx-auto">

                        {/* Badge */}
                        <BlurFade delay={0}>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-primary/30 mb-3 badge-shimmer relative overflow-hidden">
                                <BorderBeam size={100} duration={8} />
                                <span className="w-2 h-2 bg-brand-primary rounded-full animate-sparkle" />
                                <span className="text-sm text-brand-text/90 font-medium">Your personal knowledge library</span>
                            </div>
                        </BlurFade>

                        {/* GitHub open source badge */}
                        <BlurFade delay={0.05}>
                            <div className="mb-8">
                                <a
                                    href="https://github.com/THEROHAN01/brainly-monorepo"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-surface/60 text-brand-text/50 text-xs hover:text-brand-text/80 hover:border-brand-surface transition-colors"
                                >
                                    <GithubIcon />
                                    <span>Open Source on GitHub</span>
                                    <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        </BlurFade>

                        {/* Headline — gradient text */}
                        <BlurFade delay={0.1}>
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
                                <span className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
                                    Never Lose Another
                                </span>
                                <span className="block mt-2">
                                    <TextShimmer className="text-5xl sm:text-6xl lg:text-7xl font-bold">
                                        Great Find Again
                                    </TextShimmer>
                                </span>
                            </h1>
                        </BlurFade>

                        {/* Subheadline */}
                        <BlurFade delay={0.2}>
                            <p className="text-lg sm:text-xl text-brand-text/50 mb-10 max-w-2xl mx-auto leading-relaxed">
                                Save, organize, and access content from YouTube, Twitter, GitHub, Medium, Instagram, Notion, and more — all in one beautiful place.
                            </p>
                        </BlurFade>

                        {/* CTAs */}
                        <BlurFade delay={0.3}>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                {/* Primary CTA with glow ring */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-brand-primary/50 blur-2xl rounded-xl scale-110 -z-10" />
                                    <Link to="/signup">
                                        <Button
                                            variant="primary"
                                            text="Start Saving for Free"
                                            size="lg"
                                            glow
                                            endIcon={<ArrowRightIcon size="sm" />}
                                        />
                                    </Link>
                                </div>
                                <a href="#how-it-works">
                                    <Button variant="secondary" text="See How It Works" size="lg" />
                                </a>
                            </div>
                        </BlurFade>

                        {/* Trust Indicators */}
                        <BlurFade delay={0.4}>
                            <div className="flex flex-wrap justify-center gap-6 mt-10 text-brand-text/40 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <ShieldIcon size="sm" className="text-brand-primary/70" />
                                    <span>No credit card required</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <ZapIcon size="sm" className="text-brand-primary/70" />
                                    <span>Setup in 30 seconds</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <GlobeIcon size="sm" className="text-brand-primary/70" />
                                    <span>Access from anywhere</span>
                                </div>
                            </div>
                        </BlurFade>
                    </div>

                    {/* Dashboard Mockup */}
                    <BlurFade delay={0.5}>
                        <div className="mt-20 relative">
                            {/* Glow behind mockup */}
                            <div className="absolute inset-x-20 top-10 h-40 bg-brand-primary/25 blur-[80px] rounded-full pointer-events-none" />

                            <MagicCard className="relative mx-auto max-w-5xl rounded-2xl">
                                {/* Mockup Container */}
                                <div className="relative rounded-2xl border border-brand-surface/60 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)] bg-brand-bg">
                                    <BorderBeam size={300} duration={20} />

                                    {/* Browser Header */}
                                    <div className="flex items-center gap-2 px-4 py-3 bg-brand-surface-dark border-b border-brand-surface/60">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-500/70" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                                            <div className="w-3 h-3 rounded-full bg-green-500/70" />
                                        </div>
                                        <div className="flex-1 mx-4">
                                            <div className="bg-brand-surface/80 rounded-md px-3 py-1 text-xs text-brand-text/40 max-w-xs mx-auto text-center">
                                                brainly.app/dashboard
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dashboard Content */}
                                    <div className="flex">
                                        {/* Sidebar */}
                                        <div className="w-52 border-r border-brand-surface/60 p-4 hidden sm:block shrink-0">
                                            <div className="flex items-center gap-2 mb-5">
                                                <div className="w-7 h-7 bg-brand-primary rounded-md flex items-center justify-center">
                                                    <span className="text-brand-bg font-bold text-xs">B</span>
                                                </div>
                                                <span className="font-semibold text-sm">Brainly</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-brand-primary/15 text-brand-text border border-brand-primary/20">
                                                    <div className="w-3.5 h-3.5 rounded bg-brand-primary/40" />
                                                    <span className="text-xs font-medium">All Content</span>
                                                </div>
                                                {[
                                                    { icon: <YoutubeIcon />, label: "YouTube" },
                                                    { icon: <TwitterIcon />, label: "Twitter" },
                                                    { icon: <GithubIcon />, label: "GitHub" },
                                                    { icon: <MediumIcon />, label: "Medium" },
                                                    { icon: <InstagramIcon />, label: "Instagram" },
                                                ].map(({ icon, label }) => (
                                                    <div key={label} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-brand-text/50 hover:bg-brand-surface/50 hover:text-brand-text/70 transition-colors cursor-pointer">
                                                        <span className="opacity-70 flex items-center">{icon}</span>
                                                        <span className="text-xs">{label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Main Content */}
                                        <div className="flex-1 p-5 min-w-0">
                                            <div className="flex items-center justify-between mb-5">
                                                <h3 className="text-sm font-semibold">Your Content</h3>
                                                <div className="px-2.5 py-1 bg-brand-primary text-brand-bg text-xs font-medium rounded-md">
                                                    + Add
                                                </div>
                                            </div>

                                            {/* Content Cards Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {/* Card 1 */}
                                                <div className="rounded-lg border border-brand-surface/60 bg-brand-surface-dark/80 p-3 hover-lift">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <TwitterIcon />
                                                        <span className="text-xs text-brand-text/50">Twitter Thread</span>
                                                    </div>
                                                    <div className="h-14 bg-brand-surface/60 rounded-md mb-2" />
                                                    <p className="text-xs text-brand-text/70 line-clamp-2">How to build a second brain...</p>
                                                </div>

                                                {/* Card 2 */}
                                                <div className="rounded-lg border border-brand-surface/60 bg-brand-surface-dark/80 p-3 hover-lift">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <YoutubeIcon />
                                                        <span className="text-xs text-brand-text/50">YouTube Video</span>
                                                    </div>
                                                    <div className="h-14 bg-brand-surface/60 rounded-md mb-2 flex items-center justify-center">
                                                        <div className="w-7 h-7 bg-red-500/20 rounded-full flex items-center justify-center">
                                                            <div className="w-0 h-0 border-l-[6px] border-l-red-500 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5" />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-brand-text/70 line-clamp-2">The Ultimate Guide to Productivity</p>
                                                </div>

                                                {/* Card 3 */}
                                                <div className="rounded-lg border border-brand-surface/60 bg-brand-surface-dark/80 p-3 hover-lift hidden lg:block">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <GithubIcon />
                                                        <span className="text-xs text-brand-text/50">GitHub Repo</span>
                                                    </div>
                                                    <div className="h-14 bg-brand-surface/60 rounded-md mb-2" />
                                                    <p className="text-xs text-brand-text/70 line-clamp-2">awesome-react — curated list of resources...</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom fade — blends mockup into page */}
                                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-brand-bg to-transparent pointer-events-none" />
                                </div>
                            </MagicCard>
                        </div>
                    </BlurFade>
                </div>
            </section>

            {/* ── Platforms Strip ── */}
            <section className="relative py-14 px-4 sm:px-6 lg:px-8">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-surface/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-surface/60 to-transparent" />
                <div className="max-w-7xl mx-auto">
                    <p className="text-center text-brand-text/30 text-xs mb-7 uppercase tracking-[0.2em]">Save from any platform</p>
                    <div className="flex flex-wrap justify-center items-center gap-5 md:gap-10">
                        {[
                            { icon: <YoutubeIcon />, label: "YouTube" },
                            { icon: <TwitterIcon />, label: "Twitter / X" },
                            { icon: <GithubIcon />, label: "GitHub" },
                            { icon: <MediumIcon />, label: "Medium" },
                            { icon: <InstagramIcon />, label: "Instagram" },
                            { icon: <GlobeIcon size="sm" />, label: "Any URL" },
                        ].map(({ icon, label }, i) => (
                            <BlurFade key={label} delay={0.08 * i}>
                                <div className="flex items-center gap-2 text-brand-text/35 hover:text-brand-text/60 transition-colors duration-200">
                                    <span className="opacity-70 flex items-center">{icon}</span>
                                    <span className="text-sm font-medium">{label}</span>
                                </div>
                            </BlurFade>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features — Bento Grid ── */}
            <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <BlurFade>
                        <div className="text-center mb-16">
                            <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
                                Everything You Need to <TextShimmer>Stay Organized</TextShimmer>
                            </h2>
                            <p className="text-lg text-brand-text/50 max-w-2xl mx-auto">
                                Powerful features designed to help you save, organize, and never lose valuable content again.
                            </p>
                        </div>
                    </BlurFade>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* Large Card 1 - Save Instantly */}
                        <BlurFade delay={0.1} className="lg:col-span-2">
                            <MagicCard className="group relative rounded-3xl border border-brand-surface/60 bg-gradient-to-br from-brand-surface-dark to-brand-bg p-8 hover:border-brand-primary/40 transition-all duration-500 overflow-hidden h-full">
                                <div className="absolute top-0 right-0 w-72 h-72 bg-brand-primary/8 rounded-full blur-[100px] group-hover:bg-brand-primary/15 transition-all duration-500" />
                                <div className="relative z-10">
                                    {/* Icon with glow halo */}
                                    <div className="relative w-14 h-14 mb-6">
                                        <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-2xl group-hover:bg-brand-primary/35 transition-all duration-300" />
                                        <div className="relative w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <ZapIcon size="lg" className="text-brand-primary" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Save Instantly</h3>
                                    <p className="text-brand-text/55 text-base max-w-md leading-relaxed">
                                        Paste any link — YouTube, Twitter, GitHub, Medium, and more — and we'll save it instantly. No extensions, no complex setup.
                                    </p>
                                    {/* Mini Demo */}
                                    <div className="mt-8 p-4 rounded-xl bg-brand-bg/60 border border-brand-surface/60">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-brand-surface/80 rounded-lg px-4 py-2 text-brand-text/35 text-sm">
                                                https://github.com/owner/awesome-repo
                                            </div>
                                            <div className="px-4 py-2 bg-brand-primary text-brand-bg text-sm font-medium rounded-lg shrink-0">
                                                Save
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </MagicCard>
                        </BlurFade>

                        {/* Small Card - Access Anywhere */}
                        <BlurFade delay={0.2}>
                            <MagicCard className="group relative rounded-3xl border border-brand-surface/60 bg-gradient-to-br from-brand-surface-dark to-brand-bg p-8 hover:border-brand-primary/40 transition-all duration-500 h-full">
                                <div className="relative w-14 h-14 mb-6">
                                    <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-2xl group-hover:bg-brand-primary/35 transition-all duration-300" />
                                    <div className="relative w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <GlobeIcon size="lg" className="text-brand-primary" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3 tracking-tight">Access Anywhere</h3>
                                <p className="text-brand-text/55 leading-relaxed">
                                    Your content syncs across all devices. Desktop, tablet, or phone—it's always there.
                                </p>
                            </MagicCard>
                        </BlurFade>

                        {/* Small Card - Organize Smart */}
                        <BlurFade delay={0.3}>
                            <MagicCard className="group relative rounded-3xl border border-brand-surface/60 bg-gradient-to-br from-brand-surface-dark to-brand-bg p-8 hover:border-brand-primary/40 transition-all duration-500 h-full">
                                <div className="relative w-14 h-14 mb-6">
                                    <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-2xl group-hover:bg-brand-primary/35 transition-all duration-300" />
                                    <div className="relative w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <FolderIcon size="lg" className="text-brand-primary" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3 tracking-tight">Organize Smart</h3>
                                <p className="text-brand-text/55 leading-relaxed">
                                    Add tags, filter by platform, and sort by date or title. Find what you need in seconds.
                                </p>
                            </MagicCard>
                        </BlurFade>

                        {/* Large Card 2 - Powerful Search */}
                        <BlurFade delay={0.25} className="lg:col-span-2">
                            <MagicCard className="group relative rounded-3xl border border-brand-surface/60 bg-gradient-to-br from-brand-surface-dark to-brand-bg p-8 hover:border-brand-primary/40 transition-all duration-500 overflow-hidden h-full">
                                <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-primary/8 rounded-full blur-[100px] group-hover:bg-brand-primary/15 transition-all duration-500" />
                                <div className="relative z-10">
                                    <div className="relative w-14 h-14 mb-6">
                                        <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-2xl group-hover:bg-brand-primary/35 transition-all duration-300" />
                                        <div className="relative w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <SearchIcon size="lg" className="text-brand-primary" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Powerful Search</h3>
                                    <p className="text-brand-text/55 text-base max-w-md leading-relaxed">
                                        Find that perfect thread instantly. Search by title, URL, or tag across all your saved content with lightning-fast results.
                                    </p>
                                    {/* Search Demo */}
                                    <div className="mt-8 p-4 rounded-xl bg-brand-bg/60 border border-brand-surface/60">
                                        <div className="flex items-center gap-3 bg-brand-surface/80 rounded-lg px-4 py-3">
                                            <SearchIcon size="sm" className="text-brand-text/30" />
                                            <span className="text-brand-text/30 text-sm">Search your saved content...</span>
                                        </div>
                                    </div>
                                </div>
                            </MagicCard>
                        </BlurFade>

                        {/* Small Card - Share Brain */}
                        <BlurFade delay={0.3}>
                            <MagicCard className="group relative rounded-3xl border border-brand-surface/60 bg-gradient-to-br from-brand-surface-dark to-brand-bg p-8 hover:border-brand-primary/40 transition-all duration-500 h-full">
                                <div className="relative w-14 h-14 mb-6">
                                    <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-2xl group-hover:bg-brand-primary/35 transition-all duration-300" />
                                    <div className="relative w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-7 h-7 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                            <polyline points="16 6 12 2 8 6" />
                                            <line x1="12" y1="2" x2="12" y2="15" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3 tracking-tight">Share Your Brain</h3>
                                <p className="text-brand-text/55 leading-relaxed">
                                    Generate a public link and share your entire curated knowledge library with anyone.
                                </p>
                            </MagicCard>
                        </BlurFade>

                        {/* Small Card - Never Lose Content */}
                        <BlurFade delay={0.35}>
                            <MagicCard className="group relative rounded-3xl border border-brand-surface/60 bg-gradient-to-br from-brand-surface-dark to-brand-bg p-8 hover:border-brand-primary/40 transition-all duration-500 h-full">
                                <div className="relative w-14 h-14 mb-6">
                                    <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-2xl group-hover:bg-brand-primary/35 transition-all duration-300" />
                                    <div className="relative w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <ShieldIcon size="lg" className="text-brand-primary" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3 tracking-tight">Never Lose Content</h3>
                                <p className="text-brand-text/55 leading-relaxed">
                                    Even if tweets get deleted, your saved content remains safe and accessible.
                                </p>
                            </MagicCard>
                        </BlurFade>

                        {/* Small Card - Rich Metadata */}
                        <BlurFade delay={0.4}>
                            <MagicCard className="group relative rounded-3xl border border-brand-surface/60 bg-gradient-to-br from-brand-surface-dark to-brand-bg p-8 hover:border-brand-primary/40 transition-all duration-500 h-full">
                                <div className="relative w-14 h-14 mb-6">
                                    <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-2xl group-hover:bg-brand-primary/35 transition-all duration-300" />
                                    <div className="relative w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-7 h-7 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="3" />
                                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3 tracking-tight">Rich Metadata</h3>
                                <p className="text-brand-text/55 leading-relaxed">
                                    Automatically fetches titles, descriptions, and thumbnails so your library is always informative.
                                </p>
                            </MagicCard>
                        </BlurFade>
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section id="how-it-works" className="relative py-24 px-4 sm:px-6 lg:px-8">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-surface/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-surface-dark/20 to-transparent pointer-events-none" />
                <div className="max-w-5xl mx-auto relative z-10">
                    <BlurFade>
                        <div className="text-center mb-16">
                            <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
                                Getting Started is <TextShimmer>Simple</TextShimmer>
                            </h2>
                            <p className="text-lg text-brand-text/50">
                                Three easy steps to build your personal knowledge library
                            </p>
                        </div>
                    </BlurFade>

                    <div className="relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-10 left-[22%] right-[22%] h-px bg-gradient-to-r from-brand-primary/60 via-brand-primary/30 to-brand-primary/60" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {/* Step 1 */}
                            <BlurFade delay={0.1}>
                                <div className="text-center relative">
                                    <div className="relative mx-auto w-20 h-20 mb-6">
                                        <div className="absolute inset-0 bg-brand-primary/30 blur-xl rounded-2xl" />
                                        <div className="relative w-20 h-20 bg-brand-primary rounded-2xl flex flex-col items-center justify-center text-brand-bg shadow-lg border border-brand-primary-light/30">
                                            <UsersIcon size="sm" className="mb-0.5 opacity-80" />
                                            <span className="text-lg font-bold leading-none">1</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 tracking-tight">Create Your Account</h3>
                                    <p className="text-brand-text/50 leading-relaxed">
                                        Sign up in seconds with just an email. No credit card required.
                                    </p>
                                </div>
                            </BlurFade>

                            {/* Step 2 */}
                            <BlurFade delay={0.2}>
                                <div className="text-center relative">
                                    <div className="relative mx-auto w-20 h-20 mb-6">
                                        <div className="absolute inset-0 bg-brand-primary/30 blur-xl rounded-2xl" />
                                        <div className="relative w-20 h-20 bg-brand-primary rounded-2xl flex flex-col items-center justify-center text-brand-bg shadow-lg border border-brand-primary-light/30">
                                            <ZapIcon size="sm" className="mb-0.5 opacity-80" />
                                            <span className="text-lg font-bold leading-none">2</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 tracking-tight">Save Your Content</h3>
                                    <p className="text-brand-text/50 leading-relaxed">
                                        Paste any link — YouTube, Twitter, GitHub, Medium, Instagram, Notion, or any URL. We handle the rest.
                                    </p>
                                </div>
                            </BlurFade>

                            {/* Step 3 */}
                            <BlurFade delay={0.3}>
                                <div className="text-center relative">
                                    <div className="relative mx-auto w-20 h-20 mb-6">
                                        <div className="absolute inset-0 bg-brand-primary/30 blur-xl rounded-2xl" />
                                        <div className="relative w-20 h-20 bg-brand-primary rounded-2xl flex flex-col items-center justify-center text-brand-bg shadow-lg border border-brand-primary-light/30">
                                            <SearchIcon size="sm" className="mb-0.5 opacity-80" />
                                            <span className="text-lg font-bold leading-none">3</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 tracking-tight">Access Anytime</h3>
                                    <p className="text-brand-text/50 leading-relaxed">
                                        Browse, search, and share your curated collection from any device.
                                    </p>
                                </div>
                            </BlurFade>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <BlurFade>
                        <div className="text-center mb-16">
                            <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
                                Loved by <TextShimmer>Knowledge Workers</TextShimmer>
                            </h2>
                            <p className="text-lg text-brand-text/50">
                                Join thousands who have transformed how they save and organize content
                            </p>
                        </div>
                    </BlurFade>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Testimonial 1 */}
                        <BlurFade delay={0.1}>
                            <MagicCard className="rounded-2xl border border-brand-surface/60 bg-brand-surface-dark/40 p-7 hover:border-brand-primary/30 transition-colors h-full">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon key={i} size="sm" filled className="text-brand-primary" />
                                    ))}
                                </div>
                                <p className="text-brand-text/75 mb-6 leading-relaxed text-sm">
                                    "Finally, a tool that understands how I consume content. I've saved hundreds of threads that would have been lost forever. Brainly is now essential to my workflow."
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-dark flex items-center justify-center text-brand-bg font-bold text-sm shrink-0">
                                        SK
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">Sarah Kim</div>
                                        <div className="text-xs text-brand-text/40">Product Manager at TechCorp</div>
                                    </div>
                                </div>
                            </MagicCard>
                        </BlurFade>

                        {/* Testimonial 2 */}
                        <BlurFade delay={0.2}>
                            <MagicCard className="rounded-2xl border border-brand-surface/60 bg-brand-surface-dark/40 p-7 hover:border-brand-primary/30 transition-colors h-full">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon key={i} size="sm" filled className="text-brand-primary" />
                                    ))}
                                </div>
                                <p className="text-brand-text/75 mb-6 leading-relaxed text-sm">
                                    "The search functionality is incredible. I can find any thread or video I've saved in seconds. It's like having a second brain that actually works."
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        MR
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">Michael Rodriguez</div>
                                        <div className="text-xs text-brand-text/40">Founder at StartupXYZ</div>
                                    </div>
                                </div>
                            </MagicCard>
                        </BlurFade>

                        {/* Testimonial 3 */}
                        <BlurFade delay={0.3}>
                            <MagicCard className="rounded-2xl border border-brand-surface/60 bg-brand-surface-dark/40 p-7 hover:border-brand-primary/30 transition-colors h-full">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon key={i} size="sm" filled className="text-brand-primary" />
                                    ))}
                                </div>
                                <p className="text-brand-text/75 mb-6 leading-relaxed text-sm">
                                    "I used to have bookmarks scattered everywhere. Now everything is in one place, beautifully organized. Being able to share my whole brain with a link is incredible."
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        AL
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">Alex Lee</div>
                                        <div className="text-xs text-brand-text/40">Designer at InnovateCo</div>
                                    </div>
                                </div>
                            </MagicCard>
                        </BlurFade>
                    </div>
                </div>
            </section>

            {/* ── Value Props ── */}
            <section className="relative py-20 px-4 sm:px-6 lg:px-8">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-surface/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-surface/60 to-transparent" />
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <BlurFade delay={0.1}>
                            <div>
                                <div className="text-4xl sm:text-5xl font-bold text-gradient mb-2 tracking-tight">6+</div>
                                <div className="text-brand-text/50">Platforms Supported</div>
                            </div>
                        </BlurFade>
                        <BlurFade delay={0.2}>
                            <div>
                                <div className="text-4xl sm:text-5xl font-bold text-gradient mb-2 tracking-tight">Free</div>
                                <div className="text-brand-text/50">No credit card required</div>
                            </div>
                        </BlurFade>
                        <BlurFade delay={0.3}>
                            <div>
                                <div className="text-4xl sm:text-5xl font-bold text-gradient mb-2 tracking-tight">&lt;30s</div>
                                <div className="text-brand-text/50">To get started</div>
                            </div>
                        </BlurFade>
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-surface/30 via-brand-bg to-brand-surface/30" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-brand-primary/12 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-purple-600/8 rounded-full blur-[120px]" />

                <BlurFade>
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-[1.1]">
                            <span className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
                                Start Building Your
                            </span>
                            <span className="block mt-2">
                                <TextShimmer className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                                    Knowledge Library Today
                                </TextShimmer>
                            </span>
                        </h2>
                        <p className="text-lg text-brand-text/50 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Join thousands of creators, researchers, and learners who never lose track of valuable content.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-primary/50 blur-2xl rounded-xl scale-110 -z-10" />
                                <Link to="/signup">
                                    <Button
                                        variant="primary"
                                        text="Get Started Free"
                                        size="lg"
                                        glow
                                        endIcon={<ArrowRightIcon size="sm" />}
                                    />
                                </Link>
                            </div>
                        </div>
                        <p className="mt-6 text-brand-text/35 text-sm">
                            Free forever • No credit card required • Setup in 30 seconds
                        </p>
                    </div>
                </BlurFade>
            </section>

            {/* ── Footer ── */}
            <footer className="relative border-t border-brand-surface/50 py-14 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16">
                        {/* Brand */}
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center space-x-2.5 mb-4">
                                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                                    <span className="text-brand-bg text-sm font-bold">B</span>
                                </div>
                                <span className="text-lg font-bold text-brand-text">Brainly</span>
                            </div>
                            <p className="text-brand-text/40 text-sm max-w-xs leading-relaxed">
                                Your personal knowledge library. Save from YouTube, Twitter, GitHub, Medium, Instagram, Notion, and more.
                            </p>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="font-semibold mb-4 text-brand-text/80 text-sm">Product</h4>
                            <ul className="space-y-2.5 text-sm text-brand-text/40">
                                <li><a href="#features" className="hover:text-brand-primary transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Changelog</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Roadmap</a></li>
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h4 className="font-semibold mb-4 text-brand-text/80 text-sm">Company</h4>
                            <ul className="space-y-2.5 text-sm text-brand-text/40">
                                <li><a href="#" className="hover:text-brand-primary transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Careers</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Contact</a></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="font-semibold mb-4 text-brand-text/80 text-sm">Legal</h4>
                            <ul className="space-y-2.5 text-sm text-brand-text/40">
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Cookie Policy</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t border-brand-surface/40 mt-10 pt-7 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-brand-text/30 text-sm">
                            &copy; 2026 Brainly. All rights reserved.
                        </p>
                        <div className="flex items-center gap-5">
                            <a href="https://github.com/THEROHAN01/brainly-monorepo" target="_blank" rel="noopener noreferrer" className="text-brand-text/30 hover:text-brand-primary transition-colors" aria-label="GitHub">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                </svg>
                            </a>
                            <a href="#" className="text-brand-text/30 hover:text-brand-primary transition-colors" aria-label="Twitter / X">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </a>
                            <a href="#" className="text-brand-text/30 hover:text-brand-primary transition-colors" aria-label="LinkedIn">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
