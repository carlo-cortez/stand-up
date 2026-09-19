import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Monotonic milliseconds that are still comparable across a page reload.
 * performance.now() never jumps with the system clock; adding timeOrigin
 * anchors it to the epoch so a persisted phase start still means something
 * after a refresh.
 */
export function clockNow(): number {
  return performance.timeOrigin + performance.now();
}

const HEARTBEAT_MS = 5_000;

/**
 * The round's one requestAnimationFrame loop (handoff §1). Returns the
 * current clock reading, updated every frame while `running`.
 *
 * Nothing here accumulates ticks: every consumer derives elapsed time from
 * `now - startedAt`. rAF stops in a hidden tab, and that is fine — the first
 * frame after the tab returns reads the real clock, so the timer is correct
 * the moment it is visible again.
 *
 * `onHeartbeat` runs every five seconds while running, whenever visibility
 * changes, and on pagehide — so a refresh always finds a fresh heartbeat.
 */
export function useRoundTimer(running: boolean, onHeartbeat: () => void): number {
  const [now, setNow] = useState(clockNow);
  const beat = useRef(onHeartbeat);
  useLayoutEffect(() => {
    beat.current = onHeartbeat;
  });

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let lastBeat = clockNow();

    const tick = () => {
      const t = clockNow();
      setNow(t);
      if (t - lastBeat >= HEARTBEAT_MS) {
        lastBeat = t;
        beat.current();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onVisibility = () => {
      lastBeat = clockNow();
      beat.current();
      setNow(lastBeat);
    };
    const onPageHide = () => beat.current();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    beat.current();

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [running]);

  return now;
}

export type TimingLight = 'on' | 'wrap' | 'over';

/** Handoff §4.4: yellow at max(15s, 20% of target); overtime at zero. */
export function yellowThreshold(targetSeconds: number): number {
  return Math.max(15, targetSeconds * 0.2);
}

export function timingLight(remainingSeconds: number, targetSeconds: number): TimingLight {
  if (remainingSeconds <= 0) return 'over';
  if (remainingSeconds <= yellowThreshold(targetSeconds)) return 'wrap';
  return 'on';
}
