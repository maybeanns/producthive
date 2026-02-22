import HeroSection from "@/components/landing/HeroSection";
import MainInput from "@/components/landing/MainInput";
import ToolIntegrationBar from "@/components/landing/ToolIntegrationBar";
import HoneycombBackground from "@/components/landing/HoneycombBackground";

export default function Home() {
    return (
        <main className="min-h-screen bg-background relative overflow-x-hidden flex flex-col items-center justify-center">
            {/* Honeycomb Background Pattern */}
            <HoneycombBackground />

            {/* Animated gradient mesh background */}
            <div className="fixed inset-0 bg-gradient-mesh opacity-40 pointer-events-none" />

            {/* Radial gradient overlay */}
            <div className="fixed inset-0 bg-gradient-radial from-transparent via-background/50 to-background pointer-events-none" />

            {/* Main content */}
            <div className="relative z-10 w-full">
                <HeroSection />

                <div className="container mx-auto px-4 pb-20">
                    <MainInput />
                </div>
            </div>


        </main>
    );
}
