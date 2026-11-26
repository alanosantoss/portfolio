import type { ProjectItem } from "./project";

declare global {
  interface Window {
    DEFAULT_PROJECTS?: ProjectItem[];
  }
}

export {};
