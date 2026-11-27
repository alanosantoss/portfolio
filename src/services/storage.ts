export const STORAGE_KEYS = {
  PROJECTS: "portfolio_projects_v2",
  LEGACY_PROJECTS: "portfolio_projects",
  WELCOME_SEEN: "portfolio_welcome_seen",
  WELCOME_CAT: "portfolio_welcome_cat",
  INTRO_SEEN: "portfolio_intro_seen",
  GITHUB_TOKEN: "portfolio_gh_token"
} as const;

export function getLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalStorageItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function getSessionStorageItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setSessionStorageItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

export function removeSessionStorageItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
