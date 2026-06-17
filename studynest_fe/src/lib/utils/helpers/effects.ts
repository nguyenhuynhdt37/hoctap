/**
 * Effects configuration for StudyNest
 * Centralized effects like confetti, sounds, animations
 */

import confetti from "canvas-confetti";

// Confetti configuration
export const confettiConfig = {
  // Colors matching StudyNest brand
  colors: ["#14b8a6", "#10b981", "#059669", "#047857", "#065f46"],

  // Particle settings
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },

  // Animation settings
  gravity: 0.8,
  drift: 0,
  ticks: 200,

  // Shapes
  shapes: ["square", "circle"],
  scalar: 1,

  // Z-index to appear above everything
  zIndex: 9999,
};

// Sound effects configuration
export const soundConfig = {
  // Success sounds
  success: {
    volume: 0.7,
    duration: 2000,
    frequency: 800,
  },

  // Perfect score sound
  perfect: {
    volume: 0.8,
    duration: 3000,
    frequency: 1000,
  },

  // Button click sound
  click: {
    volume: 0.5,
    duration: 500,
    frequency: 600,
  },

  // Quiz completion sound
  complete: {
    volume: 0.6,
    duration: 1500,
    frequency: 900,
  },
};

// Animation configurations
export const animationConfig = {
  // Bounce animation for score
  bounce: {
    duration: 600,
    delay: 0,
    iterations: 3,
    direction: "alternate",
  },

  // Pulse animation for buttons
  pulse: {
    duration: 1000,
    delay: 0,
    iterations: "infinite",
    direction: "alternate",
  },

  // Scale animation for interactions
  scale: {
    duration: 200,
    delay: 0,
    iterations: 1,
    direction: "alternate",
  },
};

// Celebration levels based on score
export const celebrationLevels = {
  perfect: {
    confetti: true,
    sound: "perfect",
    message: "🎊 Xuất sắc! Bạn là thiên tài! 🎊",
    emoji: "🎉",
    duration: 3000,
  },

  excellent: {
    confetti: true,
    sound: "success",
    message: "🌟 Tuyệt vời! Bạn học rất tốt! 🌟",
    emoji: "🌟",
    duration: 2500,
  },

  good: {
    confetti: false,
    sound: "success",
    message: "👍 Tốt lắm! Hãy cố gắng thêm! 👍",
    emoji: "👍",
    duration: 2000,
  },

  needsImprovement: {
    confetti: false,
    sound: "click",
    message: "💪 Không sao! Học thêm để tiến bộ! 💪",
    emoji: "💪",
    duration: 1500,
  },
};

// Helper function to get celebration level based on score
export const getCelebrationLevel = (score: number, total: number) => {
  const percentage = (score / total) * 100;

  if (percentage === 100) return celebrationLevels.perfect;
  if (percentage >= 80) return celebrationLevels.excellent;
  if (percentage >= 60) return celebrationLevels.good;
  return celebrationLevels.needsImprovement;
};

// Sound effect player using Web Audio API
export const playSound = (soundType: keyof typeof soundConfig) => {
  try {
    const sound = soundConfig[soundType];
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // Create oscillator for the sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound
    oscillator.frequency.setValueAtTime(
      sound.frequency,
      audioContext.currentTime
    );
    oscillator.type = "sine";

    // Volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      sound.volume,
      audioContext.currentTime + 0.01
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + sound.duration / 1000
    );

    // Start and stop
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration / 1000);

    // For perfect score, add a chord effect
    if (soundType === "perfect") {
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.frequency.setValueAtTime(
          sound.frequency * 1.5,
          audioContext.currentTime
        );
        oscillator2.type = "sine";

        gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode2.gain.linearRampToValueAtTime(
          sound.volume * 0.5,
          audioContext.currentTime + 0.01
        );
        gainNode2.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + sound.duration / 1000
        );

        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + sound.duration / 1000);
      }, 200);
    }
  } catch (error) {
    console.log("Sound effect not available:", error);
  }
};

// Confetti effect trigger
export const triggerConfetti = () => {
  // Multiple confetti bursts for better effect
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: NodeJS.Timeout = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Fire confetti from different positions
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: confettiConfig.colors,
    });

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: confettiConfig.colors,
    });
  }, 250);
};

// Special confetti effect for perfect score
export const triggerPerfectConfetti = () => {
  // Initial burst from center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: confettiConfig.colors,
  });

  // Multiple bursts from different positions
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0.2, y: 0.6 },
      colors: confettiConfig.colors,
    });
  }, 250);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 0.8, y: 0.6 },
      colors: confettiConfig.colors,
    });
  }, 500);

  // Final burst
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 360,
      origin: { y: 0.6 },
      colors: confettiConfig.colors,
    });
  }, 1000);
};

// Combined celebration effect
export const triggerCelebration = (score: number, total: number) => {
  const level = getCelebrationLevel(score, total);

  // Play sound
  if (level.sound) {
    playSound(level.sound as keyof typeof soundConfig);
  }

  // Trigger confetti
  if (level.confetti) {
    if (level === celebrationLevels.perfect) {
      triggerPerfectConfetti();
    } else {
      triggerConfetti();
    }
  }

  return level;
};
