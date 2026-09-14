export type ThemePreference = 'system' | 'light' | 'dark';
export type AccentId =
  'teal' | 'blue' | 'purple' | 'pink' | 'orange' | 'green' | 'graphite';

export const DEFAULT_ACCENT: AccentId = 'teal';

export const ACCENTS: ReadonlyArray<{
  readonly id: AccentId;
  readonly swatch: string;
}> = [
  { id: 'teal', swatch: '#12939c' },
  { id: 'blue', swatch: '#007aff' },
  { id: 'purple', swatch: '#af52de' },
  { id: 'pink', swatch: '#ff2d55' },
  { id: 'orange', swatch: '#ff9500' },
  { id: 'green', swatch: '#34c759' },
  { id: 'graphite', swatch: '#8e8e93' },
];

export const PREFERENCES_STORAGE_KEY = 'openmedia.preferences';

export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = theme;
}

export function applyAccent(accent: AccentId): void {
  document.documentElement.dataset.accent = accent;
}

export const THEME_BOOTSTRAP_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${PREFERENCES_STORAGE_KEY}")||"{}");if(p.theme==="light"||p.theme==="dark"){document.documentElement.dataset.theme=p.theme}document.documentElement.dataset.accent=p.accent||"${DEFAULT_ACCENT}"}catch(e){document.documentElement.dataset.accent="${DEFAULT_ACCENT}"}`;
