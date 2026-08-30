import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { FirebaseError } from 'firebase/app';
import { AppError, AppErrorCode, mapToAppError } from './errors';

describe('errors', () => {
    describe('mapToAppError', () => {
        it('should return the original AppError if already an AppError instance', () => {
            const originalError = new AppError(AppErrorCode.AUTH_USER_NOT_FOUND, 'User not found');
            const mappedError = mapToAppError(originalError);

            expect(mappedError).toBe(originalError);
            expect(mappedError.code).toBe(AppErrorCode.AUTH_USER_NOT_FOUND);
            expect(mappedError.message).toBe('User not found');
        });

        it('should map ZodError correctly', () => {
            const zodError = new ZodError([
                {
                    code: 'custom',
                    path: ['user', 'email'],
                    message: 'Invalid email address',
                }
            ]);

            const mappedError = mapToAppError(zodError);

            expect(mappedError).toBeInstanceOf(AppError);
            expect(mappedError.code).toBe(AppErrorCode.VALIDATION_ERROR);
            expect(mappedError.message).toBe('user.email: Invalid email address');
            expect(mappedError.originalError).toBe(zodError);
        });

        it('should handle ZodError with no issues', () => {
            const zodError = new ZodError([]);
            const mappedError = mapToAppError(zodError);

            expect(mappedError).toBeInstanceOf(AppError);
            expect(mappedError.code).toBe(AppErrorCode.VALIDATION_ERROR);
            expect(mappedError.message).toBe('Data validation failed.');
            expect(mappedError.originalError).toBe(zodError);
        });

        it('should map specific FirebaseErrors to AppErrorCode', () => {
            const errorCases = [
                {
                    code: 'auth/operation-not-allowed',
                    message: 'Firebase error',
                    expectedCode: AppErrorCode.AUTH_OPERATION_NOT_ALLOWED,
                },
                {
                    code: 'auth/unauthorized-domain',
                    message: 'Firebase error',
                    expectedCode: AppErrorCode.AUTH_UNAUTHORIZED_DOMAIN,
                },
                {
                    code: 'auth/firebase-app-check-token-is-invalid',
                    message: 'Firebase error',
                    expectedCode: AppErrorCode.AUTH_APP_CHECK_INVALID,
                },
                {
                    code: 'permission-denied',
                    message: 'Firebase error',
                    expectedCode: AppErrorCode.FIRESTORE_PERMISSION_DENIED,
                },
            ];

            errorCases.forEach(({ code, message, expectedCode }) => {
                const firebaseError = new FirebaseError(code, message);
                const mappedError = mapToAppError(firebaseError);

                expect(mappedError).toBeInstanceOf(AppError);
                expect(mappedError.code).toBe(expectedCode);
                expect(mappedError.originalError).toBe(firebaseError);
            });
        });

        it('should map unknown FirebaseErrors to AppErrorCode.NETWORK_ERROR', () => {
            const firebaseError = new FirebaseError('some-other-code', 'Unknown firebase error');
            const mappedError = mapToAppError(firebaseError);

            expect(mappedError).toBeInstanceOf(AppError);
            expect(mappedError.code).toBe(AppErrorCode.NETWORK_ERROR);
            expect(mappedError.message).toBe('Unknown firebase error');
            expect(mappedError.originalError).toBe(firebaseError);
        });

        it('should map generic Error to AppErrorCode.UNKNOWN_ERROR', () => {
            const genericError = new Error('Something went wrong');
            const mappedError = mapToAppError(genericError);

            expect(mappedError).toBeInstanceOf(AppError);
            expect(mappedError.code).toBe(AppErrorCode.UNKNOWN_ERROR);
            expect(mappedError.message).toBe('Something went wrong');
            expect(mappedError.originalError).toBe(genericError);
        });

        it('should handle arbitrary non-Error objects gracefully', () => {
            const arbitraryObject = { foo: 'bar' };
            const mappedError = mapToAppError(arbitraryObject);

            expect(mappedError).toBeInstanceOf(AppError);
            expect(mappedError.code).toBe(AppErrorCode.UNKNOWN_ERROR);
            expect(mappedError.message).toBe('An unexpected error occurred.');
            expect(mappedError.originalError).toBe(arbitraryObject);
        });

        it('should handle null/undefined gracefully', () => {
            const mappedErrorNull = mapToAppError(null);
            expect(mappedErrorNull.code).toBe(AppErrorCode.UNKNOWN_ERROR);
            expect(mappedErrorNull.message).toBe('An unexpected error occurred.');

            const mappedErrorUndefined = mapToAppError(undefined);
            expect(mappedErrorUndefined.code).toBe(AppErrorCode.UNKNOWN_ERROR);
            expect(mappedErrorUndefined.message).toBe('An unexpected error occurred.');
        });
    });
});
