import type { Voice } from './sessions';

/*
 * How the voice moved, measured on the phone (handoff §4.5). The recording is
 * decoded here at 16 kHz — plenty for a speaking voice — and handed to a worker
 * for the arithmetic, so nothing leaves the device and the screen stays smooth.
 *
 * Always resolves: any failure (an old browser, an odd codec, a slow phone)
 * gives null, and the feedback card simply goes without the voice rows.
 */

const RATE = 16_000;
const TIMEOUT = 15_000;

export async function analyseVoice(blob: Blob, segments: { start: number; end: number }[]): Promise<Voice | null> {
  try {
    const Offline =
      window.OfflineAudioContext ??
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Offline || typeof Worker === 'undefined') return null;

    // Decoding into a 16 kHz context resamples on the way in.
    const buffer = await new Offline(1, 1, RATE).decodeAudioData(await blob.arrayBuffer());
    const samples = new Float32Array(buffer.getChannelData(0));

    const worker = new Worker(new URL('./voiceWorker.ts', import.meta.url), { type: 'module' });
    return await new Promise<Voice | null>((resolve) => {
      const done = (voice: Voice | null) => {
        clearTimeout(timer);
        worker.terminate();
        resolve(voice);
      };
      const timer = setTimeout(() => done(null), TIMEOUT);
      worker.onmessage = (event: MessageEvent<{ voice: Voice | null }>) => done(event.data.voice);
      worker.onerror = () => done(null);
      worker.postMessage({ samples, rate: buffer.sampleRate, segments }, [samples.buffer]);
    });
  } catch {
    return null;
  }
}
