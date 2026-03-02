'use client';

import { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

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

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Listen for incoming calls
    useEffect(() => {
        const unsub = listenForIncomingCalls(chatId, myUid, (callId, data) => {
            setIncomingCall({ callId, data });
            toast(`📞 Incoming ${data.type} call from ${otherUserName}`, { duration: 10000 });
        });
        return () => unsub();
    }, [chatId, myUid, otherUserName]);

    // Attach streams to video elements
    useEffect(() => {
        if (!session) return;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = session.localStream;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = session.remoteStream;
        }

        // Monitor connection state
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

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

    const rejectIncomingCall = () => {
        setIncomingCall(null);
    };

    const handleEndCall = async () => {
        if (session) {
            await endCall(session);
            setSession(null);
        }
        setCallState('idle');
        setMuted(false);
        setCameraOff(false);
        setScreenSharing(false);
        setElapsed(0);
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

    // Incoming call toast banner
    if (incomingCall && callState === 'idle') {
        return (
            <>
                {/* Inline call buttons in header area */}
                <CallButtons onStartCall={startCall} disabled={false} />

                {/* Incoming call overlay */}
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[fade-in-up_0.2s_ease-out]">
                    <div className="bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] rounded-2xl p-6 w-80 text-center space-y-4 shadow-2xl">
                        <div className="h-16 w-16 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center mx-auto animate-pulse">
                            <Phone className="h-8 w-8 text-[var(--ui-accent)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--ui-text)]">Incoming {incomingCall.data.type} call</h3>
                        <p className="text-sm text-[var(--ui-text-muted)]">{otherUserName}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={acceptIncomingCall}
                                className="flex items-center gap-2 rounded-full bg-[var(--ui-success)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
                            >
                                <Phone className="h-4 w-4" /> Accept
                            </button>
                            <button
                                onClick={rejectIncomingCall}
                                className="flex items-center gap-2 rounded-full bg-[var(--ui-danger)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
                            >
                                <PhoneOff className="h-4 w-4" /> Decline
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Active / calling state — full overlay
    if (callState !== 'idle') {
        return (
            <>
                <CallButtons onStartCall={startCall} disabled={true} />

                <div className="fixed inset-0 z-50 bg-[#0a0a0b] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">{otherUserName}</h2>
                            <p className="text-sm text-[var(--ui-text-muted)]">
                                {callState === 'calling' ? 'Calling...' : callState === 'ringing' ? 'Ringing...' : formatTime(elapsed)}
                            </p>
                        </div>
                        <span className="text-xs text-[var(--ui-text-muted)] uppercase tracking-wider">
                            {callType} call
                        </span>
                    </div>

                    {/* Video area */}
                    <div className="flex-1 relative flex items-center justify-center">
                        {/* Remote video (full) */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {callState === 'calling' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <div className="h-20 w-20 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center mx-auto animate-pulse">
                                        <Phone className="h-10 w-10 text-[var(--ui-accent)]" />
                                    </div>
                                    <p className="text-lg text-white animate-pulse">Calling {otherUserName}...</p>
                                </div>
                            </div>
                        )}

                        {/* Local video (PiP) */}
                        <div className="absolute bottom-4 right-4 w-32 sm:w-48 aspect-video rounded-xl overflow-hidden ring-2 ring-white/20 shadow-2xl">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            {cameraOff && (
                                <div className="absolute inset-0 bg-[var(--ui-bg-elevated)] flex items-center justify-center">
                                    <VideoOff className="h-6 w-6 text-[var(--ui-text-muted)]" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 py-6 px-4 bg-[var(--ui-bg-surface)]/50 backdrop-blur-lg">
                        <button
                            onClick={toggleMute}
                            className={`p-3.5 rounded-full transition-colors ${muted ? 'bg-[var(--ui-danger)] text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text)]'}`}
                            title={muted ? 'Unmute' : 'Mute'}
                        >
                            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </button>

                        {callType === 'video' && (
                            <button
                                onClick={toggleCamera}
                                className={`p-3.5 rounded-full transition-colors ${cameraOff ? 'bg-[var(--ui-danger)] text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text)]'}`}
                                title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                            >
                                {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                            </button>
                        )}

                        <button
                            onClick={handleScreenShare}
                            className={`p-3.5 rounded-full transition-colors ${screenSharing ? 'bg-[var(--ui-accent)] text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text)]'}`}
                            title={screenSharing ? 'Stop sharing' : 'Share screen'}
                        >
                            {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                        </button>

                        <button
                            onClick={handleEndCall}
                            className="p-3.5 rounded-full bg-[var(--ui-danger)] text-white hover:opacity-90 transition-opacity"
                            title="End call"
                        >
                            <PhoneOff className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // Idle — just show inline call buttons
    return <CallButtons onStartCall={startCall} disabled={false} />;
}

/* ── Inline header call buttons ── */

function CallButtons({ onStartCall, disabled }: { onStartCall: (type: 'audio' | 'video') => void; disabled: boolean }) {
    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => onStartCall('audio')}
                disabled={disabled}
                className="p-2 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] disabled:opacity-30 transition-colors"
                title="Voice call"
            >
                <Phone className="h-4 w-4" />
            </button>
            <button
                onClick={() => onStartCall('video')}
                disabled={disabled}
                className="p-2 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] disabled:opacity-30 transition-colors"
                title="Video call"
            >
                <Video className="h-4 w-4" />
            </button>
            <button
                disabled={disabled}
                onClick={() => onStartCall('video')}
                className="p-2 rounded-lg text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-hover)] disabled:opacity-30 transition-colors"
                title="Share screen"
            >
                <Monitor className="h-4 w-4" />
            </button>
        </div>
    );
}

