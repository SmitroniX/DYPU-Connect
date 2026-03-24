'use client';

import { Suspense, lazy, useRef } from 'react';
import { Image as ImageIcon, Smile, Gift, Mic, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GiphyGif } from '@/lib/giphy';
import { ChatInputFeatures } from './types';
import Image from 'next/image';

const EmojiPicker = lazy(() => import('@/components/EmojiPicker'));
const GiphyPicker = lazy(() => import('@/components/GiphyPicker'));
const AudioRecorder = lazy(() => import('@/components/AudioRecorder'));

interface InputActionsProps {
    features: Required<ChatInputFeatures>;
    uploading: boolean;
    sending: boolean;
    disabled: boolean;
    onEmojiSelect: (emoji: string) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGifSelect: (gif: GiphyGif) => void;
    onAudioUploaded: (url: string) => void;
}

export default function InputActions({
    features,
    uploading,
    sending,
    disabled,
    onEmojiSelect,
    onImageUpload,
    onGifSelect,
    onAudioUploaded,
}: InputActionsProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner group/actions transition-all duration-500 hover:bg-white/10 hover:border-white/20">
            {/* Logo Icon as a "Plus" or Main Action trigger */}
            <motion.div 
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl bg-[var(--ui-accent)] shadow-lg shadow-[var(--ui-accent)]/20 cursor-pointer mr-1 hidden sm:flex items-center justify-center"
            >
                <Plus className="w-4 h-4 text-[var(--ui-accent-text)]" />
            </motion.div>

            {features.emoji && (
                <Suspense fallback={null}>
                    <EmojiPicker
                        onSelect={onEmojiSelect}
                        trigger={
                            <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-yellow-400 transition-all"
                                title="Add emoji"
                            >
                                <Smile className="w-5 h-5 fill-current/10" />
                            </motion.button>
                        }
                    />
                </Suspense>
            )}
            
            {features.image && (
                <>
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading || disabled}
                        className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-blue-400 transition-all disabled:opacity-50"
                        title="Attach photo"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </motion.button>
                    <input
                        type="file"
                        accept="image/*"
                        ref={imageInputRef}
                        className="hidden"
                        onChange={onImageUpload}
                    />
                </>
            )}

            {features.gif && (
                <div className="flex items-center justify-center">
                    <Suspense fallback={null}>
                        <GiphyPicker
                            onSelect={onGifSelect}
                            disabled={disabled || uploading || sending}
                            trigger={
                                <motion.button
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-pink-400 transition-all"
                                    title="Add GIF"
                                >
                                    <Gift className="w-5 h-5" />
                                </motion.button>
                            }
                        />
                    </Suspense>
                </div>
            )}

            {features.voice && (
                <div className="flex items-center justify-center">
                    <Suspense fallback={null}>
                        <AudioRecorder
                            onAudioUploaded={onAudioUploaded}
                            disabled={disabled || uploading || sending}
                            trigger={
                                <motion.button
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 rounded-xl text-[var(--ui-text-muted)] hover:text-red-400 transition-all"
                                    title="Voice message"
                                >
                                    <Mic className="w-5 h-5" />
                                </motion.button>
                            }
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}
