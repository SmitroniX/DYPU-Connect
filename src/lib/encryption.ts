// ---------------------------------------------------------------------------
// Client-side AES-256-GCM encryption for Google Drive uploads
// Uses Web Crypto API (SubtleCrypto) — available in all modern browsers
// ---------------------------------------------------------------------------

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* ── Helpers ── */

function hexEncode(buffer: Uint8Array): string {
    return Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexDecode(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/* ── Salt Generation ── */

export function generateEncryptionSalt(): string {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    return hexEncode(salt);
}

/* ── Key Derivation (PBKDF2 → AES-256-GCM) ── */

export async function deriveEncryptionKey(uid: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(uid),
        'PBKDF2',
        false,
        ['deriveKey'],
    );

    const saltBytes = hexDecode(salt);
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes.buffer as ArrayBuffer,
            iterations: 100_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/* ── File Encryption ── */

export interface EncryptedFileResult {
    encryptedBlob: Blob;
    iv: string; // hex-encoded 12-byte IV
}

export async function encryptFile(file: File, key: CryptoKey): Promise<EncryptedFileResult> {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    const plainData = await file.arrayBuffer();
    const cipherData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        plainData,
    );

    return {
        encryptedBlob: new Blob([cipherData], { type: 'application/octet-stream' }),
        iv: hexEncode(iv),
    };
}

/* ── File Decryption ── */

export async function decryptBlob(
    encryptedData: ArrayBuffer,
    iv: string,
    key: CryptoKey,
    mimeType = 'image/jpeg',
): Promise<Blob> {
    const ivBytes = hexDecode(iv);
    const plainData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes as BufferSource },
        key,
        encryptedData,
    );
    return new Blob([plainData], { type: mimeType });
}

/* ── Firestore salt management ── */

export async function getOrCreateEncryptionSalt(uid: string): Promise<string> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        const existing = snap.data().encryptionSalt;
        if (typeof existing === 'string' && existing.length >= 16) {
            return existing;
        }
    }

    const salt = generateEncryptionSalt();
    await updateDoc(userRef, { encryptionSalt: salt });
    return salt;
}

/* ── Encrypted image cache (in-memory blob URLs) ── */

const blobUrlCache = new Map<string, string>();

export function getCachedBlobUrl(fileId: string): string | undefined {
    return blobUrlCache.get(fileId);
}

export function setCachedBlobUrl(fileId: string, url: string): void {
    blobUrlCache.set(fileId, url);
}

export function clearBlobUrlCache(): void {
    blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
    blobUrlCache.clear();
}

