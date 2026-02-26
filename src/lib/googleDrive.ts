const GSI_CLIENT_SCRIPT = 'https://accounts.google.com/gsi/client';
const DRIVE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.file email profile openid';

interface GoogleTokenResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
}

interface GoogleTokenClient {
    requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GoogleAccountsOauth2 {
    initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: () => void;
    }) => GoogleTokenClient;
}

interface GoogleAccounts {
    oauth2: GoogleAccountsOauth2;
}

interface GoogleGlobal {
    accounts: GoogleAccounts;
}

declare global {
    interface Window {
        google?: GoogleGlobal;
    }
}

export interface GoogleDriveUploadResult {
    fileId: string;
    fileName: string;
    viewUrl: string;
    directImageUrl: string;
}

interface GoogleDriveUploadResponse {
    id?: string;
    name?: string;
    webViewLink?: string;
}

interface GoogleUserInfoResponse {
    email?: string;
}

function getGoogleClientId(): string {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
}

export function isGoogleDriveConfigured(): boolean {
    return getGoogleClientId().length > 0;
}

function buildDriveDirectImageUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
}

export function extractGoogleDriveFolderId(input: string): string | undefined {
    const trimmed = input.trim();
    if (!trimmed) return undefined;

    try {
        const url = new URL(trimmed);
        const folderFromPath = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1];
        if (folderFromPath) {
            return folderFromPath;
        }

        const idFromQuery = url.searchParams.get('id');
        if (idFromQuery && /^[a-zA-Z0-9_-]{10,}$/.test(idFromQuery)) {
            return idFromQuery;
        }
    } catch {
        // Ignore URL parsing errors. Raw folder ID is handled below.
    }

    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
        return trimmed;
    }

    return undefined;
}

let scriptLoadPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Google Drive integration is only available in the browser.'));
    }

    if (window.google?.accounts?.oauth2) {
        return Promise.resolve();
    }

    if (scriptLoadPromise) {
        return scriptLoadPromise;
    }

    scriptLoadPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_CLIENT_SCRIPT}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity script.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = GSI_CLIENT_SCRIPT;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity script.'));
        document.head.appendChild(script);
    });

    return scriptLoadPromise;
}

export async function requestGoogleDriveAccessToken(prompt: 'consent' | '' = 'consent'): Promise<string> {
    const clientId = getGoogleClientId();
    if (!clientId) {
        throw new Error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
    }

    await loadGoogleIdentityScript();

    return new Promise<string>((resolve, reject) => {
        const googleApi = window.google;
        if (!googleApi?.accounts?.oauth2) {
            reject(new Error('Google Identity API is unavailable.'));
            return;
        }

        const tokenClient = googleApi.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: DRIVE_OAUTH_SCOPE,
            callback: (response) => {
                if (response.error) {
                    reject(new Error(response.error_description || response.error));
                    return;
                }

                if (!response.access_token) {
                    reject(new Error('Google did not return an access token.'));
                    return;
                }

                resolve(response.access_token);
            },
            error_callback: () => reject(new Error('Google sign-in failed.')),
        });

        tokenClient.requestAccessToken({ prompt });
    });
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to read Google account details.');
    }

    const payload = (await response.json()) as GoogleUserInfoResponse;
    const email = payload.email?.trim();
    if (!email) {
        throw new Error('Google account email is unavailable.');
    }

    return email;
}

export async function uploadImageToGoogleDrive(options: {
    accessToken: string;
    file: File;
    folderId?: string;
}): Promise<GoogleDriveUploadResult> {
    const { accessToken, file, folderId } = options;

    const metadata: Record<string, unknown> = {
        name: file.name,
        mimeType: file.type || 'image/jpeg',
    };

    if (folderId) {
        metadata.parents = [folderId];
    }

    const boundary = `dypu-boundary-${Math.random().toString(36).slice(2, 11)}`;
    const multipartBody = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
        file,
        `\r\n--${boundary}--`,
    ]);

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
    });

    if (!uploadResponse.ok) {
        throw new Error('Google Drive upload failed.');
    }

    const payload = (await uploadResponse.json()) as GoogleDriveUploadResponse;
    const fileId = payload.id;
    if (!fileId) {
        throw new Error('Google Drive upload completed without a file ID.');
    }

    const permissionResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
        }),
    });

    if (!permissionResponse.ok) {
        throw new Error('Uploaded file permission update failed.');
    }

    const directImageUrl = buildDriveDirectImageUrl(fileId);
    return {
        fileId,
        fileName: payload.name || file.name,
        viewUrl: payload.webViewLink || directImageUrl,
        directImageUrl,
    };
}
