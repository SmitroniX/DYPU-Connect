'use client';

import { Suspense, lazy, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GiphyGif } from '@/lib/giphy';
import { ChatInputFeatures } from './types';

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
        <div className="flex items-center pb-1 gap-1 shrink-0">
            {features.emoji && (
                <Suspense fallback={null}>
                    <EmojiPicker
                        onSelect={onEmojiSelect}
                        trigger={
                            <motion.button
                                whileHover={{ scale: 0.98 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] transition-all text-lg leading-none"
                                title="Add emoji"
                            >
                                🙂
                            </motion.button>
                        }
                    />
                </Suspense>
            )}
            {features.image && (
                <>
                    <motion.button
                        whileHover={{ scale: 0.98, backgroundColor: 'var(--ui-accent-dim)' }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading || disabled}
                        className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-all disabled:opacity-50"
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
                <div className="flex items-center justify-center pt-0.5">
                    <Suspense fallback={null}>
                        <GiphyPicker
                            onSelect={onGifSelect}
                            disabled={disabled}
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
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}
