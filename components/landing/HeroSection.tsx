'use client';

export default function HeroSection() {
    return (
        <div className="container mx-auto px-4 pt-20 pb-8 text-center">
            {/* Main headline with gradient */}
            {/* Main headline with gradient */}
            <h1 className="text-4xl md:text-5xl font-display font-medium mb-4 animate-fade-in tracking-tight">
                <span className="text-gradient from-primary via-secondary to-accent bg-[length:200%_auto] animate-gradient">
                    Have an idea? Let's build it
                </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-4 animate-slide-up opacity-80">
                Build fully functional apps and websites through simple conversations
            </p>
        </div>
    );
}
