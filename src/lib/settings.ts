import type { Category, Difficulty } from './topics';

export type PrepSeconds = 15 | 30 | 60;
export type TargetSeconds = 60 | 120 | 180;
export type Theme = 'system' | 'light' | 'dark';

/** Handoff §6 Settings. */
export type Settings = {
  category: Category | 'surprise';
  difficulty: Difficulty;
  prepSeconds: PrepSeconds;
  targetSeconds: TargetSeconds;
  recordAudio: boolean;
  /** Set when getUserMedia was refused; cleared when a request succeeds. */
  micBlocked: boolean;
  /** null until the user first opens or hides it; then their choice sticks. */
  showStructureHint: boolean | null;
  theme: Theme;
};

/** The round-shaping part of Settings — what "Same as last time" repeats. */
export type RoundSettings = Pick<Settings, 'category' | 'difficulty' | 'prepSeconds' | 'targetSeconds' | 'recordAudio'>;

export const DEFAULT_SETTINGS: Settings = {
  category: 'surprise',
  difficulty: 'medium',
  prepSeconds: 30,
  targetSeconds: 120,
  recordAudio: true,
  micBlocked: false,
  showStructureHint: null,
  theme: 'system',
};

const KEYS = {
  settings: 'standup.settings',
  lastRound: 'standup.lastRound',
  recentTopics: 'standup.recentTopics',
} as const;

const RECENT_TOPIC_LIMIT = 20;

// Storage can throw (private windows, blocked site data). Every read falls
// back to a default and every write is best-effort.
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing useful to do; the app keeps working for this visit.
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  write(KEYS.settings, next);
  return next;
}

export function roundSettingsOf(s: Settings): RoundSettings {
  return {
    category: s.category,
    difficulty: s.difficulty,
    prepSeconds: s.prepSeconds,
    targetSeconds: s.targetSeconds,
    recordAudio: s.recordAudio,
  };
}

export function loadLastRoundSettings(): RoundSettings | null {
  const saved = read<RoundSettings | null>(KEYS.lastRound, null);
  // Rounds saved before recording existed carry no recordAudio.
  return saved && { ...saved, recordAudio: saved.recordAudio ?? DEFAULT_SETTINGS.recordAudio };
}

export function saveLastRoundSettings(s: RoundSettings): void {
  write(KEYS.lastRound, s);
}

export function loadRecentTopics(): string[] {
  return read<string[]>(KEYS.recentTopics, []);
}

export function rememberTopic(id: string): void {
  const next = [id, ...loadRecentTopics().filter((x) => x !== id)].slice(0, RECENT_TOPIC_LIMIT);
  write(KEYS.recentTopics, next);
}

export function resolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = resolvedTheme(theme);
}
