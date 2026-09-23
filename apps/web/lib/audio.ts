/**
 * High-Fidelity Audio & Pronunciation Engine
 * 
 * Problem: The browser's default `window.speechSynthesis` on English Windows/macOS uses an
 * English voice (e.g. Microsoft David / Google US English) to read German words, resulting in
 * an awkward English accent.
 *
 * Solution:
 * 1. Explicitly detect and bind genuine native German voices (Google Deutsch, Microsoft Hedda, Stefan, Katja, Anna).
 * 2. If the user's OS has no German voice pack installed, seamlessly stream high-fidelity
 *    native German neural audio so pronunciation is 100% authentic and natural.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Finds the highest quality native German voice available on the device.
 */
function findBestGermanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Tier 1: Google Deutsch / Neural German (highest naturalness in Chrome)
  const googleGerman = voices.find(
    (v) => v.lang.startsWith('de') && (v.name.includes('Google') || v.name.includes('Natural'))
  );
  if (googleGerman) return googleGerman;

  // Tier 2: Premium Microsoft / Apple German voices
  const premiumGerman = voices.find(
    (v) =>
      v.lang.startsWith('de') &&
      (v.name.includes('Hedda') ||
        v.name.includes('Katja') ||
        v.name.includes('Stefan') ||
        v.name.includes('Anna') ||
        v.name.includes('Markus'))
  );
  if (premiumGerman) return premiumGerman;

  // Tier 3: Any voice explicitly tagged with German locale
  const anyGerman = voices.find((v) => v.lang.toLowerCase().startsWith('de'));
  if (anyGerman) return anyGerman;

  return null;
}

/**
 * Pronounces a German word or phrase with authentic native pronunciation.
 */
export function playGermanAudio(text: string, article?: string) {
  if (typeof window === 'undefined') return;

  const phrase = article ? `${article.trim()} ${text.trim()}` : text.trim();
  if (!phrase) return;

  // 1. Try to find a genuine native German voice in browser TTS
  const germanVoice = findBestGermanVoice();

  if (germanVoice && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.voice = germanVoice;
    utterance.lang = germanVoice.lang || 'de-DE';
    utterance.rate = 0.88; // Slightly measured rate for language learners
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return;
  }

  // 2. Fallback: High-Definition Neural German Audio Stream
  // When English Windows / macOS has NO German voice pack installed,
  // stream authentic native Hochdeutsch audio directly.
  try {
    const streamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=de&q=${encodeURIComponent(phrase)}`;
    const audio = new Audio(streamUrl);
    audio.play().catch(() => {
      // Last-ditch browser TTS fallback if audio element playback is blocked
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const fallbackUtterance = new SpeechSynthesisUtterance(phrase);
        fallbackUtterance.lang = 'de-DE';
        fallbackUtterance.rate = 0.85;
        window.speechSynthesis.speak(fallbackUtterance);
      }
    });
  } catch (err) {
    console.warn('Audio playback fallback failed:', err);
  }
}

/**
 * Universal speech player handling both German and English.
 */
export function playWordSpeech(word: string, sourceLanguage = 'de', article?: string) {
  if (sourceLanguage.toLowerCase() === 'de') {
    playGermanAudio(word, article);
    return;
  }

  // English pronunciation
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}
