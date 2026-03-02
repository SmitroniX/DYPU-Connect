import type { UserProfile } from '@/types/profile';
import {
    requestGoogleDriveAccessToken,
    uploadFileToDrive,
    listDriveFiles,
    downloadDriveFileContent,
    type GoogleDriveListFile,
} from '@/lib/googleDrive';

const BACKUP_FILE_PREFIX = 'dypu-connect-backup';
const BACKUP_MIME_TYPE = 'application/json';

function buildBackupFileName(): string {
    const date = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    return `${BACKUP_FILE_PREFIX}_${date}.json`;
}

/**
 * Obtain a Drive access token, preferring the in-memory one.
 */
async function getToken(driveAccessToken: string | null): Promise<string> {
    if (driveAccessToken) return driveAccessToken;
    try {
        return await requestGoogleDriveAccessToken('');
    } catch {
        return await requestGoogleDriveAccessToken('consent');
    }
}

/**
 * Export the user's profile to their Google Drive as a JSON backup file.
 */
export async function exportProfileBackup(
    userProfile: UserProfile,
    driveAccessToken: string | null,
): Promise<string> {
    const accessToken = await getToken(driveAccessToken);

    const backupData = {
        _type: 'dypu-connect-backup',
        _version: 1,
        _exportedAt: new Date().toISOString(),
        profile: userProfile,
    };

    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: BACKUP_MIME_TYPE });
    const file = new File([blob], buildBackupFileName(), { type: BACKUP_MIME_TYPE });

    const result = await uploadFileToDrive({
        accessToken,
        file,
        folderId: userProfile.googleDrive?.folderId,
    });

    return result.fileName;
}

/**
 * List available backup files on the user's Google Drive.
 */
export async function listBackups(
    driveAccessToken: string | null,
    folderId?: string,
): Promise<GoogleDriveListFile[]> {
    const accessToken = await getToken(driveAccessToken);
    const allFiles = await listDriveFiles(accessToken, folderId, BACKUP_MIME_TYPE);
    // Only return files that match our backup naming convention
    return allFiles.filter((f) => f.name.startsWith(BACKUP_FILE_PREFIX));
}

/**
 * Download and parse a backup file from Google Drive.
 * Returns the restored UserProfile data.
 */
export async function importProfileBackup(
    driveAccessToken: string | null,
    fileId: string,
): Promise<UserProfile> {
    const accessToken = await getToken(driveAccessToken);
    const content = await downloadDriveFileContent(accessToken, fileId);

    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error('Backup file is not valid JSON.');
    }

    const backup = parsed as { _type?: string; _version?: number; profile?: UserProfile };

    if (backup._type !== 'dypu-connect-backup' || !backup.profile) {
        throw new Error('This file is not a valid DYPU Connect backup.');
    }

    // Basic validation
    const profile = backup.profile;
    if (!profile.userId || !profile.email || !profile.name) {
        throw new Error('Backup file contains incomplete profile data.');
    }

    return profile;
}

