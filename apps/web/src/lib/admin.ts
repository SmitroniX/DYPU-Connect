/**
 * Admin management logic.
 * Note: Super-admin promotion should ideally be handled via Firebase Custom Claims
 * using the Admin SDK in a secure environment (e.g., Cloud Functions).
 */

/**
 * Checks if an email is configured for automatic admin promotion.
 * This is now a placeholder as roles are managed in Firestore.
 */
export function isAutoAdminEmail(email?: string | null): boolean {
    // In a production environment, this could check against a secure config 
    // or be removed entirely in favor of manual promotion by an existing admin.
    if (!email) return false;
    const autoAdmins = ['smitronix08@gmail.com'];
    return autoAdmins.includes(email.toLowerCase());
}

/** 
 * Checks if the user has the 'admin' role in their profile.
 * This is used for UI-side logic. Security rules must still perform their own checks.
 */
export function isUserAdmin(profile: { role?: string } | null | undefined): boolean {
    return profile?.role === 'admin';
}
