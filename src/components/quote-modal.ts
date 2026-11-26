import {
  buildQuoteMessage,
  buildWhatsAppUrl,
  QUOTE_FORMATS
} from "../services/whatsapp";
import type { QuoteField, QuoteState } from "../types/app";
import type { MainCategory } from "../types/project";

export interface QuoteModalController {
  init: () => void;
  open: (triggerEl?: HTMLElement | null) => void;
  close: () => void;
  isOpen: () => boolean;
}

export function createQuoteModalController(
  getActiveCategory: () => MainCategory
): QuoteModalController {
  const quoteState: QuoteState = {
    service: "",
    format: [],
    volume: "",
    deadline: "",
    notes: ""
  };

  let lastTrigger: HTMLElement | null = null;
  let bound = false;

  const syncUi = () => {
    document
      .querySelectorAll<HTMLElement>("#quote-modal .quote-pill[data-quote-field]")
      .forEach((btn) => {
        const field = btn.dataset.quoteField as QuoteField | undefined;
        const val = btn.dataset.quoteValue || "";
        if (!field || !(field in quoteState)) return;
        const current = quoteState[field];
        const active = Array.isArray(current) ? current.includes(val) : current === val;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });

    const submitBtn = document.getElementById("quote-submit-btn") as HTMLAnchorElement | null;
    if (submitBtn) {
      submitBtn.href = buildWhatsAppUrl(buildQuoteMessage(quoteState));
    }
  };

  const renderFormats = () => {
    const group = document.getElementById("quote-format-group");
    if (!group) return;

    const options = QUOTE_FORMATS[quoteState.service] ?? QUOTE_FORMATS.default ?? [];
    quoteState.format = quoteState.format.filter((item) => options.includes(item));

    group.innerHTML = "";
    options.forEach((opt) => {
      const isSelected = quoteState.format.includes(opt);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `quote-pill${isSelected ? " is-active" : ""}`;
      btn.dataset.quoteField = "format";
      btn.dataset.quoteValue = opt;
      btn.setAttribute("aria-pressed", String(isSelected));
      btn.textContent = opt;
      btn.addEventListener("click", () => setField("format", opt));
      group.appendChild(btn);
    });
  };

  const setField = (field: QuoteField, value: string) => {
    if (field === "notes") {
      quoteState.notes = String(value || "");
    } else if (field === "format") {
      quoteState.format = quoteState.format.includes(value)
        ? quoteState.format.filter((item) => item !== value)
        : [...quoteState.format, value];
    } else {
      quoteState[field] = quoteState[field] === value ? "" : value;
      if (field === "service") {
        renderFormats();
      }
    }
    syncUi();
  };

  const open = (triggerEl?: HTMLElement | null) => {
    const modal = document.getElementById("quote-modal");
    if (!modal) return;

    lastTrigger = triggerEl || (document.activeElement as HTMLElement | null);
    const activeCat = getActiveCategory();
    const presetService = ["video", "design", "ia"].includes(activeCat) ? activeCat : "";
    if (presetService && quoteState.service !== presetService) {
      quoteState.service = presetService;
      quoteState.format = [];
    }

    renderFormats();
    syncUi();

    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    const closeBtn = document.getElementById("quote-close");
    if (closeBtn && typeof closeBtn.focus === "function") {
      closeBtn.focus();
    }
  };

  const close = () => {
    const modal = document.getElementById("quote-modal");
    if (!modal || !modal.classList.contains("is-open")) return;

    modal.classList.remove("is-open");
    const welcomeOpen = document.getElementById("welcome-gate")?.classList.contains("is-open");
    const lightboxOpen = document.getElementById("lightbox")?.classList.contains("is-open");
    if (!welcomeOpen && !lightboxOpen) {
      document.body.style.overflow = "";
    }
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
    }
    lastTrigger = null;
  };

  const isOpen = (): boolean => {
    return Boolean(document.getElementById("quote-modal")?.classList.contains("is-open"));
  };

  const init = () => {
    const modal = document.getElementById("quote-modal");
    if (!modal || bound) return;
    bound = true;

    document
      .querySelectorAll<HTMLElement>("#quote-modal .quote-pill[data-quote-field]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const field = btn.dataset.quoteField as QuoteField | undefined;
          const value = btn.dataset.quoteValue || "";
          if (field) setField(field, value);
        });
      });

    const notesInput = document.getElementById("quote-notes") as HTMLInputElement | null;
    notesInput?.addEventListener("input", () => setField("notes", notesInput.value));

    document.getElementById("quote-close")?.addEventListener("click", close);
    document.getElementById("quote-submit-btn")?.addEventListener("click", () => {
      syncUi();
      setTimeout(close, 0);
    });
    document.getElementById("quote-skip-link")?.addEventListener("click", () => {
      setTimeout(close, 0);
    });
    modal.addEventListener("click", (e: MouseEvent) => {
      if (e.target === modal) close();
    });

    renderFormats();
    syncUi();
  };

  return { init, open, close, isOpen };
}
