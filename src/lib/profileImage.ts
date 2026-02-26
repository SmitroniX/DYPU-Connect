const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;

function buildAvatarFromSeed(seed: string): string {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&radius=50&size=256`;
}

export function resolveProfileImage(source: string | undefined, email: string | null | undefined, name: string): string {
    const rawSource = (source ?? '').trim();

    if (rawSource.length > 0) {
        if (EMAIL_PATTERN.test(rawSource)) {
            return buildAvatarFromSeed(rawSource.toLowerCase());
        }

        if (HTTP_URL_PATTERN.test(rawSource)) {
            return rawSource;
        }

        return buildAvatarFromSeed(rawSource.toLowerCase());
    }

    const fallbackSeed = (email ?? name).trim().toLowerCase();
    return buildAvatarFromSeed(fallbackSeed || 'dypu-user');
}
