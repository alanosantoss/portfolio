import type { ProjectItem } from "../types/project";
import { formatProjectsFile } from "./storage";

const GITHUB_REPO = "alanosantoss/portfolio";
const PROJECTS_REPO_PATH = "public/projects.js";

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      bin += String.fromCharCode(byte);
    }
  }
  return btoa(bin);
}

export async function saveToLocalServer(
  projects: ProjectItem[]
): Promise<{ ok: boolean; message?: string } | null> {
  const localCtrl = new AbortController();
  const localTimer = setTimeout(() => localCtrl.abort(), 1800);

  try {
    const localRes = await fetch("/api/save-git", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects }),
      signal: localCtrl.signal
    }).catch(() => null);

    if (localRes && localRes.ok) {
      return (await localRes.json()) as { ok: boolean; message?: string };
    }
    return null;
  } finally {
    clearTimeout(localTimer);
  }
}

export async function pushToGitHubAPI(projects: ProjectItem[], token: string): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  };

  const resProjects = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${PROJECTS_REPO_PATH}`,
    { headers }
  );

  let sha: string | undefined;
  if (resProjects.ok) {
    const dataProjects = (await resProjects.json()) as { sha?: string };
    sha = dataProjects.sha;
  } else if (resProjects.status !== 404) {
    const err = (await resProjects.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || `Erro ao acessar o repositório (${resProjects.status})`);
  }

  const updatedProjectsContent = formatProjectsFile(projects);
  const putBody: { message: string; content: string; sha?: string } = {
    message: "feat: atualiza catalogo de projetos via Painel Admin",
    content: utf8ToBase64(updatedProjectsContent)
  };
  if (sha) {
    putBody.sha = sha;
  }

  const putProjects = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${PROJECTS_REPO_PATH}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(putBody)
    }
  );

  if (!putProjects.ok) {
    const err = (await putProjects.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || `Erro ao salvar ${PROJECTS_REPO_PATH} (${putProjects.status})`);
  }
}
