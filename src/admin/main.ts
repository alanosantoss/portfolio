import type { ProjectItem } from "../types/project";
import { getItemAspect } from "../utils/media";
import { escapeHtml, isSafeImageUrl } from "../utils/security";
import { createAdminEditor } from "./editor";
import { pushToGitHubAPI, saveToLocalServer } from "./github";
import { filterAdminProjects, moveProject } from "./project-manager";
import {
  formatProjectsFile,
  getGitHubToken,
  loadAdminProjects,
  resetAdminProjects,
  saveAdminProjects,
  setGitHubToken
} from "./storage";

interface AdminState {
  projects: ProjectItem[];
  activeFilter: string;
  searchQuery: string;
  dragSourceIndex: number | null;
}

const state: AdminState = {
  projects: [],
  activeFilter: "all",
  searchQuery: "",
  dragSourceIndex: null
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string): void {
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toast-msg");
  if (!toast || !msg) return;
  msg.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2500);
}

function persistProjects(notify = true): void {
  const ok = saveAdminProjects(state.projects);
  const statusEl = document.getElementById("save-status");
  if (ok) {
    if (statusEl) statusEl.textContent = "● Salvo no Navegador";
    if (notify) showToast("Alterações salvas com sucesso!");
  } else {
    showToast("Erro ao salvar no armazenamento local!");
  }
}

function updateGitHubStatusUI(): void {
  const pill = document.getElementById("github-status-pill");
  const token = getGitHubToken();
  if (!pill) return;
  if (token) {
    pill.textContent = "● Git Conectado";
    pill.style.color = "#4ade80";
  } else {
    pill.textContent = "Conectar Git";
    pill.style.color = "";
  }
}

function moveItem(fromIndex: number, toIndex: number): void {
  const updated = moveProject(state.projects, fromIndex, toIndex);
  if (!updated) return;
  state.projects = updated;
  persistProjects(false);
  renderCards();
  showToast(`Item movido para a posição #${toIndex + 1}!`);
}

function deleteItem(index: number): void {
  const item = state.projects[index];
  if (!item) return;
  if (!confirm(`Deseja realmente excluir "${item.title}"?`)) return;
  state.projects.splice(index, 1);
  persistProjects(false);
  renderCards();
  showToast("Item excluído com sucesso!");
}

function setupCardDragEvents(card: HTMLElement, index: number): void {
  card.addEventListener("dragstart", (e: DragEvent) => {
    state.dragSourceIndex = index;
    card.classList.add("is-dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("is-dragging");
    document.querySelectorAll(".admin-card").forEach((c) => c.classList.remove("drag-over-active"));
    state.dragSourceIndex = null;
  });

  card.addEventListener("dragover", (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  });

  card.addEventListener("dragenter", () => {
    if (state.dragSourceIndex !== null && state.dragSourceIndex !== index) {
      card.classList.add("drag-over-active");
    }
  });

  card.addEventListener("dragleave", (e: DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && card.contains(related)) return;
    card.classList.remove("drag-over-active");
  });

  card.addEventListener("drop", (e: DragEvent) => {
    e.preventDefault();
    card.classList.remove("drag-over-active");
    const sourceIndex = state.dragSourceIndex;
    if (sourceIndex === null || sourceIndex === index) return;

    const updated = moveProject(state.projects, sourceIndex, index);
    if (!updated) return;
    state.projects = updated;
    persistProjects(false);
    renderCards();
    showToast(`Item movido para a posição #${index + 1}!`);
  });
}

let editorController: ReturnType<typeof createAdminEditor> | null = null;

function renderCards(): void {
  const container = document.getElementById("cards-container");
  if (!container) return;
  container.innerHTML = "";

  const filtered = filterAdminProjects(state.projects, state.activeFilter, state.searchQuery);
  const total = state.projects.length;
  const visibleCount = state.projects.filter((p) => p.visible !== false).length;
  const counterEl = document.getElementById("stats-counter");
  if (counterEl) {
    counterEl.textContent = `${visibleCount} de ${total} visíveis (${filtered.length} exibidos)`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--muted); background: var(--surface); border-radius: 8px;">
        Nenhum projeto encontrado para o filtro atual.
      </div>
    `;
    return;
  }

  filtered.forEach(({ item, originalIndex }) => {
    const isVideo = item.type === "video";
    const isVisible = item.visible !== false;
    const safeTitle = escapeHtml(item.title || "");
    const rawThumbUrl = isVideo
      ? `https://i.ytimg.com/vi/${encodeURIComponent(item.id || "")}/hqdefault.jpg`
      : item.image || "";
    const safeThumbUrl = isVideo || isSafeImageUrl(rawThumbUrl) ? escapeHtml(rawThumbUrl) : "";
    const aspectLabel = getItemAspect(item);
    const isReels = aspectLabel === "9:16";
    const safeCategory = escapeHtml(item.category || item.type || "");

    const card = document.createElement("div");
    card.className = `admin-card ${!isVisible ? "is-hidden-project" : ""}`;
    card.dataset.index = String(originalIndex);
    card.setAttribute("draggable", "true");

    card.innerHTML = `
      <div class="card-top">
        <span class="drag-handle" title="Arraste para mover">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"></circle>
            <circle cx="15" cy="6" r="1.5"></circle>
            <circle cx="9" cy="12" r="1.5"></circle>
            <circle cx="15" cy="12" r="1.5"></circle>
            <circle cx="9" cy="18" r="1.5"></circle>
            <circle cx="15" cy="18" r="1.5"></circle>
          </svg>
          #${originalIndex + 1}
        </span>

        <label class="visibility-toggle" title="Mostrar/Ocultar no Portfólio">
          <span>${isVisible ? "Visível" : "Oculto"}</span>
          <input type="checkbox" class="toggle-vis-input" ${isVisible ? "checked" : ""} />
        </label>
      </div>

      <div class="card-thumb-wrap">
        <img class="card-thumb" src="${safeThumbUrl}" alt="${safeTitle}" loading="lazy" />
        <div class="card-badges">
          <span class="badge-pill ${isReels ? "badge-reels" : "badge-widescreen"}">
            ${isReels ? "9:16 Reels" : escapeHtml(aspectLabel)}
          </span>
          <span class="badge-pill">${safeCategory}</span>
        </div>
      </div>

      <div class="card-body">
        <h4 class="card-title">${safeTitle}</h4>
        <div class="card-meta">
          ${(item.tags || []).map((t) => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>

      <div class="card-footer">
        <div class="move-btn-group">
          <button class="icon-btn btn-move-up" type="button" title="Mover para cima" ${originalIndex === 0 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="18 15 12 9 6 15"></polyline></svg>
          </button>
          <button class="icon-btn btn-move-down" type="button" title="Mover para baixo" ${originalIndex === state.projects.length - 1 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>

        <div style="display: flex; gap: 6px;">
          <button class="icon-btn btn-edit-item" type="button" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger btn-delete-item" type="button" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;

    card.querySelector<HTMLInputElement>(".toggle-vis-input")?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      item.visible = target.checked;
      persistProjects(false);
      renderCards();
      showToast(item.visible ? "Item ativado no portfólio!" : "Item ocultado do portfólio!");
    });

    card
      .querySelector(".btn-move-up")
      ?.addEventListener("click", () => moveItem(originalIndex, originalIndex - 1));
    card
      .querySelector(".btn-move-down")
      ?.addEventListener("click", () => moveItem(originalIndex, originalIndex + 1));
    card
      .querySelector(".btn-edit-item")
      ?.addEventListener("click", () => editorController?.openEditModal(originalIndex));
    card.querySelector(".btn-delete-item")?.addEventListener("click", () => deleteItem(originalIndex));

    setupCardDragEvents(card, originalIndex);
    container.appendChild(card);
  });
}

function openGitHubModal(): void {
  const githubModal = document.getElementById("github-modal");
  const inputGithubToken = document.getElementById("input-github-token") as HTMLInputElement | null;
  if (!githubModal || !inputGithubToken) return;
  inputGithubToken.value = getGitHubToken();
  githubModal.classList.add("is-open");
  inputGithubToken.focus();
}

function closeGitHubModal(): void {
  document.getElementById("github-modal")?.classList.remove("is-open");
}

async function saveToGit(): Promise<void> {
  const saveBtn = document.getElementById("btn-save") as HTMLButtonElement | null;
  const saveText = document.getElementById("btn-save-text");
  const originalText = "Salvar no Git";
  if (!saveBtn || !saveText) return;

  persistProjects(false);
  saveBtn.disabled = true;
  saveText.textContent = "Salvando no Git...";

  try {
    const localData = await saveToLocalServer(state.projects);
    if (localData) {
      saveText.textContent = "✓ Salvo no Git!";
      showToast(localData.message || "Alterações enviadas para o Git com sucesso!");
      setTimeout(() => {
        saveBtn.disabled = false;
        saveText.textContent = originalText;
      }, 2500);
      return;
    }
  } catch {}

  const token = getGitHubToken();
  if (!token) {
    saveBtn.disabled = false;
    saveText.textContent = originalText;
    openGitHubModal();
    return;
  }

  try {
    saveText.textContent = "Enviando ao GitHub...";
    await pushToGitHubAPI(state.projects, token);
    saveText.textContent = "✓ Salvo no Git!";
    showToast("Sucesso! Alterações enviadas ao GitHub. O site atualizará em ~1 minuto.");
    updateGitHubStatusUI();
    setTimeout(() => {
      saveBtn.disabled = false;
      saveText.textContent = originalText;
    }, 3000);
  } catch (err) {
    const message = err instanceof Error ? err.message : "verifique sua conexão";
    console.error("Erro no envio para GitHub:", err);
    saveBtn.disabled = false;
    saveText.textContent = originalText;
    if (message.includes("Bad credentials") || message.includes("401")) {
      showToast("Token do GitHub inválido ou expirado. Digite o token novamente.");
      openGitHubModal();
    } else {
      showToast("Erro ao enviar: " + message);
    }
  }
}

function initAdmin(): void {
  state.projects = loadAdminProjects();

  editorController = createAdminEditor({
    getProjectAt: (index) => state.projects[index] ?? null,
    onSaveItem: (itemData, index) => {
      if (index >= 0) {
        state.projects[index] = itemData;
        showToast("Item atualizado com sucesso!");
      } else {
        state.projects.unshift(itemData);
        showToast("Item adicionado no topo da lista!");
      }
      persistProjects(false);
      renderCards();
    }
  });
  editorController.init();

  const itemModal = document.getElementById("item-modal");
  const codeModal = document.getElementById("code-modal");
  const codeOutput = document.getElementById("code-output") as HTMLTextAreaElement | null;
  const githubModal = document.getElementById("github-modal");
  const inputGithubToken = document.getElementById("input-github-token") as HTMLInputElement | null;

  document.getElementById("btn-add")?.addEventListener("click", () => editorController?.openAddModal());
  document.getElementById("modal-close-btn")?.addEventListener("click", () => editorController?.closeModal());
  document.getElementById("modal-cancel-btn")?.addEventListener("click", () => editorController?.closeModal());
  document.getElementById("btn-save")?.addEventListener("click", () => void saveToGit());

  document.getElementById("btn-copy-code")?.addEventListener("click", () => {
    if (!codeModal || !codeOutput) return;
    codeOutput.value = formatProjectsFile(state.projects);
    codeModal.classList.add("is-open");
  });

  document.getElementById("code-modal-close")?.addEventListener("click", () => {
    codeModal?.classList.remove("is-open");
  });

  document.getElementById("btn-copy-clipboard")?.addEventListener("click", async () => {
    if (!codeOutput) return;
    try {
      await navigator.clipboard.writeText(codeOutput.value);
      showToast("Código copiado para a Área de Transferência!");
    } catch {
      codeOutput.select();
      document.execCommand("copy");
      showToast("Código copiado!");
    }
  });

  document.getElementById("btn-github-settings")?.addEventListener("click", openGitHubModal);
  document.getElementById("github-modal-close")?.addEventListener("click", closeGitHubModal);
  document.getElementById("github-modal-cancel")?.addEventListener("click", closeGitHubModal);
  document.getElementById("btn-save-github-token")?.addEventListener("click", () => {
    const token = inputGithubToken?.value.trim() || "";
    if (!token) {
      alert("Por favor, cole um token válido do GitHub.");
      return;
    }
    setGitHubToken(token);
    closeGitHubModal();
    updateGitHubStatusUI();
    showToast("Token configurado com sucesso! Enviando para o GitHub...");
    void saveToGit();
  });

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (
      !confirm(
        "Tem certeza que deseja restaurar a lista original de projetos? Todas as alterações manuais serão perdidas."
      )
    ) {
      return;
    }
    state.projects = resetAdminProjects();
    renderCards();
    showToast("Portfólio restaurado para o padrão original!");
  });

  document.querySelectorAll<HTMLButtonElement>(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.activeFilter = btn.dataset.filter || "all";
      renderCards();
    });
  });

  document.getElementById("search-input")?.addEventListener("input", (e: Event) => {
    const target = e.target as HTMLInputElement;
    state.searchQuery = target.value;
    renderCards();
  });

  [itemModal, codeModal, githubModal].forEach((m) => {
    m?.addEventListener("click", (e: MouseEvent) => {
      if (e.target === m) m.classList.remove("is-open");
    });
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      editorController?.closeModal();
      codeModal?.classList.remove("is-open");
      closeGitHubModal();
    }
  });

  renderCards();
  updateGitHubStatusUI();
}

document.addEventListener("DOMContentLoaded", initAdmin);
