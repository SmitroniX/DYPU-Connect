import { FirebaseError } from 'firebase/app';
import { ZodError } from 'zod';
import { toast } from 'react-hot-toast';

export enum AppErrorCode {
    // Auth Errors
    AUTH_OPERATION_NOT_ALLOWED = 'auth/operation-not-allowed',
    AUTH_UNAUTHORIZED_DOMAIN = 'auth/unauthorized-domain',
    AUTH_APP_CHECK_INVALID = 'auth/firebase-app-check-token-is-invalid',
    AUTH_USER_NOT_FOUND = 'auth/user-not-found',
    AUTH_INVALID_LINK = 'auth/invalid-link',
    AUTH_RESTRICTED_EMAIL = 'auth/restricted-email',

    // Firestore Errors
    FIRESTORE_PERMISSION_DENIED = 'firestore/permission-denied',
    FIRESTORE_NOT_FOUND = 'firestore/not-found',

    // Validation Errors
    VALIDATION_ERROR = 'validation/error',

    // Generic Errors
    NETWORK_ERROR = 'network/error',
    UNKNOWN_ERROR = 'unknown/error',
}

export class AppError extends Error {
    public readonly code: AppErrorCode;
    public readonly originalError?: unknown;

    constructor(code: AppErrorCode, message: string, originalError?: unknown) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.originalError = originalError;

        // Ensure proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}

/**
 * Global error handler that logs the error and shows a toast notification.
 */
export function handleError(error: unknown, context?: string) {
    const appError = mapToAppError(error);
    
    // Log for developers
    console.error(`[AppError]${context ? ` in ${context}` : ''}:`, {
        code: appError.code,
        message: appError.message,
        original: appError.originalError,
    });

    // Show user-friendly toast
    toast.error(appError.message);

    return appError;
}

/**
 * Maps various error types to a structured AppError.
 */
export function mapToAppError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof ZodError) {
        return mapZodError(error);
    }

    if (isFirebaseError(error)) {
        return mapFirebaseError(error);
    }

    if (error instanceof Error) {
        return new AppError(AppErrorCode.UNKNOWN_ERROR, error.message, error);
    }

    return new AppError(AppErrorCode.UNKNOWN_ERROR, 'An unexpected error occurred.', error);
}

function isFirebaseError(error: unknown): error is FirebaseError {
    return (error as FirebaseError).code !== undefined && (error as FirebaseError).name === 'FirebaseError';
}

function mapFirebaseError(error: FirebaseError): AppError {
    switch (error.code) {
        case 'auth/operation-not-allowed':
            return new AppError(
                AppErrorCode.AUTH_OPERATION_NOT_ALLOWED,
                'Email link sign-in is disabled. In Firebase Console, enable Email link (passwordless sign-in) under Sign-in methods.',
                error
            );
        case 'auth/unauthorized-domain':
            return new AppError(
                AppErrorCode.AUTH_UNAUTHORIZED_DOMAIN,
                'This domain is not authorized for Firebase Auth. Add it under Authentication -> Settings -> Authorized domains.',
                error
            );
        case 'auth/firebase-app-check-token-is-invalid':
            return new AppError(
                AppErrorCode.AUTH_APP_CHECK_INVALID,
                'Firebase App Check token is invalid. Configure App Check or disable enforcement during development.',
                error
            );
        case 'permission-denied':
            return new AppError(
                AppErrorCode.FIRESTORE_PERMISSION_DENIED,
                'Firestore access denied. Update Firestore Rules to allow this user to read/write their profile.',
                error
            );
        default:
            return new AppError(AppErrorCode.NETWORK_ERROR, error.message, error);
    }
}

function mapZodError(error: ZodError): AppError {
    const firstIssue = error.issues[0];
    const message = firstIssue 
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : 'Data validation failed.';
        
    return new AppError(AppErrorCode.VALIDATION_ERROR, message, error);
}
