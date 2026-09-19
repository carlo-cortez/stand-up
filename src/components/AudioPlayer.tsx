import { useEffect, useRef, useState } from 'react';
import { mmss } from '../lib/format';
import { waveformPeaks } from '../lib/waveform';

type Props = { blob: Blob; fallbackSeconds: number };

/**
 * Playback on Review: a play/pause button, the recording's own waveform
 * filling in as it plays, and the time. The waveform is a real range input
 * underneath, so it can be scrubbed by pointer or by arrow keys.
 */
export function AudioPlayer({ blob, fallbackSeconds }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const [url] = useState(() => URL.createObjectURL(blob));
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(fallbackSeconds);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    let live = true;
    void waveformPeaks(blob).then((p) => live && setPeaks(p));
    return () => {
      live = false;
    };
  }, [blob]);

  // Recorded webm often reports an Infinity duration until played through;
  // the spoken time is the honest fallback until the element knows better.
  const onMetadata = () => {
    const d = audio.current?.duration;
    if (d && Number.isFinite(d)) setDuration(d);
  };

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const seek = (seconds: number) => {
    if (audio.current) audio.current.currentTime = seconds;
    setPosition(seconds);
  };

  const progress = duration > 0 ? position / duration : 0;
  const bars = peaks ?? Array.from({ length: 40 }, () => 0.3);

  return (
    <div className="player">
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onLoadedMetadata={onMetadata}
        onDurationChange={onMetadata}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
      />
      <button type="button" className="player__play" onClick={toggle} aria-label={playing ? 'Pause recording' : 'Play recording'}>
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <rect x="4" y="3.5" width="3.4" height="11" rx="1.2" />
            <rect x="10.6" y="3.5" width="3.4" height="11" rx="1.2" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M5 3.5 L14 9 L5 14.5 Z" />
          </svg>
        )}
      </button>
      <div className="player__track">
        <div className="player__wave" aria-hidden="true">
          {bars.map((level, i) => (
            <span
              key={i}
              className={i / bars.length < progress ? 'is-played' : undefined}
              style={{ height: `${Math.round(level * 100)}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          className="player__scrub"
          min={0}
          max={duration || 1}
          step={0.1}
          value={position}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Position in recording"
          aria-valuetext={`${mmss(position)} of ${mmss(duration)}`}
        />
      </div>
      <span className="player__time tabular">{playing || position > 0 ? mmss(position) : mmss(duration)}</span>
    </div>
  );
}
