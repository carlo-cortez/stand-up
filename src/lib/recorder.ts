/*
 * Recording the Speaking phase (handoff §1, §4.4, §9). The mic is asked for
 * when a recorded round starts, never on app load; it is released straight
 * away and taken again the moment Speaking begins, so the browser's "mic in
 * use" indicator only shows while the user is actually talking.
 */

import { saveSettings } from './settings';

export type MicResult = 'granted' | 'blocked' | 'unavailable';

function toResult(error: unknown): MicResult {
  const name = error instanceof DOMException ? error.name : '';
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : 'unavailable';
}

/** Asks for the mic, records the answer in settings, and lets go of it. */
export async function checkMic(): Promise<MicResult> {
  if (!navigator.mediaDevices?.getUserMedia) return 'unavailable';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    saveSettings({ micBlocked: false });
    return 'granted';
  } catch (error) {
    const result = toResult(error);
    if (result === 'blocked') saveSettings({ micBlocked: true });
    return result;
  }
}

/** webm/opus where supported (Chrome, Firefox); mp4/AAC on Safari. */
function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
}

export type Recording = {
  /** Stops the recorder and resolves with everything captured. */
  stop: () => Promise<Blob | null>;
  /** Stops and throws the audio away. */
  discard: () => void;
  /** False once the browser has suspended or ended the recorder on its own. */
  isHealthy: () => boolean;
};

export async function startRecording(): Promise<Recording | MicResult> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return 'unavailable';
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const result = toResult(error);
    if (result === 'blocked') saveSettings({ micBlocked: true });
    return result;
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  let stoppedByUs = false;
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  // A timeslice keeps data flowing, so a recorder the OS suspends mid-round
  // still leaves everything captured up to that point.
  recorder.start(1000);

  const release = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stop: () =>
      new Promise((resolve) => {
        if (recorder.state === 'inactive') {
          release();
          resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null);
          return;
        }
        stoppedByUs = true;
        recorder.onstop = () => {
          release();
          resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null);
        };
        recorder.stop();
      }),
    discard: () => {
      stoppedByUs = true;
      if (recorder.state !== 'inactive') recorder.stop();
      release();
      chunks.length = 0;
    },
    isHealthy: () => stoppedByUs || recorder.state === 'recording',
  };
}
