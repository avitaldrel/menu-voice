/**
 * TTS client module.
 *
 * Provides sentence-buffered text-to-speech playback:
 * - Primary: OpenAI TTS via /api/tts, played through HTMLAudioElement (required by CLAUDE.md)
 * - Fallback: window.speechSynthesis when /api/tts returns non-2xx
 * - Auto-retry OpenAI every 5 requests after entering fallback mode
 * - Blob URL revocation after playback to prevent memory leaks (Pitfall 4)
 */

/**
 * Split text on terminal punctuation (.!?) followed by whitespace or end of string.
 * Returns single-element array with trimmed input if no sentence boundaries found.
 */
export function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(\s|$)?/g);
  if (!matches) return [text.trim()].filter(Boolean);
  const sentences = matches.map((s) => s.trim()).filter(Boolean);
  return sentences.length > 0 ? sentences : [text.trim()];
}

/**
 * Speak a sentence using window.speechSynthesis.
 * Stores utterance on window to prevent iOS GC bug.
 * Calls callback on completion (onend or onerror).
 */
function speakWithSynthesis(text: string, onDone: () => void): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.0;
  utterance.volume = 1.0;

  // Store reference on window to prevent iOS GC bug
  (window as Window & { _ttsUtterance?: SpeechSynthesisUtterance })._ttsUtterance = utterance;

  utterance.onend = () => {
    (window as Window & { _ttsUtterance?: SpeechSynthesisUtterance })._ttsUtterance = undefined;
    onDone();
  };
  utterance.onerror = () => {
    (window as Window & { _ttsUtterance?: SpeechSynthesisUtterance })._ttsUtterance = undefined;
    onDone();
  };

  window.speechSynthesis.speak(utterance);
}

export class TTSClient {
  private audioElement: HTMLAudioElement;
  private queue: string[] = [];
  private buffer: string = '';
  private isPlaying: boolean = false;
  private useFallback: boolean = false;
  private requestsSinceFallback: number = 0;
  private currentBlobUrl: string | null = null;
  private speakingStartFired: boolean = false;

  private onSpeakingStart: (() => void) | null;
  private onSpeakingEnd: (() => void) | null;
  private onSentenceStart: ((sentence: string) => void) | null;

  constructor(options: {
    onSpeakingStart?: () => void;
    onSpeakingEnd?: () => void;
    onSentenceStart?: (sentence: string) => void;
  } = {}) {
    // Audio() constructor creates standalone element — not attached to DOM (A11Y-05)
    this.audioElement = new Audio();
    this.onSpeakingStart = options.onSpeakingStart ?? null;
    this.onSpeakingEnd = options.onSpeakingEnd ?? null;
    this.onSentenceStart = options.onSentenceStart ?? null;
  }

  /**
   * Buffer incoming text chunks and enqueue complete sentences for playback.
   * Keeps last incomplete fragment as buffer.
   */
  queueText(text: string): void {
    this.buffer += text;
    const sentences = splitSentences(this.buffer);

    if (sentences.length > 1) {
      // All but the last are complete sentences
      const complete = sentences.slice(0, -1);
      this.buffer = sentences[sentences.length - 1] ?? '';
      for (const sentence of complete) {
        this.queue.push(sentence);
      }
      if (!this.isPlaying) {
        this.playNext();
      }
    }
  }

  /**
   * Flush the remaining buffer as a sentence (call at end of streaming).
   */
  flush(): void {
    const remaining = this.buffer.trim();
    if (remaining) {
      this.queue.push(remaining);
      this.buffer = '';
    }
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * Stop playback, cancel synthesis, revoke blob URL, clear queue.
   */
  stop(): void {
    this.audioElement.pause();
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    window.speechSynthesis?.cancel();
    this.queue = [];
    this.buffer = '';
    this.isPlaying = false;
    this.speakingStartFired = false;
  }

  /**
   * Cleanup audio element.
   */
  destroy(): void {
    this.stop();
  }

  /**
   * Play the next sentence from the queue.
   * Uses OpenAI TTS (primary) or SpeechSynthesis (fallback).
   */
  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      if (this.isPlaying || this.speakingStartFired) {
        this.isPlaying = false;
        this.speakingStartFired = false;
        this.onSpeakingEnd?.();
      }
      return;
    }

    const sentence = this.queue.shift()!;
    this.isPlaying = true;
    this.onSentenceStart?.(sentence);

    // Fire onSpeakingStart only on the first sentence
    if (!this.speakingStartFired) {
      this.speakingStartFired = true;
      this.onSpeakingStart?.();
    }

    // Determine whether to try OpenAI
    const shouldTryOpenAI =
      !this.useFallback || this.requestsSinceFallback % 5 === 0;

    if (shouldTryOpenAI) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sentence }),
        });

        if (!response.ok) {
          // Enter fallback mode silently
          this.useFallback = true;
          this.playWithFallback(sentence);
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        this.currentBlobUrl = url;
        this.audioElement.src = url;

        this.audioElement.onended = () => {
          // Revoke blob URL to prevent memory leak (Pitfall 4)
          URL.revokeObjectURL(url);
          this.currentBlobUrl = null;
          this.playNext();
        };

        this.audioElement.onerror = () => {
          URL.revokeObjectURL(url);
          this.currentBlobUrl = null;
          this.playNext();
        };

        await this.audioElement.play();
      } catch {
        // Network failure — fall back
        this.useFallback = true;
        this.playWithFallback(sentence);
      }
    } else {
      this.playWithFallback(sentence);
    }
  }

  private playWithFallback(sentence: string): void {
    if (this.useFallback) {
      this.requestsSinceFallback++;
    }
    speakWithSynthesis(sentence, () => {
      this.playNext();
    });
  }
}
