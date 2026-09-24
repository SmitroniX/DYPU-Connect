'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pipette, Sparkles } from 'lucide-react';
import { useAccentColor } from './ThemeProvider';
import { useStore } from '@/store/useStore';
import { useAuth } from './AuthProvider';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function AccentColorPicker() {
    const { accentColor, setAccentColor, presets } = useAccentColor();
    const { user } = useAuth();
    const { userProfile, setUserProfile } = useStore();
    const [customColor, setCustomColor] = useState(accentColor);

    const handleSelectColor = async (color: string) => {
        setAccentColor(color);
        setCustomColor(color);

        if (user?.uid) {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    accentColor: color,
                });
                if (userProfile) {
                    setUserProfile({ ...userProfile, accentColor: color });
                }
            } catch (err) {
                console.error('Failed to sync accent color to profile:', err);
            }
        }
        toast.success('Accent color updated');
    };

    const isPreset = presets.some(p => p.value.toLowerCase() === accentColor.toLowerCase());

    return (
        <div className="space-y-4">
            {/* Color Swatches Grid */}
            <div className="flex flex-wrap items-center gap-3">
                {presets.map((preset) => {
                    const isSelected = accentColor.toLowerCase() === preset.value.toLowerCase();
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectColor(preset.value)}
                            title={preset.name}
                            className="relative group p-1 rounded-full transition-transform active:scale-95 focus:outline-none"
                            aria-label={`Select ${preset.name}`}
                        >
                            <span
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md transition-all group-hover:scale-110"
                                style={{ backgroundColor: preset.value }}
                            >
                                {isSelected && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    >
                                        <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={3} />
                                    </motion.span>
                                )}
                            </span>
                            <span className="sr-only">{preset.name}</span>
                        </button>
                    );
                })}

                {/* Custom Color Pipette */}
                <label
                    title="Choose custom color"
                    className="relative cursor-pointer group p-1 rounded-full transition-transform active:scale-95 flex items-center justify-center"
                >
                    <input
                        type="color"
                        value={customColor}
                        onChange={(e) => handleSelectColor(e.target.value)}
                        className="sr-only"
                    />
                    <span
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 border-dashed transition-all group-hover:scale-110 ${
                            !isPreset
                                ? 'border-[var(--ui-accent)] shadow-md'
                                : 'border-[var(--ui-border)] hover:border-[var(--ui-text-muted)]'
                        }`}
                        style={{ backgroundColor: !isPreset ? customColor : 'transparent' }}
                    >
                        {!isPreset ? (
                            <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={3} />
                        ) : (
                            <Pipette className="w-4 h-4 text-[var(--ui-text-muted)] group-hover:text-[var(--ui-text)]" />
                        )}
                    </span>
                </label>
            </div>

            {/* Live Interactive Component Preview */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--ui-bg-input)] border border-[var(--ui-border)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--ui-accent)]" />
                    <span className="text-xs font-semibold text-[var(--ui-text)]">Live Preview</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ui-accent-dim)] text-[var(--ui-accent)] border border-[var(--ui-accent)]/20">
                        Accent Pill
                    </span>
                    <button
                        type="button"
                        className="btn-primary !py-1.5 !px-3 !text-xs !rounded-lg"
                    >
                        Action Button
                    </button>
                </div>
            </div>
        </div>
    );
}
