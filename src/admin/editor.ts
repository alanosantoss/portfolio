import type { ProjectCategory, ProjectItem, ProjectType } from "../types/project";
import { getItemAspect } from "../utils/media";
import { extractYouTubeId, isSafeImageUrl, isValidYouTubeId } from "../utils/security";
import { buildProjectPayload } from "./project-manager";

export interface EditorCallbacks {
  getProjectAt: (index: number) => ProjectItem | null;
  onSaveItem: (item: ProjectItem, index: number) => void;
}

export interface EditorController {
  openAddModal: () => void;
  openEditModal: (index: number) => void;
  closeModal: () => void;
  init: () => void;
}

export function createAdminEditor(callbacks: EditorCallbacks): EditorController {
  const itemModal = document.getElementById("item-modal");
  const itemForm = document.getElementById("item-form") as HTMLFormElement | null;
  const editIndexInput = document.getElementById("edit-index") as HTMLInputElement | null;
  const modalTitle = document.getElementById("modal-title");
  const inputType = document.getElementById("input-type") as HTMLSelectElement | null;
  const labelMediaSource = document.getElementById("label-media-source");
  const hintMediaSource = document.getElementById("hint-media-source");
  const inputYt = document.getElementById("input-yt-url") as HTMLInputElement | null;
  const inputTitle = document.getElementById("input-title") as HTMLInputElement | null;
  const inputAspect = document.getElementById("input-aspect") as HTMLSelectElement | null;
  const inputCategory = document.getElementById("input-category") as HTMLSelectElement | null;
  const inputTags = document.getElementById("input-tags") as HTMLInputElement | null;
  const inputVisible = document.getElementById("input-visible") as HTMLInputElement | null;
  const thumbPreviewBox = document.getElementById("thumb-preview-box");

  // Portfolio 2.0 fields
  const inputClient = document.getElementById("input-client") as HTMLInputElement | null;
  const inputDuration = document.getElementById("input-duration") as HTMLInputElement | null;
  const inputSlug = document.getElementById("input-slug") as HTMLInputElement | null;
  const inputSummary = document.getElementById("input-summary") as HTMLInputElement | null;
  const inputDescription = document.getElementById("input-description") as HTMLTextAreaElement | null;
  const inputServices = document.getElementById("input-services") as HTMLInputElement | null;
  const inputTools = document.getElementById("input-tools") as HTMLInputElement | null;
  const inputPreviewUrl = document.getElementById("input-preview-url") as HTMLInputElement | null;
  const inputBeforeImg = document.getElementById("input-before-img") as HTMLInputElement | null;
  const inputAfterImg = document.getElementById("input-after-img") as HTMLInputElement | null;
  const inputDemoUrl = document.getElementById("input-demo-url") as HTMLInputElement | null;
  const inputFeatured = document.getElementById("input-featured") as HTMLInputElement | null;
  const inputCaseStudy = document.getElementById("input-case-study") as HTMLInputElement | null;

  const updateMediaInputUI = () => {
    const isDesign = inputType?.value === "design";
    if (labelMediaSource) {
      labelMediaSource.textContent = isDesign ? "URL ou Caminho da Imagem" : "Link ou ID do YouTube";
    }
    if (inputYt) {
      inputYt.placeholder = isDesign
        ? "Ex: assets/arte.jpg ou https://images.unsplash.com/..."
        : "Ex: https://youtube.com/shorts/aNsA0iwBbqc ou aNsA0iwBbqc";
    }
    if (hintMediaSource) {
      hintMediaSource.textContent = isDesign
        ? "Aceita caminho relativo (assets/...) ou URL completa da imagem (https://...)."
        : "Aceita link completo de Shorts, vídeo comum ou apenas o ID de 11 caracteres.";
    }
  };

  const updateThumbPreview = () => {
    if (!inputYt || !inputType || !thumbPreviewBox) return;
    const raw = inputYt.value.trim();

    if (inputType.value === "design") {
      if (isSafeImageUrl(raw)) {
        const img = document.createElement("img");
        img.alt = "Preview";
        img.src = raw;
        thumbPreviewBox.replaceChildren(img);
      } else {
        thumbPreviewBox.replaceChildren();
        thumbPreviewBox.textContent = "Informe uma URL de imagem válida acima para pré-visualizar";
      }
      return;
    }

    const id = extractYouTubeId(raw);
    if (isValidYouTubeId(id)) {
      const img = document.createElement("img");
      img.alt = "Preview";
      img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      img.addEventListener(
        "error",
        () => {
          img.src = `https://i.ytimg.com/vi/${id}/sddefault.jpg`;
        },
        { once: true }
      );
      thumbPreviewBox.replaceChildren(img);
    } else {
      thumbPreviewBox.replaceChildren();
      thumbPreviewBox.textContent = "Cole o link do YouTube acima para pré-visualizar";
    }
  };

  const openAddModal = () => {
    if (!itemModal || !itemForm || !editIndexInput || !modalTitle || !inputType || !inputVisible) {
      return;
    }
    editIndexInput.value = "-1";
    modalTitle.textContent = "Adicionar Novo Item";
    itemForm.reset();
    inputType.value = "video";
    inputVisible.checked = true;
    updateMediaInputUI();
    updateThumbPreview();
    itemModal.classList.add("is-open");
    inputYt?.focus();
  };

  const openEditModal = (index: number) => {
    const item = callbacks.getProjectAt(index);
    if (
      !item ||
      !itemModal ||
      !editIndexInput ||
      !modalTitle ||
      !inputType ||
      !inputYt ||
      !inputTitle ||
      !inputAspect ||
      !inputCategory ||
      !inputTags ||
      !inputVisible
    ) {
      return;
    }

    editIndexInput.value = String(index);
    modalTitle.textContent = "Editar Item";
    inputType.value = item.type === "design" ? "design" : "video";
    inputYt.value =
      item.type === "design" ? item.image || item.id || "" : item.id || item.image || "";
    inputTitle.value = item.title || "";
    inputAspect.value = getItemAspect(item);
    inputCategory.value = item.category || "video";
    inputTags.value = (item.tags || []).join(", ");
    inputVisible.checked = item.visible !== false;

    // Set Portfolio 2.0 fields
    if (inputClient) inputClient.value = item.client || "";
    if (inputDuration) inputDuration.value = item.duration || (item.year ? String(item.year) : "");
    if (inputSlug) inputSlug.value = item.slug || "";
    if (inputSummary) inputSummary.value = item.summary || "";
    if (inputDescription) inputDescription.value = item.description || "";
    if (inputServices) inputServices.value = (item.services || []).join(", ");
    if (inputTools) inputTools.value = (item.tools || []).join(", ");
    if (inputPreviewUrl) inputPreviewUrl.value = item.previewUrl || "";
    if (inputBeforeImg) inputBeforeImg.value = item.beforeImage || "";
    if (inputAfterImg) inputAfterImg.value = item.afterImage || "";
    if (inputDemoUrl) inputDemoUrl.value = item.demoUrl || "";
    if (inputFeatured) inputFeatured.checked = Boolean(item.featured);
    if (inputCaseStudy) inputCaseStudy.checked = Boolean(item.caseStudy);

    updateMediaInputUI();
    updateThumbPreview();
    itemModal.classList.add("is-open");
    inputTitle.focus();
  };

  const closeModal = () => {
    itemModal?.classList.remove("is-open");
  };

  const init = () => {
    inputYt?.addEventListener("input", updateThumbPreview);
    inputType?.addEventListener("change", () => {
      updateMediaInputUI();
      updateThumbPreview();
    });

    itemForm?.addEventListener("submit", (e: SubmitEvent) => {
      e.preventDefault();
      if (
        !inputYt ||
        !inputTitle ||
        !inputType ||
        !inputAspect ||
        !inputCategory ||
        !inputVisible ||
        !inputTags ||
        !editIndexInput
      ) {
        return;
      }

      const rawSource = inputYt.value.trim();
      const title = inputTitle.value.trim();
      const type = (inputType.value === "design" ? "design" : "video") as ProjectType;
      const aspect = inputAspect.value;
      const category = inputCategory.value as ProjectCategory;
      const visible = inputVisible.checked;
      const tags = inputTags.value
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter(Boolean);

      const client = inputClient?.value.trim() || undefined;
      const duration = inputDuration?.value.trim() || undefined;
      const slug = inputSlug?.value.trim() || undefined;
      const summary = inputSummary?.value.trim() || undefined;
      const description = inputDescription?.value.trim() || undefined;
      const services = inputServices?.value
        ? inputServices.value.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const tools = inputTools?.value
        ? inputTools.value.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined;
      const previewUrl = inputPreviewUrl?.value.trim() || undefined;
      const beforeImage = inputBeforeImg?.value.trim() || undefined;
      const afterImage = inputAfterImg?.value.trim() || undefined;
      const demoUrl = inputDemoUrl?.value.trim() || undefined;
      const featured = Boolean(inputFeatured?.checked);
      const caseStudy = Boolean(inputCaseStudy?.checked);

      if (type === "design" && !isSafeImageUrl(rawSource)) {
        alert("Informe uma URL de imagem válida (https://..., http://... ou assets/...).");
        return;
      }

      const index = parseInt(editIndexInput.value, 10);
      const previousItem = index >= 0 ? callbacks.getProjectAt(index) : null;
      const itemData = buildProjectPayload(
        {
          type,
          category,
          rawSource,
          title,
          aspect,
          tags,
          visible,
          client,
          duration,
          slug,
          summary,
          description,
          services,
          tools,
          previewUrl,
          beforeImage,
          afterImage,
          demoUrl,
          featured,
          caseStudy
        },
        previousItem
      );

      callbacks.onSaveItem(itemData, index);
      closeModal();
    });
  };

  return { openAddModal, openEditModal, closeModal, init };
}
