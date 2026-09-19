/* Inline stroke icons lifted from the artboards. Decorative: always aria-hidden. */

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.7" {...common}>
      <path d="M5 5 L15 15" />
      <path d="M15 5 L5 15" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.8" {...common}>
      <path d="M12 4 L6 10 L12 16" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.7" {...common}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3 L10 4.6" />
      <path d="M10 15.4 L10 17" />
      <path d="M3 10 L4.6 10" />
      <path d="M15.4 10 L17 10" />
      <path d="M5 5 L6.2 6.2" />
      <path d="M13.8 13.8 L15 15" />
      <path d="M15 5 L13.8 6.2" />
      <path d="M6.2 13.8 L5 15" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" strokeWidth="1.8" {...common}>
      <path d="M6 3.5 L10.5 8 L6 12.5" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" strokeWidth="1.7" {...common}>
      <path d="M4 6.5 L8 10.5 L12 6.5" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.6" {...common}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6 L10 10 L12.5 11.5" />
    </svg>
  );
}

export function MicOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" strokeWidth="1.6" {...common}>
      <path d="M8 2.5 A2 2 0 0 1 10 4.5 L10 7" />
      <path d="M6 5.4 L6 8 A2 2 0 0 0 9.4 9.4" />
      <path d="M3.5 7.5 A4.5 4.5 0 0 0 8 12 A4.4 4.4 0 0 0 10.6 11.2" />
      <path d="M12.5 7.5 A4.5 4.5 0 0 1 12.2 9" />
      <path d="M8 12 L8 14" />
      <path d="M3 3 L13 13" />
    </svg>
  );
}
