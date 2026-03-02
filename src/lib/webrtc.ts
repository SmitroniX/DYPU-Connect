// WebRTC + Firestore signaling for voice/video calls and screen sharing
// Uses native browser RTCPeerConnection + public STUN servers

import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    collection,
    addDoc,
    deleteDoc,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export interface CallData {
    callerId: string;
    calleeId: string;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    status: 'ringing' | 'active' | 'ended';
    type: 'audio' | 'video';
    createdAt: number;
}

export interface CallSession {
    pc: RTCPeerConnection;
    localStream: MediaStream;
    remoteStream: MediaStream;
    callId: string;
    unsubscribes: Unsubscribe[];
}

/* ── Create a call (caller side) ── */

export async function createCall(
    chatId: string,
    callerUid: string,
    calleeUid: string,
    callType: 'audio' | 'video',
): Promise<CallSession> {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const remoteStream = new MediaStream();

    // Get local media
    const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
    });

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };

    // Create call document
    const callId = `${chatId}_${Date.now()}`;
    const callRef = doc(db, 'calls', callId);
    const candidatesRef = collection(db, 'calls', callId, 'callerCandidates');

    // Collect ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            addDoc(candidatesRef, event.candidate.toJSON());
        }
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(callRef, {
        callerId: callerUid,
        calleeId: calleeUid,
        offer: { type: offer.type, sdp: offer.sdp },
        status: 'ringing',
        type: callType,
        createdAt: Date.now(),
    } satisfies CallData);

    // Listen for answer
    const unsubAnswer = onSnapshot(callRef, (snapshot) => {
        const data = snapshot.data() as CallData | undefined;
        if (data?.answer && !pc.currentRemoteDescription) {
            pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    });

    // Listen for callee ICE candidates
    const calleeCandidatesRef = collection(db, 'calls', callId, 'calleeCandidates');
    const unsubCalleeCandidates = onSnapshot(calleeCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            }
        });
    });

    return {
        pc,
        localStream,
        remoteStream,
        callId,
        unsubscribes: [unsubAnswer, unsubCalleeCandidates],
    };
}

/* ── Answer a call (callee side) ── */

export async function answerCall(
    callId: string,
    callType: 'audio' | 'video',
): Promise<CallSession> {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const remoteStream = new MediaStream();

    const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
    });

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };

    const callRef = doc(db, 'calls', callId);
    const calleeCandidatesRef = collection(db, 'calls', callId, 'calleeCandidates');

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            addDoc(calleeCandidatesRef, event.candidate.toJSON());
        }
    };

    // Read offer
    const callSnap = await getDoc(callRef);
    const callData = callSnap.data() as CallData;
    if (!callData?.offer) throw new Error('No offer found for this call.');

    await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await updateDoc(callRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'active',
    });

    // Listen for caller ICE candidates
    const callerCandidatesRef = collection(db, 'calls', callId, 'callerCandidates');
    const unsubCallerCandidates = onSnapshot(callerCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            }
        });
    });

    return {
        pc,
        localStream,
        remoteStream,
        callId,
        unsubscribes: [unsubCallerCandidates],
    };
}

/* ── End a call ── */

export async function endCall(session: CallSession): Promise<void> {
    session.unsubscribes.forEach((unsub) => unsub());
    session.localStream.getTracks().forEach((track) => track.stop());
    session.pc.close();
    try {
        await updateDoc(doc(db, 'calls', session.callId), { status: 'ended' });
    } catch {
        // Call doc may already be deleted
    }
}

/* ── Toggle screen sharing ── */

export async function toggleScreenShare(
    session: CallSession,
    sharing: boolean,
): Promise<MediaStream | null> {
    const senders = session.pc.getSenders();
    const videoSender = senders.find((s) => s.track?.kind === 'video');

    if (sharing) {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            if (videoSender) {
                await videoSender.replaceTrack(screenTrack);
            }

            screenTrack.onended = () => {
                // Revert to camera when user stops sharing
                const camTrack = session.localStream.getVideoTracks()[0];
                if (camTrack && videoSender) {
                    videoSender.replaceTrack(camTrack);
                }
            };

            return screenStream;
        } catch {
            return null; // User cancelled screen share picker
        }
    } else {
        // Revert to camera
        const camTrack = session.localStream.getVideoTracks()[0];
        if (camTrack && videoSender) {
            await videoSender.replaceTrack(camTrack);
        }
        return null;
    }
}

/* ── Listen for incoming calls ── */

export function listenForIncomingCalls(
    chatId: string,
    myUid: string,
    onIncoming: (callId: string, callData: CallData) => void,
): Unsubscribe {
    // Listen on the calls collection for calls where I'm the callee
    // We filter by chatId prefix since callId = `${chatId}_${timestamp}`
    const callsRef = collection(db, 'calls');

    return onSnapshot(callsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const data = change.doc.data() as CallData;
                if (
                    data.calleeId === myUid &&
                    data.status === 'ringing' &&
                    change.doc.id.startsWith(chatId)
                ) {
                    onIncoming(change.doc.id, data);
                }
            }
        });
    });
}

/* ── Clean up old call docs ── */

export async function cleanupCall(callId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'calls', callId));
    } catch {
        // Ignore cleanup failures
    }
}

