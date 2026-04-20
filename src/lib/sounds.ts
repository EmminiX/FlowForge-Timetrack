// Sound utilities using Web Audio API
// Generates synthesized tones for timer feedback

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
) {
  try {
    const ctx = getAudioContext();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn('Failed to play sound:', error);
  }
}

// Pleasant ascending tone for starting
export function playStartSound() {
  playTone(523.25, 0.15, 'sine', 0.25); // C5
  setTimeout(() => playTone(659.25, 0.15, 'sine', 0.25), 100); // E5
  setTimeout(() => playTone(783.99, 0.2, 'sine', 0.25), 200); // G5
}

// Gentle descending tone for pausing
export function playPauseSound() {
  playTone(659.25, 0.15, 'sine', 0.2); // E5
  setTimeout(() => playTone(523.25, 0.2, 'sine', 0.2), 100); // C5
}

// Same as start for resuming
export function playResumeSound() {
  playTone(523.25, 0.12, 'sine', 0.2); // C5
  setTimeout(() => playTone(659.25, 0.15, 'sine', 0.2), 80); // E5
}

// Satisfying completion sound for stopping
export function playStopSound() {
  playTone(783.99, 0.12, 'sine', 0.25); // G5
  setTimeout(() => playTone(659.25, 0.12, 'sine', 0.25), 80); // E5
  setTimeout(() => playTone(523.25, 0.25, 'sine', 0.3), 160); // C5
}

// Gentle reminder for break time (work period ended)
export function playBreakSound() {
  playTone(880, 0.15, 'sine', 0.2); // A5
  setTimeout(() => playTone(880, 0.15, 'sine', 0.2), 200);
  setTimeout(() => playTone(1046.5, 0.3, 'sine', 0.25), 400); // C6
}

// Energizing sound for when break ends (time to work)
export function playWorkResumeSound() {
  playTone(523.25, 0.1, 'sine', 0.2); // C5
  setTimeout(() => playTone(659.25, 0.1, 'sine', 0.2), 100); // E5
  setTimeout(() => playTone(783.99, 0.1, 'sine', 0.2), 200); // G5
  setTimeout(() => playTone(1046.5, 0.25, 'sine', 0.3), 300); // C6
}
