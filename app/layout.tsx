import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
    display: "swap",
});

const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-dm-sans",
    display: "swap",
});

export const metadata: Metadata = {
    title: "ProductHive - Where Ideas Become Reality",
    description: "Professional multi-agent software creation platform with PRD generation and GitHub automation",
    keywords: ["AI", "software development", "PRD", "automation", "multi-agent"],
};

import Navbar from "@/components/landing/Navbar";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${outfit.variable} ${dmSans.variable} font-sans antialiased`} suppressHydrationWarning>
                <Navbar />
                {children}
            </body>
        </html>
    );
}
