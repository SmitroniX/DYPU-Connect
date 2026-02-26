const AUTO_ADMIN_EMAILS = new Set([
    'asm.jog.rt25@dypatil.edu',
]);

export function isAutoAdminEmail(email: string | null | undefined): boolean {
    return !!email && AUTO_ADMIN_EMAILS.has(email.toLowerCase());
}
