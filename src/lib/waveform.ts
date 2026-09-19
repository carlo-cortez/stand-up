/**
 * Peak levels for the Review waveform, from the recording itself: `bars`
 * values between 0.12 and 1. Falls back to a gentle flat line if the browser
 * can't decode the blob, so the player never shows an empty box.
 */
export async function waveformPeaks(blob: Blob, bars = 40): Promise<number[]> {
  const flat = Array.from({ length: bars }, () => 0.3);
  try {
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    void context.close();
    const data = buffer.getChannelData(0);
    const size = Math.floor(data.length / bars);
    if (size === 0) return flat;
    const peaks = Array.from({ length: bars }, (_, i) => {
      let peak = 0;
      for (let j = i * size; j < (i + 1) * size; j += 64) peak = Math.max(peak, Math.abs(data[j]));
      return peak;
    });
    const loudest = Math.max(...peaks) || 1;
    return peaks.map((p) => 0.12 + 0.88 * (p / loudest));
  } catch {
    return flat;
  }
}
