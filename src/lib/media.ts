import imageCompression from 'browser-image-compression';
import { encode } from 'blurhash';

/**
 * Compresses an image file on the client side.
 * @param file The image file to compress.
 * @returns A promise that resolves to the compressed image file.
 */
export async function compressImage(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1, // Max size 1MB (though 1200px and 0.8 quality will likely be much smaller)
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        initialQuality: 0.8,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        // Ensure it's still a File object (imageCompression can return Blob)
        return new File([compressedFile], file.name, {
            type: compressedFile.type,
            lastModified: Date.now(),
        });
    } catch (error) {
        console.error('Image compression failed:', error);
        return file; // Return original file as fallback
    }
}

/**
 * Generates a BlurHash string for an image file.
 * @param file The image file to generate a BlurHash for.
 * @returns A promise that resolves to the BlurHash string.
 */
export async function generateBlurHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const width = 32;
                const height = 32;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const hash = encode(imageData.data, imageData.width, imageData.height, 4, 4);
                resolve(hash);
            };
            img.onerror = () => reject(new Error('Failed to load image for BlurHash generation'));
            img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file for BlurHash generation'));
        reader.readAsDataURL(file);
    });
}
