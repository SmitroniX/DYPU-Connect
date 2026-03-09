'use client';

import { useEffect, useState } from 'react';

export default function PremiumLoadingScreen() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Use a short timeout to ensure it runs after the initial mount cycle, avoiding ESLint errors
        const timer = setTimeout(() => setMounted(true), 10);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#0f0f0f] transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            {/* Animated Background Mesh */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
                <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full mix-blend-screen filter blur-[80px] animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-[600px] h-[600px] bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000"></div>
            </div>

            {/* Glowing Logo / Rings */}
            <div className="relative flex items-center justify-center">
                {/* Outer rotating dashed ring */}
                <div className="absolute w-32 h-32 rounded-full border border-blue-500/20 border-r-blue-400/80 animate-[spin_4s_linear_infinite]"></div>
                {/* Inner counter-rotating ring */}
                <div className="absolute w-24 h-24 rounded-full border border-fuchsia-500/20 border-l-fuchsia-400/80 animate-[spin_3s_linear_infinite_reverse]"></div>
                
                {/* Center Core */}
                <div className="relative w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(59,130,246,0.2)] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-tr from-blue-500/20 to-fuchsia-500/20 mix-blend-overlay"></div>
                    <span className="font-black text-xl bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-fuchsia-400 animate-pulse">
                        DC
                    </span>
                </div>
            </div>

            {/* Typography */}
            <div className="mt-12 text-center relative z-10">
                <h1 className="text-2xl font-bold text-white tracking-widest uppercase mb-2 drop-shadow-md">DYPU Connect</h1>
                <div className="flex items-center gap-1.5 justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.3s]"></span>
                </div>
                <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mt-4 font-medium">Initializing encrypted session</p>
            </div>
        </div>
    );
}
