import type { UserProfile } from '@/types/profile';
import { AUTO_BACKUP_INTERVALS } from '@/types/profile';
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

/* ══════════════════════════════════════════════════════
   Auto-Backup Scheduler
   ══════════════════════════════════════════════════════
   Runs client-side. On each login (or periodic interval)
   it checks whether a backup is due based on the user's
   chosen interval, and silently uploads if needed.
   ══════════════════════════════════════════════════════ */

const AUTO_BACKUP_STORAGE_KEY = 'dypu_auto_backup_last';
let autoBackupTimerId: ReturnType<typeof setInterval> | null = null;

/**
 * Resolve the interval in milliseconds for the given interval key.
 */
function resolveIntervalMs(interval: string): number {
    const entry = AUTO_BACKUP_INTERVALS.find((i) => i.value === interval);
    return entry?.ms ?? AUTO_BACKUP_INTERVALS[0].ms; // default 24h
}

/**
 * Check whether an auto-backup is due and run it if so.
 * Returns the backup filename if a backup was performed, or null.
 *
 * This function is safe to call silently — it catches errors internally
 * and returns null on failure.
 */
export async function checkAndRunAutoBackup(
    userProfile: UserProfile,
    driveAccessToken: string | null,
    onComplete?: (fileName: string | null, lastBackupAt: number) => void,
): Promise<string | null> {
    try {
        const settings = userProfile.autoBackup;
        if (!settings?.enabled) return null;
        if (!userProfile.googleDrive) return null;

        const intervalMs = resolveIntervalMs(settings.interval);
        const lastBackupAt = settings.lastBackupAt
            ?? parseInt(localStorage.getItem(AUTO_BACKUP_STORAGE_KEY) || '0', 10);
        const now = Date.now();

        if (now - lastBackupAt < intervalMs) {
            // Not due yet
            return null;
        }

        // Perform backup
        const fileName = await exportProfileBackup(userProfile, driveAccessToken);

        // Save last-backup timestamp locally as fallback
        localStorage.setItem(AUTO_BACKUP_STORAGE_KEY, now.toString());

        // Callback for the caller to persist to Firestore
        onComplete?.(fileName, now);

        return fileName;
    } catch (err) {
        console.warn('[AutoBackup] Silent backup failed:', err);
        return null;
    }
}

/**
 * Start a periodic timer that checks for auto-backup every 5 minutes.
 * If a backup is due (based on interval), it runs silently.
 *
 * Call `stopAutoBackupScheduler()` on logout.
 */
export function startAutoBackupScheduler(
    getProfile: () => UserProfile | null,
    getDriveToken: () => string | null,
    onComplete?: (fileName: string | null, lastBackupAt: number) => void,
): void {
    stopAutoBackupScheduler();

    // Check immediately on start (e.g. on login)
    const runCheck = () => {
        const profile = getProfile();
        if (!profile) return;
        checkAndRunAutoBackup(profile, getDriveToken(), onComplete).catch(() => {});
    };

    // Run first check after a short delay (let the app settle)
    setTimeout(runCheck, 10_000);

    // Then check every 5 minutes
    autoBackupTimerId = setInterval(runCheck, 5 * 60 * 1000);
}

/**
 * Stop the auto-backup scheduler.
 */
export function stopAutoBackupScheduler(): void {
    if (autoBackupTimerId !== null) {
        clearInterval(autoBackupTimerId);
        autoBackupTimerId = null;
    }
}

