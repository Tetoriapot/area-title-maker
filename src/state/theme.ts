export type StudioTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'area-title-maker:theme:v1';
const THEME_CHANGE_EVENT = 'area-title-maker:theme-change';

// Run before first paint so a saved light theme does not flash dark on reload.
export const THEME_BOOTSTRAP_SCRIPT = `(()=>{try{document.documentElement.classList.toggle('dark',localStorage.getItem('${THEME_STORAGE_KEY}')!=='light')}catch{}})();`;

export function getStudioTheme(): StudioTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function getServerStudioTheme(): StudioTheme {
  return 'dark';
}

export function setStudioTheme(theme: StudioTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme switching still works when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeToStudioTheme(onChange: () => void) {
  const syncStoredTheme = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    document.documentElement.classList.toggle(
      'dark',
      event.newValue !== 'light',
    );
    onChange();
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener('storage', syncStoredTheme);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', syncStoredTheme);
  };
}
