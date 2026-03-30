/**
 * Thinking chime utility.
 *
 * Plays a soft repeating 440Hz sine wave tone during the processing state
 * to give audio feedback that the app is "thinking". Uses Web Audio API
 * OscillatorNode — no audio files required.
 *
 * Conforms to:
 * - VOICE-05: Audio thinking cue every 2s during processing
 * - Pitfall 2: AudioContext created lazily (after user gesture, not on load)
 */

let chimeInterval: ReturnType<typeof setInterval> | null = null;
let audioCtx: AudioContext | null = null;

/**
 * Play a single 200ms sine wave chime at 440Hz with low gain.
 * Creates AudioContext lazily on first call (after user gesture per Pitfall 2).
 */
function playChime(): void {
  // Lazy AudioContext creation — only after user gesture
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 440; // A4 — warm, unobtrusive per CONTEXT.md
  gain.gain.value = 0.08;    // low volume — non-intrusive

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.2); // 200ms beep
}

/**
 * Start the thinking chime. Plays immediately then every 2000ms.
 * Guards against duplicate intervals — calling twice is safe.
 */
export function startThinkingChime(): void {
  // Guard: prevent duplicate intervals
  if (chimeInterval !== null) return;

  // Guard: SSR or old browser without Web Audio API
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return;

  playChime(); // immediate first chime
  chimeInterval = setInterval(playChime, 2000);
}

/**
 * Stop the thinking chime. Clears the interval.
 * Safe to call multiple times or when not running.
 */
export function stopThinkingChime(): void {
  if (chimeInterval !== null) {
    clearInterval(chimeInterval);
    chimeInterval = null;
  }
}
