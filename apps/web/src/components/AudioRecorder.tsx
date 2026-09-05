'use client';

import { useState, useRef, useEffect, useCallback, ReactElement } from 'react';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '@/store/useStore';
import { isGoogleDriveConfigured, requestGoogleDriveAccessToken, uploadAudioToGoogleDrive } from '@/lib/googleDrive';
import { motion } from 'framer-motion';

interface AudioRecorderProps {
    onAudioUploaded: (audioUrl: string) => void;
    disabled?: boolean;
    trigger?: ReactElement<Record<string, unknown>>;
}

export default function AudioRecorder({ onAudioUploaded, disabled, trigger }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { userProfile, driveAccessToken } = useStore();

    const startRecording = useCallback(async () => {
        if (!isGoogleDriveConfigured() || !userProfile?.googleDrive) {
            toast.error('Connect Google Drive in Settings to send Voice Notes.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                clearInterval(timerRef.current!);
                setIsRecording(false);
                
                // If we have no data, don't process
                if (chunksRef.current.length === 0) {
                    setIsProcessing(false);
                    return;
                }

                setIsProcessing(true);

                try {
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const audioFile = new File([audioBlob], `VoiceNote_${Date.now()}.webm`, { type: 'audio/webm' });

                    let accessToken: string;
                    if (driveAccessToken) {
                        accessToken = driveAccessToken;
                    } else {
                        if (userProfile?.googleDrive?.accessToken) {
                            accessToken = userProfile.googleDrive.accessToken;
                        } else {
                            try { accessToken = await requestGoogleDriveAccessToken(''); }
                            catch { accessToken = await requestGoogleDriveAccessToken('consent'); }
                        }
                    }

                    const result = await uploadAudioToGoogleDrive({
                        accessToken,
                        file: audioFile,
                        folderId: userProfile?.googleDrive?.folderId || '',
                    });

                    onAudioUploaded(result.audioUrl);
                    toast.success('Voice note ready');
                } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to upload Voice Note.');
                } finally {
                    setIsProcessing(false);
                    setRecordingTime(0);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            toast.error('Microphone access denied or unavailable.');
            console.error(error);
        }
    }, [userProfile, driveAccessToken, onAudioUploaded]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const cancelRecording = useCallback(() => {
        chunksRef.current = [];
        stopRecording();
        toast.error('Recording cancelled');
    }, [stopRecording]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const defaultTrigger = (
        <button
            type="button"
            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all hover:scale-105 disabled:opacity-50"
            disabled={disabled}
            onClick={startRecording}
            title="Record Voice Note"
        >
            <Mic className="w-5 h-5" />
        </button>
    );

    const handleCustomTrigger = (e: React.MouseEvent) => {
        (trigger?.props as { onClick?: (e: React.MouseEvent) => void })?.onClick?.(e);
        if (!disabled) void startRecording();
    };

    const triggerElement = trigger ? (
        <div onClick={handleCustomTrigger} className="inline-flex cursor-pointer">
            {trigger}
        </div>
    ) : defaultTrigger;

    if (isProcessing) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] rounded-2xl animate-pulse border border-[var(--ui-accent)]/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Uploading</span>
            </div>
        );
    }

    if (isRecording) {
        return (
            <motion.div 
                initial={{ width: 40, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                className="flex items-center gap-3 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20"
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold tabular-nums min-w-[36px]">{formatTime(recordingTime)}</span>
                </div>
                
                <div className="h-4 w-[1px] bg-red-500/20 mx-1" />
                
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={cancelRecording}
                        className="p-1 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Cancel"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={stopRecording}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20"
                        title="Finish & Send"
                    >
                        <Square className="w-3 h-3 fill-current" />
                    </button>
                </div>
            </motion.div>
        );
    }

    return triggerElement;
}
