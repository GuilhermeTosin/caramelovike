let audioContext: AudioContext | null = null;
let unlockListenerInstalled = false;
let lastPlayedAt = 0;

function unlockAudio() {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => undefined);
    }

    document.removeEventListener("pointerdown", unlockAudio, true);
    document.removeEventListener("keydown", unlockAudio, true);
    unlockListenerInstalled = false;
  } catch {
    // Audio is optional; browser restrictions must not affect messaging.
  }
}

export function prepareMessageNotificationSound() {
  if (typeof document === "undefined" || unlockListenerInstalled) return;

  document.addEventListener("pointerdown", unlockAudio, true);
  document.addEventListener("keydown", unlockAudio, true);
  unlockListenerInstalled = true;
}

export function playMessageNotificationSound() {
  if (!audioContext || audioContext.state !== "running") return;
  if (Date.now() - lastPlayedAt < 450) return;

  lastPlayedAt = Date.now();
  const startAt = audioContext.currentTime;
  try {
    [660, 880].forEach((frequency, index) => {
      const start = startAt + index * 0.12;
      const oscillator = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
      oscillator.connect(gain);
      gain.connect(audioContext!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });
  } catch {
    // Keep notification audio best-effort if a browser tears down its context.
  }
}
