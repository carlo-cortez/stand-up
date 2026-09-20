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
  // A cog with eight teeth, drawn in polar coordinates so it is symmetric.
  // The artboard put a sun under this label, which reads as a brightness
  // toggle rather than settings — see the handoff's §4.1 note.
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.5" {...common}>
      <path d="M7.81 1.99 L12.19 1.99 L10.99 3.78 L13.70 4.90 L14.11 2.79 L17.21 5.89 L15.10 6.30 L16.22 9.01 L18.01 7.81 L18.01 12.19 L16.22 10.99 L15.10 13.70 L17.21 14.11 L14.11 17.21 L13.70 15.10 L10.99 16.22 L12.19 18.01 L7.81 18.01 L9.01 16.22 L6.30 15.10 L5.89 17.21 L2.79 14.11 L4.90 13.70 L3.78 10.99 L1.99 12.19 L1.99 7.81 L3.78 9.01 L4.90 6.30 L2.79 5.89 L5.89 2.79 L6.30 4.90 L9.01 3.78 Z" />
      <circle cx="10" cy="10" r="2.6" />
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
