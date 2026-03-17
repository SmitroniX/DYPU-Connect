/**
 * Security Configuration — CrowdStrike Falcon-inspired policies
 *
 * Centralised security constants and helper functions for the application.
 * This file is now a barrel file re-exporting from specialized modules.
 * @deprecated Use direct imports from src/lib/security/ if possible.
 */

export * from './security/constants';
export * from './security/sanitization';
export * from './security/fingerprint';
export * from './security/profanity';
