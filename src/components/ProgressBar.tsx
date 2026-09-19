/** Speaking progress: width is elapsed / target, capped at full in overtime. */
export function ProgressBar({ fraction }: { fraction: number }) {
  const width = `${Math.min(1, Math.max(0, fraction)) * 100}%`;
  return (
    <div className="progress" aria-hidden="true">
      <div className="progress__fill" style={{ width }} />
    </div>
  );
}
