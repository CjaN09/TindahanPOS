import { createAudioPlayer } from 'expo-audio';

export const playBeep = async (isSoundEnabled = true) => {
  if (!isSoundEnabled) return;
  try {
    const player = createAudioPlayer(require('../../assets/sounds/beep.mp3'));
    player.play();
  } catch (e) {
    console.log('Error playing beep:', e);
  }
};

export const playCash = async (isSoundEnabled = true) => {
  if (!isSoundEnabled) return;
  try {
    const player = createAudioPlayer(require('../../assets/sounds/cash.mp3'));
    player.play();
  } catch (e) {
    console.log('Error playing cash sound:', e);
  }
};