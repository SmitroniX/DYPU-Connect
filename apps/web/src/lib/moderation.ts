/**
 * Utility for content moderation (AI-Ready)
 */

// Basic keyword filter for immediate use
const BANNED_WORDS = [
  'abuse', 'kill', 'hate', 'spam', 'scam'
  // Add common offensive terms here
];

export interface ModerationResult {
  isSafe: boolean;
  reason?: string;
}

/**
 * Basic local moderation check
 */
export const moderateTextLocal = (text: string): ModerationResult => {
  const lowerText = text.toLowerCase();
  
  for (const word of BANNED_WORDS) {
    if (lowerText.includes(word)) {
      return { isSafe: false, reason: `Contains forbidden language: ${word}` };
    }
  }
  
  return { isSafe: true };
};

/**
 * Placeholder for AI Moderation (Category 5)
 * You can implement this using Gemini API or OpenAI in a Next.js API route.
 */
export const moderateTextAI = async (text: string): Promise<ModerationResult> => {
  try {
    // In a real implementation, you would call your backend API here
    // const response = await fetch('/api/moderate', { method: 'POST', body: JSON.stringify({ text }) });
    // return await response.json();
    
    // For now, fall back to local check
    return moderateTextLocal(text);
  } catch (error) {
    console.error('AI Moderation failed:', error);
    return { isSafe: true }; // Allow if AI check fails to avoid blocking users
  }
};
