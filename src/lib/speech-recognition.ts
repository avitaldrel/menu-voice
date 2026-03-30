/**
 * Speech recognition utility module.
 *
 * Wraps Web Speech API with:
 * - Single-turn recognition (continuous: false) for iOS Safari reliability
 * - interimResults: true to work around iOS isFinal=false bug
 * - Auto-restart via onend with shouldRestart flag (avoids double-restart from onerror)
 * - Voice command detection ("stop", "pause") for hands-free control
 */

/**
 * Returns true if the browser supports Web Speech API.
 * Guards with typeof window check for SSR safety.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Creates and returns a configured SpeechRecognition instance, or null if not supported.
 * Configuration per research:
 * - continuous: false — single-turn, reliable on iOS
 * - interimResults: true — iOS isFinal=false workaround
 * - lang: 'en-US' — always set explicitly per MDN best practice
 * - maxAlternatives: 1
 */
export function createSpeechRecognition(): SpeechRecognition | null {
  if (!isSpeechRecognitionSupported()) return null;
  const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  return recognition;
}

/**
 * Returns true if the given transcript is a voice control command ("stop" or "pause").
 * Comparison is case-insensitive and trims whitespace.
 */
export function isVoiceCommand(transcript: string): boolean {
  const normalized = transcript.toLowerCase().trim();
  return normalized === 'stop' || normalized === 'pause';
}

/**
 * SpeechManager wraps SpeechRecognition lifecycle with:
 * - shouldRestart flag for safe onend-based restart
 * - iOS isFinal=false workaround
 * - Voice command detection (stop/pause)
 * - 300ms restart delay to avoid rate limiting
 */
export class SpeechManager {
  private recognition: SpeechRecognition | null;
  private shouldRestart: boolean = false;
  private lastTranscript: string = '';
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private onTranscript: (transcript: string) => void,
    private onError: (message: string) => void,
    private onRestart: () => void,
  ) {
    this.recognition = createSpeechRecognition();
    this.attachHandlers();
  }

  private attachHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;

      // iOS isFinal=false workaround: use transcript if it has content
      if (result.isFinal || transcript.length > 0) {
        this.lastTranscript = transcript;

        // Voice command detection — stop here, do not pass to onTranscript
        if (isVoiceCommand(transcript)) {
          this.stop();
          return;
        }

        this.shouldRestart = false;
        this.onTranscript(transcript);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Fatal errors: do not restart
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        this.shouldRestart = false;
        this.onError('Microphone permission denied');
        return;
      }
      // Non-fatal errors (no-speech, network, aborted): leave shouldRestart unchanged
      // Per Pitfall 3: NEVER call recognition.start() in onerror — let onend handle restart
    };

    this.recognition.onend = () => {
      if (this.shouldRestart) {
        // 300ms delay avoids rate limiting per research
        this.restartTimeout = setTimeout(() => {
          this.recognition?.start();
          this.onRestart();
        }, 300);
      }
    };
  }

  /**
   * Start listening. Sets shouldRestart=true so onend will trigger restart.
   */
  start(): void {
    this.shouldRestart = true;
    this.lastTranscript = '';
    this.recognition?.start();
  }

  /**
   * Stop listening. Sets shouldRestart=false to prevent onend from restarting.
   */
  stop(): void {
    this.shouldRestart = false;
    if (this.restartTimeout !== null) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.recognition?.stop();
  }

  /**
   * Cleanup — abort recognition and clear any pending restart.
   */
  destroy(): void {
    this.shouldRestart = false;
    if (this.restartTimeout !== null) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.recognition?.abort();
    this.recognition = null;
  }
}
