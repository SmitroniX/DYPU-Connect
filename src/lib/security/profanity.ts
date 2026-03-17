import { useSystemStore } from '@/store/useSystemStore';

/* ── Profanity filter (partial censor) ────────────── */

/**
 * List of abusive / profane words to partially censor.
 * Words are stored lowercase. Matching is case-insensitive and
 * whole-word-boundary aware so "class" won't match "ass".
 */
const PROFANITY_LIST: string[] = [
    // English
    'fuck', 'fucking', 'fucker', 'fucked', 'fucks',
    'shit', 'shitty', 'bullshit', 'shitting',
    'ass', 'asshole', 'arsehole', 'arse',
    'bitch', 'bitches', 'bitchy',
    'damn', 'damned', 'dammit',
    'dick', 'dickhead',
    'cunt', 'cunts',
    'bastard', 'bastards',
    'whore', 'slut', 'sluts',
    'crap', 'crappy',
    'piss', 'pissed', 'pissing',
    'cock', 'cocks',
    'wanker', 'wankers',
    'twat', 'twats',
    'motherfucker', 'motherfucking', 'mofo',
    'nigger', 'nigga',
    'retard', 'retarded',
    'stfu', 'gtfo', 'lmfao',
    // Hindi / Hinglish
    'madarchod', 'madarc**d', 'mc', 'behenchod', 'bc',
    'chutiya', 'chutiye', 'chut',
    'bhosdike', 'bhosdi', 'bhosdiwale',
    'gaand', 'gandu', 'gand',
    'lauda', 'lund', 'lavde', 'lavda',
    'randi', 'raand',
    'harami', 'haramkhor',
    'saala', 'saale', 'sala', 'sale',
    'kamina', 'kamine', 'kamini',
    'tatti', 'tatte',
    'jhatu', 'jhaatu',
    'ullu', 'gadha',
    'bakchod', 'bakchodi',
    'chodu', 'chodna',
    // Marathi
    'zavadya', 'zavnya',
    'aai zhavadya',
    'bhikarchot',
    'bokachoda',
    'ghalat',
    // Common text-speak evasions
    'f*ck', 'sh*t', 'b*tch', 'a**hole', 'd*ck', 'f**k', 'a$$',
];

/**
 * Get the combined list of hardcoded and custom banned keywords
 */
export function getProfanityList(): string[] {
    const customList = useSystemStore.getState().settings?.bannedKeywords || [];
    const allWords = new Set([...PROFANITY_LIST, ...customList]);
    return Array.from(allWords).filter(w => typeof w === 'string' && w.trim().length > 0);
}

/**
 * Build a regex that matches any profane word at word boundaries.
 * Sorted longest-first so "motherfucker" matches before "fucker".
 */
function getProfanityRegex(): RegExp {
    const list = getProfanityList();
    
    if (list.length === 0) return /(?!)/; // Matches nothing

    return new RegExp(
        '\\b(' +
        list.sort((a, b) => b.length - a.length)
            .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|') +
        ')\\b',
        'gi',
    );
}

/**
 * Partially censor a profane word — replaces just ONE character
 * with a single star so the word stays very readable.
 *
 *   "fuck"    → "Fu*k"
 *   "shit"    → "Sh*t"
 *   "bastard" → "Basta*d"
 *   "asshole" → "Assho*e"
 *   "ass"     → "A*s"
 *   "mc"      → "M*"
 *
 * First letter is capitalised to make the censor look intentional.
 */
function censorWord(word: string): string {
    const len = word.length;
    if (len <= 1) return '*';
    if (len === 2) return word[0].toUpperCase() + '*';
    if (len <= 4) {
        // Short words (3-4 chars): star the second-to-last char → Fu*k, Sh*t, A*s
        const starPos = len - 2;
        return word[0].toUpperCase() + word.slice(1, starPos) + '*' + word.slice(starPos + 1);
    }
    // Longer words (5+): star the second-to-last char → Basta*d, Assho*e
    const starPos = len - 2;
    return word[0].toUpperCase() + word.slice(1, starPos) + '*' + word.slice(starPos + 1);
}

/**
 * Filter profanity in text — partially censors abusive words
 * so they're still readable but visually moderated.
 *
 * "What the fuck is this bullshit" → "What the Fu*k is this Bullsh*t"
 */
export function filterProfanity(text: string): string {
    return text.replace(getProfanityRegex(), (match) => censorWord(match));
}

/**
 * Check if text contains profanity.
 */
export function containsProfanity(text: string): boolean {
    const regex = getProfanityRegex();
    regex.lastIndex = 0;
    return regex.test(text);
}
