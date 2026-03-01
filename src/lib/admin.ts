const SUPER_ADMIN_EMAIL = 'asm.jog.rt25@dypatil.edu';

const AUTO_ADMIN_EMAILS = new Set([
    SUPER_ADMIN_EMAIL,
]);

export function isAutoAdminEmail(email: string | null | undefined): boolean {
    return !!email && AUTO_ADMIN_EMAILS.has(email.toLowerCase());
}

/** Only the super-admin can promote/demote other users' roles */
export function isSuperAdmin(email: string | null | undefined): boolean {
    return !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL;
}
