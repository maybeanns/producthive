'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Hexagon } from 'lucide-react';

/**
 * Concave fillet corners — the 20×20 div sits OUTSIDE the tab.
 * The SVG fills the "bridge" colour in the correct quadrant so the
 * curve faces inward (toward the centre of the viewport).
 *
 * LEFT corner  (placed at -left-[20px])  → fill top-right quadrant
 * RIGHT corner (placed at -right-[20px]) → fill top-left  quadrant
 */
function ConcaveLeft({ color }: { color: string }) {
    return (
        <div className="absolute top-0 -left-[20px] w-[20px] h-[20px]" style={{ color }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Start at top-right (20,0), go down to (20,20), quadratic bend to top-left (0,0) */}
                <path d="M20 0 L20 20 Q20 0 0 0 Z" fill="currentColor" />
            </svg>
        </div>
    );
}

function ConcaveRight({ color }: { color: string }) {
    return (
        <div className="absolute top-0 -right-[20px] w-[20px] h-[20px]" style={{ color }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Start at top-left (0,0), go down to (0,20), quadratic bend to top-right (20,0) */}
                <path d="M0 0 L0 20 Q0 0 20 0 Z" fill="currentColor" />
            </svg>
        </div>
    );
}

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] flex justify-between px-10 pointer-events-none">

            {/* ── Left Tab — Brand ── */}
            <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="relative pointer-events-auto"
            >
                <div className="relative bg-[#DD830A] px-5 py-2.5 rounded-b-[20px] flex items-center gap-2 text-white">
                    <ConcaveLeft color="#DD830A" />
                    <ConcaveRight color="#DD830A" />

                    <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <Hexagon className="w-4 h-4 fill-white/20 flex-shrink-0" strokeWidth={2.5} />
                        <span className="font-display font-semibold tracking-tight text-sm whitespace-nowrap">ProductHive</span>
                    </Link>
                </div>
            </motion.div>

            {/* ── Right Tab — Navigation ── */}
            <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                className="relative pointer-events-auto"
            >
                <div className="relative bg-[#0A0A0A] px-7 py-2.5 rounded-b-[20px] flex items-center gap-7 text-white">
                    <ConcaveLeft color="#0A0A0A" />
                    <ConcaveRight color="#0A0A0A" />

                    <Link href="/help" className="text-[13px] font-display font-medium text-white/70 hover:text-white transition-colors tracking-tight">Help</Link>
                    <Link href="/pricing" className="text-[13px] font-display font-medium text-white/70 hover:text-[#FBBF24] transition-colors tracking-tight">Pricing</Link>
                    <Link href="/profile" className="text-[13px] font-display font-medium text-white/70 hover:text-white transition-colors tracking-tight">Profile</Link>
                </div>
            </motion.div>

        </nav>
    );
}
