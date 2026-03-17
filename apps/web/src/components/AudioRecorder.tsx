'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '@/store/useStore';
import { isGoogleDriveConfigured, requestGoogleDriveAccessToken, uploadAudioToGoogleDrive } from '@/lib/googleDrive';

interface AudioRecorderProps {
    onAudioUploaded: (audioUrl: string) => void;
    disabled?: boolean;
}

export default function AudioRecorder({ onAudioUploaded, disabled }: AudioRecorderProps) {
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
                setIsProcessing(true);

                try {
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const audioFile = new File([audioBlob], `VoiceNote_${Date.now()}.webm`, { type: 'audio/webm' });

                    let accessToken: string;
                    if (driveAccessToken) {
                        accessToken = driveAccessToken;
                    } else {
                        // Check if userProfile has a stored access token, otherwise request a new one
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

    if (isProcessing) {
        return (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] rounded-full animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[11px] font-medium leading-none">Processing...</span>
            </div>
        );
    }

    if (isRecording) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-full">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-red-500/30 ring-2 ring-red-500/20" />
                <span className="text-xs font-medium tabular-nums w-10 relative top-[1px]">{formatTime(recordingTime)}</span>
                <button
                    type="button"
                    onClick={stopRecording}
                    className="p-1 rounded-full hover:bg-red-500/20 transition-colors ml-1"
                >
                    <Square className="w-3.5 h-3.5 fill-current" />
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            className="p-2 rounded-full text-[var(--ui-text-muted)] hover:text-[#ec4899] hover:bg-[#ec4899]/10 transition-all hover:scale-105 disabled:opacity-50"
            disabled={disabled}
            onClick={startRecording}
            title="Record Voice Note"
        >
            <Mic className="w-5 h-5" />
        </button>
    );
}
