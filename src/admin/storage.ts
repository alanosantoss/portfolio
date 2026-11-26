import { getAllProjects, getDefaultProjects } from "../services/projects";
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
  STORAGE_KEYS
} from "../services/storage";
import type { ProjectItem } from "../types/project";

export function loadAdminProjects(): ProjectItem[] {
  return getAllProjects();
}

export function saveAdminProjects(projects: ProjectItem[]): boolean {
  return setLocalStorageItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function resetAdminProjects(): ProjectItem[] {
  removeLocalStorageItem(STORAGE_KEYS.PROJECTS);
  return getDefaultProjects();
}

export function getGitHubToken(): string {
  return getLocalStorageItem(STORAGE_KEYS.GITHUB_TOKEN) || "";
}

export function setGitHubToken(token: string): void {
  setLocalStorageItem(STORAGE_KEYS.GITHUB_TOKEN, token.trim());
}

export function formatProjectsFile(projects: ProjectItem[]): string {
  const cleanArray = projects.map((p) => {
    const copy: ProjectItem = { ...p };
    if (copy.visible === true) {
      delete copy.visible;
    }
    return copy;
  });
  return `window.DEFAULT_PROJECTS = ${JSON.stringify(cleanArray, null, 2)};\n`;
}
