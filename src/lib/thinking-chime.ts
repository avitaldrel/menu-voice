/**
 * Thinking chime utility.
 *
 * Plays a gentle two-tone pulse during the processing state — sounds like
 * a soft "breathing" indicator rather than an alarm beep. Uses Web Audio API.
 *
 * Conforms to:
 * - VOICE-05: Audio thinking cue during processing
 * - Pitfall 2: AudioContext created lazily (after user gesture, not on load)
 */

let chimeInterval: ReturnType<typeof setInterval> | null = null;
let audioCtx: AudioContext | null = null;

/**
 * Play a soft ambient "breathing" pulse — a slow fade-in/fade-out hum.
 * Sounds like a gentle white noise whoosh, not a musical tone.
 * Creates AudioContext lazily on first call (after user gesture).
 */
function playChime(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const now = audioCtx.currentTime;
  const duration = 1.2;

  // Use filtered noise for a soft whoosh instead of a beep
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  // Bandpass filter — keeps only a warm mid-range hum
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 2;

  // Gentle fade in and out
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.03, now + 0.4);
  gain.gain.linearRampToValueAtTime(0.03, now + 0.8);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  source.start(now);
  source.stop(now + duration);
}

/**
 * Start the thinking chime. Plays immediately then every 3000ms.
 * Guards against duplicate intervals — calling twice is safe.
 */
export function startThinkingChime(): void {
  if (chimeInterval !== null) return;
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return;

  playChime();
  chimeInterval = setInterval(playChime, 3000);
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
