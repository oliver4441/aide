"use client";

const audioCtx =
  typeof window !== "undefined"
    ? new (window.AudioContext || (window as any).webkitAudioContext)()
    : null;

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3,
) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.01,
    audioCtx.currentTime + duration,
  );
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playSequence(
  notes: { freq: number; dur: number; delay: number }[],
  type: OscillatorType = "sine",
  volume = 0.3,
) {
  if (!audioCtx) return;
  notes.forEach(({ freq, dur, delay }) => {
    setTimeout(() => playTone(freq, dur, type, volume), delay);
  });
}

export const sounds = {
  saleComplete: () => {
    playSequence(
      [
        { freq: 523, dur: 0.1, delay: 0 },
        { freq: 659, dur: 0.1, delay: 80 },
        { freq: 784, dur: 0.15, delay: 160 },
        { freq: 1047, dur: 0.2, delay: 240 },
      ],
      "sine",
      0.25,
    );
  },

  lowStock: () => {
    playSequence(
      [
        { freq: 880, dur: 0.08, delay: 0 },
        { freq: 0, dur: 0.05, delay: 80 },
        { freq: 880, dur: 0.08, delay: 130 },
      ],
      "square",
      0.15,
    );
  },

  notification: () => {
    playTone(830, 0.15, "sine", 0.2);
    setTimeout(() => playTone(1047, 0.2, "sine", 0.15), 120);
  },

  buttonClick: () => {
    playTone(600, 0.04, "sine", 0.1);
  },

  error: () => {
    playSequence(
      [
        { freq: 400, dur: 0.12, delay: 0 },
        { freq: 300, dur: 0.15, delay: 100 },
      ],
      "sawtooth",
      0.15,
    );
  },

  sync: () => {
    playSequence(
      [
        { freq: 1200, dur: 0.04, delay: 0 },
        { freq: 1400, dur: 0.04, delay: 50 },
        { freq: 1600, dur: 0.06, delay: 100 },
      ],
      "sine",
      0.15,
    );
  },
};
