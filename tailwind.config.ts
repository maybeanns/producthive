import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: '#FFFFFF',
                foreground: '#0A0A0A',
                primary: {
                    DEFAULT: '#D97706', // Amber-600 (Darker for light mode contrast)
                    foreground: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#B45309', // Amber-700
                    foreground: '#FFFFFF',
                },
                accent: {
                    DEFAULT: '#F59E0B', // Amber-500
                    foreground: '#0A0A0A',
                },
                muted: {
                    DEFAULT: '#F4F4F5',
                    foreground: '#71717A',
                },
                border: '#E4E4E7',
                card: {
                    DEFAULT: '#FFFFFF',
                    foreground: '#0A0A0A',
                },
            },
            fontFamily: {
                sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
                display: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'gradient-mesh': 'radial-gradient(at 40% 20%, hsla(45, 100%, 50%, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(35, 100%, 50%, 0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(50, 100%, 50%, 0.15) 0px, transparent 50%)',
            },
            animation: {
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-up': 'slide-up 0.5s ease-out',
                'slide-down': 'slide-down 0.5s ease-out',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'float': 'float 3s ease-in-out infinite',
                'gradient': 'gradient 8s linear infinite',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-down': {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'glow': {
                    '0%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
                    '100%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'gradient': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};

export default config;
