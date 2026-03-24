import { Message } from '@/lib/validation/schemas';

export interface ChatInputPayload {
    text: string;
    gifUrl?: string;
    imageUrl?: string;
    blurHash?: string;
    audioUrl?: string;
}

export interface ChatInputFeatures {
    emoji?: boolean;
    gif?: boolean;
    image?: boolean;
    markdown?: boolean;
    voice?: boolean;
}

export type { Message };
