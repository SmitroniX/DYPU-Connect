import { ref, uploadBytes, getDownloadURL, SettableMetadata } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads media (image/audio/etc) to Firebase Storage for a specific chat.
 * 
 * @param file The file to upload.
 * @param chatId The ID or generic path key representing the chat (e.g., 'public', 'group_123', or a direct message ID).
 * @param blurHash Optional BlurHash string for images.
 * @returns The public download URL of the uploaded file.
 */
export async function uploadChatMedia(file: File, chatId: string, blurHash?: string): Promise<string> {
    if (!storage) {
        throw new Error('Firebase Storage is not initialized.');
    }

    const fileExt = file.name.split('.').pop() || 'tmp';
    const timestamp = Date.now();
    // Path structure: chat-media/<chatId>/<timestamp>_<random>.<ext>
    const path = `chat-media/${chatId}/${timestamp}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    
    const storageRef = ref(storage, path);
    const metadata: SettableMetadata = blurHash ? { customMetadata: { blurHash } } : {};
    
    try {
        const snapshot = await uploadBytes(storageRef, file, metadata);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
    } catch (error) {
        console.error('Error uploading chat media:', error);
        throw new Error('Failed to upload media. Please try again.');
    }
}
