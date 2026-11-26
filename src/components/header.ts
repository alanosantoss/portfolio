import { CONFIG } from "../core/config";
import { buildWhatsAppUrl } from "../services/whatsapp";
import type { MainCategory, ProjectCategory } from "../types/project";

export function initHeaderContacts(onOpenQuote: (trigger: HTMLElement) => void): void {
  const waUrl = buildWhatsAppUrl();

  const headerWa = document.getElementById("header-whatsapp") as HTMLAnchorElement | null;
  const socialLi = document.getElementById("social-linkedin") as HTMLAnchorElement | null;
  const aboutWa = document.getElementById("about-whatsapp") as HTMLAnchorElement | null;
  const aboutLi = document.getElementById("about-linkedin") as HTMLAnchorElement | null;
  const quoteSkip = document.getElementById("quote-skip-link") as HTMLAnchorElement | null;

  [headerWa, aboutWa].forEach((trigger) => {
    if (!trigger) return;
    trigger.href = waUrl;
    if (trigger.dataset.quoteBound === "1") return;
    trigger.dataset.quoteBound = "1";
    trigger.addEventListener("click", (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onOpenQuote(trigger);
    });
  });

  if (quoteSkip) quoteSkip.href = waUrl;
  if (socialLi) socialLi.href = CONFIG.LINKEDIN_URL;
  if (aboutLi) aboutLi.href = CONFIG.LINKEDIN_URL;

  const emailBtn = document.getElementById("about-email-btn");
  const copyToast = document.getElementById("copy-toast");
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  if (emailBtn && emailBtn.dataset.bound !== "1") {
    emailBtn.dataset.bound = "1";
    emailBtn.addEventListener("click", async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(CONFIG.EMAIL);
        } else {
          const ta = document.createElement("textarea");
          ta.value = CONFIG.EMAIL;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }

        if (copyToast) {
          copyToast.classList.add("is-visible");
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = setTimeout(() => {
            copyToast.classList.remove("is-visible");
          }, 2200);
        }
      } catch (err) {
        console.warn("Erro ao copiar e-mail:", err);
      }
    });
  }
}

export function bindHeaderNavigation(
  onSelectCategory: (category: MainCategory) => void,
  onBrandHome: () => void
): void {
  document.querySelectorAll<HTMLButtonElement>("#category-nav .nav-btn[data-category]").forEach((btn) => {
    if (btn.dataset.navBound === "1") return;
    btn.dataset.navBound = "1";
    btn.addEventListener("click", () => {
      const cat = btn.dataset.category as MainCategory | undefined;
      if (cat) onSelectCategory(cat);
    });
  });

  const brandHome = document.getElementById("brand-home");
  if (brandHome && brandHome.dataset.navBound !== "1") {
    brandHome.dataset.navBound = "1";
    brandHome.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      onBrandHome();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

export function updateHeaderActiveCategory(category: MainCategory): void {
  document.querySelectorAll<HTMLElement>("#category-nav .nav-btn[data-category]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.category === category);
  });
}

export function applyHeaderCategoryLock(lockedCategory: ProjectCategory | null): void {
  document.querySelectorAll<HTMLElement>("#category-nav .nav-btn[data-category]").forEach((btn) => {
    const cat = btn.dataset.category;
    const hide = Boolean(lockedCategory) && cat !== lockedCategory && cat !== "sobre";
    btn.classList.toggle("is-hidden-by-gate", hide);
  });

  document.getElementById("switch-area-btn")?.classList.toggle("is-visible", Boolean(lockedCategory));
}
