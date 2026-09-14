import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

// Mirrors the PWA's src/lib/sound.ts: a device-local on/off preference
// (never synced to Supabase) plus five short UI tones. The PWA synthesizes
// these live via Web Audio oscillators — React Native has no equivalent
// API, so the exact same frequency/duration/gain-envelope math was
// rendered offline into assets/sounds/*.wav (see the generation script) and
// is just played back here.
const STORAGE_KEY = "ingatin:sound-enabled";

let enabledCache: boolean | null = null;

export async function isSoundEnabled(): Promise<boolean> {
  if (enabledCache !== null) return enabledCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    enabledCache = raw === null ? true : raw === "1";
  } catch {
    enabledCache = true;
  }
  return enabledCache;
}

export async function setSoundEnabled(enabled: boolean) {
  enabledCache = enabled;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage errors, same as the PWA
  }
}

export type SoundEffect = "popup" | "open" | "close" | "send" | "receive";

const SOURCES: Record<SoundEffect, number> = {
  popup: require("../assets/sounds/popup.wav"),
  open: require("../assets/sounds/open.wav"),
  close: require("../assets/sounds/close.wav"),
  send: require("../assets/sounds/send.wav"),
  receive: require("../assets/sounds/receive.wav"),
};

// One player per effect, created lazily and reused — matches the PWA's
// "one shared AudioContext" reasoning (avoid recreating playback objects
// on every call) while still letting different effects overlap.
const players = new Map<SoundEffect, AudioPlayer>();

// expo-audio defaults playsInSilentMode to true — the PWA's own tones
// explicitly respect the device's silent/mute switch ("Otomatis ikut mode
// senyap HP kamu" in the Settings copy), so that has to be turned off
// once, not left at the library default.
let audioModeReady: Promise<void> | null = null;
function ensureAudioMode(): Promise<void> {
  if (!audioModeReady) {
    audioModeReady = setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
  }
  return audioModeReady;
}

function getPlayer(effect: SoundEffect): AudioPlayer {
  let player = players.get(effect);
  if (!player) {
    player = createAudioPlayer(SOURCES[effect]);
    players.set(effect, player);
  }
  return player;
}

// Best-effort only, same as the PWA: a failed/unavailable audio backend
// should never break the UI it's attached to.
export async function playSound(effect: SoundEffect) {
  if (!(await isSoundEnabled())) return;
  try {
    await ensureAudioMode();
    const player = getPlayer(effect);
    await player.seekTo(0);
    player.play();
  } catch {
    // ignore playback errors
  }
}
