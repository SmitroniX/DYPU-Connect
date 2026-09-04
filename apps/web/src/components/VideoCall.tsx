'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    type CallSession,
    type CallData,
    createCall,
    answerCall,
    endCall,
    toggleScreenShare,
    listenForIncomingCalls,
} from '@/lib/webrtc';
import {
    Phone,
    PhoneOff,
    Video,
    VideoOff,
    Mic,
    MicOff,
    Monitor,
    MonitorOff,
    X,
    Maximize2,
    PictureInPicture2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VideoCallProps {
    chatId: string;
    myUid: string;
    otherUserId: string;
    otherUserName: string;
}

type CallState = 'idle' | 'calling' | 'ringing' | 'active';

export default function VideoCall({ chatId, myUid, otherUserId, otherUserName }: VideoCallProps) {
    const [callState, setCallState] = useState<CallState>('idle');
    const [callType, setCallType] = useState<'audio' | 'video'>('video');
    const [session, setSession] = useState<CallSession | null>(null);
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [screenSharing, setScreenSharing] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [incomingCall, setIncomingCall] = useState<{ callId: string; data: CallData } | null>(null);
    const [pip, setPip] = useState(false);
    const [callSummary, setCallSummary] = useState<{ duration: number; type: 'audio' | 'video' } | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Listen for incoming calls
    useEffect(() => {
        const unsub = listenForIncomingCalls(chatId, myUid, (callId, data) => {
            setIncomingCall({ callId, data });
            toast(`📞 Incoming ${data.type} call from ${otherUserName}`, { 
                icon: '📞',
                duration: 10000,
                style: {
                    borderRadius: '16px',
                    background: '#18181b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)'
                }
            });
        });
        return () => unsub();
    }, [chatId, myUid, otherUserName]);

    const handleEndCall = useCallback(async () => {
        if (session) {
            await endCall(session);
            setSession(null);
        }
        if (callState === 'active') {
            setCallSummary({ duration: elapsed, type: callType });
            setTimeout(() => setCallSummary(null), 3000);
        }
        if (document.pictureInPictureElement) {
            try { await document.exitPictureInPicture(); } catch {}
        }
        setCallState('idle');
        setMuted(false);
        setCameraOff(false);
        setScreenSharing(false);
        setElapsed(0);
        setPip(false);
    }, [session, callState, elapsed, callType]);

    // Attach streams to video elements
    useEffect(() => {
        if (!session) return;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = session.localStream;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = session.remoteStream;
        }

        const handleConnectionChange = () => {
            if (session.pc.connectionState === 'connected') {
                setCallState('active');
            } else if (['disconnected', 'failed', 'closed'].includes(session.pc.connectionState)) {
                handleEndCall();
            }
        };
        session.pc.addEventListener('connectionstatechange', handleConnectionChange);
        return () => {
            session.pc.removeEventListener('connectionstatechange', handleConnectionChange);
        };
    }, [session, handleEndCall]);

    // Elapsed timer
    useEffect(() => {
        if (callState === 'active') {
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [callState]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const startCall = async (type: 'audio' | 'video') => {
        try {
            setCallType(type);
            setCallState('calling');
            const sess = await createCall(chatId, myUid, otherUserId, type);
            setSession(sess);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to start call.');
            setCallState('idle');
        }
    };

    const acceptIncomingCall = async () => {
        if (!incomingCall) return;
        try {
            setCallType(incomingCall.data.type);
            setCallState('active');
            const sess = await answerCall(incomingCall.callId, incomingCall.data.type);
            setSession(sess);
            setIncomingCall(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to answer call.');
            setCallState('idle');
            setIncomingCall(null);
        }
    };

    const rejectIncomingCall = async () => {
        if (incomingCall) {
            try {
                await updateDoc(doc(db, 'calls', incomingCall.callId), { status: 'ended' });
            } catch {
                // Ignore if call doc already deleted
            }
        }
        setIncomingCall(null);
    };

    const toggleMute = () => {
        if (!session) return;
        const audioTracks = session.localStream.getAudioTracks();
        audioTracks.forEach((track) => { track.enabled = muted; });
        setMuted(!muted);
    };

    const toggleCamera = () => {
        if (!session) return;
        const videoTracks = session.localStream.getVideoTracks();
        videoTracks.forEach((track) => { track.enabled = cameraOff; });
        setCameraOff(!cameraOff);
    };

    const handleScreenShare = async () => {
        if (!session) return;
        const result = await toggleScreenShare(session, !screenSharing);
        setScreenSharing(result !== null);
    };

    const togglePip = async () => {
        if (!remoteVideoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setPip(false);
            } else {
                await remoteVideoRef.current.requestPictureInPicture();
                setPip(true);
            }
        } catch {
            toast.error('Picture-in-Picture not supported');
        }
    };

    return (
        <>
            <CallButtons onStartCall={startCall} disabled={callState !== 'idle'} />

            <AnimatePresence>
                {incomingCall && callState === 'idle' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
                    >
                        <div className="bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-3xl p-8 w-80 text-center space-y-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 animate-pulse" />
                            
                            <div className="relative">
                                <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto animate-bounce">
                                    <Phone className="h-10 w-10 text-emerald-500 fill-emerald-500/20" />
                                </div>
                                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl -z-10 rounded-full" />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-white">Incoming {incomingCall.data.type}</h3>
                                <p className="text-[var(--ui-text-secondary)] font-medium">{otherUserName}</p>
                            </div>

                            <div className="flex gap-4 justify-center pt-4">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={acceptIncomingCall}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
                                >
                                    <Phone className="h-4 w-4 fill-white/20" /> Accept
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={rejectIncomingCall}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[var(--ui-bg-elevated)] py-4 text-sm font-bold text-white border border-[var(--ui-border)] hover:bg-zinc-700 transition-colors"
                                >
                                    <X className="h-4 w-4" /> Decline
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {callSummary && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1">
                            {callSummary.type === 'video' ? <Video className="w-5 h-5 text-emerald-500" /> : <Phone className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <h3 className="text-white font-bold text-lg">Call ended</h3>
                        <p className="text-[var(--ui-text-muted)] text-sm font-medium">
                            Duration: {formatTime(callSummary.duration)}
                        </p>
                    </motion.div>
                )}

                {callState !== 'idle' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[#09090b] flex flex-col overflow-hidden"
                    >
                        {/* Status Bar */}
                        <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between px-8 py-6 bg-gradient-to-b from-black/60 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-[var(--ui-bg-hover)] backdrop-blur-xl border border-[var(--ui-border)] flex items-center justify-center overflow-hidden">
                                    <img 
                                        src={`https://ui-avatars.com/api/?name=${otherUserName}&background=random`} 
                                        alt={otherUserName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">{otherUserName}</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-sm font-medium text-emerald-500/90">
                                            {callState === 'calling' ? 'Connecting...' : formatTime(elapsed)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1.5 rounded-full bg-[var(--ui-bg-hover)] border border-[var(--ui-border)] backdrop-blur-md text-[10px] font-bold text-white/60 uppercase tracking-widest">
                                    Encrypted
                                </div>
                            </div>
                        </div>

                        {/* Main Stage */}
                        <div className="flex-1 relative bg-black flex items-center justify-center">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover opacity-80"
                            />

                            {callState === 'calling' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8 bg-[var(--ui-bg-base)] backdrop-blur-sm">
                                    <div className="relative">
                                        <div className="h-32 w-32 rounded-full border border-[var(--ui-border)] flex items-center justify-center animate-[ping_3s_infinite] opacity-20" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-24 w-24 rounded-full bg-[var(--ui-accent)]/10 flex items-center justify-center border border-[var(--ui-accent)]/20 animate-pulse">
                                                <Phone className="h-10 w-10 text-[var(--ui-accent)]" />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xl font-medium text-white/80 tracking-wide">Calling {otherUserName}...</p>
                                </div>
                            )}

                            {/* PiP Window */}
                            <motion.div 
                                drag
                                dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
                                className="absolute bottom-32 right-8 w-40 sm:w-64 aspect-video rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] bg-[var(--ui-bg-surface)] group"
                            >
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                {cameraOff && (
                                    <div className="absolute inset-0 bg-[var(--ui-bg-surface)] flex flex-col items-center justify-center gap-2">
                                        <VideoOff className="h-8 w-8 text-white/20" />
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Camera Off</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="p-1.5 rounded-lg bg-black/40 backdrop-blur-md">
                                        <Maximize2 className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Control Bar */}
                        <div className="h-32 flex items-center justify-center relative z-20">
                            <div className="flex items-center gap-3 sm:gap-6 px-6 py-4 sm:px-10 sm:py-5 bg-[var(--ui-bg-surface)] backdrop-blur-2xl border border-[var(--ui-border)] rounded-[40px] shadow-2xl">
                                <ControlBtn 
                                    active={!muted} 
                                    onClick={toggleMute} 
                                    icon={muted ? MicOff : Mic} 
                                    danger={muted}
                                    label={muted ? 'Unmute' : 'Mute'}
                                />
                                
                                {callType === 'video' && (
                                    <ControlBtn 
                                        active={!cameraOff} 
                                        onClick={toggleCamera} 
                                        icon={cameraOff ? VideoOff : Video} 
                                        danger={cameraOff}
                                        label={cameraOff ? 'Start Video' : 'Stop Video'}
                                    />
                                )}

                                <ControlBtn 
                                    active={screenSharing} 
                                    onClick={handleScreenShare} 
                                    icon={screenSharing ? MonitorOff : Monitor}
                                    accent={screenSharing}
                                    label={screenSharing ? 'Stop Sharing' : 'Share Screen'}
                                />

                                {callType === 'video' && (
                                    <ControlBtn 
                                        active={pip} 
                                        onClick={togglePip} 
                                        icon={PictureInPicture2}
                                        accent={pip}
                                        label={pip ? 'Exit PiP' : 'Enter PiP'}
                                    />
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: -90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleEndCall}
                                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20 hover:bg-red-400 transition-colors"
                                    title="End Call"
                                >
                                    <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6 fill-white/10" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

interface ControlBtnProps {
    active: boolean;
    onClick: () => void;
    icon: any;
    danger?: boolean;
    accent?: boolean;
    label: string;
}

function ControlBtn({ active, onClick, icon: Icon, danger, accent, label }: ControlBtnProps) {
    return (
        <div className="flex flex-col items-center gap-2">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClick}
                className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                    danger 
                        ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                        : accent && active
                            ? 'bg-[var(--ui-accent)] border-[var(--ui-accent)] text-[var(--ui-accent-text)] shadow-lg shadow-[var(--ui-accent)]/20'
                            : active 
                                ? 'bg-[var(--ui-bg-hover)] border-[var(--ui-border)] text-white hover:bg-[var(--ui-bg-active)]' 
                                : 'bg-[var(--ui-bg-hover)] border-[var(--ui-border)] text-white/40'
                }`}
                title={label}
            >
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${active && !danger && !accent ? 'fill-white/10' : ''}`} />
            </motion.button>
        </div>
    );
}

function CallButtons({ onStartCall, disabled }: { onStartCall: (type: 'audio' | 'video') => void; disabled: boolean }) {
    return (
        <div className="flex items-center gap-1.5 bg-[var(--ui-bg-hover)] p-1 rounded-xl border border-[var(--ui-border)]">
            <button
                onClick={() => onStartCall('audio')}
                disabled={disabled}
                className="p-2 rounded-lg text-[var(--ui-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 transition-all duration-300"
                title="Voice Call"
            >
                <Phone className="h-4.5 w-4.5" />
            </button>
            <button
                onClick={() => onStartCall('video')}
                disabled={disabled}
                className="p-2 rounded-lg text-[var(--ui-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 disabled:opacity-30 transition-all duration-300"
                title="Video Call"
            >
                <Video className="h-4.5 w-4.5" />
            </button>
        </div>
    );
}
