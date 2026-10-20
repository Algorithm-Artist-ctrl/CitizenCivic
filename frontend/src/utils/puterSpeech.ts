/**
 * Puter.js AI Speech-to-Text Integration for CitizenCivic
 * Official documentation: https://developer.puter.com/tutorials/free-unlimited-speech-to-text-api/
 *
 * Provides client-side speech recognition via puter.ai.speech2txt()
 * supporting Hindi, English, and Hinglish for civic complaint descriptions.
 */

declare global {
  interface Window {
    puter?: {
      ai: {
        speech2txt: (
          source: Blob | File | string,
          options?: {
            provider?: string;
            model?: string;
            language?: string;
            prompt?: string;
            temperature?: number;
            translate?: boolean;
            response_format?: 'json' | 'text';
            test_mode?: boolean;
          }
        ) => Promise<any>;
      };
    };
  }
}

let puterLoadPromise: Promise<boolean> | null = null;

/**
 * Checks whether Puter SDK is loaded and speech2txt is callable
 */
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.puter?.ai?.speech2txt === 'function';
}

/**
 * Safely loads the Puter.js v2 SDK from https://js.puter.com/v2/
 * Deduplicates concurrent requests and prevents duplicate script tags.
 */
export async function loadPuterSDK(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isPuterAvailable()) return true;

  if (puterLoadPromise) return puterLoadPromise;

  puterLoadPromise = new Promise<boolean>((resolve) => {
    // Check if script tag is already in DOM
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="js.puter.com"]');
    if (existingScript) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (isPuterAvailable()) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts >= 40) {
          clearInterval(interval);
          resolve(isPuterAvailable());
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (isPuterAvailable()) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts >= 40) {
          clearInterval(interval);
          resolve(isPuterAvailable());
        }
      }, 100);
    };

    script.onerror = () => {
      console.warn('[Puter.js] Could not load SDK from https://js.puter.com/v2/');
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return puterLoadPromise;
}

export interface TranscriptionOptions {
  language?: 'auto' | 'hi' | 'en';
  prompt?: string;
}

/**
 * Transcribes an audio recording Blob using puter.ai.speech2txt()
 *
 * @param audioBlob The captured microphone audio Blob or File
 * @param options Language ('auto', 'hi', 'en') and optional context prompt
 * @returns The transcribed text string
 */
export async function transcribeAudioWithPuter(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<string> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Audio recording is empty. Please speak clearly into the microphone.');
  }

  // Ensure Puter SDK is ready
  const loaded = await loadPuterSDK();
  if (!loaded || !isPuterAvailable()) {
    throw new Error(
      'Puter AI speech service could not be reached. Please check your internet connection or enter the description manually.'
    );
  }

  const lang = options.language === 'auto' || !options.language ? undefined : options.language;
  const prompt =
    options.prompt ||
    'Civic issue complaint description, garbage dump, water logging, damaged road, potholes, streetlight, sewage, municipal ward problem, Hindi, English, Hinglish.';

  try {
    const result = await window.puter!.ai.speech2txt(audioBlob, {
      language: lang,
      prompt,
      translate: false, // Preserve original spoken language (Hindi / English / Hinglish)
      response_format: 'text',
    });

    let transcribedText = '';
    if (typeof result === 'string') {
      transcribedText = result.trim();
    } else if (result && typeof result === 'object') {
      transcribedText = (result.text || result.transcript || result.result || '').toString().trim();
    }

    if (!transcribedText) {
      throw new Error('No clear speech was recognized. Please speak closer to the microphone and try again.');
    }

    return transcribedText;
  } catch (err: any) {
    console.error('[Puter.js] speech2txt error:', err);
    const msg = err?.message || err?.error || String(err);
    if (msg.includes('network') || msg.includes('Failed to fetch')) {
      throw new Error('Network timeout contacting Puter speech service. Please retry or type manually.');
    }
    throw new Error(msg || 'Failed to transcribe audio. Please try again or type manually.');
  }
}
