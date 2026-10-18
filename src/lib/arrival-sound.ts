// W6-B7 (W6-A4 gap #3 — kitchen-proof new-order notification): the
// orders page's arrival branch (20s visibility-gated poll → toast) is
// silent, and a working kitchen is not watching the tab. This helper
// plays a short two-tone WebAudio beep on the EXISTING arrival branch —
// no new dependencies (the WebAudio API), no autoplay-policy fights
// beyond what any dashboard session already provides (a prior user
// gesture unlocks the AudioContext; if it stays suspended the beep
// silently no-ops, never throws).
//
// UX DECISION (documented, per the mission's ask): the sound is
// OPT-IN — default OFF. A web page making noise the operator never
// asked for is the classic surprise-audio anti-pattern; the toggle is
// one tap in the orders toolbar (aria-pressed, aria-label) and the
// preference persists in localStorage (the repo has no per-user
// notification-setting surface — the dashboard's only persisted prefs
// are theme (next-themes localStorage) so the same storage idiom is the
// family fit, not a new pattern).
//
// Import-safety: no top-level window/AudioContext access — node --test
// imports this module bare (the arrival-sound.test.ts behavior pins).

/** localStorage key for the persisted toggle ("1" = on). */
export const ARRIVAL_SOUND_STORAGE_KEY = "smart-order:arrival-sound";

/** Lazy AudioContext singleton — created on the first ON beep only. */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null; // construction can throw on some locked-down browsers
    }
  }
  return ctx;
}

/** One short tone with click-safe ramps (WebAudio schedule). */
function tone(
  audio: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peak: number,
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // exponential ramps both ways — a hard start/end is an audible click
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.015);
  gain.gain.setValueAtTime(peak, startAt + duration - 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/**
 * The arrival beep: a two-tone descending chime (880Hz → 620Hz, ~0.35s
 * total) at a modest peak gain — audible across a kitchen, not a
 * siren. Returns true iff a beep was actually scheduled (caller may
 * ignore; it never throws and never blocks the arrival branch).
 */
export function playArrivalBeep(): boolean {
  const audio = getCtx();
  if (!audio) return false;
  try {
    // Autoplay policy: a context created outside a user gesture starts
    // suspended; resume() is fire-and-forget — if the policy still
    // refuses, the scheduled tones simply never sound (no error path).
    if (audio.state === "suspended") void audio.resume().catch(() => {});
    const t0 = audio.currentTime + 0.02;
    tone(audio, 880, t0, 0.12, 0.12);
    tone(audio, 620, t0 + 0.16, 0.18, 0.12);
    return true;
  } catch {
    return false; // never let a notification device break the poll
  }
}

/** Read the persisted preference (default OFF — see the module header). */
export function readArrivalSoundPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ARRIVAL_SOUND_STORAGE_KEY) === "1";
  } catch {
    return false; // storage blocked (private mode) — respectful default
  }
}

/** Persist the preference ("1" | "0") — never throws. */
export function writeArrivalSoundPref(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ARRIVAL_SOUND_STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* storage blocked — the session toggle still works in memory */
  }
}
